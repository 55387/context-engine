import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLiteMemoryStorage } from '../src/context-engine/storage/SQLiteMemoryStorage';
import { Memory } from '../src/context-engine/types';
import { generateId } from '../src/context-engine/utils';
import fs from 'fs';
import path from 'path';

describe('SQLiteMemoryStorage', () => {
    let storage: SQLiteMemoryStorage;
    const testDbPath = './test-memories.db';

    beforeEach(() => {
        // Clean up any existing test database
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        storage = new SQLiteMemoryStorage({ dbPath: testDbPath });
    });

    afterEach(() => {
        storage.close();
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
    });

    const createTestMemory = (userId: string = 'user1', fact: string = 'Test fact'): Memory => ({
        id: generateId(),
        userId,
        scope: 'user',
        type: 'declarative',
        content: {
            fact,
            topic: 'test',
        },
        provenance: {
            sourceType: 'user_input',
            confidence: 0.9,
            corroborationCount: 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    it('should create and retrieve a memory', async () => {
        const memory = createTestMemory();
        await storage.create(memory);

        const retrieved = await storage.get(memory.id);
        expect(retrieved).not.toBeNull();
        expect(retrieved!.id).toBe(memory.id);
        expect(retrieved!.content.fact).toBe('Test fact');
        expect(retrieved!.userId).toBe('user1');
    });

    it('should update an existing memory', async () => {
        const memory = createTestMemory();
        await storage.create(memory);

        memory.content.fact = 'Updated fact';
        memory.provenance.confidence = 0.95;
        await storage.update(memory);

        const retrieved = await storage.get(memory.id);
        expect(retrieved!.content.fact).toBe('Updated fact');
        expect(retrieved!.provenance.confidence).toBe(0.95);
    });

    it('should delete a memory', async () => {
        const memory = createTestMemory();
        await storage.create(memory);

        await storage.delete(memory.id);
        const retrieved = await storage.get(memory.id);
        expect(retrieved).toBeNull();
    });

    it('should list memories by user', async () => {
        await storage.create(createTestMemory('user1', 'Fact 1'));
        await storage.create(createTestMemory('user1', 'Fact 2'));
        await storage.create(createTestMemory('user2', 'Fact 3'));

        const user1Memories = await storage.listByUser('user1');
        expect(user1Memories).toHaveLength(2);
        expect(user1Memories.every(m => m.userId === 'user1')).toBe(true);
    });

    it('should search memories with filters', async () => {
        const memory1 = createTestMemory('user1', 'I like TypeScript');
        memory1.scope = 'user';
        await storage.create(memory1);

        const memory2 = createTestMemory('user1', 'I like JavaScript');
        memory2.scope = 'session';
        await storage.create(memory2);

        const results = await storage.search({
            userId: 'user1',
            query: 'TypeScript',
            scope: ['user'],
            topK: 5,
        });

        expect(results).toHaveLength(1);
        expect(results[0].memory.content.fact).toContain('TypeScript');
    });

    it('should mark memories as accessed', async () => {
        const memory = createTestMemory();
        await storage.create(memory);

        expect(memory.lastAccessedAt).toBeUndefined();

        await storage.markAccessed([memory.id]);

        const retrieved = await storage.get(memory.id);
        expect(retrieved!.lastAccessedAt).toBeDefined();
    });

    it('should support encryption', async () => {
        const encryptedStorage = new SQLiteMemoryStorage({
            dbPath: ':memory:',
            encryptionKey: 'test-encryption-key-32-chars-long',
        });

        const memory = createTestMemory('user1', 'Secret information');
        await encryptedStorage.create(memory);

        const retrieved = await encryptedStorage.get(memory.id);
        expect(retrieved!.content.fact).toBe('Secret information');

        encryptedStorage.close();
    });

    it('should handle expired memories', async () => {
        const memory = createTestMemory();
        memory.expiresAt = new Date(Date.now() - 1000); // expired 1 second ago
        await storage.create(memory);

        const retrieved = await storage.get(memory.id);
        expect(retrieved).toBeNull(); // Should be auto-deleted
    });

    it('should soft delete memories', async () => {
        await storage.create(createTestMemory('user1', 'Fact 1'));
        await storage.create(createTestMemory('user1', 'Fact 2'));

        const deletedCount = await storage.deleteByUserSoft('user1');
        expect(deletedCount).toBe(2);

        const memories = await storage.listByUser('user1');
        expect(memories).toHaveLength(0); // Archived memories shouldn't appear
    });

    it('should restore archived memories', async () => {
        const memory = createTestMemory();
        await storage.create(memory);
        await storage.deleteByUserSoft(memory.userId);

        const restored = await storage.restore(memory.id);
        expect(restored).not.toBeNull();
        expect(restored!.archivedAt).toBeUndefined();
    });

    it('should add embeddings to memories', async () => {
        const memory = createTestMemory();
        await storage.create(memory);

        const embedding = new Array(128).fill(0.5);
        await storage.addEmbedding(memory.id, embedding);

        const retrieved = await storage.get(memory.id);
        expect(retrieved!.embedding).toEqual(embedding);
    });

    it('should use transactions for batch operations', async () => {
        const memory1 = createTestMemory('user1', 'Fact 1');
        const memory2 = createTestMemory('user1', 'Fact 2');
        const memory3 = createTestMemory('user1', 'Fact 3');

        await storage.create(memory1);
        await storage.create(memory2);
        await storage.create(memory3);

        // Mark all accessed in a single transaction
        await storage.markAccessed([memory1.id, memory2.id, memory3.id]);

        const m1 = await storage.get(memory1.id);
        const m2 = await storage.get(memory2.id);
        const m3 = await storage.get(memory3.id);

        expect(m1!.lastAccessedAt).toBeDefined();
        expect(m2!.lastAccessedAt).toBeDefined();
        expect(m3!.lastAccessedAt).toBeDefined();
    });

    it('should persist data across instances', async () => {
        const memory = createTestMemory('user1', 'Persistent fact');
        await storage.create(memory);
        storage.close();

        // Create new instance with same DB
        const storage2 = new SQLiteMemoryStorage({ dbPath: testDbPath });
        const retrieved = await storage2.get(memory.id);

        expect(retrieved).not.toBeNull();
        expect(retrieved!.content.fact).toBe('Persistent fact');

        storage2.close();
    });
});
