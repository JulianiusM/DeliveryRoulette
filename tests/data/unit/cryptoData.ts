/**
 * Test data for crypto helper module unit tests.
 */

export const encryptionSecret = 'test-secret-key-for-unit-tests';
export const alternateSecret = 'different-secret-key-for-tests';

// ── encrypt + decrypt round-trip test data ───────────────────

export const roundTripData = [
    {
        description: 'encrypts and decrypts a simple string',
        plaintext: 'my-api-key-12345',
    },
    {
        description: 'encrypts and decrypts an empty string',
        plaintext: '',
    },
    {
        description: 'encrypts and decrypts a long secret',
        plaintext: 'a'.repeat(1000),
    },
    {
        description: 'encrypts and decrypts unicode characters',
        plaintext: 'pässwörd-über-sëcret-🔑',
    },
    {
        description: 'encrypts and decrypts JSON content',
        plaintext: '{"clientId":"abc","clientSecret":"xyz-123"}',
    },
    {
        description: 'encrypts and decrypts special characters',
        plaintext: '!@#$%^&*()_+-=[]{}|;:,.<>?/~`',
    },
];

// ── uniqueness test data ─────────────────────────────────────

export const uniquenessInputs = [
    'same-plaintext',
    'same-plaintext',
];

// ── wrong key test data ──────────────────────────────────────

export const wrongKeyData = [
    {
        description: 'fails to decrypt with wrong key',
        plaintext: 'secret-value',
        encryptSecret: encryptionSecret,
        decryptSecret: alternateSecret,
    },
];

// ── malformed payload test data ──────────────────────────────

export const malformedPayloadData = [
    {
        description: 'rejects empty string payload',
        encoded: '',
    },
    {
        description: 'rejects too-short base64 payload',
        encoded: Buffer.from('short').toString('base64'),
    },
    {
        description: 'rejects random base64 with correct length but bad data',
        // 12 (iv) + 16 (tag) + 1 (ciphertext) = 29 bytes min
        encoded: Buffer.from('a'.repeat(30)).toString('base64'),
    },
];

// ── redactSecrets test data ──────────────────────────────────

export const redactData = [
    {
        description: 'redacts a single secret from text',
        text: 'API key is sk-12345 for this service',
        secrets: ['sk-12345'],
        expected: 'API key is [REDACTED] for this service',
    },
    {
        description: 'redacts multiple secrets from text',
        text: 'user=admin password=s3cret token=abc123',
        secrets: ['s3cret', 'abc123'],
        expected: 'user=admin password=[REDACTED] token=[REDACTED]',
    },
    {
        description: 'redacts repeated occurrences',
        text: 'key=secret and also key=secret again',
        secrets: ['secret'],
        expected: 'key=[REDACTED] and also key=[REDACTED] again',
    },
    {
        description: 'returns original text when no secrets match',
        text: 'nothing sensitive here',
        secrets: ['xyz'],
        expected: 'nothing sensitive here',
    },
    {
        description: 'handles empty secrets array',
        text: 'some text',
        secrets: [],
        expected: 'some text',
    },
    {
        description: 'skips empty string secrets',
        text: 'some text',
        secrets: [''],
        expected: 'some text',
    },
    {
        description: 'handles secrets with regex special characters',
        text: 'key is abc.def*ghi',
        secrets: ['abc.def*ghi'],
        expected: 'key is [REDACTED]',
    },
];
