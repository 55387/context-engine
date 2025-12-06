/**
 * Context Engine Type Definitions
 * 
 * Core types for sessions, memory, events, and context management
 * based on the Context Engineering whitepaper.
 */

// ==================== Event Types ====================

/**
 * Role in a conversation - either user or model (agent)
 */
export type Role = 'user' | 'model';

/**
 * Event types that can occur in a session
 */
export type EventType =
    | 'user_input'      // Message from the user
    | 'agent_response'  // Agent's reply
    | 'tool_call'       // Agent's decision to use a tool
    | 'tool_output'     // Data returned from a tool
    | 'system';         // System-level events

/**
 * Content part - can be text, image, audio, or other data
 */
export interface ContentPart {
    type: 'text' | 'image' | 'audio' | 'video' | 'file';
    text?: string;
    data?: Uint8Array;
    mimeType?: string;
    uri?: string;
}

/**
 * A single event in the conversation history
 */
export interface Event {
    id: string;
    type: EventType;
    role: Role;
    parts: ContentPart[];
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

/**
 * Tool call representation
 */
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

/**
 * Tool output representation
 */
export interface ToolOutput {
    callId: string;
    result: unknown;
    error?: string;
}

// ==================== Session Types ====================

/**
 * Session state - working memory for the current conversation
 */
export type SessionState = Record<string, unknown>;

/**
 * Session configuration options
 */
export interface SessionConfig {
    /** Maximum number of events to keep in history */
    maxEvents?: number;
    /** Maximum tokens allowed in context */
    maxTokens?: number;
    /** Time-to-live in milliseconds */
    ttlMs?: number;
    /** Enable automatic compaction */
    autoCompact?: boolean;
    /** Compaction interval (number of turns) */
    compactionInterval?: number;
}

/**
 * A session represents a single conversation
 */
export interface Session {
    id: string;
    userId: string;
    appId?: string;
    events: Event[];
    state: SessionState;
    createdAt: Date;
    updatedAt: Date;
    metadata?: Record<string, unknown>;
    config: SessionConfig;
}

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions {
    userId: string;
    appId?: string;
    initialState?: SessionState;
    config?: SessionConfig;
    metadata?: Record<string, unknown>;
}

// ==================== Memory Types ====================

/**
 * Memory scope - who/what the memory describes
 */
export type MemoryScope = 'user' | 'session' | 'application';

/**
 * Memory type based on cognitive science
 */
export type MemoryType = 'declarative' | 'procedural';

/**
 * Memory organization pattern
 */
export type MemoryOrganization = 'collection' | 'profile' | 'rolling_summary';

/**
 * Memory content - can be structured or unstructured
 */
export interface MemoryContent {
    /** The actual memory content */
    fact: string;
    /** Structured data if applicable */
    structured?: Record<string, unknown>;
    /** Topic/category label */
    topic?: string;
}

/**
 * Memory provenance - tracking origin and history
 */
export interface MemoryProvenance {
    /** Source type: bootstrapped, user_input, tool_output */
    sourceType: 'bootstrapped' | 'user_input' | 'tool_output' | 'implicit';
    /** Original session ID if applicable */
    sessionId?: string;
    /** Source event IDs that contributed to this memory */
    sourceEventIds?: string[];
    /** Confidence score (0-1) */
    confidence: number;
    /** Number of corroborating sources */
    corroborationCount: number;
}

/**
 * A single memory entry
 */
export interface Memory {
    id: string;
    userId: string;
    appId?: string;
    scope: MemoryScope;
    type: MemoryType;
    content: MemoryContent;
    provenance: MemoryProvenance;
    createdAt: Date;
    updatedAt: Date;
    /** Embedding vector for similarity search */
    embedding?: number[];
    /** Time-to-live date */
    expiresAt?: Date;
    /** Archival timestamp (soft delete) */
    archivedAt?: Date;
    /** Last time this memory was retrieved or used */
    lastAccessedAt?: Date;
    metadata?: Record<string, unknown>;
}

/**
 * Memory retrieval options
 */
export interface MemoryRetrievalOptions {
    userId: string;
    appId?: string;
    query?: string;
    /** Embedding vector for the query */
    queryEmbedding?: number[];
    scope?: MemoryScope[];
    type?: MemoryType[];
    topK?: number;
    minConfidence?: number;
    includeExpired?: boolean;
}

/**
 * Memory retrieval result with relevance score
 */
export interface MemorySearchResult {
    memory: Memory;
    relevanceScore: number;
    recencyScore: number;
    importanceScore: number;
    combinedScore: number;
}

/**
 * Topic definition for memory extraction
 */
export interface MemoryTopicDefinition {
    label: string;
    description: string;
    examples?: Array<{
        input: string;
        extractedFact: string;
    }>;
}

/**
 * Memory generation configuration
 */
export interface MemoryGenerationConfig {
    /** Topics to extract */
    topics?: MemoryTopicDefinition[];
    /** Run in background */
    async?: boolean;
    /** Maximum memories to generate per session */
    maxMemories?: number;
}

/**
 * Memory consolidation operation
 */
export type ConsolidationOperation = 'create' | 'update' | 'delete';

/**
 * Result of memory consolidation
 */
export interface ConsolidationResult {
    operation: ConsolidationOperation;
    memoryId: string;
    previousMemory?: Memory;
    newMemory?: Memory;
    reason?: string;
}

// ==================== Context Types ====================

/**
 * Context component types
 */
export interface ContextComponents {
    /** System instructions */
    systemInstructions?: string;
    /** Tool definitions */
    tools?: ToolDefinition[];
    /** Few-shot examples */
    fewShotExamples?: Event[];
    /** Retrieved memories */
    memories?: Memory[];
    /** External knowledge (RAG results) */
    externalKnowledge?: ExternalKnowledgeChunk[];
    /** Conversation history */
    conversationHistory: Event[];
    /** Current user prompt */
    userPrompt?: ContentPart[];
    /** Session state */
    state?: SessionState;
}

/**
 * Tool definition for context
 */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}

/**
 * External knowledge chunk from RAG
 */
export interface ExternalKnowledgeChunk {
    content: string;
    source: string;
    relevanceScore: number;
    metadata?: Record<string, unknown>;
}

/**
 * Prepared context for LLM call
 */
export interface PreparedContext {
    /** System prompt with memories and instructions */
    systemPrompt: string;
    /** Formatted conversation history */
    messages: Array<{
        role: Role;
        content: string | ContentPart[];
    }>;
    /** Raw conversation history events */
    conversationHistory: Event[];
    /** Available tools */
    tools?: ToolDefinition[];
    /** Token count estimate */
    estimatedTokens: number;
    /** Context metadata */
    metadata: {
        sessionId: string;
        memoryCount: number;
        historyEventCount: number;
        compacted: boolean;
    };
}

// ==================== Compaction Types ====================

/**
 * Compaction strategy
 */
export type CompactionStrategy =
    | 'truncate_oldest'      // Keep last N turns
    | 'token_limit'          // Truncate by token count
    | 'recursive_summary'    // Summarize older content
    | 'hybrid';              // Combination approach

/**
 * Compaction trigger type
 */
export type CompactionTrigger =
    | 'count_based'    // Triggered by turn count
    | 'token_based'    // Triggered by token count
    | 'time_based'     // Triggered by inactivity
    | 'event_based';   // Triggered by task completion

/**
 * Compaction configuration
 */
export interface CompactionConfig {
    strategy: CompactionStrategy;
    trigger: CompactionTrigger;
    /** For count-based: max turns to keep */
    maxTurns?: number;
    /** For token-based: max tokens */
    maxTokens?: number;
    /** For time-based: inactivity threshold in ms */
    inactivityThreshold?: number;
    /** Keep overlap for context */
    overlapSize?: number;
}

/**
 * Compaction result
 */
export interface CompactionResult {
    originalEventCount: number;
    compactedEventCount: number;
    summary?: string;
    removedEvents: Event[];
    tokensSaved: number;
}

// ==================== Storage Types ====================

/**
 * Storage backend interface for sessions
 */
export interface SessionStorage {
    create(session: Session): Promise<Session>;
    get(sessionId: string): Promise<Session | null>;
    update(session: Session): Promise<Session>;
    delete(sessionId: string): Promise<void>;
    listByUser(userId: string, limit?: number): Promise<Session[]>;
    appendEvent(sessionId: string, event: Event): Promise<void>;
    updateState(sessionId: string, state: SessionState): Promise<void>;
}

/**
 * Memory storage options
 */
export interface MemoryStorageOptions {
    namespace?: string;
}

/**
 * Interface for memory storage
 */
export interface MemoryStorage {
    create(memory: Memory): Promise<Memory>;
    get(memoryId: string): Promise<Memory | null>;
    update(memory: Memory): Promise<Memory>;
    delete(memoryId: string): Promise<void>;
    search(options: MemoryRetrievalOptions): Promise<MemorySearchResult[]>;
    listByUser(userId: string, limit?: number): Promise<Memory[]>;
    deleteByUser(userId: string): Promise<number>;
    /** Soft delete all memories for a user */
    deleteByUserSoft(userId: string): Promise<number>;
    /** Restore a soft-deleted memory */
    restore(memoryId: string): Promise<Memory | null>;
    deleteExpired(): Promise<number>;
    /** Mark memories as accessed */
    markAccessed(memoryIds: string[]): Promise<void>;
}

// ==================== Callback Types ====================

/**
 * Callback context for hooks
 */
export interface CallbackContext {
    session: Session;
    userId: string;
    appId?: string;
    currentEvent?: Event;
}

/**
 * Before model callback - modify request before LLM call
 */
export type BeforeModelCallback = (
    context: CallbackContext,
    preparedContext: PreparedContext
) => Promise<PreparedContext>;

/**
 * After model callback - process response after LLM call
 */
export type AfterModelCallback = (
    context: CallbackContext,
    response: Event
) => Promise<Event>;

/**
 * Memory trigger callback - decide when to generate memories
 */
export type MemoryTriggerCallback = (
    context: CallbackContext
) => Promise<boolean>;

// ==================== LLM Provider Types ====================

/**
 * LLM provider interface for memory operations
 */
export interface LLMProvider {
    /** Generate text completion */
    complete(prompt: string, options?: LLMOptions): Promise<string>;
    /** Generate embeddings */
    embed(text: string): Promise<number[]>;
    /** Count tokens in text */
    countTokens(text: string): Promise<number>;
}

/**
 * LLM options
 */
export interface LLMOptions {
    temperature?: number;
    maxTokens?: number;
    stopSequences?: string[];
}

// ==================== Error Types ====================

/**
 * Context Engine error codes
 */
export enum ContextEngineErrorCode {
    SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
    MEMORY_NOT_FOUND = 'MEMORY_NOT_FOUND',
    STORAGE_ERROR = 'STORAGE_ERROR',
    COMPACTION_ERROR = 'COMPACTION_ERROR',
    LLM_ERROR = 'LLM_ERROR',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    PERMISSION_ERROR = 'PERMISSION_ERROR',
}

/**
 * Custom error class for Context Engine
 */
export class ContextEngineError extends Error {
    constructor(
        public code: ContextEngineErrorCode,
        message: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ContextEngineError';
    }
}

// ==================== Audit Types ====================

export type AuditAction =
    | 'create' | 'update' | 'delete' | 'soft_delete' | 'restore'
    | 'read' | 'search' | 'compact' | 'extract';

export type AuditEntityType = 'session' | 'memory' | 'context';

export interface AuditLogEntry {
    id: string;
    timestamp: Date;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    actorId: string;
    description?: string;
    metadata?: Record<string, unknown>;
}

export interface AuditLogger {
    log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void>;
    query(filter: Partial<AuditLogEntry>): Promise<AuditLogEntry[]>;
}
