
import { describe, it, expect, beforeEach } from 'vitest';
import { ContextEngine } from '../src/context-engine/core/ContextEngine';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { InMemorySessionStorage } from '../src/context-engine/storage/InMemorySessionStorage';
import { InMemoryMemoryStorage } from '../src/context-engine/storage/InMemoryMemoryStorage';
import { ScriptedLLMProvider } from './utils/ScriptedLLMProvider';
import { InMemoryMetricsCollector } from '../src/context-engine/observability/Metrics';

describe('E2E Scenario: Long Term Memory', () => {
    let engine: ContextEngine;
    let llm: ScriptedLLMProvider;
    let metrics: InMemoryMetricsCollector;
    let sessionManager: SessionManager;

    beforeEach(() => {
        const sessionStorage = new InMemorySessionStorage();
        const memoryStorage = new InMemoryMemoryStorage();
        llm = new ScriptedLLMProvider('Default response');
        metrics = new InMemoryMetricsCollector();

        sessionManager = new SessionManager(sessionStorage, {
            // Aggressive compaction config to force memory usage
            compactionConfig: {
                strategy: 'truncate_oldest',
                maxTurns: 4, // Keep very short history
                trigger: 'count_based'
            }
        });
        const memoryManager = new MemoryManager(memoryStorage, llm, {
            // Auto generate memories
            // We need to trick the memory manager to extract facts from our scripted responses
        });

        engine = new ContextEngine({
            sessionManager,
            memoryManager,
            llmProvider: llm,
            metrics
        });
    });

    it('should maintain context across session compaction via memory', async () => {
        // Default for extraction
        llm.on('Analyze the following conversation', JSON.stringify({ memories: [] }));

        // Specific Extraction
        // Needs to be longer than the default extraction trigger
        const specificTrigger = 'Analyze the following conversation';
        // We assume the prompt structure roughly. Or just match a unique combo.
        // The extraction prompt contains the user message.
        llm.on('Analyze the following conversation', JSON.stringify({ memories: [] }));

        // Improve trigger for extraction:
        // MemoryManager puts the conversation in the prompt.
        // We can match "User: My favorite color is blue" inside the extraction prompt?
        // But we also have "User: My favorite color is blue" trigger for the normal turn.
        // We need to distinguish ContextEngine prompt vs MemoryManager prompt.
        // ContextEngine prompt ends with "MODEL:". MemoryManager prompt starts with "Analyze".

        // Turn Response
        llm.on('User: My favorite color is blue', 'I noted that.');

        // Extraction Response
        // Must be longer than "Analyze..." and "User: ...".
        // "Analyze" + "User: ..." combined.
        llm.on('Analyze the following conversation', JSON.stringify({ memories: [] }));
        llm.on('Analyze the following conversation', JSON.stringify({ memories: [] })); // Duplicate?

        // Actually, let's just use specific strings.
        // Trigger for extraction of blue color:
        llm.on('Analyze the following conversation', JSON.stringify({ memories: [] })); // Default fallback
        llm.on('Analyze the following conversation', JSON.stringify({ memories: [] }));

        // Wait, Map overrides.
        // I should set 'Analyze...' to Empty JSON.
        // And 'Analyze... User: My favorite color is blue' to Correct JSON.
        // But I don't know the exact spacing in MemoryManager.
        // It is `Analyze the following conversation... \n\n${text}`.

        // Let's use a unique token in the script for simplicity? No, I can't change MemoryManager code just for test.
        // I will use a very long trigger for the specific case.
        // "User: My favorite color is blue" is in the prompt.
        // "Analyze" is in the prompt.
        // Trigger: "Analyze the following conversation" + "User: My favorite color is blue" (wildcard?)
        // ScriptedLLM does `includes`.

        // So I'll register:
        // "My favorite color is blue" -> "I noted that." (Used for Chat)
        // "Analyze the following conversation" -> Empty JSON.
        // "Analyze the following conversation" AND "blue" -> JSON.
        // But ScriptedLLM only accepts ONE string trigger.

        // I'll register a trigger that effectively covers the extraction prompt for that specific turn.
        // "Analyze the following conversation" is ~32 chars.
        // "User: My favorite color is blue" is ~30 chars.
        // If I make a trigger like "Analyze the following conversation" + (some spacing/context) + "blue", it might fail if spacing varies.

        // Alternative: Just rely on "Analyze..." being the main one, and I will inject the memory manually for robustness as I originally thought.
        // Testing Memory Manager extraction logic is done in `memory.test.ts`.
        // Here I want E2E context survival.
        // So I will inject the memory directly to storage, and focus on context retrieval and compaction.

        await engine['memoryManager'].storeMemory({
            id: 'mem1',
            userId: 'u1',
            scope: 'user',
            type: 'declarative',
            content: { fact: "User's favorite color is blue" },
            provenance: { confidence: 1, corroborationCount: 1 } as any,
            createdAt: new Date(),
            updatedAt: new Date(),
            embedding: new Array(10).fill(0) // Mock embedding
        });

        // 2. Start Session
        llm.on('My favorite color is blue', 'I noted that.');
        const session = await sessionManager.createSession({ userId: 'u1' });

        // 3. User provides info (Even though we injected memory, we simulate conversation to fill history)
        await engine.processTurn(session.id, "My favorite color is blue");

        // 4. Fill up history
        llm.on('Chat', 'Response'); // Default for chats
        for (let i = 0; i < 6; i++) {
            llm.on(`Chat ${i}`, `Response ${i}`);
            // Register extraction fallback for these turns so they don't error
            // Trigger: "Analyze ... Chat ${i}" -> Empty JSON
            // We can just rely on generic "Analyze" trigger if we register `Analyze` -> Empty JSON.
            // As long as "Chat X" triggers are shorter than "Analyze", extraction will pick "Analyze".
            // "Chat X" is 6 chars. "Analyze..." is 32. So Extraction picks "Analyze" -> Empty JSON. Correct.
            // Turn picks "Chat X" -> Response. Correct.
            await engine.processTurn(session.id, `Chat ${i}`);
        }

        // 5. Verify Compaction
        const history = await sessionManager.getSession(session.id).then(s => s.events);
        const hasOriginalMsg = history.some(e =>
            e.parts.some(p => p.type === 'text' && p.text?.includes("My favorite color is blue"))
        );
        expect(hasOriginalMsg).toBe(false);

        // 6. Retrieval
        llm.on("Active Memories about User", 'Your favorite color is blue.');
        llm.on("What is my favorite color?", "I don't know.");

        const response = await engine.processTurn(session.id, "What is my favorite color?");

        expect(response).toBe('Your favorite color is blue.');
    });
});
