/**
 * Unit tests for the crypto helper module.
 * Tests encryption/decryption round-trips, uniqueness, error handling, and secret redaction.
 */
import {encrypt, decrypt, redactSecrets} from '../../src/modules/lib/crypto';
import {
    encryptionSecret,
    roundTripData,
    uniquenessInputs,
    wrongKeyData,
    malformedPayloadData,
    redactData,
} from '../data/unit/cryptoData';

describe('crypto helper', () => {
    describe('encrypt + decrypt round-trip', () => {
        test.each(roundTripData)('$description', ({plaintext}) => {
            const encrypted = encrypt(plaintext, encryptionSecret);
            const decrypted = decrypt(encrypted, encryptionSecret);
            expect(decrypted).toBe(plaintext);
        });
    });

    describe('encryption output properties', () => {
        test('produces base64-encoded output', () => {
            const encrypted = encrypt('test', encryptionSecret);
            expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
            // Re-encode to verify it's valid base64
            const buf = Buffer.from(encrypted, 'base64');
            expect(buf.toString('base64')).toBe(encrypted);
        });

        test('produces unique ciphertexts for the same plaintext (random IV)', () => {
            const [a, b] = uniquenessInputs.map((p) => encrypt(p, encryptionSecret));
            expect(a).not.toBe(b);
        });
    });

    describe('decryption with wrong key', () => {
        test.each(wrongKeyData)('$description', ({plaintext, encryptSecret, decryptSecret}) => {
            const encrypted = encrypt(plaintext, encryptSecret);
            expect(() => decrypt(encrypted, decryptSecret)).toThrow();
        });
    });

    describe('malformed payload handling', () => {
        test.each(malformedPayloadData)('$description', ({encoded}) => {
            expect(() => decrypt(encoded, encryptionSecret)).toThrow();
        });
    });

    describe('redactSecrets', () => {
        test.each(redactData)('$description', ({text, secrets, expected}) => {
            expect(redactSecrets(text, secrets)).toBe(expected);
        });
    });
});
