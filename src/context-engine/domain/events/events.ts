
import { DomainEvent } from './DomainEventBus';
import { Memory, Session } from '../../types'; // Adjust path as needed

// === Session Events ===

export class SessionCreatedEvent extends DomainEvent {
    public readonly name = 'SessionCreated';
    constructor(public readonly session: Session) { super(); }
}

export class SessionUpdatedEvent extends DomainEvent {
    public readonly name = 'SessionUpdated';
    constructor(
        public readonly session: Session,
        public readonly changes: Partial<Session>
    ) { super(); }
}

// === Memory Events ===

export class MemoryCreatedEvent extends DomainEvent {
    public readonly name = 'MemoryCreated';
    constructor(public readonly memory: Memory) { super(); }
}

export class MemoryUpdatedEvent extends DomainEvent {
    public readonly name = 'MemoryUpdated';
    constructor(
        public readonly memory: Memory,
        public readonly previousMemory?: Memory
    ) { super(); }
}

export class MemoryDeletedEvent extends DomainEvent {
    public readonly name = 'MemoryDeleted';
    constructor(public readonly memoryId: string) { super(); }
}

// === Context Events ===

export class ContextRetrievedEvent extends DomainEvent {
    public readonly name = 'ContextRetrieved';
    constructor(
        public readonly sessionId: string,
        public readonly query: string,
        public readonly memories: Memory[]
    ) { super(); }
}
