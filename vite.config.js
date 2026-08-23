import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(__dirname, 'clips_db.json');
const MAX_DB_RECORDS = 5000;

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({}));
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data || '{}');
  } catch (e) {
    return {};
  }
}

function writeDb(db) {
  try {
    const keys = Object.keys(db);
    if (keys.length > MAX_DB_RECORDS) {
      const sortedKeys = keys.sort((a, b) => (db[a].createdAt || 0) - (db[b].createdAt || 0));
      const overflowCount = keys.length - MAX_DB_RECORDS;
      for (let i = 0; i < overflowCount; i++) {
        delete db[sortedKeys[i]];
      }
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {}
}

function cleanExpired(db) {
  const now = Date.now();
  let changed = false;
  for (const code in db) {
    if (db[code].expireAt && now > db[code].expireAt) {
      delete db[code];
      changed = true;
    }
  }
  if (changed) writeDb(db);
}

// Dev Rate Limiter & PIN Lockout
const devIpCounts = new Map();
const devPinFailed = new Map();
const DEV_WINDOW = 60 * 1000;
const DEV_MAX = 40;

function isRateLimited(ip) {
  const now = Date.now();
  let rec = devIpCounts.get(ip);
  if (!rec || now - rec.start > DEV_WINDOW) {
    rec = { count: 1, start: now };
  } else {
    rec.count++;
  }
  devIpCounts.set(ip, rec);
  return rec.count > DEV_MAX;
}

// Prototype pollution helper
function sanitizePayload(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  delete obj.__proto__;
  delete obj.constructor;
  delete obj.prototype;
  return obj;
}

// Custom Vite middleware plugin with hardened backend security
function octopusApiPlugin() {
  return {
    name: 'octopus-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Set Hardened Security Headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        const clientIp = req.socket.remoteAddress || '127.0.0.1';

        // Handle POST /api/clip
        if (req.method === 'POST' && req.url === '/api/clip') {
          if (isRateLimited(clientIp)) {
            res.statusCode = 429;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Rate limit exceeded. Please wait a minute.' }));
            return;
          }

          let body = '';
          req.on('data', chunk => {
            body += chunk;
            if (body.length > 5000000) { // 5MB payload limit
              res.statusCode = 413;
              res.end(JSON.stringify({ error: 'Payload size exceeds 5MB limit.' }));
              req.destroy();
            }
          });

          req.on('end', () => {
            try {
              const clip = sanitizePayload(JSON.parse(body));
              if (!clip || !clip.code || typeof clip.code !== 'string' || !/^\d{6}$/.test(clip.code.trim())) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid PIN code format. Must be 6 digits.' }));
                return;
              }
              const db = readDb();
              cleanExpired(db);
              db[clip.code.trim()] = clip;
              writeDb(db);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, code: clip.code.trim() }));
            } catch (err) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
          });
          return;
        }

        // Handle GET /api/clip/:code
        if (req.method === 'GET' && req.url.startsWith('/api/clip/')) {
          if (isRateLimited(clientIp)) {
            res.statusCode = 429;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Rate limit exceeded.' }));
            return;
          }

          const code = req.url.replace('/api/clip/', '').trim();
          
          // Strict Regex Whitelisting: 6 digits only
          if (!/^\d{6}$/.test(code)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid PIN code format.' }));
            return;
          }

          const failedKey = `${clientIp}_${code}`;
          const failedRecord = devPinFailed.get(failedKey);
          if (failedRecord && failedRecord.count > 10 && Date.now() - failedRecord.start < 5 * 60 * 1000) {
            res.statusCode = 429;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'PIN search locked due to repeated failed attempts.' }));
            return;
          }

          const db = readDb();
          cleanExpired(db);

          const clip = db[code];
          res.setHeader('Content-Type', 'application/json');

          if (!clip) {
            let rec = devPinFailed.get(failedKey) || { count: 0, start: Date.now() };
            rec.count++;
            devPinFailed.set(failedKey, rec);

            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Clip not found or expired.' }));
            return;
          }

          if (clip.expireAt && Date.now() > clip.expireAt) {
            delete db[code];
            writeDb(db);
            res.statusCode = 410;
            res.end(JSON.stringify({ error: 'This clip has expired.' }));
            return;
          }

          if (clip.burnOnRead) {
            delete db[code];
            writeDb(db);
          }

          res.end(JSON.stringify(clip));
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), octopusApiPlugin()],
  server: {
    port: 3000,
    host: true
  }
});
