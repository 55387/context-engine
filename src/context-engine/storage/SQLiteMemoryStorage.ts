/**
 * SQLite Memory Storage
 * 
 * Persistent memory storage using SQLite with transaction support.
 * Provides ACID guarantees and efficient querying.
 */

import Database from 'better-sqlite3';
import {
    Memory,
    MemoryStorage,
    MemoryRetrievalOptions,
    MemorySearchResult,
    ContextEngineError,
    ContextEngineErrorCode,
    MemoryStorageOptions,
} from '../types';
import {
    deepClone,
    cosineSimilarity,
    calculateRecencyScore,
    combineScores,
    isExpired,
    EncryptionService,
} from '../utils';

interface SQLiteMemoryStorageOptions extends MemoryStorageOptions {
    dbPath?: string;
    encryptionKey?: string;
}

export class SQLiteMemoryStorage implements MemoryStorage {
    private db: Database.Database;
    private encryptionService?: EncryptionService;

    constructor(options: SQLiteMemoryStorageOptions = {}) {
        const dbPath = options.dbPath || ':memory:';
        this.db = new Database(dbPath);

        if (options.encryptionKey) {
            this.encryptionService = new EncryptionService(options.encryptionKey);
        }

        this.initializeSchema();
    }

    private initializeSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                appId TEXT,
                scope TEXT NOT NULL,
                type TEXT NOT NULL,
                fact TEXT NOT NULL,
                topic TEXT,
                confidence REAL NOT NULL,
                corroborationCount INTEGER NOT NULL DEFAULT 0,
                sourceType TEXT NOT NULL,
                sessionId TEXT,
                sourceEventIds TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                expiresAt TEXT,
                archivedAt TEXT,
                lastAccessedAt TEXT,
                embedding TEXT,
                metadata TEXT
            );
            
            CREATE INDEX IF NOT EXISTS idx_userId ON memories(userId);
            CREATE INDEX IF NOT EXISTS idx_userId_appId ON memories(userId, appId);
            CREATE INDEX IF NOT EXISTS idx_scope ON memories(scope);
            CREATE INDEX IF NOT EXISTS idx_type ON memories(type);
        `);
    }

    private encrypt(text: string): string {
        return this.encryptionService ? this.encryptionService.encrypt(text) : text;
    }

    private decrypt(text: string): string {
        return this.encryptionService ? this.encryptionService.decrypt(text) : text;
    }

    private memoryToRow(memory: Memory): any {
        return {
            id: memory.id,
            userId: memory.userId,
            appId: memory.appId || null,
            scope: memory.scope,
            type: memory.type,
            fact: this.encrypt(memory.content.fact),
            topic: memory.content.topic || null,
            confidence: memory.provenance.confidence,
            corroborationCount: memory.provenance.corroborationCount,
            sourceType: memory.provenance.sourceType,
            sessionId: memory.provenance.sessionId || null,
            sourceEventIds: memory.provenance.sourceEventIds?.join(',') || null,
            createdAt: memory.createdAt.toISOString(),
            updatedAt: memory.updatedAt.toISOString(),
            expiresAt: memory.expiresAt?.toISOString() || null,
            archivedAt: memory.archivedAt?.toISOString() || null,
            lastAccessedAt: memory.lastAccessedAt?.toISOString() || null,
            embedding: memory.embedding ? JSON.stringify(memory.embedding) : null,
            metadata: memory.metadata ? JSON.stringify(memory.metadata) : null,
        };
    }

    private rowToMemory(row: any): Memory {
        return {
            id: row.id,
            userId: row.userId,
            appId: row.appId || undefined,
            scope: row.scope,
            type: row.type,
            content: {
                fact: this.decrypt(row.fact),
                topic: row.topic || undefined,
            },
            provenance: {
                sourceType: row.sourceType,
                sessionId: row.sessionId || undefined,
                sourceEventIds: row.sourceEventIds ? row.sourceEventIds.split(',') : undefined,
                confidence: row.confidence,
                corroborationCount: row.corroborationCount,
            },
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(row.updatedAt),
            expiresAt: row.expiresAt ? new Date(row.expiresAt) : undefined,
            archivedAt: row.archivedAt ? new Date(row.archivedAt) : undefined,
            lastAccessedAt: row.lastAccessedAt ? new Date(row.lastAccessedAt) : undefined,
            embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        };
    }

    async create(memory: Memory): Promise<Memory> {
        const row = this.memoryToRow(memory);

        const stmt = this.db.prepare(`
            INSERT INTO memories (
                id, userId, appId, scope, type, fact, topic,
                confidence, corroborationCount, sourceType, sessionId, sourceEventIds,
                createdAt, updatedAt, expiresAt, archivedAt, lastAccessedAt,
                embedding, metadata
            ) VALUES (
                @id, @userId, @appId, @scope, @type, @fact, @topic,
                @confidence, @corroborationCount, @sourceType, @sessionId, @sourceEventIds,
                @createdAt, @updatedAt, @expiresAt, @archivedAt, @lastAccessedAt,
                @embedding, @metadata
            )
        `);

        try {
            stmt.run(row);
            return memory;
        } catch (error: any) {
            throw new ContextEngineError(
                ContextEngineErrorCode.STORAGE_ERROR,
                `SQLite create failed: ${error.message}`,
                { originalError: error }
            );
        }
    }

    async get(memoryId: string): Promise<Memory | null> {
        const row = this.db.prepare('SELECT * FROM memories WHERE id = ?').get(memoryId);

        if (!row) return null;

        const memory = this.rowToMemory(row);

        // Check expiration
        if (isExpired(memory.expiresAt)) {
            await this.delete(memoryId);
            return null;
        }

        return memory;
    }

    async update(memory: Memory): Promise<Memory> {
        const row = this.memoryToRow(memory);
        row.updatedAt = new Date().toISOString();

        const stmt = this.db.prepare(`
            UPDATE memories SET
                userId = @userId,
                appId = @appId,
                scope = @scope,
                type = @type,
                fact = @fact,
                topic = @topic,
                confidence = @confidence,
                corroborationCount = @corroborationCount,
                sourceType = @sourceType,
                sessionId = @sessionId,
                sourceEventIds = @sourceEventIds,
                updatedAt = @updatedAt,
                expiresAt = @expiresAt,
                archivedAt = @archivedAt,
                lastAccessedAt = @lastAccessedAt,
                embedding = @embedding,
                metadata = @metadata
            WHERE id = @id
        `);

        try {
            const result = stmt.run(row);
            if (result.changes === 0) {
                throw new ContextEngineError(
                    ContextEngineErrorCode.MEMORY_NOT_FOUND,
                    `Memory with ID ${memory.id} not found`
                );
            }
            return memory;
        } catch (error: any) {
            if (error instanceof ContextEngineError) throw error;
            throw new ContextEngineError(
                ContextEngineErrorCode.STORAGE_ERROR,
                `SQLite update failed: ${error.message}`,
                { originalError: error }
            );
        }
    }

    async delete(memoryId: string): Promise<void> {
        this.db.prepare('DELETE FROM memories WHERE id = ?').run(memoryId);
    }

    async search(options: MemoryRetrievalOptions): Promise<MemorySearchResult[]> {
        const {
            userId,
            appId,
            query,
            scope,
            type,
            topK = 10,
            minConfidence = 0,
            includeExpired = false,
        } = options;

        // Build WHERE clause
        const conditions: string[] = ['userId = ?'];
        const params: any[] = [userId];

        if (appId) {
            conditions.push('appId = ?');
            params.push(appId);
        }

        if (scope && scope.length > 0) {
            conditions.push(`scope IN (${scope.map(() => '?').join(',')})`);
            params.push(...scope);
        }

        if (type && type.length > 0) {
            conditions.push(`type IN (${type.map(() => '?').join(',')})`);
            params.push(...type);
        }

        conditions.push('confidence >= ?');
        params.push(minConfidence);

        conditions.push('archivedAt IS NULL');

        if (!includeExpired) {
            conditions.push("(expiresAt IS NULL OR datetime(expiresAt) > datetime('now'))");
        }

        const sql = `SELECT * FROM memories WHERE ${conditions.join(' AND ')}`;
        const rows = this.db.prepare(sql).all(...params);

        const memories = rows.map(row => this.rowToMemory(row));
        const queryEmbedding = options.queryEmbedding || (query ? this.createMockEmbedding(query) : undefined);

        // Calculate scores
        const results: MemorySearchResult[] = memories.map(memory => {
            let relevanceScore = 0.5;

            if (queryEmbedding && memory.embedding) {
                relevanceScore = cosineSimilarity(queryEmbedding, memory.embedding);
            } else if (query) {
                relevanceScore = this.calculateTextRelevance(query, memory.content.fact);
            }

            const referenceDate = memory.lastAccessedAt || memory.updatedAt;
            const recencyScore = calculateRecencyScore(referenceDate);

            const daysSinceAccess = (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
            const decayFactor = Math.exp(-0.01 * daysSinceAccess);

            const importanceScore = combineScores([
                { value: memory.provenance.confidence, weight: 0.6 },
                { value: Math.min(memory.provenance.corroborationCount / 5, 1), weight: 0.4 },
            ]);

            const combinedScore = combineScores([
                { value: relevanceScore, weight: 0.5 },
                { value: recencyScore * decayFactor, weight: 0.3 },
                { value: importanceScore, weight: 0.2 },
            ]);

            return {
                memory,
                relevanceScore,
                recencyScore: recencyScore * decayFactor,
                importanceScore,
                combinedScore,
            };
        });

        results.sort((a, b) => b.combinedScore - a.combinedScore);
        return results.slice(0, topK);
    }

    async listByUser(userId: string): Promise<Memory[]> {
        const rows = this.db.prepare(
            'SELECT * FROM memories WHERE userId = ? AND archivedAt IS NULL'
        ).all(userId);

        return rows.map(row => this.rowToMemory(row));
    }

    async deleteByUser(userId: string): Promise<number> {
        const result = this.db.prepare('DELETE FROM memories WHERE userId = ?').run(userId);
        return result.changes;
    }

    async deleteByUserSoft(userId: string): Promise<number> {
        const result = this.db.prepare(
            'UPDATE memories SET archivedAt = ? WHERE userId = ? AND archivedAt IS NULL'
        ).run(new Date().toISOString(), userId);
        return result.changes;
    }

    async restore(memoryId: string): Promise<Memory | null> {
        const result = this.db.prepare(
            'UPDATE memories SET archivedAt = NULL WHERE id = ?'
        ).run(memoryId);

        if (result.changes === 0) return null;

        return this.get(memoryId);
    }

    async deleteExpired(): Promise<number> {
        const result = this.db.prepare(
            "DELETE FROM memories WHERE expiresAt IS NOT NULL AND datetime(expiresAt) <= datetime('now')"
        ).run();
        return result.changes;
    }

    async markAccessed(memoryIds: string[]): Promise<void> {
        const now = new Date().toISOString();
        const stmt = this.db.prepare('UPDATE memories SET lastAccessedAt = ? WHERE id = ?');

        // Use transaction for atomic batch update
        const updateAll = this.db.transaction((ids: string[]) => {
            for (const id of ids) {
                stmt.run(now, id);
            }
        });

        updateAll(memoryIds);
    }

    async addEmbedding(memoryId: string, embedding: number[]): Promise<void> {
        const result = this.db.prepare(
            'UPDATE memories SET embedding = ? WHERE id = ?'
        ).run(JSON.stringify(embedding), memoryId);

        if (result.changes === 0) {
            throw new ContextEngineError(
                ContextEngineErrorCode.MEMORY_NOT_FOUND,
                `Memory with ID ${memoryId} not found`
            );
        }
    }

    // Utility methods (same as InMemoryMemoryStorage)

    private createMockEmbedding(text: string): number[] {
        const embedding: number[] = new Array(128).fill(0);
        const words = text.toLowerCase().split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const hash = this.hashString(word);
            const idx = Math.abs(hash % embedding.length);
            embedding[idx] += 1 / (i + 1);
        }

        const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= norm;
            }
        }

        return embedding;
    }

    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    private calculateTextRelevance(query: string, text: string): number {
        const qNorm = query.toLowerCase();
        const tNorm = text.toLowerCase();

        const queryWords = qNorm.split(/\s+/).filter(w => w.length > 0);
        const textWords = tNorm.split(/\s+/).filter(w => w.length > 0);

        if (queryWords.length <= 1 || textWords.length <= 1) {
            const qChars = new Set(qNorm.split(''));
            const tChars = new Set(tNorm.split(''));

            let overlap = 0;
            for (const char of qChars) {
                if (tChars.has(char)) overlap++;
            }
            const union = new Set([...qChars, ...tChars]).size;
            return union > 0 ? overlap / union : 0;
        }

        const qSet = new Set(queryWords);
        const tSet = new Set(textWords);

        let overlap = 0;
        for (const word of qSet) {
            if (tSet.has(word)) overlap++;
        }

        const union = new Set([...qSet, ...tSet]).size;
        return union > 0 ? overlap / union : 0;
    }

    // Close database connection
    close(): void {
        this.db.close();
    }
}
