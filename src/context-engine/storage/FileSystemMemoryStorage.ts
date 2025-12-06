import fs from 'fs';
import path from 'path';
import { InMemoryMemoryStorage } from './InMemoryMemoryStorage';
import { MemoryStorageOptions, Memory } from '../types';

export interface FileSystemMemoryStorageConfig extends MemoryStorageOptions {
    baseDir: string;
    encryptionKey?: string;
}

/**
 * File System backed Memory Storage.
 * Extends InMemoryMemoryStorage but persists state to a JSON file on every write.
 */
export class FileSystemMemoryStorage extends InMemoryMemoryStorage {
    private filePath: string;

    constructor(config: FileSystemMemoryStorageConfig) {
        super({ namespace: config.namespace, encryptionKey: config.encryptionKey });
        const dir = path.join(config.baseDir, 'memories');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.filePath = path.join(dir, 'memories.json');
        this.loadFromFile();
    }

    private loadFromFile() {
        if (fs.existsSync(this.filePath)) {
            try {
                const data = fs.readFileSync(this.filePath, 'utf-8');
                const memories = JSON.parse(data, (key, value) => {
                    if (['createdAt', 'updatedAt', 'timestamp', 'expiresAt', 'archivedAt', 'lastAccessedAt'].includes(key)) {
                        return new Date(value);
                    }
                    return value;
                }) as Memory[];

                // Hydrate the Map in the parent class
                // Accessing protected/private member by casting to any workaround, 
                // or better, use super.create() but that triggers save.
                // Best is to use the internal map if protected, but it's private.
                // We'll trust the parent's create, but disable auto-save during hydration?
                // Actually, since InMemoryStorage stores in a Map, we can just repopulate it.
                // But `memories` is private. 
                // We can use `(this as any).memories` to set it directly for performance and correctness.
                const map = new Map<string, Memory>();
                for (const m of memories) {
                    map.set(m.id, m);
                }
                (this as any).memories = map;

            } catch (err) {
                console.error('Failed to load memories from file:', err);
            }
        }
    }

    private saveToFile() {
        try {
            // Access private map
            const memoriesMap = (this as any).memories as Map<string, Memory>;
            const memoriesArray = Array.from(memoriesMap.values());
            fs.writeFileSync(this.filePath, JSON.stringify(memoriesArray, null, 2), 'utf-8');
        } catch (err) {
            console.error('Failed to save memories to file:', err);
        }
    }

    // Override write methods to trigger save
    async create(memory: Memory): Promise<Memory> {
        const result = await super.create(memory);
        this.saveToFile();
        return result;
    }

    async update(memory: Memory): Promise<Memory> {
        const result = await super.update(memory);
        this.saveToFile();
        return result;
    }

    async delete(memoryId: string): Promise<void> {
        await super.delete(memoryId);
        this.saveToFile();
    }

    async deleteByUser(userId: string): Promise<number> {
        const count = await super.deleteByUser(userId);
        this.saveToFile();
        return count;
    }

    async deleteByUserSoft(userId: string): Promise<number> {
        const count = await super.deleteByUserSoft(userId);
        this.saveToFile();
        return count;
    }

    async restore(memoryId: string): Promise<Memory | null> {
        const result = await super.restore(memoryId);
        if (result) this.saveToFile();
        return result;
    }

    async deleteExpired(): Promise<number> {
        const count = await super.deleteExpired();
        if (count > 0) this.saveToFile();
        return count;
    }

    async markAccessed(memoryIds: string[]): Promise<void> {
        await super.markAccessed(memoryIds);
        this.saveToFile();
    }
}
