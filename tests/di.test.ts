
import { describe, it, expect } from 'vitest';
import { Container } from '../src/context-engine/di/Container';

describe('DI Container', () => {
    it('should register and resolve values', () => {
        const container = new Container();
        container.registerValue('config', { key: 'value' });

        expect(container.resolve('config')).toEqual({ key: 'value' });
    });

    it('should register and resolve singletons', () => {
        const container = new Container();
        let count = 0;

        container.registerSingleton('counter', () => {
            count++;
            return { count };
        });

        const instance1 = container.resolve<{ count: number }>('counter');
        const instance2 = container.resolve<{ count: number }>('counter');

        expect(instance1).toBe(instance2);
        expect(instance1.count).toBe(1);
        expect(count).toBe(1);
    });

    it('should register and resolve transients', () => {
        const container = new Container();

        container.registerTransient('random', () => Math.random());

        const val1 = container.resolve<number>('random');
        const val2 = container.resolve<number>('random');

        expect(val1).not.toBe(val2);
    });

    it('should throw if service not found', () => {
        const container = new Container();
        expect(() => container.resolve('unknown')).toThrowError(/Service not registered/);
    });

    it('should resolve dependencies', () => {
        const container = new Container();

        class Logger {
            log(msg: string) { return `logged ${msg}`; }
        }

        class Service {
            constructor(public logger: Logger) { }
        }

        container.registerSingleton('Logger', () => new Logger());
        container.registerSingleton('Service', (c) => new Service(c.resolve('Logger')));

        const service = container.resolve<Service>('Service');
        expect(service.logger).toBeInstanceOf(Logger);
        expect(service.logger.log('hi')).toBe('logged hi');
    });
});
