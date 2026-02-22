import pino from 'pino';

/**
 * Structured logger with redaction of sensitive fields.
 * Uses pino for high-performance JSON logging.
 */
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
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
});

export default logger;
