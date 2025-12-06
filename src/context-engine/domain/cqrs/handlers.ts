
import { Command, CommandHandler, Query, QueryHandler } from './CQRS';
import { Session, Memory, CreateSessionOptions, MemoryRetrievalOptions, MemorySearchResult } from '../../types';
import { SessionManager } from '../../session/SessionManager';
import { MemoryManager } from '../../memory/MemoryManager';

// === Commands ===

export class CreateSessionCommand implements Command<Session> {
    constructor(public readonly options: CreateSessionOptions) { }
}

export class CreateSessionHandler implements CommandHandler<CreateSessionCommand, Session> {
    constructor(private sessionManager: SessionManager) { }

    async execute(command: CreateSessionCommand): Promise<Session> {
        return this.sessionManager.createSession(command.options);
    }
}

export class AddMemoryCommand implements Command<Memory> {
    constructor(public readonly memory: Memory) { }
}

export class AddMemoryHandler implements CommandHandler<AddMemoryCommand, Memory> {
    constructor(private memoryManager: MemoryManager) { }

    async execute(command: AddMemoryCommand): Promise<Memory> {
        return this.memoryManager.storeMemory(command.memory);
    }
}

// === Queries ===

export class GetSessionQuery implements Query<Session | null> {
    constructor(public readonly sessionId: string) { }
}

export class GetSessionHandler implements QueryHandler<GetSessionQuery, Session | null> {
    constructor(private sessionManager: SessionManager) { }

    async execute(query: GetSessionQuery): Promise<Session | null> {
        return this.sessionManager.getSession(query.sessionId);
    }
}

export class SearchMemoriesQuery implements Query<Memory[]> {
    constructor(public readonly options: MemoryRetrievalOptions) { }
}

export class SearchMemoriesHandler implements QueryHandler<SearchMemoriesQuery, Memory[]> {
    constructor(private memoryManager: MemoryManager) { }

    async execute(query: SearchMemoriesQuery): Promise<Memory[]> {
        return this.memoryManager.retrieveRelevantMemories(
            query.options.userId,
            query.options.query || '',
        );
    }
}
