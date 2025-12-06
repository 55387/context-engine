import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { InMemorySessionStorage } from '../src/context-engine/storage/InMemorySessionStorage';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { Event } from '../src/context-engine/types';
import { userEvent, agentEvent } from '../src/context-engine/utils';

describe('SessionManager', () => {
    let sessionManager: SessionManager;
    let storage: InMemorySessionStorage;
    let llmProvider: MockLLMProvider;

    beforeEach(() => {
        storage = new InMemorySessionStorage();
        llmProvider = new MockLLMProvider();
        sessionManager = new SessionManager(storage, {
            llmProvider,
            compactionConfig: {
                strategy: 'truncate_oldest',
                maxTurns: 3,
                overlapSize: 1
            }
        });
    });

    it('should create a session', async () => {
        const session = await sessionManager.createSession({ userId: 'user-1' });
        expect(session.id).toBeDefined();
        expect(session.userId).toBe('user-1');
        expect(session.events).toEqual([]);
    });

    it('should add events', async () => {
        const session = await sessionManager.createSession({ userId: 'user-1' });
        const event = userEvent('Hello');

        await sessionManager.addEvent(session.id, event);

        const retrieved = await sessionManager.getSession(session.id);
        expect(retrieved.events).toHaveLength(1);
        expect(retrieved.events[0].id).toBe(event.id);
    });

    it('should compact events based on turn count (truncate)', async () => {
        const session = await sessionManager.createSession({ userId: 'user-1' });

        // Add 5 events (limit is 3 turns + 1 overlap = 4 events max ideally, but let's check logic)
        // Actually strategy: keep maxTurns + overlap. 
        // maxTurns=3 means we keep 3 *most recent* turns??? No, usually means count.
        // In code: keepCount = maxTurns + overlap = 3 + 1 = 4.

        for (let i = 0; i < 5; i++) {
            await sessionManager.addEvent(session.id, userEvent(`msg-${i}`));
        }

        const retrieved = await sessionManager.getSession(session.id);
        // Should have triggered compaction. 5 events > 4 keepCount.
        // Should keep last 4.
        expect(retrieved.events).toHaveLength(4);
        expect(retrieved.events[retrieved.events.length - 1].parts[0].text).toBe('msg-4');
        expect(retrieved.events[0].parts[0].text).toBe('msg-1'); // msg-0 removed
    });

    it('should support state updates', async () => {
        const session = await sessionManager.createSession({
            userId: 'user-1',
            initialState: { counter: 0 }
        });

        await sessionManager.updateState(session.id, { counter: 1, newField: 'test' });

        const retrieved = await sessionManager.getSession(session.id);
        expect(retrieved.state).toEqual({ counter: 1, newField: 'test' });
    });

    it('should retrieve last N events', async () => {
        const session = await sessionManager.createSession({ userId: 'user-1' });
        await sessionManager.addEvent(session.id, userEvent('1'));
        await sessionManager.addEvent(session.id, userEvent('2'));
        await sessionManager.addEvent(session.id, userEvent('3'));

        const last2 = await sessionManager.getLastEvents(session.id, 2);
        expect(last2).toHaveLength(2);
        // @ts-ignore
        expect(last2[0].parts[0].text).toBe('2');
        // @ts-ignore
        expect(last2[1].parts[0].text).toBe('3');
    });
});
