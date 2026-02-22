/**
 * Enhanced Logger with PII Redaction and Trace Context
 * 
 * Production-safe logger that:
 * - Redacts sensitive PII (email, phone, credit card, etc.)
 * - Includes trace context (requestId, correlationId)
 * - Supports structured logging
 */

import { type TraceContext } from './observability/tracing';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    traceContext?: Partial<TraceContext>;
    [key: string]: any;
}

/**
 * PII patterns to redact
 */
const PII_PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
    ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g
};

/**
 * Redact PII from string
 * 
 * @param value - String that may contain PII
 * @returns Redacted string
 */
function redactPII(value: string): string {
    let redacted = value;

    // Redact email
    redacted = redacted.replace(PII_PATTERNS.email, (match) => {
        const [local, domain] = match.split('@');
        const localRedacted = local.length > 2
            ? local[0] + '***' + local[local.length - 1]
            : '***';
        return `${localRedacted}@${domain}`;
    });

    // Redact phone
    redacted = redacted.replace(PII_PATTERNS.phone, '***-***-****');

    // Redact credit card
    redacted = redacted.replace(PII_PATTERNS.creditCard, (match) => {
        const digits = match.replace(/\D/g, '');
        return `****-****-****-${digits.slice(-4)}`;
    });

    // Redact SSN
    redacted = redacted.replace(PII_PATTERNS.ssn, '***-**-****');

    // Redact IP (keep first octet for debugging)
    redacted = redacted.replace(PII_PATTERNS.ipAddress, (match) => {
        const octets = match.split('.');
        return `${octets[0]}.*.*.*`;
    });

    return redacted;
}

/**
 * Redact PII from object
 * 
 * Recursively walks object and redacts PII from string values.
 * 
 * @param obj - Object that may contain PII
 * @returns Redacted object
 */
function redactPIIFromObject(obj: any): any {
    if (typeof obj === 'string') {
        return redactPII(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(redactPIIFromObject);
    }

    if (obj !== null && typeof obj === 'object') {
        const redacted: any = {};
        for (const [key, value] of Object.entries(obj)) {
            // Always redact sensitive keys completely
            if (['password', 'token', 'apiKey', 'secret', 'authorization'].includes(key.toLowerCase())) {
                redacted[key] = '***REDACTED***';
            } else {
                redacted[key] = redactPIIFromObject(value);
            }
        }
        return redacted;
    }

    return obj;
}

/**
 * Logger class
 */
class Logger {
    private isDevelopment = process.env.NODE_ENV !== 'production';

    private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
        const entry: LogEntry = {
            level,
            message: this.isDevelopment ? message : redactPII(message),
            timestamp: new Date().toISOString(),
            ...(this.isDevelopment ? meta : redactPIIFromObject(meta))
        };

        // In development, pretty print
        if (this.isDevelopment) {
            const color = {
                info: '\x1b[36m',    // Cyan
                warn: '\x1b[33m',    // Yellow
                error: '\x1b[31m',   // Red
                debug: '\x1b[90m'    // Gray
            }[level];

            console.log(
                `${color}[${level.toUpperCase()}]\x1b[0m`,
                entry.timestamp,
                message,
                meta ? JSON.stringify(meta, null, 2) : ''
            );
        } else {
            // In production, output structured JSON
            console.log(JSON.stringify(entry));
        }
    }

    info(message: string, meta?: Record<string, any>): void {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: Record<string, any>): void {
        this.log('warn', message, meta);
    }

    error(message: string, meta?: Record<string, any>): void {
        this.log('error', message, meta);
    }

    debug(message: string, meta?: Record<string, any>): void {
        if (this.isDevelopment) {
            this.log('debug', message, meta);
        }
    }

    /**
     * Create child logger with trace context
     * 
     * All log entries will include trace context automatically.
     * 
     * @param traceContext - Trace context to include
     * @returns Child logger
     */
    withTrace(traceContext: TraceContext): Logger {
        const childLogger = new Logger();
        const originalLog = childLogger.log.bind(childLogger);

        childLogger.log = (level: LogLevel, message: string, meta?: Record<string, any>) => {
            originalLog(level, message, {
                ...meta,
                traceContext: {
                    requestId: traceContext.requestId,
                    correlationId: traceContext.correlationId,
                    spanId: traceContext.spanId
                }
            });
        };

        return childLogger;
    }
}

// Export singleton
export const logger = new Logger();
