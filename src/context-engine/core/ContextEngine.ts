/**
 * Context Engine
 * 
 * The main orchestrator that integrates Session Management and Memory Management
 * to provide a stateful, context-aware agent experience.
 */

import { SessionManager } from '../session/SessionManager';
import { MemoryManager } from '../memory/MemoryManager';
import {
    LLMProvider,
    SessionConfig,
    MemoryGenerationConfig,
    PreparedContext,
    ContentPart,
    Role,
    Event,
    Session,
    ContextEngineError,
    ContextEngineErrorCode,
    Memory,
    AuditLogger,
} from '../types';
import {
    userEvent,
    agentEvent,
    deepMerge,
    deepClone,
} from '../utils';
import { eventBus } from './EventEmitter';
import { AuthorizationService } from '../security/AuthorizationService';
import { Logger } from '../observability/Logger';
import { MetricsCollector } from '../observability/Metrics';

export interface ContextEngineConfig {
    sessionManager: SessionManager;
    memoryManager: MemoryManager;
    llmProvider: LLMProvider;
    systemInstructions?: string;
    /** Maximum number of tokens allowed in the context window */
    maxContextTokens?: number;
    auditLogger?: AuditLogger; // Added
    /** Authorization Service for access control */
    authService?: AuthorizationService;
    logger?: Logger;
    metrics?: MetricsCollector;
}

export class ContextEngine {
    private sessionManager: SessionManager;
    private memoryManager: MemoryManager;
    private llmProvider: LLMProvider;
    private systemInstructions: string;
    private maxContextTokens: number;
    private auditLogger?: AuditLogger; // Added
    private authService?: AuthorizationService;
    private logger?: Logger;
    private metrics?: MetricsCollector;

    constructor(config: ContextEngineConfig) {
        this.sessionManager = config.sessionManager;
        this.memoryManager = config.memoryManager;
        this.llmProvider = config.llmProvider;
        this.systemInstructions = config.systemInstructions || 'You are a helpful AI assistant.';
        this.maxContextTokens = config.maxContextTokens || 4000; // Default to a safe limit
        this.auditLogger = config.auditLogger; // Added
        this.authService = config.authService;
        this.logger = config.logger;
        this.metrics = config.metrics;
    }

    /**
     * Process a single turn of conversation
     */
    async processTurn(
        sessionId: string,
        message: string | ContentPart[],
        actorId?: string // Added optional actorId for auth
    ): Promise<string> {
        const startTime = Date.now();

        // 1. Fetch Session
        const session = await this.sessionManager.findSession(sessionId);
        if (!session) {
            console.log(`[ContextEngine] Session ${sessionId} not found. Recording metric.`);
            if (this.metrics) {
                this.metrics.increment('session_not_found_errors', 1, { sessionId });
            } else {
                console.log('[ContextEngine] Metrics collector not configured.');
            }
            throw new ContextEngineError(
                ContextEngineErrorCode.SESSION_NOT_FOUND,
                `Session ${sessionId} not found`
            );
        }

        // 1.5 Authorization Check
        if (actorId && this.authService) {
            this.authService.verifyRead(actorId, session, 'Session');
            // Assuming write access is also needed to append events
            this.authService.verifyWrite(actorId, session, 'Session');
        }

        // 2. Add User Event
        const userEvt = typeof message === 'string'
            ? userEvent(message)
            : {
                id: userEvent('').id,
                type: 'user_input' as const,
                role: 'user' as const,
                parts: message,
                timestamp: new Date()
            }; // Helper for multi-part not fully implemented in utils yet, doing manually or simple text

        await this.sessionManager.addEvent(session.id, userEvt);

        // 3. Retrieve Context (Memories + History)
        const context = await this.prepareContext(session, userEvt);

        // 4. Call LLM
        eventBus.emit('context:prepared', session.id, context.estimatedTokens);

        // Track Prompt Tokens
        this.metrics?.histogram('token_usage_prompt', context.estimatedTokens, { sessionId: session.id, model: 'unknown' });

        // In a real implementation this would handle tools, etc.
        // Here we do a simple completion call
        const llmStart = Date.now();
        const responseText = await this.llmProvider.complete(
            this.constructPrompt(context)
        );
        const llmDuration = Date.now() - llmStart;
        this.metrics?.histogram('llm_latency_ms', llmDuration, { sessionId: session.id });

        // Estimate completion tokens
        const completionTokens = await this.llmProvider.countTokens(responseText);
        this.metrics?.histogram('token_usage_completion', completionTokens, { sessionId: session.id });
        this.metrics?.increment('token_usage_total', context.estimatedTokens + completionTokens, { sessionId: session.id });

        // 5. Add Agent Event
        const agentEvt = agentEvent(responseText);
        await this.sessionManager.addEvent(session.id, agentEvt);

        // 6. Trigger Memory Generation (Background)
        // Pass newly created events
        const newEvents = [userEvt, agentEvt];
        this.memoryManager.generateMemoriesFromSession(session, newEvents).catch(console.error);

        // Metrics: Turn Latency
        const duration = Date.now() - startTime;
        this.metrics?.histogram('turn_latency_ms', duration, { sessionId: session.id });
        this.metrics?.increment('turns_processed', 1, { sessionId: session.id });

        return responseText;
    }

    /**
     * Prepare the full context for the LLM
     */
    async prepareContext(session: Session, currentEvent: Event): Promise<PreparedContext> {
        // A. Retrieve relevant memories based on the current user message
        let query = '';
        if (currentEvent.parts) {
            query = currentEvent.parts
                .filter((p: ContentPart) => p.type === 'text')
                .map((p: ContentPart) => p.text)
                .join(' ');
        }

        const relevantMemories = await this.memoryManager.retrieveRelevantMemories(
            session.userId,
            query,
            5 // Top 5 relevant memories
        );

        // B. Get Recent History (optionally with tool outputs, etc.)
        // We already have the full session, but maybe we want a window
        const history = await this.sessionManager.getConversationHistory(session.id);

        // C. Construct System Prompt with Memories
        const memoryContext = relevantMemories.length > 0
            ? `\n\nActive Memories about User:\n${relevantMemories.map((m: Memory) => `- ${m.content.fact}`).join('\n')}`
            : '';

        const fullSystemPrompt = `${this.systemInstructions}${memoryContext}`;

        // D. Estimate Tokens and Enforce Budget
        const systemTokens = await this.llmProvider.countTokens(fullSystemPrompt);
        let historyTokens = 0;
        for (const evt of history) {
            // Rough estimation for parts, ideally verify part types
            const text = evt.parts.map(p => (p.type === 'text' ? p.text : '')).join(' ');
            historyTokens += await this.llmProvider.countTokens(text);
        }

        const totalEstimated = systemTokens + historyTokens;

        // Check budget
        if (totalEstimated > this.maxContextTokens) {
            const tokensToCut = totalEstimated - this.maxContextTokens;
            // Trigger Compaction Event
            eventBus.emit('context:compactionTriggered', session.id, 'token_budget_exceeded');

            // Simple strategy: remove oldest messages until fit
            // In production, SessionManager should handle this, but as a failsafe:
            let cutCount = 0;
            while (history.length > 1 && (systemTokens + historyTokens) > this.maxContextTokens) {
                const removed = history.shift(); // Remove oldest
                if (removed) {
                    const text = removed.parts.map(p => (p.type === 'text' ? p.text : '')).join(' ');
                    const removedTokens = await this.llmProvider.countTokens(text);
                    historyTokens -= removedTokens;
                    cutCount++;
                }
            }
            if (cutCount > 0) {
                const msg = `Token budget exceeded. Dropped ${cutCount} oldest events.`;
                this.logger?.warn(msg, { sessionId: session.id, cutCount });
                if (!this.logger) console.warn(`[ContextEngine] ${msg}`);
            }
        }

        return {
            systemPrompt: fullSystemPrompt,
            messages: history.map((evt: Event) => ({
                role: evt.role,
                content: evt.parts
            })),
            conversationHistory: history,
            estimatedTokens: systemTokens + historyTokens,
            metadata: {
                sessionId: session.id,
                memoryCount: relevantMemories.length,
                historyEventCount: history.length,
                compacted: false
            }
        };
    }

    /**
     * Convert PreparedContext to a string prompt (Simple concatenation for now)
     */
    private constructPrompt(context: PreparedContext): string {
        let prompt = `System: ${context.systemPrompt}\n\n`;

        for (const msg of context.messages) {
            const content = Array.isArray(msg.content)
                ? msg.content.map(p => p.text || '[Non-text content]').join('')
                : msg.content;
            prompt += `${msg.role.toUpperCase()}: ${content}\n`;
        }

        prompt += `MODEL:`;
        return prompt;
    }
}
