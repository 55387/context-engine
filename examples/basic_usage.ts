import {
    ContextEngine,
    SessionManager,
    MemoryManager,
    InMemorySessionStorage,
    InMemoryMemoryStorage,
    MockLLMProvider,
    eventBus,
} from '../src/context-engine';

async function main() {
    console.log('🚀 Starting Context Engine Demo...\n');

    // 1. Initialize Components
    const llmProvider = new MockLLMProvider();

    const sessionStorage = new InMemorySessionStorage();
    const memoryStorage = new InMemoryMemoryStorage();

    const sessionManager = new SessionManager(sessionStorage, {
        llmProvider,
        compactionConfig: {
            strategy: 'hybrid',
            trigger: 'count_based',
            maxTurns: 5 // Low number to trigger compaction easily in demo
        }
    });

    const memoryManager = new MemoryManager(memoryStorage, llmProvider, {
        async: true,
        maxMemories: 10
    });

    const engine = new ContextEngine({
        sessionManager,
        memoryManager,
        llmProvider,
        systemInstructions: 'You are a helpful assistant for the Context Engine demo.'
    });

    // 2. Setup Event Listeners for visibility
    eventBus.on('session:created', (s) => console.log(`[Event] Session created: ${s.id}`));
    eventBus.on('memory:created', (m) => console.log(`[Event] Memory created: "${m.content.fact}"`));
    eventBus.on('session:compacted', (_, summary) => console.log(`[Event] Session compacted. Summary: "${summary}"`));
    eventBus.on('memory:retrieved', (_, memories) => {
        if (memories.length > 0) {
            console.log(`[Event] Retrieved ${memories.length} relevant memories`);
        }
    });

    // 3. Create a Session
    const session = await sessionManager.createSession({
        userId: 'user-123',
        initialState: {
            theme: 'dark'
        }
    });

    console.log('\n--- Turn 1: Initial Greeting ---');
    let response = await engine.processTurn(session.id, "Hi, I'm doing some coding today.");
    console.log('Agent:', response);

    console.log('\n--- Turn 2: Stating Preference ---');
    response = await engine.processTurn(session.id, "I prefer writing TypeScript over Python.");
    console.log('Agent:', response);

    // Wait a bit for async memory generation to happen
    await new Promise(r => setTimeout(r, 1000));

    console.log('\n--- Turn 3: Checking Memory Retrieval ---');
    // The system should retrieve the preference mentioned above
    response = await engine.processTurn(session.id, "Which language should I use for this new project?");
    console.log('Agent:', response);

    console.log('\n--- Turn 4: Triggering Compaction (simulate many turns) ---');
    // Add dummy events to force compaction
    for (let i = 0; i < 6; i++) {
        await sessionManager.addEvent(session.id, {
            id: `dummy-${i}`,
            role: 'user',
            type: 'user_input',
            parts: [{ type: 'text', text: `Dummy message ${i}` }],
            timestamp: new Date()
        });
        await sessionManager.addEvent(session.id, {
            id: `dummy-resp-${i}`,
            role: 'model',
            type: 'agent_response',
            parts: [{ type: 'text', text: `Dummy response ${i}` }],
            timestamp: new Date()
        });
    }

    response = await engine.processTurn(session.id, "What was the summary of our chat?");
    console.log('Agent:', response);

    // Allow background tasks to finish
    await new Promise(r => setTimeout(r, 2000));
    console.log('\nDemo complete!');
}

main().catch(console.error);
