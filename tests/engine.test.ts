import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextEngine } from '../src/context-engine/core/ContextEngine';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { InMemorySessionStorage } from '../src/context-engine/storage/InMemorySessionStorage';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { eventBus } from '../src/context-engine/core/EventEmitter';

describe('ContextEngine', () => {
    let engine: ContextEngine;
    let sessionManager: SessionManager;
    let memoryManager: MemoryManager;
    let llmProvider: MockLLMProvider;

    beforeEach(() => {
        const sessionStorage = new InMemorySessionStorage();
        const memoryStorage = new InMemoryMemoryStorage();
        llmProvider = new MockLLMProvider();

        sessionManager = new SessionManager(sessionStorage, { llmProvider });
        memoryManager = new MemoryManager(memoryStorage, llmProvider, { async: true });

        engine = new ContextEngine({
            sessionManager,
            memoryManager,
            llmProvider,
            systemInstructions: 'Test System Prompt'
        });
    });

    it('should process a complete turn', async () => {
        const session = await sessionManager.createSession({ userId: 'u1' });
        const sessionId = session.id;

        const response = await engine.processTurn(sessionId, 'Hello AI');

        // 1. Check response
        expect(response).toBeDefined();

        // 2. Check session events (1 user + 1 agent)
        const history = await sessionManager.getConversationHistory(sessionId);
        expect(history).toHaveLength(2);
        expect(history[0].role).toBe('user');
        expect(history[1].role).toBe('model');

        // 3. Memory generation is async, so we can't easily await it here without hooks,
        // but we can check if the method was called if we spied on it, or wait a bit.
        // For this test, we assume if no error thrown, it's good.
    });

    it('should inject specific memories into prompt', async () => {
        // Inject a memory first
        const memoryStorage = (memoryManager as any).storage;
        await memoryStorage.create({
            id: 'm1',
            userId: 'u1',
            scope: 'user',
            type: 'declarative',
            content: { fact: 'SecretKeyword' },
            provenance: { sourceType: 'user_input', confidence: 1, corroborationCount: 1 },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const session = await sessionManager.createSession({ userId: 'u1' });

        // Spy on LLM complete to check the prompt
        const spy = vi.spyOn(llmProvider, 'complete');

        await engine.processTurn(session.id, 'Query with SecretKeyword');

        expect(spy).toHaveBeenCalled();
        const callArgs = spy.mock.calls[0];
        const prompt = callArgs[0] as string;

        // Check if the memory was injected into the prompt
        expect(prompt).toContain('SecretKeyword');
        expect(prompt).toContain('Test System Prompt');
    });

    it('should emit events during processing', async () => {
        const session = await sessionManager.createSession({ userId: 'u1' });

        const emitSpy = vi.spyOn(eventBus, 'emit');

        await engine.processTurn(session.id, 'Hello');

        expect(emitSpy).toHaveBeenCalled();
        // Check for specific event type
        const calls = emitSpy.mock.calls;
        const prepareEvent = calls.find(call => call[0] === 'context:prepared');
        expect(prepareEvent).toBeDefined();
    });

    it('should log memory creation to audit log', async () => {
        const auditLogger = {
            log: vi.fn(),
            query: vi.fn()
        };

        const storage = new InMemoryMemoryStorage(); // Define storage for this test
        const auditedMemoryManager = new MemoryManager(storage, llmProvider, { async: false }, auditLogger);

        const auditedEngine = new ContextEngine({
            sessionManager,
            memoryManager: auditedMemoryManager,
            llmProvider,
            auditLogger: auditLogger
        });

        const session = await sessionManager.createSession({ userId: 'u_audit' });

        // Spy on LLM extraction to force a result that triggers create
        vi.spyOn(llmProvider, 'complete').mockResolvedValue(JSON.stringify([{
            fact: 'User loves auditing',
            topic: 'user_preference',
            confidence: 0.95
        }]));

        // Trigger memory creation logic
        const events = [
            { id: 'e1', type: 'user_input' as const, role: 'user' as const, parts: [{ type: 'text' as const, text: 'I love auditing' }], timestamp: new Date() }
        ];

        // Manually trigger memory extraction to verify audit log (easier than full engine turn)
        await auditedMemoryManager.generateMemoriesFromSession(session, events);

        // Verify audit log called
        expect(auditLogger.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'create',
            entityType: 'memory',
            actorId: 'system'
        }));
    });

    it('should enforce token budget by pruning history', async () => {
        // Create an engine with a very small token limit
        const smallEngine = new ContextEngine({
            sessionManager,
            memoryManager,
            llmProvider,
            maxContextTokens: 10 // Very small limit
        });

        const session = await sessionManager.createSession({ userId: 'u1' });
        // Add multiple events to fill up history
        await sessionManager.addEvent(session.id, { id: '1', type: 'user_input', role: 'user', parts: [{ type: 'text', text: 'Long message 1' }], timestamp: new Date() });
        await sessionManager.addEvent(session.id, { id: '2', type: 'agent_response', role: 'model', parts: [{ type: 'text', text: 'Long response 1' }], timestamp: new Date() });
        await sessionManager.addEvent(session.id, { id: '3', type: 'user_input', role: 'user', parts: [{ type: 'text', text: 'Target message' }], timestamp: new Date() });

        // Mock countTokens to return high enough value to trigger limit
        vi.spyOn(llmProvider, 'countTokens').mockResolvedValue(5);
        // 3 msgs * 5 = 15 + system prompt > 10. Should drop oldest.

        const spy = vi.spyOn(console, 'warn');

        await smallEngine.processTurn(session.id, 'New input'); // This adds one more event before processing context

        expect(spy).toHaveBeenCalledWith(expect.stringContaining('Token budget exceeded'));
    });
});
