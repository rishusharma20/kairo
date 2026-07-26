import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  let keyString = process.env.GEMINI_ENCRYPTION_KEY;
  if (process.env.NODE_ENV === 'production' && !keyString) {
    throw new Error('Missing GEMINI_ENCRYPTION_KEY in production.');
  }
  if (!keyString) {
    keyString = '00000000000000000000000000000000'; // 32 bytes fallback for development
  }
  if (keyString.length !== 32) {
    throw new Error('GEMINI_ENCRYPTION_KEY must be exactly 32 characters long.');
  }
  return Buffer.from(keyString, 'utf-8');
}

export function encryptKey(text: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptKey(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // Fallback: If it's not encrypted (e.g. legacy data), return as-is, BUT log a warning.
    // In strict mode, we should throw, but since we are migrating from plaintext, we handle both.
    if (encryptedText.startsWith('AIza')) {
      return encryptedText; 
    }
    throw new Error('Invalid encrypted text format');
  }
  
  const [ivHex, authTagHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
