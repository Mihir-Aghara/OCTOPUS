import { generatePinCode, encryptPayload, decryptPayload } from './cryptoUtils';
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env?.VITE_API_URL || '';
const STORAGE_PREFIX = 'octopus_clip_';
const VAULT_KEY = 'octopus_vault_history';
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('octopus_sync_channel') : null;

// Synchronous in-memory cache map
const inMemoryClips = new Map();

/**
 * Safe LocalStorage setter with quota eviction fallback
 */
function safeSetLocalStorage(key, value) {
  try {
    // Avoid saving very large files (>2MB) to localStorage to prevent quota crashes
    if (value && value.length > 2500000) {
      return;
    }
    localStorage.setItem(key, value);
  } catch (err) {
    if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      // Storage full: Purge oldest octopus clips from localStorage to free up space
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX) && k !== key) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.slice(0, 5).forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(key, value);
      } catch (innerErr) {
        console.warn('LocalStorage quota limit reached; saved in-memory cache only.', innerErr);
      }
    }
  }
}

/**
 * Save a new clip to OCTOPUS via Secure Backend Proxy Route (/api/clip)
 * Client bundle contains 0 database keys or credentials!
 */
export async function saveClip({
  type = 'text',
  content,
  title = '',
  passcode = '',
  burnOnRead = false,
  expiration = '24h',
  metadata = {}
}) {
  const pinCode = generatePinCode();
  const createdAt = Date.now();
  let expireAt = null;

  switch (expiration) {
    case '10m':
      expireAt = createdAt + 10 * 60 * 1000;
      break;
    case '1h':
      expireAt = createdAt + 60 * 60 * 1000;
      break;
    case '24h':
      expireAt = createdAt + 24 * 60 * 60 * 1000;
      break;
    case '7d':
      expireAt = createdAt + 7 * 24 * 60 * 60 * 1000;
      break;
    case 'never':
    default:
      expireAt = null;
      break;
  }

  // AES-256 Client-Side Encryption: Secret Passcodes are NEVER sent to the server!
  const isEncrypted = Boolean(passcode);
  const payloadToStore = isEncrypted ? encryptPayload(content, passcode) : content;

  const clipRecord = {
    code: pinCode,
    type,
    title: title || (type === 'file' ? metadata.fileName : `Clip #${pinCode}`),
    content: payloadToStore,
    rawContent: content,
    isEncrypted,
    burnOnRead,
    expiration,
    expireAt,
    createdAt,
    metadata,
    viewsCount: 0
  };

  // 1. Local Memory & LocalStorage
  const key = STORAGE_PREFIX + pinCode;
  inMemoryClips.set(pinCode, clipRecord);
  safeSetLocalStorage(key, JSON.stringify(clipRecord));

  // 2. Send payload to Secure Backend Proxy Route (/api/clip)
  try {
    const res = await fetch(`${API_BASE}/api/clip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: pinCode,
        type,
        title: clipRecord.title,
        content: payloadToStore,
        isEncrypted,
        burnOnRead,
        expiration,
        expireAt,
        createdAt,
        metadata
      })
    });
    if (!res.ok) {
      console.warn('Backend proxy responded with status:', res.status);
    }
  } catch (err) {
    console.warn('Backend proxy unreachable, falling back to local/cloud storage:', err);
  }

  // 3. Optional Supabase Cloud Sync (if configured on client)
  if (supabase) {
    try {
      await supabase.from('octopus_clips').upsert([{
        code: pinCode,
        type,
        title: clipRecord.title,
        content: payloadToStore,
        is_encrypted: isEncrypted,
        burn_on_read: burnOnRead,
        expiration,
        expire_at: expireAt,
        created_at: createdAt,
        metadata
      }]);
    } catch (err) {
      console.warn('Supabase client save warning:', err);
    }
  }

  // 4. Broadcast across open tabs
  if (channel) {
    try {
      channel.postMessage({ type: 'CLIP_CREATED', clip: clipRecord });
    } catch (e) {}
  }

  // 5. Save to Vault History
  addToVault({
    code: pinCode,
    type,
    title: clipRecord.title,
    createdAt,
    isEncrypted,
    expiration,
    expireAt,
    preview: typeof content === 'string' ? content.substring(0, 80) : '[Attachment]'
  });

  return clipRecord;
}

/**
 * Retrieve a clip by 6-digit code via Secure Proxy API (/api/clip/:code)
 */
export async function getClip(code, passcode = '') {
  const pin = code.trim();
  const key = STORAGE_PREFIX + pin;
  let clipRecord = null;

  // Tier 1: In-Memory Cache (0ms)
  if (inMemoryClips.has(pin)) {
    clipRecord = inMemoryClips.get(pin);
  }

  // Tier 2: LocalStorage
  if (!clipRecord) {
    let rawData = localStorage.getItem(key);
    if (rawData) {
      try {
        clipRecord = JSON.parse(rawData);
      } catch (e) {}
    }
  }

  // Tier 3: Secure Backend Proxy API (/api/clip/:code)
  if (!clipRecord) {
    try {
      const res = await fetch(`${API_BASE}/api/clip/${pin}`);
      if (res.ok) {
        clipRecord = await res.json();
      }
    } catch (err) {
      console.warn('Backend proxy fetch failed:', err);
    }
  }

  // Tier 4: Direct Supabase Cloud Fetch (if configured)
  if (!clipRecord && supabase) {
    try {
      const { data, error } = await supabase
        .from('octopus_clips')
        .select('*')
        .eq('code', pin)
        .single();

      if (data && !error) {
        clipRecord = {
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
      console.warn('Supabase client fetch warning:', err);
    }
  }

  if (!clipRecord) {
    throw new Error('Clip not found. Please verify the 6-digit code or check if it expired.');
  }

  // Check expiration timestamp
  if (clipRecord.expireAt && Date.now() > Number(clipRecord.expireAt)) {
    deleteClip(pin);
    if (supabase) {
      supabase.from('octopus_clips').delete().eq('code', pin).catch(() => {});
    }
    throw new Error('This clip has expired and is no longer available.');
  }

  // AES-256 Client-Side Decryption: Occurs ONLY inside recipient browser!
  let finalContent = clipRecord.rawContent || clipRecord.content;
  if (clipRecord.isEncrypted) {
    if (!passcode) {
      return {
        requiresPasscode: true,
        code: pin,
        type: clipRecord.type,
        title: clipRecord.title
      };
    }
    const decrypted = decryptPayload(clipRecord.content, passcode);
    if (decrypted === null) {
      throw new Error('Incorrect passcode. Please try again.');
    }
    finalContent = decrypted;
  }

  // Update view count
  clipRecord.viewsCount = (clipRecord.viewsCount || 0) + 1;

  // Handle Burn On Read self-destruct
  if (clipRecord.burnOnRead) {
    deleteClip(pin);
    if (supabase) {
      supabase.from('octopus_clips').delete().eq('code', pin).catch(() => {});
    }
  } else {
    safeSetLocalStorage(key, JSON.stringify(clipRecord));
  }

  // Add to vault history
  addToVault({
    code: pin,
    type: clipRecord.type,
    title: clipRecord.title,
    createdAt: clipRecord.createdAt,
    isEncrypted: clipRecord.isEncrypted,
    expiration: clipRecord.expiration,
    expireAt: clipRecord.expireAt,
    preview: typeof finalContent === 'string' ? finalContent.substring(0, 80) : '[Attachment]'
  });

  return {
    ...clipRecord,
    content: finalContent,
    requiresPasscode: false
  };
}

/**
 * Delete a clip
 */
export function deleteClip(code) {
  const pin = code.trim();
  const key = STORAGE_PREFIX + pin;
  localStorage.removeItem(key);
  inMemoryClips.delete(pin);

  if (channel) {
    try {
      channel.postMessage({ type: 'CLIP_DELETED', code: pin });
    } catch (e) {}
  }
}

/**
 * Vault History Management
 */
export function getVaultHistory() {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addToVault(item) {
  try {
    const history = getVaultHistory();
    const filtered = history.filter((h) => h.code !== item.code);
    const updated = [item, ...filtered].slice(0, 20);
    safeSetLocalStorage(VAULT_KEY, JSON.stringify(updated));
  } catch (e) {}
}

export function clearVaultHistory() {
  localStorage.removeItem(VAULT_KEY);
}
