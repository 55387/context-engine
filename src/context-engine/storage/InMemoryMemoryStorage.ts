/**
 * In-Memory Memory Storage
 * 
 * Simple in-memory implementation with vector similarity search.
 * For production, use a vector database backend.
 */

import {
    Memory,
    MemoryStorage,
    MemoryRetrievalOptions,
    MemorySearchResult,
    ContextEngineError,
    ContextEngineErrorCode,
    MemoryStorageOptions, // Added
    ConsolidationResult, // Added
} from '../types';
import {
    deepClone,
    cosineSimilarity,
    calculateRecencyScore,
    combineScores,
    isExpired,
    EncryptionService, // Added
} from '../utils';

// Added interface for InMemoryStorageOptions
interface InMemoryStorageOptions extends MemoryStorageOptions {
    encryptionKey?: string;
}

export class InMemoryMemoryStorage implements MemoryStorage {
    private memories: Map<string, Memory>; // Changed initialization to constructor
    private encryptionService?: EncryptionService; // Added

    // Added constructor
    constructor(options: InMemoryStorageOptions = {}) {
        this.memories = new Map();
        if (options.encryptionKey) {
            this.encryptionService = new EncryptionService(options.encryptionKey);
        }
    }

    // Added encrypt method
    private encrypt(text: string): string {
        return this.encryptionService ? this.encryptionService.encrypt(text) : text;
    }

    // Added decrypt method
    private decrypt(text: string): string {
        return this.encryptionService ? this.encryptionService.decrypt(text) : text;
    }

    async create(memory: Memory): Promise<Memory> {
        if (this.memories.has(memory.id)) {
            throw new ContextEngineError(
                ContextEngineErrorCode.VALIDATION_ERROR,
                `Memory with ID ${memory.id} already exists`
            );
        }

        // Encrypt content before storing
        const storedMemory = deepClone(memory);
        storedMemory.content.fact = this.encrypt(memory.content.fact);

        this.memories.set(memory.id, storedMemory);
        return memory; // Return original (unencrypted)
    }

    async get(memoryId: string): Promise<Memory | null> {
        const memory = this.memories.get(memoryId);
        if (!memory) return null;

        // Check expiration
        if (isExpired(memory.expiresAt)) {
            this.memories.delete(memoryId);
            return null;
        }

        const decryptedMemory = deepClone(memory);
        decryptedMemory.content.fact = this.decrypt(decryptedMemory.content.fact);
        return decryptedMemory;
    }

    async update(memory: Memory): Promise<Memory> {
        if (!this.memories.has(memory.id)) {
            throw new ContextEngineError(
                ContextEngineErrorCode.STORAGE_ERROR,
                `Memory with ID ${memory.id} not found`
            );
        }

        // Encrypt content before storing
        const storedMemory = deepClone(memory);
        storedMemory.updatedAt = new Date();
        storedMemory.content.fact = this.encrypt(memory.content.fact);

        this.memories.set(memory.id, storedMemory);
        return memory;
    }

    async delete(memoryId: string): Promise<void> {
        this.memories.delete(memoryId);
    }

    async search(options: MemoryRetrievalOptions): Promise<MemorySearchResult[]> {
        const results: MemorySearchResult[] = [];
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

        // Use provided embedding or create a mock one
        const queryEmbedding = options.queryEmbedding || (query ? this.createMockEmbedding(query) : undefined);

        for (const memory of this.memories.values()) {
            // Filter by user
            if (memory.userId !== userId) continue;

            // Filter by app if specified
            if (appId && memory.appId !== appId) continue;

            // Filter by scope if specified
            if (scope && !scope.includes(memory.scope)) continue;

            // Filter by type if specified
            if (type && !type.includes(memory.type)) continue;

            // Filter by confidence
            if (memory.provenance.confidence < minConfidence) continue;

            // Decrypt for processing and return
            const decryptedMemory = deepClone(memory);
            decryptedMemory.content.fact = this.decrypt(memory.content.fact);

            // Skip archived
            if (decryptedMemory.archivedAt) continue;

            // Filter expired
            if (!includeExpired && isExpired(decryptedMemory.expiresAt)) {
                // If expired, remove it from storage and skip
                this.memories.delete(memory.id);
                continue;
            }

            // Calculate relevance score
            let relevanceScore = 0.5; // Default if no query
            if (queryEmbedding && decryptedMemory.embedding) {
                relevanceScore = cosineSimilarity(queryEmbedding, decryptedMemory.embedding);
            } else if (query) {
                // Simple text matching fallback
                relevanceScore = this.calculateTextRelevance(
                    query,
                    decryptedMemory.content.fact
                );
            }

            // Calculate recency score (prefer lastAccessed for access-based decay)
            // If checking for decay: Items not accessed for long time should have lower score.
            // Current calculateRecencyScore favors recent dates.
            const referenceDate = decryptedMemory.lastAccessedAt || decryptedMemory.updatedAt;
            const recencyScore = calculateRecencyScore(referenceDate);

            // Apply specific decay penalty if not accessed in a long time (e.g. > 30 days)
            // Simple exponential decay factor
            const daysSinceAccess = (Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);
            const decayFactor = Math.exp(-0.01 * daysSinceAccess); // Slow decay

            // Calculate importance score based on confidence and corroboration
            const importanceScore = combineScores([
                { value: memory.provenance.confidence, weight: 0.6 },
                { value: Math.min(memory.provenance.corroborationCount / 5, 1), weight: 0.4 },
            ]);

            // Combine scores with decay
            const combinedScore = combineScores([
                { value: relevanceScore, weight: 0.5 },
                { value: recencyScore * decayFactor, weight: 0.3 }, // Apply decay to recency component
                { value: importanceScore, weight: 0.2 },
            ]);

            results.push({
                memory: decryptedMemory, // Return the decrypted version
                relevanceScore,
                recencyScore: recencyScore * decayFactor,
                importanceScore,
                combinedScore,
            });
        }

        // Sort by combined score and return top K
        results.sort((a, b) => b.combinedScore - a.combinedScore);
        return results.slice(0, topK);
    }

    async listByUser(userId: string): Promise<Memory[]> {
        const results: Memory[] = [];
        for (const memory of this.memories.values()) {
            // Updated filtering logic for archived
            if (memory.userId === userId && !memory.archivedAt) {
                const decryptedMemory = deepClone(memory);
                decryptedMemory.content.fact = this.decrypt(decryptedMemory.content.fact);
                results.push(decryptedMemory);
            }
        }
        return results;
    }

    async deleteByUser(userId: string): Promise<number> {
        let count = 0;
        for (const [id, memory] of this.memories.entries()) {
            if (memory.userId === userId) {
                this.memories.delete(id);
                count++;
            }
        }
        return count;
    }

    async deleteByUserSoft(userId: string): Promise<number> {
        let count = 0;
        for (const memory of this.memories.values()) {
            if (memory.userId === userId && !memory.archivedAt) {
                memory.archivedAt = new Date();
                // Persist change (in-memory is ref, but good practice to 'set')
                this.memories.set(memory.id, memory);
                count++;
            }
        }
        return count;
    }

    async restore(memoryId: string): Promise<Memory | null> {
        const memory = this.memories.get(memoryId);
        if (!memory) return null;

        if (memory.archivedAt) {
            delete memory.archivedAt;
            this.memories.set(memoryId, memory);
        }

        const decryptedMemory = deepClone(memory);
        decryptedMemory.content.fact = this.decrypt(decryptedMemory.content.fact);
        return decryptedMemory;
    }

    async deleteExpired(): Promise<number> {
        let deleted = 0;

        for (const [id, memory] of this.memories.entries()) {
            if (isExpired(memory.expiresAt)) {
                this.memories.delete(id);
                deleted++;
            }
        }

        return deleted;
    }

    async markAccessed(memoryIds: string[]): Promise<void> {
        for (const id of memoryIds) {
            const memory = this.memories.get(id);
            if (memory) {
                memory.lastAccessedAt = new Date();
                this.memories.set(id, memory);
            }
        }
    }

    /**
     * Create a mock embedding (for demo purposes)
     * In production, use a real embedding model
     */
    private createMockEmbedding(text: string): number[] {
        const embedding: number[] = new Array(128).fill(0);
        const words = text.toLowerCase().split(/\s+/);

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const hash = this.hashString(word);
            const idx = Math.abs(hash % embedding.length);
            embedding[idx] += 1 / (i + 1);
        }

        // Normalize
        const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        if (norm > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= norm;
            }
        }

        return embedding;
    }

    /**
     * Simple string hash function
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    }

    /**
     * Calculate text relevance using simple word overlap
     */
    /**
     * Calculate text relevance using simple word/character overlap
     */
    private calculateTextRelevance(query: string, text: string): number {
        // Simple heuristic: if strict word splitting yields few tokens, try character grams or simple includes
        const qNorm = query.toLowerCase();
        const tNorm = text.toLowerCase();

        const queryWords = qNorm.split(/\s+/).filter(w => w.length > 0);
        const textWords = tNorm.split(/\s+/).filter(w => w.length > 0);

        // If mostly one big chunk (likely CJK without spaces)
        if (queryWords.length <= 1 || textWords.length <= 1) {
            // Character based Jaccard
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

    /**
     * Clear all memories (for testing)
     */
    clear(): void {
        this.memories.clear();
    }

    /**
     * Get memory count (for testing)
     */
    size(): number {
        return this.memories.size;
    }

    /**
     * Add embedding to a memory
     */
    async addEmbedding(memoryId: string, embedding: number[]): Promise<void> {
        const memory = this.memories.get(memoryId);
        if (!memory) {
            throw new ContextEngineError(
                ContextEngineErrorCode.MEMORY_NOT_FOUND,
                `Memory with ID ${memoryId} not found`
            );
        }
        memory.embedding = embedding;
    }
}
