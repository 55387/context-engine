
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryMetricsCollector } from '../src/context-engine/observability/Metrics';
import { ContextEngine } from '../src/context-engine/core/ContextEngine';
import { InMemorySessionStorage } from '../src/context-engine/storage/InMemorySessionStorage';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';

describe('Metrics', () => {
    let metrics: InMemoryMetricsCollector;
    let engine: ContextEngine;
    let sessionManager: SessionManager;

    beforeEach(() => {
        metrics = new InMemoryMetricsCollector();
        const sessionStorage = new InMemorySessionStorage();
        const memoryStorage = new InMemoryMemoryStorage();
        const llmProvider = new MockLLMProvider();

        sessionManager = new SessionManager(sessionStorage);
        const memoryManager = new MemoryManager(memoryStorage, llmProvider);

        engine = new ContextEngine({
            sessionManager,
            memoryManager,
            llmProvider,
            metrics
        });
    });

    it('should track turn metrics', async () => {
        const session = await sessionManager.createSession({ userId: 'u1' });

        await engine.processTurn(session.id, 'Hello metrics');

        const snapshot = metrics.getSnapshot();

        // Counters
        const turnCount = snapshot['turns_processed{sessionId="' + session.id + '"}'];
        expect(turnCount).toBe(1);

        const totalTokens = snapshot['token_usage_total{sessionId="' + session.id + '"}'];
        expect(totalTokens).toBeGreaterThan(0);

        // Histograms
        const turnLatency = snapshot['turn_latency_ms{sessionId="' + session.id + '"}'];
        expect(turnLatency.count).toBe(1);
        expect(turnLatency.avg).toBeGreaterThan(0);

        const llmLatency = snapshot['llm_latency_ms{sessionId="' + session.id + '"}'];
        expect(llmLatency.count).toBe(1);
    });

    it('should track logic errors', async () => {
        metrics.increment('manual_check', 1);
        try {
            await engine.processTurn('invalid-session', 'msg');
        } catch (e) {
            // Expected
        }

        const snapshot = metrics.getSnapshot();
        console.log('Snapshot keys:', Object.keys(snapshot));

        expect(snapshot['manual_check']).toBe(1);

        const keys = Object.keys(snapshot);
        const errorKey = keys.find(k => k.startsWith('session_not_found_errors'));
        expect(errorKey).toBeDefined();
        expect(snapshot[errorKey!]).toBe(1);
    });
});
