
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { Memory } from '../src/context-engine/types';
import { performance } from 'perf_hooks';

describe('Benchmark: Memory Storage', () => {
    let storage: InMemoryMemoryStorage;

    beforeEach(() => {
        storage = new InMemoryMemoryStorage();
    });

    const generateEmbedding = (dim: number): number[] => {
        return Array.from({ length: dim }, () => Math.random());
    };

    const runBenchmark = async (count: number, dim: number = 768) => {
        // 1. Seed
        const startSeed = performance.now();
        const memories: Memory[] = [];
        for (let i = 0; i < count; i++) {
            memories.push({
                id: `mem-${i}`,
                userId: 'user-bench',
                scope: 'user',
                type: 'declarative',
                content: { fact: `Fact number ${i}` },
                provenance: { confidence: 1, corroborationCount: 1 } as any,
                createdAt: new Date(),
                updatedAt: new Date(),
                embedding: generateEmbedding(dim)
            });
        }

        // Batch create? Storage only has single create.
        // Parallelize
        await Promise.all(memories.map(m => storage.create(m)));
        const seedTime = performance.now() - startSeed;

        // 2. Search
        const queryEmbedding = generateEmbedding(dim);
        const startSearch = performance.now();
        await storage.search({
            userId: 'user-bench',
            query: 'test',
            queryEmbedding,
            topK: 5
        });
        const searchTime = performance.now() - startSearch;

        return { count, dim, seedTime, searchTime };
    };

    it('should perform vector search efficiently', async () => {
        console.log('Running Benchmarks (Dim: 768)...');

        const counts = [100, 1000, 5000];

        for (const count of counts) {
            storage = new InMemoryMemoryStorage(); // Reset
            const result = await runBenchmark(count);
            console.log(`[${count} Items] Seed: ${result.seedTime.toFixed(2)}ms, Search: ${result.searchTime.toFixed(2)}ms, Avg Search/Item: ${(result.searchTime / count).toFixed(4)}ms`);

            // Assertion to ensure it is reasonable (e.g. < 1ms per item checked in loop)
            // 5000 items * 768 math ops. JS can do millions ops/sec.
            // 5000 search should be under 100ms.
            expect(result.searchTime).toBeLessThan(500);
        }
    });
});
