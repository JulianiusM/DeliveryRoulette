import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Derive a 32-byte encryption key from the raw secret.
 * Uses SHA-256 so any-length passphrase maps to a valid AES-256 key.
 */
function deriveKey(secret: string): Buffer {
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns a single base64 string containing iv + authTag + ciphertext.
 */
export function encrypt(plaintext: string, secret: string): string {
    const key = deriveKey(secret);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Pack: iv (12) + tag (16) + ciphertext
    const packed = Buffer.concat([iv, tag, encrypted]);
    return packed.toString('base64');
}

/**
 * Decrypt a value previously produced by `encrypt()`.
 * Throws on invalid key, tampered data, or malformed input.
 */
export function decrypt(encoded: string, secret: string): string {
    const key = deriveKey(secret);
    const packed = Buffer.from(encoded, 'base64');

    if (packed.length < IV_LENGTH + TAG_LENGTH) {
        throw new Error('Invalid encrypted payload');
    }

    const iv = packed.subarray(0, IV_LENGTH);
    const tag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
}

/**
 * Redact sensitive values from a string.
 * Replaces any occurrence of the provided secrets with '[REDACTED]'.
 */
export function redactSecrets(text: string, secrets: string[]): string {
    let result = text;
    for (const secret of secrets) {
        if (secret.length === 0) continue;
        // Escape special regex characters in the secret
        const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        result = result.replace(new RegExp(escaped, 'g'), '[REDACTED]');
    }
    return result;
}
