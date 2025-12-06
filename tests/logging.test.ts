
import { describe, it, expect, vi } from 'vitest';
import { BufferedLogger, StructuredLogger } from '../src/context-engine/observability/Logger';

describe('Logging', () => {
    it('BufferedLogger should capture logs', () => {
        const logger = new BufferedLogger();
        logger.info('Test Info', { foo: 'bar' });
        logger.error('Test Error', new Error('oops'), { baz: 'qux' });

        expect(logger.logs).toHaveLength(2);
        expect(logger.logs[0]).toMatchObject({
            level: 'info',
            message: 'Test Info',
            context: { foo: 'bar' }
        });
        expect(logger.logs[1]).toMatchObject({
            level: 'error',
            message: 'Test Error',
            context: { baz: 'qux', error: expect.any(Error) }
        });
    });

    it('StructuredLogger should filter levels', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const logger = new StructuredLogger('warn'); // minLevel = warn

        logger.info('Should be ignored');
        logger.warn('Should be logged');

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"Should be logged"'));

        consoleLogSpy.mockRestore();
    });

    it('StructuredLogger should output JSON', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const logger = new StructuredLogger('info', 'test-service');

        logger.info('JSON Test', { userId: '123' });

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"service":"test-service"'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"level":"info"'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"message":"JSON Test"'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"userId":"123"'));

        consoleLogSpy.mockRestore();
    });
});
