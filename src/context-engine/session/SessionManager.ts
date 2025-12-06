/**
 * Session Manager
 * 
 * Manages conversation sessions including:
 * - Session lifecycle (create, read, update, delete)
 * - Event handling and history management
 * - State management
 * - Compaction strategies
 */

import {
    Session,
    SessionConfig,
    SessionState,
    SessionStorage,
    Event,
    CreateSessionOptions,
    CompactionConfig,
    CompactionResult,
    CompactionStrategy,
    LLMProvider,
    ContextEngineError,
    ContextEngineErrorCode,
} from '../types';
import { generateId, estimateEventsTokens, extractEventText } from '../utils';
import { eventBus } from '../core/EventEmitter';

/**
 * Default session configuration
 */
const DEFAULT_SESSION_CONFIG: SessionConfig = {
    maxEvents: 100,
    maxTokens: 128000,
    autoCompact: true,
    compactionInterval: 20,
};

/**
 * Default compaction configuration
 */
const DEFAULT_COMPACTION_CONFIG: CompactionConfig = {
    strategy: 'truncate_oldest',
    trigger: 'count_based',
    maxTurns: 20,
    overlapSize: 2,
};

export class SessionManager {
    private storage: SessionStorage;
    private llmProvider?: LLMProvider;
    private compactionConfig: CompactionConfig;

    constructor(
        storage: SessionStorage,
        options?: {
            llmProvider?: LLMProvider;
            compactionConfig?: Partial<CompactionConfig>;
        }
    ) {
        this.storage = storage;
        this.llmProvider = options?.llmProvider;
        this.compactionConfig = {
            ...DEFAULT_COMPACTION_CONFIG,
            ...options?.compactionConfig,
        };
    }

    /**
     * Create a new session
     */
    async createSession(options: CreateSessionOptions): Promise<Session> {
        const session: Session = {
            id: generateId(),
            userId: options.userId,
            appId: options.appId,
            events: [],
            state: options.initialState || {},
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: options.metadata,
            config: { ...DEFAULT_SESSION_CONFIG, ...options.config },
        };

        const created = await this.storage.create(session);
        eventBus.emit('session:created', created);
        return created;
    }

    /**
     * Get a session by ID
     */
    async getSession(sessionId: string): Promise<Session> {
        const session = await this.storage.get(sessionId);
        if (!session) {
            throw new ContextEngineError(
                ContextEngineErrorCode.SESSION_NOT_FOUND,
                `Session with ID ${sessionId} not found`
            );
        }
        return session;
    }

    /**
     * Get a session by ID (returns null if not found)
     */
    async findSession(sessionId: string): Promise<Session | null> {
        return this.storage.get(sessionId);
    }

    /**
     * Update a session
     */
    async updateSession(session: Session): Promise<Session> {
        const updated = await this.storage.update(session);
        eventBus.emit('session:updated', updated);
        return updated;
    }

    /**
     * Delete a session
     */
    async deleteSession(sessionId: string): Promise<void> {
        await this.storage.delete(sessionId);
        eventBus.emit('session:deleted', sessionId);
    }

    /**
     * List sessions for a user
     */
    async listUserSessions(userId: string, limit?: number): Promise<Session[]> {
        return this.storage.listByUser(userId, limit);
    }

    /**
     * Add an event to a session
     */
    async addEvent(sessionId: string, event: Event): Promise<void> {
        await this.storage.appendEvent(sessionId, event);
        eventBus.emit('session:eventAdded', sessionId, event);

        // Check if compaction is needed
        const session = await this.getSession(sessionId);
        if (session.config.autoCompact) {
            await this.checkAndCompact(session);
        }
    }

    /**
     * Update session state
     */
    async updateState(
        sessionId: string,
        state: Partial<SessionState>
    ): Promise<void> {
        await this.storage.updateState(sessionId, state);
        eventBus.emit('session:stateUpdated', sessionId, state);
    }

    /**
     * Get the conversation history for a session
     */
    async getConversationHistory(sessionId: string): Promise<Event[]> {
        const session = await this.getSession(sessionId);
        return session.events;
    }

    /**
     * Get the last N events from a session
     */
    async getLastEvents(sessionId: string, count: number): Promise<Event[]> {
        const session = await this.getSession(sessionId);
        return session.events.slice(-count);
    }

    /**
     * Check if compaction is needed and perform it
     */
    async checkAndCompact(session: Session): Promise<CompactionResult | null> {
        const needsCompaction = this.needsCompaction(session);
        if (!needsCompaction) return null;

        return this.compactSession(session.id);
    }

    /**
     * Check if a session needs compaction
     */
    private needsCompaction(session: Session): boolean {
        const { trigger, maxTurns, maxTokens, inactivityThreshold } =
            this.compactionConfig;

        switch (trigger) {
            case 'count_based':
                return session.events.length > (maxTurns || 20);

            case 'token_based':
                const tokens = estimateEventsTokens(session.events);
                return tokens > (maxTokens || 100000);

            case 'time_based':
                const lastActivity = session.updatedAt.getTime();
                const now = Date.now();
                return now - lastActivity > (inactivityThreshold || 900000); // 15 min default

            case 'event_based':
                // Would need custom logic to detect task completion
                return false;

            default:
                return false;
        }
    }

    /**
     * Compact a session's history
     */
    async compactSession(sessionId: string): Promise<CompactionResult> {
        const session = await this.getSession(sessionId);
        const originalEventCount = session.events.length;
        const originalTokens = estimateEventsTokens(session.events);

        let compactedEvents: Event[];
        let summary: string | undefined;
        let removedEvents: Event[];

        switch (this.compactionConfig.strategy) {
            case 'truncate_oldest':
                ({ compactedEvents, removedEvents } = this.truncateOldest(session));
                break;

            case 'token_limit':
                ({ compactedEvents, removedEvents } = this.truncateByTokens(session));
                break;

            case 'recursive_summary':
                if (this.llmProvider) {
                    ({ compactedEvents, removedEvents, summary } =
                        await this.summarizeOlder(session));
                } else {
                    ({ compactedEvents, removedEvents } = this.truncateOldest(session));
                }
                break;

            case 'hybrid':
                if (this.llmProvider) {
                    ({ compactedEvents, removedEvents, summary } =
                        await this.hybridCompaction(session));
                } else {
                    ({ compactedEvents, removedEvents } = this.truncateByTokens(session));
                }
                break;

            default:
                ({ compactedEvents, removedEvents } = this.truncateOldest(session));
        }

        // Update session with compacted events
        session.events = compactedEvents;
        if (summary) {
            session.metadata = {
                ...session.metadata,
                lastCompactionSummary: summary,
                lastCompactionAt: new Date().toISOString(),
            };
        }

        await this.storage.update(session);
        eventBus.emit('context:compactionTriggered', sessionId, this.compactionConfig.strategy);

        if (summary) {
            eventBus.emit('session:compacted', sessionId, summary);
        }

        const compactedTokens = estimateEventsTokens(compactedEvents);

        return {
            originalEventCount,
            compactedEventCount: compactedEvents.length,
            summary,
            removedEvents,
            tokensSaved: originalTokens - compactedTokens,
        };
    }

    /**
     * Truncate oldest events (keep last N)
     */
    private truncateOldest(session: Session): {
        compactedEvents: Event[];
        removedEvents: Event[];
    } {
        const maxTurns = this.compactionConfig.maxTurns || 20;
        const overlapSize = this.compactionConfig.overlapSize || 2;
        const keepCount = maxTurns + overlapSize;

        if (session.events.length <= keepCount) {
            return {
                compactedEvents: [...session.events],
                removedEvents: [],
            };
        }

        const removedEvents = session.events.slice(0, -keepCount);
        const compactedEvents = session.events.slice(-keepCount);

        return { compactedEvents, removedEvents };
    }

    /**
     * Truncate by token count
     */
    private truncateByTokens(session: Session): {
        compactedEvents: Event[];
        removedEvents: Event[];
    } {
        const maxTokens = this.compactionConfig.maxTokens || 100000;
        const compactedEvents: Event[] = [];
        let tokenCount = 0;

        // Work backwards from most recent
        for (let i = session.events.length - 1; i >= 0; i--) {
            const event = session.events[i];
            const eventTokens = estimateEventsTokens([event]);

            if (tokenCount + eventTokens > maxTokens) {
                break;
            }

            compactedEvents.unshift(event);
            tokenCount += eventTokens;
        }

        const removedEvents = session.events.filter(
            e => !compactedEvents.includes(e)
        );

        return { compactedEvents, removedEvents };
    }

    /**
     * Summarize older events using LLM
     */
    private async summarizeOlder(session: Session): Promise<{
        compactedEvents: Event[];
        removedEvents: Event[];
        summary: string;
    }> {
        if (!this.llmProvider) {
            throw new ContextEngineError(
                ContextEngineErrorCode.LLM_ERROR,
                'LLM provider required for summarization'
            );
        }

        const maxTurns = this.compactionConfig.maxTurns || 20;
        const overlapSize = this.compactionConfig.overlapSize || 2;
        const keepCount = maxTurns + overlapSize;

        if (session.events.length <= keepCount) {
            return {
                compactedEvents: [...session.events],
                removedEvents: [],
                summary: '',
            };
        }

        const eventsToSummarize = session.events.slice(0, -keepCount);
        const eventsToKeep = session.events.slice(-keepCount);

        // Generate summary of older events
        const conversationText = eventsToSummarize
            .map(e => `${e.role}: ${extractEventText(e)}`)
            .join('\n');

        const summaryPrompt = `Summarize the following conversation, preserving key facts, decisions, and context that would be relevant for continuing the conversation:

${conversationText}

Summary:`;

        const summary = await this.llmProvider.complete(summaryPrompt, {
            temperature: 0.3,
            maxTokens: 500,
        });

        return {
            compactedEvents: eventsToKeep,
            removedEvents: eventsToSummarize,
            summary: summary.trim(),
        };
    }

    /**
     * Hybrid compaction: summarize + truncate
     */
    private async hybridCompaction(session: Session): Promise<{
        compactedEvents: Event[];
        removedEvents: Event[];
        summary: string;
    }> {
        // First summarize
        const summarized = await this.summarizeOlder(session);

        // Then ensure token limit
        const maxTokens = this.compactionConfig.maxTokens || 100000;
        const summaryTokens = this.llmProvider
            ? await this.llmProvider.countTokens(summarized.summary)
            : summarized.summary.length / 4;

        let finalEvents = summarized.compactedEvents;
        let eventTokens = estimateEventsTokens(finalEvents);

        // If still over limit, truncate more
        while (eventTokens + summaryTokens > maxTokens && finalEvents.length > 2) {
            finalEvents = finalEvents.slice(1);
            eventTokens = estimateEventsTokens(finalEvents);
        }

        return {
            compactedEvents: finalEvents,
            removedEvents: session.events.filter(e => !finalEvents.includes(e)),
            summary: summarized.summary,
        };
    }

    /**
     * Get session with filtered history (for context preparation)
     */
    async getSessionWithFilteredHistory(
        sessionId: string,
        options?: {
            maxTurns?: number;
            maxTokens?: number;
            includeToolOutputs?: boolean;
        }
    ): Promise<Session> {
        const session = await this.getSession(sessionId);
        let filteredEvents = [...session.events];

        // Filter out tool outputs if not needed
        if (options?.includeToolOutputs === false) {
            filteredEvents = filteredEvents.filter(e => e.type !== 'tool_output');
        }

        // Apply turn limit
        if (options?.maxTurns && filteredEvents.length > options.maxTurns) {
            filteredEvents = filteredEvents.slice(-options.maxTurns);
        }

        // Apply token limit
        if (options?.maxTokens) {
            let tokenCount = 0;
            const keptEvents: Event[] = [];

            for (let i = filteredEvents.length - 1; i >= 0; i--) {
                const event = filteredEvents[i];
                const eventTokens = estimateEventsTokens([event]);

                if (tokenCount + eventTokens > options.maxTokens) {
                    break;
                }

                keptEvents.unshift(event);
                tokenCount += eventTokens;
            }

            filteredEvents = keptEvents;
        }

        return {
            ...session,
            events: filteredEvents,
        };
    }
}
