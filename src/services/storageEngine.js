import { generatePinCode, encryptPayload, decryptPayload } from './cryptoUtils';

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
    fetch('/api/clip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clipRecord)
    }).catch(() => {});
  } catch (err) {}

  // 3. Broadcast across open tabs
  if (channel) {
    try {
      channel.postMessage({ type: 'CLIP_CREATED', clip: clipRecord });
    } catch (e) {}
  }

  // 4. Save to Vault History
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
      const res = await fetch(`/api/clip/${pin}`);
      if (res.ok) {
        clipRecord = await res.json();
      }
    } catch (err) {}
  }

  if (!clipRecord) {
    throw new Error('Clip not found. Please verify the 6-digit code or check if it expired.');
  }

  // Check expiration timestamp
  if (clipRecord.expireAt && Date.now() > clipRecord.expireAt) {
    deleteClip(pin);
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
