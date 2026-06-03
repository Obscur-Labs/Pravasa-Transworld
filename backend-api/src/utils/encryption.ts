import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// For AES-256, the key needs to be exactly 32 bytes (256 bits).
// We hash the environment secret to ensure it's always exactly 32 bytes regardless of what is provided.
const getSecretKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || 'default-insecure-dev-key';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

/**
 * Encrypts a string using AES-256-GCM.
 * The output format is: enc:iv(hex):authTag(hex):encrypted(hex)
 */
export function encryptData(text: string): string {
  if (!text || text.startsWith('enc:')) {
    return text; // Return as is if already encrypted or empty
  }

  const iv = crypto.randomBytes(16);
  const key = getSecretKey();
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string that was encrypted using encryptData.
 * Returns the original string if decryption fails or if it wasn't encrypted.
 */
export function decryptData(text: string): string {
  if (!text || !text.startsWith('enc:')) {
    return text; // Not encrypted
  }

  try {
    const parts = text.split(':');
    if (parts.length !== 4) return text;

    const [, ivHex, authTagHex, encryptedHex] = parts;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getSecretKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption failed for data:', err);
    return text; // Fallback to returning original ciphertext if decryption completely fails
  }
}
