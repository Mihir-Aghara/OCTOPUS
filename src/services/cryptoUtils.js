import CryptoJS from 'crypto-js';

/**
 * Generate a random 6-digit pin code
 */
export function generatePinCode() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

/**
 * AES-256 Encrypt text or payload with passcode
 */
export function encryptPayload(content, passcode) {
  if (!passcode) return content;
  return CryptoJS.AES.encrypt(JSON.stringify(content), passcode).toString();
}

/**
 * AES-256 Decrypt ciphertext with passcode
 */
export function decryptPayload(ciphertext, passcode) {
  if (!passcode) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, passcode);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedData) return null;
    return JSON.parse(decryptedData);
  } catch (err) {
    return null;
  }
}

/**
 * Auto-detect programming language for text
 */
export function detectLanguage(code) {
  if (!code || typeof code !== 'string') return 'plaintext';
  const str = code.trim();

  if (str.startsWith('{') || str.startsWith('[')) {
    try {
      JSON.parse(str);
      return 'json';
    } catch (e) {}
  }
  if (/<[a-z][\s\S]*>/i.test(str)) return 'html';
  if (/import\s+.*\s+from|const\s+.*=|function\s+\w+\(|export\s+default/i.test(str)) return 'javascript';
  if (/def\s+\w+\(|import\s+\w+|class\s+\w+:|print\(/i.test(str)) return 'python';
  if (/#include\s+<|int\s+main\(\)|std::/i.test(str)) return 'cpp';
  if (/public\s+class\s+\w+|System\.out\.println/i.test(str)) return 'java';
  if (/SELECT\s+.*\s+FROM|INSERT\s+INTO|UPDATE\s+.*\s+SET/i.test(str)) return 'sql';

  return 'plaintext';
}
