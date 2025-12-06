
/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Logger Interface
 */
export interface Logger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void;
}

/**
 * Buffered Logger for testing or strict environments
 */
export class BufferedLogger implements Logger {
    public logs: Array<{ level: LogLevel; message: string; context?: any; timestamp: Date }> = [];

    debug(message: string, context?: Record<string, unknown>) {
        this.logs.push({ level: 'debug', message, context, timestamp: new Date() });
    }
    info(message: string, context?: Record<string, unknown>) {
        this.logs.push({ level: 'info', message, context, timestamp: new Date() });
    }
    warn(message: string, context?: Record<string, unknown>) {
        this.logs.push({ level: 'warn', message, context, timestamp: new Date() });
    }
    error(message: string, error?: unknown, context?: Record<string, unknown>) {
        this.logs.push({ level: 'error', message, context: { ...context, error }, timestamp: new Date() });
    }
}

/**
 * Structured JSON Logger (Production ready)
 */
export class StructuredLogger implements Logger {
    constructor(
        private minLevel: LogLevel = 'info',
        private serviceName: string = 'context-engine'
    ) { }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.minLevel);
    }

    private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
        if (!this.shouldLog(level)) return;

        const entry = {
            timestamp: new Date().toISOString(),
            service: this.serviceName,
            level,
            message,
            ...context,
            ...(error ? { error: error instanceof Error ? { message: error.message, stack: error.stack } : error } : {})
        };

        // In a real env, this might pipe to a stream or file. 
        // For now, we print to stdout/stderr.
        const output = JSON.stringify(entry);
        if (level === 'error') {
            console.error(output);
        } else {
            console.log(output);
        }
    }

    debug(message: string, context?: Record<string, unknown>) { this.log('debug', message, context); }
    info(message: string, context?: Record<string, unknown>) { this.log('info', message, context); }
    warn(message: string, context?: Record<string, unknown>) { this.log('warn', message, context); }
    error(message: string, error?: unknown, context?: Record<string, unknown>) { this.log('error', message, context, error); }
}

// Default Global Logger instance (can be replaced by DI)
export const defaultLogger = new StructuredLogger(
    (process.env.LOG_LEVEL as LogLevel) || 'info'
);
