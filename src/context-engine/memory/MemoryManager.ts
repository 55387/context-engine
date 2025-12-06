/**
 * Memory Manager
 * 
 * Manages the lifecycle of memories including:
 * - Extraction (ETL from conversation)
 * - Consolidation (Deduplication and conflict resolution)
 * - Storage and Retrieval
 * - Relevance scoring
 */

import {
    Memory,
    MemoryStorage,
    Session,
    Event,
    LLMProvider,
    MemoryGenerationConfig,
    MemoryRetrievalOptions,
    MemorySearchResult,
    ConsolidationResult,
    MemoryTopicDefinition,
    CreateSessionOptions,
    ContextEngineError,
    ContextEngineErrorCode,
    AuditLogger, // Added import
} from '../types';
import { generateId, deepClone, extractEventText } from '../utils';
import { eventBus } from '../core/EventEmitter';

/**
 * Default memory generation configuration
 */
const DEFAULT_GENERATION_CONFIG: MemoryGenerationConfig = {
    async: true,
    maxMemories: 5,
    topics: [
        {
            label: 'user_preference',
            description: 'Specific preferences, likes, dislikes, and constraints of the user.',
        },
        {
            label: 'user_fact',
            description: 'Factual information about the user (name, job, location, relations, etc.).',
        },
        {
            label: 'user_goal',
            description: 'Long-term goals, projects, or objectives the user is working towards.',
        },
    ],
};

export class MemoryManager {
    private storage: MemoryStorage;
    private llmProvider: LLMProvider;
    private config: MemoryGenerationConfig;
    private processingQueue: Set<string> = new Set();
    private auditLogger?: AuditLogger; // Added property

    constructor(
        storage: MemoryStorage,
        llmProvider: LLMProvider,
        config?: Partial<MemoryGenerationConfig>,
        auditLogger?: AuditLogger // Added param
    ) {
        this.storage = storage;
        this.llmProvider = llmProvider;
        this.config = { ...DEFAULT_GENERATION_CONFIG, ...config };
        this.auditLogger = auditLogger;
    }

    /**
     * Generate memories from a completed session
     */
    async generateMemoriesFromSession(
        session: Session,
        events: Event[]
    ): Promise<void> { // Removed duplicate signature with optional events
        if (events.length === 0) return;

        if (this.config.async) {
            this.extractAndConsolidate(session, events).catch(err => {
                console.error('Background memory generation failed:', err);
                const error = err instanceof Error ? err : new Error(String(err));
                eventBus.emitError(error, { context: 'MemoryGeneration', sessionId: session.id });
            });
        } else {
            await this.extractAndConsolidate(session, events);
        }
    }

    private async extractAndConsolidate(session: Session, events: Event[]): Promise<void> {
        try {
            // 1. Extract new insights
            const extractedFacts = await this.extractMemories(session, events);

            if (extractedFacts.length === 0) return;

            eventBus.emit('memory:extracted', session.id, extractedFacts);

            // 2. Consolidate with existing memories
            for (const fact of extractedFacts) {
                // consolidateMemories expects Array, but here we process one by one to log granularly?
                // Wait, consolidateMemories signature is (userId, newMemories: Memory[]). 
                // We should pass array if we want batch, or single array.
                // The previous code passed a single 'fact' (Memory) which caused type error.

                const results = await this.consolidateMemories(session.userId, [fact]); // Fix: pass array
                const result = results[0]; // We only passed one

                // Fire event and log
                if (result.operation === 'create' && result.newMemory) {
                    eventBus.emit('memory:created', result.newMemory);
                    this.auditLogger?.log({
                        action: 'create',
                        entityType: 'memory',
                        entityId: result.newMemory.id,
                        actorId: 'system',
                        description: `Extracted fact: ${fact.content.fact}`,
                        metadata: { sessionId: session.id, topic: fact.content.topic, details: `Extracted fact: ${fact.content.fact} from session ${session.id}` }
                    });
                } else if (result.operation === 'update' && result.newMemory) {
                    eventBus.emit('memory:updated', result.newMemory);
                    this.auditLogger?.log({
                        action: 'update',
                        entityType: 'memory',
                        entityId: result.newMemory.id,
                        actorId: 'system',
                        description: `Updated fact: ${fact.content.fact}`,
                        metadata: { sessionId: session.id, previousMemoryId: result.previousMemory?.id }
                    });
                } else if (result.operation === 'delete') { // 'ignore' is not valid AuditAction, mapped to 'delete' (discard) or I need to add 'ignore' to AuditAction type. 
                    this.auditLogger?.log({
                        action: 'delete',
                        entityType: 'memory',
                        entityId: fact.id,
                        actorId: 'system',
                        description: `Discarded new memory: ${fact.content.fact}`,
                        metadata: { sessionId: session.id, existingMemoryId: result.memoryId, reason: 'Redundant' }
                    });
                }
            }
            // Simplified event for bulk
            // eventBus.emit('memory:consolidated', ...); 
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            eventBus.emitError(error, { context: 'MemoryGeneration', sessionId: session.id });
        }
    }
    /**
     * Extract memories from events using LLM
     */
    private async extractMemories(
        session: Session,
        events: Event[]
    ): Promise<Memory[]> {
        const conversationText = events
            .map(e => `${e.role}: ${extractEventText(e)}`)
            .join('\n');

        const topicsConfig = this.config.topics
            ?.map(t => `- ${t.label}: ${t.description}`)
            .join('\n');

        const prompt = `Analyze the following conversation and extract meaningful memories about the user.
Focus on the following topics:
${topicsConfig}

Return the result as a JSON array of objects with the following structure:
[
  {
    "fact": "The extracted fact or preference",
    "topic": "The matching topic label",
    "confidence": 0.0 to 1.0 score
  }
]

Only extract information that is explicitly stated or strongly implied. Do not extract trivial or temporary information.

Conversation:
${conversationText}

Extracted Memories (JSON):`;

        try {
            const response = await this.llmProvider.complete(prompt, {
                temperature: 0.1,
                maxTokens: 1000,
            });

            // Parse JSON response (handling potential markdown code blocks)
            const jsonStr = response.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            // Handle both formats: array or { memories: [] }
            const extractedItems: Array<{
                fact: string;
                topic: string;
                confidence: number;
            }> = Array.isArray(parsed) ? parsed : (parsed.memories || []);

            // Convert to Memory objects
            const memories: Memory[] = await Promise.all(
                extractedItems.map(async item => {
                    const memory: Memory = {
                        id: generateId(),
                        userId: session.userId,
                        appId: session.appId,
                        scope: 'user', // Default to user scope
                        type: 'declarative', // Default to declarative
                        content: {
                            fact: item.fact,
                            topic: item.topic,
                        },
                        provenance: {
                            sourceType: 'user_input', // Assumed from conversation
                            sessionId: session.id,
                            sourceEventIds: events.map(e => e.id),
                            confidence: item.confidence,
                            corroborationCount: 1,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };

                    // Generate embedding for the memory content
                    try {
                        memory.embedding = await this.llmProvider.embed(item.fact);
                    } catch (e) {
                        console.warn('Failed to generate embedding for memory', e);
                    }

                    return memory;
                })
            );

            return memories;

        } catch (error) {
            console.warn('Memory extraction failed', error);
            return [];
        }
    }

    /**
     * Consolidate new memories with existing ones
     */
    private async consolidateMemories(
        userId: string,
        newMemories: Memory[]
    ): Promise<ConsolidationResult[]> {
        const results: ConsolidationResult[] = [];

        for (const newMemory of newMemories) {
            // Search for similar existing memories
            let queryEmbedding: number[] | undefined;
            try {
                queryEmbedding = await this.llmProvider.embed(newMemory.content.fact);
            } catch (e) {
                console.warn('Failed to generate embedding for consolidation query', e);
            }

            const similar = await this.storage.search({
                userId,
                query: newMemory.content.fact,
                queryEmbedding,
                topK: 3,
                minConfidence: 0.7, // Only consider high-confidence matches
            });

            if (similar.length === 0 || similar[0].relevanceScore < 0.85) {
                // No conflict/duplication found, create new
                const created = await this.storage.create(newMemory);
                eventBus.emit('memory:created', created);
                results.push({
                    operation: 'create',
                    memoryId: created.id,
                    newMemory: created,
                });
            } else {
                // High similarity found - potential duplicate or update
                const existingResult = similar[0];
                const existingMemory = existingResult.memory;

                const decision = await this.decideConsolidation(
                    existingMemory,
                    newMemory
                );

                if (decision.action === 'merge') {
                    // Update existing memory
                    existingMemory.content.fact = decision.mergedFact;
                    existingMemory.updatedAt = new Date();
                    existingMemory.provenance.corroborationCount += 1;
                    // Weighted average of confidence
                    existingMemory.provenance.confidence =
                        (existingMemory.provenance.confidence * existingMemory.provenance.corroborationCount + newMemory.provenance.confidence) /
                        (existingMemory.provenance.corroborationCount + 1);

                    // Re-embed if content changed
                    if (decision.mergedFact !== existingMemory.content.fact) {
                        existingMemory.embedding = await this.llmProvider.embed(decision.mergedFact);
                    }

                    const updated = await this.storage.update(existingMemory);
                    eventBus.emit('memory:updated', updated);
                    results.push({
                        operation: 'update',
                        memoryId: updated.id,
                        previousMemory: existingResult.memory, // Pass the old state
                        newMemory: updated,
                        reason: 'Merged with new information',
                    });

                } else if (decision.action === 'replace') {
                    // Overwrite
                    existingMemory.content = newMemory.content;
                    existingMemory.updatedAt = new Date();
                    existingMemory.provenance = newMemory.provenance;
                    existingMemory.embedding = newMemory.embedding;

                    const updated = await this.storage.update(existingMemory);
                    eventBus.emit('memory:updated', updated);
                    results.push({
                        operation: 'update',
                        memoryId: updated.id,
                        previousMemory: existingResult.memory,
                        newMemory: updated,
                        reason: 'Replaced by newer information',
                    });
                } else {
                    // Ignore new memory (keep existing)
                    results.push({
                        operation: 'delete', // Effectively discarding the new one (not strictly a delete from DB)
                        memoryId: newMemory.id,
                        reason: 'Discarded as redundant',
                    });
                }
            }
        }

        return results;
    }

    /**
     * Use LLM to decide how to consolidate two similar memories
     */
    private async decideConsolidation(
        existing: Memory,
        incoming: Memory
    ): Promise<{ action: 'merge' | 'replace' | 'ignore'; mergedFact: string }> {
        const prompt = `Compare these two memories about the same topic for a user.
Existing Memory: "${existing.content.fact}" (Confidence: ${existing.provenance.confidence})
New Memory: "${incoming.content.fact}" (Confidence: ${incoming.provenance.confidence})

Determine the best action:
- MERGE: Combine them if they are complementary.
- REPLACE: The new memory is a correction or an update (e.g., status changed).
- IGNORE: The new memory is redundant or less detailed than the existing one.

Return JSON:
{
  "action": "MERGE" | "REPLACE" | "IGNORE",
  "mergedFact": "The combined fact if MERGE, else the new fact or existing fact"
}`;

        try {
            const response = await this.llmProvider.complete(prompt, { maxTokens: 200 });
            const jsonStr = response.replace(/```json\n?|\n?```/g, '').trim();
            const result = JSON.parse(jsonStr);

            return {
                action: result.action.toLowerCase(),
                mergedFact: result.mergedFact,
            };
        } catch (e) {
            // Fallback: if very similar, ignore new. Else keep both (this logic is simplified)
            return { action: 'ignore', mergedFact: existing.content.fact };
        }
    }

    /**
     * Retrieve memories relevant to a query
     */
    async retrieveRelevantMemories(
        userId: string,
        query: string,
        limit: number = 5
    ): Promise<Memory[]> {
        let queryEmbedding: number[] | undefined;
        if (query) {
            try {
                queryEmbedding = await this.llmProvider.embed(query);
            } catch (e) {
                console.warn('Failed to generate embedding for retrieval query', e);
            }
        }

        const results = await this.storage.search({
            userId,
            query,
            queryEmbedding,
            topK: limit,
            minConfidence: 0.5,
        });

        const memories = results.map(r => r.memory);

        // Mark as accessed asynchronously (fire and forget or await if needed)
        // We await to ensure persistence logic is safe
        if (memories.length > 0) {
            await this.storage.markAccessed(memories.map(m => m.id));
        }

        eventBus.emit('memory:retrieved', userId, memories);
        return memories;
    }

    /**
     * Retrieve all memories for a user (for context window injection)
     */
    async getAllUserMemories(userId: string): Promise<Memory[]> {
        const memories = await this.storage.listByUser(userId);
        return memories;
    }
    /**
     * Directly store a memory (for CQRS or manual overrides)
     */
    async storeMemory(memory: Memory): Promise<Memory> {
        const created = await this.storage.create(memory);
        eventBus.emit('memory:created', created);
        return created;
    }

    /**
     * Update an existing memory manually
     */
    async updateMemory(memoryId: string, updates: { fact?: string; scope?: any }): Promise<Memory> {
        const existing = await this.storage.get(memoryId);
        if (!existing) {
            throw new ContextEngineError(ContextEngineErrorCode.MEMORY_NOT_FOUND, `Memory ${memoryId} not found`);
        }

        let updated = false;

        if (updates.fact && updates.fact !== existing.content.fact) {
            existing.content.fact = updates.fact;
            // Re-embed
            try {
                existing.embedding = await this.llmProvider.embed(updates.fact);
            } catch (e) {
                console.warn('Failed to re-embed memory on update', e);
            }
            updated = true;
        }

        if (updates.scope && updates.scope !== existing.scope) {
            existing.scope = updates.scope;
            updated = true;
        }

        if (updated) {
            existing.updatedAt = new Date();
            // Reset decay? Yes, modification implies freshness.
            existing.lastAccessedAt = new Date();

            await this.storage.update(existing);
            eventBus.emit('memory:updated', existing);
        }

        return existing;
    }
}
