
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextEngine } from '../src/context-engine/core/ContextEngine';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { InMemorySessionStorage } from '../src/context-engine/storage/InMemorySessionStorage';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { AuthorizationService } from '../src/context-engine/security/AuthorizationService';
import { ContextEngineErrorCode } from '../src/context-engine/types';

describe('Authorization', () => {
    let engine: ContextEngine;
    let sessionManager: SessionManager;
    let authService: AuthorizationService;

    beforeEach(() => {
        const sessionStorage = new InMemorySessionStorage();
        const memoryStorage = new InMemoryMemoryStorage();
        const llmProvider = new MockLLMProvider();
        authService = new AuthorizationService(); // Default OwnershipPolicy

        sessionManager = new SessionManager(sessionStorage);
        const memoryManager = new MemoryManager(memoryStorage, llmProvider);

        engine = new ContextEngine({
            sessionManager,
            memoryManager,
            llmProvider,
            authService
        });
    });

    it('should allow access when actorId matches session owner', async () => {
        const session = await sessionManager.createSession({ userId: 'owner_user' });

        // Should not throw
        await expect(engine.processTurn(session.id, 'Hello', 'owner_user')).resolves.toBeTruthy();
    });

    it('should deny access when actorId does not match session owner', async () => {
        const session = await sessionManager.createSession({ userId: 'owner_user' });

        // Should throw PERMISSION_ERROR
        await expect(engine.processTurn(session.id, 'Hello', 'intruder'))
            .rejects
            .toThrowError(/Access Denied/);
    });

    it('should allow access if auth is optional (no actorId passed)', async () => {
        const session = await sessionManager.createSession({ userId: 'owner_user' });
        // Legacy behavior compatibility
        await expect(engine.processTurn(session.id, 'Hello')).resolves.toBeTruthy();
    });
});
