
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { Memory, MemoryProvenance, MemoryContent } from '../src/context-engine/types';

describe('Memory Decay', () => {
    let storage: InMemoryMemoryStorage;

    beforeEach(() => {
        storage = new InMemoryMemoryStorage();
    });

    const createMemory = (id: string, accessedAt?: Date, updatedAt?: Date): Memory => ({
        id,
        userId: 'u1',
        scope: 'user',
        type: 'declarative',
        content: { fact: 'fact', topic: 'topic' },
        provenance: { confidence: 1, corroborationCount: 1 } as MemoryProvenance,
        createdAt: new Date(),
        updatedAt: updatedAt || new Date(),
        lastAccessedAt: accessedAt
    });

    it('should calculate decay score', async () => {
        // Recent memory
        const recent = createMemory('recent', new Date()); // Now
        await storage.create(recent);

        // Old memory (accessed 60 days ago)
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 60);
        const old = createMemory('old', oldDate, oldDate);
        await storage.create(old);

        const results = await storage.search({
            userId: 'u1',
            query: 'fact' // Simple text match gives same relevance
        });

        const recentResult = results.find(r => r.memory.id === 'recent');
        const oldResult = results.find(r => r.memory.id === 'old');

        // Both match query equally (relevanceScore same)
        // But recency score should differ significantly due to decay

        // Log scores for debugging if needed
        // console.log(`Recent Score: ${recentResult?.combinedScore}, Recency: ${recentResult?.recencyScore}`);
        // console.log(`Old Score: ${oldResult?.combinedScore}, Recency: ${oldResult?.recencyScore}`);

        expect(recentResult).toBeDefined();
        expect(oldResult).toBeDefined();
        expect(recentResult!.combinedScore).toBeGreaterThan(oldResult!.combinedScore);
    });

    it('should update lastAccessedAt on markAccessed', async () => {
        const mem = createMemory('m1');
        await storage.create(mem);

        const before = (await storage.get('m1'))!.lastAccessedAt;
        // Wait a bit to ensure timestamp diff? (Test runs fast, might be same ms, but identity is new Date object)

        // Mock Date to ensure diff? 
        // Or just check it is set if undefined before.
        // My createMemory sets it. Let's create one without it.
        const mem2 = createMemory('m2');
        delete mem2.lastAccessedAt;
        await storage.create(mem2);

        expect((await storage.get('m2'))!.lastAccessedAt).toBeUndefined();

        await storage.markAccessed(['m2']);

        const after = (await storage.get('m2'))!.lastAccessedAt;
        expect(after).toBeDefined();
        expect(after).toBeInstanceOf(Date);
    });
});
