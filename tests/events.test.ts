
import { describe, it, expect, vi } from 'vitest';
import { DomainEventBus, DomainEvent, DomainEventHandler } from '../src/context-engine/domain/events/DomainEventBus';

class TestEvent extends DomainEvent {
    public readonly name = 'TestEvent';
    constructor(public readonly data: string) { super(); }
}

class TestHandler implements DomainEventHandler<TestEvent> {
    public handleSpy = vi.fn();
    async handle(event: TestEvent): Promise<void> {
        this.handleSpy(event);
    }
}

describe('DomainEventBus', () => {
    it('should publish and subscribe to events', async () => {
        const bus = new DomainEventBus();
        const handler = new TestHandler();

        bus.subscribe('TestEvent', handler);

        const event = new TestEvent('test-data');
        await bus.publish(event);

        expect(handler.handleSpy).toHaveBeenCalledWith(event);
        expect(handler.handleSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple handlers', async () => {
        const bus = new DomainEventBus();
        const handler1 = new TestHandler();
        const handler2 = new TestHandler();

        bus.subscribe('TestEvent', handler1);
        bus.subscribe('TestEvent', handler2);

        await bus.publish(new TestEvent('data'));

        expect(handler1.handleSpy).toHaveBeenCalled();
        expect(handler2.handleSpy).toHaveBeenCalled();
    });

    it('should gracefully handle handler errors', async () => {
        const bus = new DomainEventBus();
        const errorHandler = {
            handle: vi.fn().mockRejectedValue(new Error('Fail'))
        };
        const successHandler = new TestHandler();

        bus.subscribe('TestEvent', errorHandler);
        bus.subscribe('TestEvent', successHandler);

        // Should not throw
        await bus.publish(new TestEvent('data'));

        expect(errorHandler.handle).toHaveBeenCalled();
        expect(successHandler.handleSpy).toHaveBeenCalled();
    });
});
