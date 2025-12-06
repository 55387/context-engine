import fs from 'fs';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystemSessionStorage } from '../src/context-engine/storage/FileSystemSessionStorage';
import { FileSystemMemoryStorage } from '../src/context-engine/storage/FileSystemMemoryStorage';
import { Session, Memory, MemoryStorageOptions } from '../src/context-engine/types';

describe('FileSystemSessionStorage', () => {
    const testDir = path.join(__dirname, 'test-storage');
    let storage: FileSystemSessionStorage;

    beforeEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        storage = new FileSystemSessionStorage({ baseDir: testDir });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should persist session to file', async () => {
        const session: Session = {
            id: 's1',
            userId: 'u1',
            appId: 'app1',
            events: [],
            state: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            config: {},
            metadata: {}
        };

        await storage.create(session);

        // Verify file exists
        const filePath = path.join(testDir, 'sessions', 's1.json');
        expect(fs.existsSync(filePath)).toBe(true);

        // Verify persist reads back
        const loaded = await storage.get('s1');
        expect(loaded).toBeDefined();
        expect(loaded?.id).toBe('s1');
        expect(loaded?.createdAt).toBeInstanceOf(Date);
    });

    it('should update session and persist changes', async () => {
        const session: Session = {
            id: 's2',
            userId: 'u1',
            events: [],
            state: { val: 1 },
            createdAt: new Date(),
            updatedAt: new Date(),
            config: {}
        };
        await storage.create(session);

        await storage.updateState('s2', { val: 2 });

        // Read new instance
        const storage2 = new FileSystemSessionStorage({ baseDir: testDir });
        const loaded = await storage2.get('s2');
        expect(loaded?.state.val).toBe(2);
    });
});

describe('FileSystemMemoryStorage', () => {
    const testDir = path.join(__dirname, 'test-mem-storage');
    let storage: FileSystemMemoryStorage;

    beforeEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        storage = new FileSystemMemoryStorage({ baseDir: testDir });
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    it('should persist memories to file', async () => {
        const memory: Memory = {
            id: 'm1',
            userId: 'u1',
            scope: 'user',
            type: 'declarative',
            content: { fact: 'Persisted fact' },
            provenance: { sourceType: 'bootstrapped', confidence: 1, corroborationCount: 1 },
            createdAt: new Date(),
            updatedAt: new Date()
        };

        await storage.create(memory);

        // Verify file exists
        const filePath = path.join(testDir, 'memories', 'memories.json');
        expect(fs.existsSync(filePath)).toBe(true);

        // Reload storage
        const storage2 = new FileSystemMemoryStorage({ baseDir: testDir });
        // Needs hydration time? No, sync in constructor
        const loaded = await storage2.get('m1');
        expect(loaded).toBeDefined();
        expect(loaded?.content.fact).toBe('Persisted fact');
    });
});
