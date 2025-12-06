
import { v4 as uuidv4 } from 'uuid';

/**
 * Base Domain Event
 * All domain events must extend this class.
 */
export abstract class DomainEvent {
    public readonly id: string;
    public readonly occurredOn: Date;
    public abstract readonly name: string;

    constructor() {
        this.id = uuidv4();
        this.occurredOn = new Date();
    }
}

/**
 * Domain Event Handler Interface
 */
export interface DomainEventHandler<T extends DomainEvent> {
    handle(event: T): Promise<void>;
}

/**
 * Domain Event Bus
 * Publishes domain events to registered handlers.
 */
export class DomainEventBus {
    private handlers = new Map<string, Set<DomainEventHandler<any>>>();

    /**
     * Subscribe to a specific domain event
     */
    subscribe<T extends DomainEvent>(
        eventName: string,
        handler: DomainEventHandler<T>
    ): void {
        if (!this.handlers.has(eventName)) {
            this.handlers.set(eventName, new Set());
        }
        this.handlers.get(eventName)!.add(handler);
    }

    /**
     * Publish a domain event
     */
    async publish(event: DomainEvent): Promise<void> {
        const eventName = event.name;
        const handlers = this.handlers.get(eventName);

        if (handlers) {
            const promises = Array.from(handlers).map(async handler => {
                try {
                    await handler.handle(event);
                } catch (error) {
                    console.error(`Error handling event ${eventName}:`, error);
                }
            });

            await Promise.all(promises);
        }
    }

    /**
     * Clear all subscribers (mostly for testing)
     */
    clear(): void {
        this.handlers.clear();
    }
}

// Global instance for now, can be replaced by DI
export const globalEventBus = new DomainEventBus();
