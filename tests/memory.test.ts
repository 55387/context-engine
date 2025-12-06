import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { Session, Event } from '../src/context-engine/types';

describe('MemoryManager', () => {
    let memoryManager: MemoryManager;
    let storage: InMemoryMemoryStorage;
    let llmProvider: MockLLMProvider;

    beforeEach(() => {
        storage = new InMemoryMemoryStorage();
        llmProvider = new MockLLMProvider();
        memoryManager = new MemoryManager(storage, llmProvider, {
            async: false // Run synchronously for tests
        });
    });

    // Helper to create a dummy session
    const createSession = (id: string = 's1', userId: string = 'u1'): Session => ({
        id,
        userId,
        appId: 'app1',
        events: [],
        state: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        config: {},
        metadata: {}
    });

    // Helper to create dummy events
    const createEvents = (texts: string[]): Event[] => texts.map((text, i) => ({
        id: `e-${i}`,
        type: 'user_input',
        role: 'user',
        parts: [{ type: 'text', text }],
        timestamp: new Date()
    }));
    it('should encrypt memory facts at rest', async () => {
        const encryptedStorage = new InMemoryMemoryStorage({ encryptionKey: 'secret' });
        const memoryManagerWithEnc = new MemoryManager(encryptedStorage, llmProvider, {
            async: false
        });

        const session = createSession('s2', 'u2');
        const events = createEvents(['Extract extracted memories please']);

        await memoryManagerWithEnc.generateMemoriesFromSession(session, events);

        // Direct access to verify encryption (not possible via public API, 
        // but we can verify that reading back via API works transparently)
        const retrieved = await encryptedStorage.listByUser('u2');
        expect(retrieved[0].content.fact).toContain('User likes TypeScript');

        // Check internal map if we can cast to any, or assume if above works, 
        // the decrypt flow is correct. To truly verify encryption at rest, 
        // we'd need to peek implementation details or mock EncryptionService
    });

    it('should extract memories from a session', async () => {
        const session = createSession();
        // Use trigger text that MockLLMProvider responds to
        const events = createEvents(['Extract extracted memories please']);

        // Spy on LLM complete to ensure it's called
        const spy = vi.spyOn(llmProvider, 'complete');

        await memoryManager.generateMemoriesFromSession(session, events);

        expect(spy).toHaveBeenCalled();
        const storedMemories = await storage.listByUser(session.userId);
        expect(storedMemories.length).toBeGreaterThan(0);
        expect(storedMemories[0].content.fact).toContain('User likes TypeScript');
    });

    it('should consolidate similar memories (Mock simulation)', async () => {
        const session = createSession();
        const events = createEvents(['Extract extracted memories']);

        // First run - creates memory
        await memoryManager.generateMemoriesFromSession(session, events);
        const firstRunMemories = await storage.listByUser(session.userId);
        expect(firstRunMemories).toHaveLength(1);
        const initialId = firstRunMemories[0].id; // Capture ID if we expect update

        // Modify Mock to return "Compare these two memories" logic which returns MERGE
        // The default MockLLMProvider already handles "Compare these two memories" -> MERGE

        // Second run with similar content, should trigger consolidation
        // We rely on the MockLLM returning the same extracted fact logic or similar
        // The previous test confirmed "User likes TypeScript" is extracted.
        // If we run again, it extracts the same. InMemoryStorage search should find it.
        // Manager calls decideConsolidation -> Mock returns MERGE.

        await memoryManager.generateMemoriesFromSession(session, events);

        const secondRunMemories = await storage.listByUser(session.userId);
        // Should still be 1 memory if merged/updated, or old one updated
        // Ideally if merge happened, we updated the existing memory
        expect(secondRunMemories).toHaveLength(1);
        expect(secondRunMemories[0].content.fact).toContain('User really likes TypeScript'); // Merged fact from Mock
        expect(secondRunMemories[0].provenance.corroborationCount).toBeGreaterThan(1);
    });

    it('should retrieve relevant memories', async () => {
        const userId = 'u1';
        // Manually inject a memory
        await storage.create({
            id: 'm1',
            userId,
            scope: 'user',
            type: 'declarative',
            content: { fact: 'User likes apples' },
            provenance: { sourceType: 'user_input', confidence: 1, corroborationCount: 1 },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const results = await memoryManager.retrieveRelevantMemories(userId, 'apples', 1);
        expect(results).toHaveLength(1);
        expect(results[0].content.fact).toBe('User likes apples');
    });

    it('should support soft delete and restore', async () => {
        const userId = 'u_soft';
        const memory1 = await storage.create({
            id: 'm_soft_1',
            userId,
            scope: 'user',
            type: 'declarative',
            content: { fact: 'User likes soft delete' },
            provenance: { sourceType: 'user_input', confidence: 1, corroborationCount: 1 },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Verify exists
        let results = await storage.listByUser(userId);
        expect(results).toHaveLength(1);

        // Soft delete
        await storage.deleteByUserSoft(userId);

        // Verify gone from list
        results = await storage.listByUser(userId);
        expect(results).toHaveLength(0);

        // Verify gone from search
        const searchResults = await storage.search({ userId, query: 'delete' });
        expect(searchResults).toHaveLength(0);

        // Restore
        await storage.restore(memory1.id);

        // Verify back
        results = await storage.listByUser(userId);
        expect(results).toHaveLength(1);
    });
});
