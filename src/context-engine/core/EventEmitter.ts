/**
 * Event Emitter for Context Engine
 * 
 * Provides event-driven architecture for decoupled components
 */

import EventEmitter from 'eventemitter3';
import { Session, Event, Memory, ConsolidationResult } from '../types';

/**
 * Context Engine events
 */
export interface ContextEngineEvents {
    // Session events
    'session:created': (session: Session) => void;
    'session:updated': (session: Session) => void;
    'session:deleted': (sessionId: string) => void;
    'session:eventAdded': (sessionId: string, event: Event) => void;
    'session:stateUpdated': (sessionId: string, state: Record<string, unknown>) => void;
    'session:compacted': (sessionId: string, summary: string) => void;

    // Memory events
    'memory:created': (memory: Memory) => void;
    'memory:updated': (memory: Memory) => void;
    'memory:deleted': (memoryId: string) => void;
    'memory:consolidated': (results: ConsolidationResult[]) => void;
    'memory:extracted': (sessionId: string, memories: Memory[]) => void;
    'memory:retrieved': (userId: string, memories: Memory[]) => void;

    // Context events
    'context:prepared': (sessionId: string, tokenCount: number) => void;
    'context:compactionTriggered': (sessionId: string, reason: string) => void;

    // Error events
    'error': (error: Error, context?: Record<string, unknown>) => void;
}

/**
 * Typed event emitter for Context Engine
 */
export class ContextEventEmitter extends EventEmitter<ContextEngineEvents> {
    /**
     * Emit an error event
     */
    emitError(error: Error, context?: Record<string, unknown>): void {
        this.emit('error', error, context);
    }

    /**
     * Wait for an event to occur
     */
    waitFor<K extends keyof ContextEngineEvents>(
        event: K,
        timeoutMs: number = 30000
    ): Promise<Parameters<ContextEngineEvents[K]>> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.off(event, handler as any);
                reject(new Error(`Timeout waiting for event: ${String(event)}`));
            }, timeoutMs);

            const handler = ((...args: Parameters<ContextEngineEvents[K]>) => {
                clearTimeout(timeout);
                resolve(args);
            }) as ContextEngineEvents[K];

            this.once(event, handler as any);
        });
    }
}

/**
 * Global event bus instance
 */
export const eventBus = new ContextEventEmitter();
