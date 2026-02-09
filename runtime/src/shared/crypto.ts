/**
 * Encryption utilities for storing secrets
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }
  // Key should be 32 bytes hex encoded (64 chars)
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a string value
 * Returns: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
 */
export function encrypt(plaintext: string): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  
  // Concatenate: IV + AuthTag + Ciphertext
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer
 * Expects: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
 */
export function decrypt(data: Buffer): string {
  const key = getEncryptionKey();
  
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Hash a value (for result hashes, etc.)
 */
export function hash(data: string | Buffer): string {
  return '0x' + crypto.createHash('sha256').update(data).digest('hex');
}
