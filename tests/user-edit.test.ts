
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { Memory } from '../src/context-engine/types';
import { CommandBus } from '../src/context-engine/domain/cqrs/CQRS';
import { UpdateMemoryCommand, UpdateMemoryHandler } from '../src/context-engine/domain/cqrs/UpdateMemoryHandler';

describe('User Edit Memory', () => {
    let memoryManager: MemoryManager;
    let storage: InMemoryMemoryStorage;
    let commandBus: CommandBus;

    beforeEach(async () => {
        storage = new InMemoryMemoryStorage();
        const llmProvider = new MockLLMProvider();
        memoryManager = new MemoryManager(storage, llmProvider);
        commandBus = new CommandBus();
        commandBus.register('UpdateMemory', new UpdateMemoryHandler(memoryManager));
    });

    const createMemory = async (): Promise<Memory> => {
        const mem: Memory = {
            id: 'm1',
            userId: 'u1',
            scope: 'user',
            type: 'declarative',
            content: { fact: 'Original Fact' },
            provenance: { confidence: 1, corroborationCount: 1 } as any,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        return await memoryManager.storeMemory(mem);
    };

    it('should update memory fact via direct manager call', async () => {
        await createMemory();

        const updated = await memoryManager.updateMemory('m1', { fact: 'Updated Fact' });

        expect(updated.content.fact).toBe('Updated Fact');
        expect(updated.updatedAt.getTime()).toBeGreaterThan(updated.createdAt.getTime());

        const stored = await storage.get('m1');
        expect(stored?.content.fact).toBe('Updated Fact');
    });

    it('should update memory via CQRS command', async () => {
        await createMemory();

        await commandBus.execute('UpdateMemory', new UpdateMemoryCommand('m1', { fact: 'Command Updated' }));

        const stored = await storage.get('m1');
        expect(stored?.content.fact).toBe('Command Updated');
    });

    it('should throw if memory not found', async () => {
        await expect(memoryManager.updateMemory('non-existent', { fact: 'new' }))
            .rejects.toThrowError(/not found/);
    });
});
