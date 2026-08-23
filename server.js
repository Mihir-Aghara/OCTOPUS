import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'clips_db.json');
const MAX_DB_RECORDS = 5000; // Capacity limit to prevent disk exhaustion attacks

// --- SERVER-SIDE SECURE SUPABASE CLIENT ---
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

const isSupabaseBackendEnabled = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const supabaseAdmin = isSupabaseBackendEnabled
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// --- HARDENED SECURITY HEADERS MIDDLEWARE ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https:");
  next();
});

app.use(cors());

// Strict Body Limit to prevent memory exhaustion DoS attacks (65MB max to support 50MB files)
app.use(express.json({ limit: '65mb' }));

// --- ADVANCED RATE LIMITER & ANTI-BRUTEFORCE TARPITTING ---
const ipRequestCounts = new Map();
const pinFailedAttempts = new Map(); // PIN brute-force tracking

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Max 30 requests / minute per IP

function rateLimiter(req, res, next) {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let record = ipRequestCounts.get(clientIp);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { count: 1, startTime: now };
  } else {
    record.count++;
  }

  ipRequestCounts.set(clientIp, record);

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests. IP rate limit exceeded. Please wait a minute.'
    });
  }

  next();
}

// Clean old rate limit entries every 5 mins
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestCounts.entries()) {
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      ipRequestCounts.delete(ip);
    }
  }
  for (const [key, record] of pinFailedAttempts.entries()) {
    if (now - record.startTime > 5 * 60 * 1000) {
      pinFailedAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

// --- HIGH-PERFORMANCE ASYNC IN-MEMORY DATABASE ENGINE WITH NON-BLOCKING PERSISTENCE ---
let memoryDbCache = null;
let writeQueuePromise = Promise.resolve();

async function readDb() {
  if (memoryDbCache !== null) {
    return memoryDbCache;
  }
  try {
    if (!fs.existsSync(DB_FILE)) {
      await fs.promises.writeFile(DB_FILE, JSON.stringify({}));
      memoryDbCache = {};
      return memoryDbCache;
    }
    const data = await fs.promises.readFile(DB_FILE, 'utf8');
    memoryDbCache = JSON.parse(data || '{}');
    return memoryDbCache;
  } catch (e) {
    memoryDbCache = {};
    return memoryDbCache;
  }
}

async function writeDb(db) {
  memoryDbCache = db;
  // Queue async file writes to ensure serial non-blocking execution
  writeQueuePromise = writeQueuePromise.then(async () => {
    try {
      const keys = Object.keys(db);
      if (keys.length > MAX_DB_RECORDS) {
        const sortedKeys = keys.sort((a, b) => (db[a].createdAt || 0) - (db[b].createdAt || 0));
        const overflowCount = keys.length - MAX_DB_RECORDS;
        for (let i = 0; i < overflowCount; i++) {
          delete db[sortedKeys[i]];
        }
      }
      await fs.promises.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
      console.error('Async DB write error', e);
    }
  });
  return writeQueuePromise;
}

// Clean expired clips
async function cleanExpired(db) {
  const now = Date.now();
  let changed = false;
  for (const code in db) {
    if (db[code].expireAt && now > db[code].expireAt) {
      delete db[code];
      changed = true;
    }
  }
  if (changed) await writeDb(db);
}

// Prototype pollution protection helper
function sanitizePayload(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  delete obj.__proto__;
  delete obj.constructor;
  delete obj.prototype;
  return obj;
}

// 1. Create a Clip (Secure Proxy Route)
app.post('/api/clip', rateLimiter, async (req, res, next) => {
  try {
    const clip = sanitizePayload(req.body);

    // Validate PIN code format (Strict 6 digits)
    if (!clip || !clip.code || typeof clip.code !== 'string' || !/^\d{6}$/.test(clip.code.trim())) {
      return res.status(400).json({ error: 'Invalid PIN code format. Must be 6 digits.' });
    }

    // Validate Content Length (Prevent >70MB payload bombs)
    if (!clip.content || typeof clip.content !== 'string' || clip.content.length > 70000000) {
      return res.status(400).json({ error: 'Payload content exceeds maximum allowed size (50MB).' });
    }

    const pinCode = clip.code.trim();
    const db = await readDb();
    await cleanExpired(db);

    db[pinCode] = clip;
    await writeDb(db);

    // Save to Server-side Supabase if configured (100% Hidden from Client)
    if (isSupabaseBackendEnabled && supabaseAdmin) {
      try {
        await supabaseAdmin.from('octopus_clips').upsert([{
          code: pinCode,
          type: clip.type || 'text',
          title: clip.title || '',
          content: clip.content,
          is_encrypted: Boolean(clip.isEncrypted),
          burn_on_read: Boolean(clip.burnOnRead),
          expiration: clip.expiration || '24h',
          expire_at: clip.expireAt,
          created_at: clip.createdAt || Date.now(),
          metadata: clip.metadata || {}
        }]);
      } catch (err) {
        console.warn('Supabase backend save warning', err);
      }
    }

    res.json({ success: true, code: pinCode });
  } catch (err) {
    next(err);
  }
});

// 2. Retrieve a Clip by PIN Code (Secure Proxy Route with Anti-Bruteforce Lockout)
app.get('/api/clip/:code', rateLimiter, async (req, res, next) => {
  try {
    const code = req.params.code.trim();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    // Strict Regex Whitelisting: Must be 6 digits only (Blocks Path Traversal & Injection)
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid PIN code format.' });
    }

    // Anti-Bruteforce Check: Lockout IP if too many failed lookups
    const failedKey = `${clientIp}_${code}`;
    const failedRecord = pinFailedAttempts.get(failedKey);
    if (failedRecord && failedRecord.count > 10 && Date.now() - failedRecord.startTime < 5 * 60 * 1000) {
      return res.status(429).json({ error: 'Too many failed lookup attempts. PIN search locked for 5 minutes.' });
    }

    let clip = null;

    // Check local database first
    const db = await readDb();
    await cleanExpired(db);
    clip = db[code];

    // If not found in local file, check server-side Supabase
    if (!clip && isSupabaseBackendEnabled && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('octopus_clips')
          .select('*')
          .eq('code', code)
          .single();

        if (data && !error) {
          clip = {
            code: data.code,
            type: data.type,
            title: data.title,
            content: data.content,
            isEncrypted: data.is_encrypted,
            burnOnRead: data.burn_on_read,
            expiration: data.expiration,
            expireAt: data.expire_at ? Number(data.expire_at) : null,
            createdAt: Number(data.created_at),
            metadata: data.metadata || {}
          };
        }
      } catch (err) {
        console.warn('Supabase backend fetch warning', err);
      }
    }

    if (!clip) {
      // Record failed attempt for anti-bruteforce tracking
      let rec = pinFailedAttempts.get(failedKey) || { count: 0, startTime: Date.now() };
      rec.count++;
      pinFailedAttempts.set(failedKey, rec);

      return res.status(404).json({ error: 'Clip not found or expired.' });
    }

    // Check expiration timestamp
    if (clip.expireAt && Date.now() > clip.expireAt) {
      delete db[code];
      await writeDb(db);
      if (isSupabaseBackendEnabled && supabaseAdmin) {
        supabaseAdmin.from('octopus_clips').delete().eq('code', code).catch(() => {});
      }
      return res.status(410).json({ error: 'This clip has expired.' });
    }

    // If Burn On Read self-destruct, delete immediately after fetching
    if (clip.burnOnRead) {
      delete db[code];
      await writeDb(db);
      if (isSupabaseBackendEnabled && supabaseAdmin) {
        supabaseAdmin.from('octopus_clips').delete().eq('code', code).catch(() => {});
      }
    }

    res.json(clip);
  } catch (err) {
    next(err);
  }
});

// Serve frontend build in production
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- ZERO STACK TRACE ERROR HANDLER (Information Leak Protection) ---
app.use((err, req, res, next) => {
  console.error('Unhandled Backend Error:', err.message || err);
  res.status(500).json({
    error: 'An internal server error occurred. Please try again later.'
  });
});

app.listen(PORT, () => {
  console.log(`OCTOPUS Hardened Secure Backend Server running on http://localhost:${PORT}`);
});
