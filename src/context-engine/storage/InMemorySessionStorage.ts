/**
 * In-Memory Session Storage
 * 
 * Simple in-memory implementation for development and testing.
 * For production, use a persistent storage backend.
 */

import {
    Session,
    SessionStorage,
    Event,
    SessionState,
    ContextEngineError,
    ContextEngineErrorCode,
} from '../types';
import { deepClone } from '../utils';

export class InMemorySessionStorage implements SessionStorage {
    private sessions: Map<string, Session> = new Map();

    async create(session: Session): Promise<Session> {
        if (this.sessions.has(session.id)) {
            throw new ContextEngineError(
                ContextEngineErrorCode.VALIDATION_ERROR,
                `Session with ID ${session.id} already exists`
            );
        }
        const clonedSession = deepClone(session);
        this.sessions.set(session.id, clonedSession);
        return deepClone(clonedSession);
    }

    async get(sessionId: string): Promise<Session | null> {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        // Check TTL
        if (session.config.ttlMs) {
            const expiresAt = new Date(
                session.updatedAt.getTime() + session.config.ttlMs
            );
            if (new Date() > expiresAt) {
                this.sessions.delete(sessionId);
                return null;
            }
        }

        return deepClone(session);
    }

    async update(session: Session): Promise<Session> {
        if (!this.sessions.has(session.id)) {
            throw new ContextEngineError(
                ContextEngineErrorCode.SESSION_NOT_FOUND,
                `Session with ID ${session.id} not found`
            );
        }
        const clonedSession = deepClone(session);
        clonedSession.updatedAt = new Date();
        this.sessions.set(session.id, clonedSession);
        return deepClone(clonedSession);
    }

    async delete(sessionId: string): Promise<void> {
        this.sessions.delete(sessionId);
    }

    async listByUser(userId: string, limit: number = 100): Promise<Session[]> {
        const userSessions: Session[] = [];

        for (const session of this.sessions.values()) {
            if (session.userId === userId) {
                userSessions.push(deepClone(session));
            }
        }

        // Sort by updatedAt descending
        userSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        return userSessions.slice(0, limit);
    }

    async appendEvent(sessionId: string, event: Event): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new ContextEngineError(
                ContextEngineErrorCode.SESSION_NOT_FOUND,
                `Session with ID ${sessionId} not found`
            );
        }

        session.events.push(deepClone(event));
        session.updatedAt = new Date();

        // Check max events limit
        if (session.config.maxEvents && session.events.length > session.config.maxEvents) {
            session.events = session.events.slice(-session.config.maxEvents);
        }
    }

    async updateState(sessionId: string, state: SessionState): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new ContextEngineError(
                ContextEngineErrorCode.SESSION_NOT_FOUND,
                `Session with ID ${sessionId} not found`
            );
        }

        session.state = { ...session.state, ...state };
        session.updatedAt = new Date();
    }

    /**
     * Clear all sessions (for testing)
     */
    clear(): void {
        this.sessions.clear();
    }

    /**
     * Get session count (for testing)
     */
    size(): number {
        return this.sessions.size;
    }

    /**
     * Clean up expired sessions
     */
    async cleanupExpired(): Promise<number> {
        let removed = 0;
        const now = new Date();

        for (const [id, session] of this.sessions.entries()) {
            if (session.config.ttlMs) {
                const expiresAt = new Date(
                    session.updatedAt.getTime() + session.config.ttlMs
                );
                if (now > expiresAt) {
                    this.sessions.delete(id);
                    removed++;
                }
            }
        }

        return removed;
    }
}
