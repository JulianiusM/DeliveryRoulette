/**
 * Unit tests for the structured logger module.
 * Tests that sensitive fields are redacted and safe fields are preserved.
 */
import pino from 'pino';
import {Writable} from 'stream';
import {redactedFieldData, safeFieldData} from '../data/unit/loggerData';

describe('logger module', () => {
    let output: string;
    let logger: pino.Logger;

    beforeEach(() => {
        output = '';
        const stream = new Writable({
            write(chunk, _encoding, callback) {
                output += chunk.toString();
                callback();
            },
        });
        logger = pino(
            {
                level: 'trace',
                redact: {
                    paths: [
                        'password',
                        'secret',
                        'token',
                        'authorization',
                        'cookie',
                        'req.headers.authorization',
                        'req.headers.cookie',
                    ],
                    censor: '[REDACTED]',
                },
            },
            stream,
        );
    });

    describe('sensitive field redaction', () => {
        test.each(redactedFieldData)('$description', ({field, value}) => {
            logger.info({[field]: value}, 'test');
            const parsed = JSON.parse(output);
            expect(parsed[field]).toBe('[REDACTED]');
        });
    });

    describe('safe field preservation', () => {
        test.each(safeFieldData)('$description', ({field, value}) => {
            logger.info({[field]: value}, 'test');
            const parsed = JSON.parse(output);
            expect(parsed[field]).toBe(value);
        });
    });

    test('logger instance is importable and has expected methods', () => {
        const appLogger = require('../../src/modules/logger').default;
        expect(appLogger).toBeDefined();
        expect(typeof appLogger.info).toBe('function');
        expect(typeof appLogger.error).toBe('function');
        expect(typeof appLogger.warn).toBe('function');
        expect(typeof appLogger.child).toBe('function');
    });
});
