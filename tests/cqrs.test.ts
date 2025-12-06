
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandBus, QueryBus } from '../src/context-engine/domain/cqrs/CQRS';
import {
    CreateSessionCommand,
    CreateSessionHandler,
    AddMemoryCommand,
    AddMemoryHandler,
    GetSessionQuery,
    GetSessionHandler,
    SearchMemoriesQuery,
    SearchMemoriesHandler
} from '../src/context-engine/domain/cqrs/handlers';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { InMemorySessionStorage } from '../src/context-engine/storage/InMemorySessionStorage';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { Session, Memory } from '../src/context-engine/types';

describe('CQRS', () => {
    let commandBus: CommandBus;
    let queryBus: QueryBus;
    let sessionManager: SessionManager;
    let memoryManager: MemoryManager;

    beforeEach(() => {
        commandBus = new CommandBus();
        queryBus = new QueryBus();

        const sessionStorage = new InMemorySessionStorage();
        const memoryStorage = new InMemoryMemoryStorage();
        const llmProvider = new MockLLMProvider();

        sessionManager = new SessionManager(sessionStorage);
        memoryManager = new MemoryManager(memoryStorage, llmProvider);

        // Register handlers
        commandBus.register('CreateSession', new CreateSessionHandler(sessionManager));
        commandBus.register('AddMemory', new AddMemoryHandler(memoryManager));

        queryBus.register('GetSession', new GetSessionHandler(sessionManager));
        queryBus.register('SearchMemories', new SearchMemoriesHandler(memoryManager));
    });

    it('should execute CreateSession command', async () => {
        const session = await commandBus.execute<Session>('CreateSession', new CreateSessionCommand({ userId: 'u1' }));
        expect(session.id).toBeDefined();
        expect(session.userId).toBe('u1');
    });

    it('should execute GetSession query', async () => {
        const session = await sessionManager.createSession({ userId: 'u1' });
        const retrieved = await queryBus.execute<Session | null>('GetSession', new GetSessionQuery(session.id));
        expect(retrieved?.id).toBe(session.id);
    });

    it('should execute AddMemory command', async () => {
        const memory: Memory = {
            id: 'm1',
            userId: 'u1',
            scope: 'user',
            type: 'declarative',
            content: { fact: 'test' },
            provenance: { sourceType: 'bootstrapped', confidence: 1, corroborationCount: 1 },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await commandBus.execute('AddMemory', new AddMemoryCommand(memory));

        // Check directly via query
        const memories = await queryBus.execute<Memory[]>('SearchMemories', new SearchMemoriesQuery({ userId: 'u1', query: 'test' }));
        expect(memories.length).toBeGreaterThan(0);
        expect(memories[0].content.fact).toBe('test');
    });

    it('should throw if handler not registered', async () => {
        await expect(commandBus.execute('Unknown', {} as any)).rejects.toThrowError(/No handler registered/);
    });
});
