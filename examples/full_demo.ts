
import { ContextEngine } from '../src/context-engine/core/ContextEngine';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { FileSystemSessionStorage } from '../src/context-engine/storage/FileSystemSessionStorage';
import { FileSystemMemoryStorage } from '../src/context-engine/storage/FileSystemMemoryStorage';
import { GeminiLLMProvider } from '../src/context-engine/providers/GeminiLLMProvider';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { AuthorizationService } from '../src/context-engine/security/AuthorizationService';
import { defaultLogger } from '../src/context-engine/observability/Logger';
import { defaultMetrics } from '../src/context-engine/observability/Metrics';
import { ConfigLoader } from '../src/context-engine/config/Config';
import { CommandBus } from '../src/context-engine/domain/cqrs/CQRS';
import { UpdateMemoryHandler, UpdateMemoryCommand } from '../src/context-engine/domain/cqrs/UpdateMemoryHandler';
import readline from 'readline';
import path from 'path';

// --- Setup & Configuration ---
const config = ConfigLoader.load();
const BASE_DIR = path.resolve(__dirname, '../data');

console.log('--- Context Engine Full Integration Demo ---');
console.log(`Base Directory: ${BASE_DIR}`);

// 1. Storage (FileSystem for persistence)
const sessionStorage = new FileSystemSessionStorage({
    baseDir: BASE_DIR
});
const memoryStorage = new FileSystemMemoryStorage({
    baseDir: BASE_DIR,
    encryptionKey: config.storage.encryptionKey // Fixed to use correct config structure
});

// 2. LLM Provider (Gemini or Mock)
const apiKey = config.llm.apiKey; // Fixed to use correct config structure
const llmProvider = apiKey
    ? new GeminiLLMProvider(apiKey)
    : new MockLLMProvider();

console.log(`Using LLM Provider: ${llmProvider.constructor.name}${apiKey ? ' (with API key)' : ' (mock mode)'}`);

// 3. Components
const sessionManager = new SessionManager(sessionStorage, {
    llmProvider,
    compactionConfig: {
        strategy: 'hybrid', // Showcasing advanced compaction
        maxTurns: 10
    }
});

const memoryManager = new MemoryManager(memoryStorage, llmProvider);

// 4. Cross-Cutting Concerns (Security, Observability)
const authService = new AuthorizationService();

// 5. CQRS Setup
const commandBus = new CommandBus();
commandBus.register('UpdateMemory', new UpdateMemoryHandler(memoryManager));

// 6. Engine Assembly
const engine = new ContextEngine({
    sessionManager,
    memoryManager,
    llmProvider,
    authService,
    logger: defaultLogger,
    metrics: defaultMetrics,
    auditLogger: {
        log: async (entry) => {
            console.log(`[AUDIT] ${entry.actorId} ${entry.action} ${entry.entityType}:${entry.entityId}`);
        },
        query: async () => []
    }
});

// --- CLI Interface ---

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question: string): Promise<string> => {
    return new Promise(resolve => rl.question(question, resolve));
};

async function main() {
    // A. Login
    const userId = await ask('Enter User ID (e.g., alice): ') || 'alice';
    const actorId = userId; // In this demo, user is the actor
    console.log(`Logged in as: ${userId}`);

    // B. Session
    console.log('Creating session...');
    const session = await sessionManager.createSession({ userId });
    console.log(`Session Created: ${session.id}`);

    // C. Interaction Loop
    let running = true;
    while (running) {
        console.log('\n--- Options ---');
        console.log('1. Chat (Normal Interaction)');
        console.log('2. View Memories');
        console.log('3. Edit Memory (CQRS)');
        console.log('4. View Metrics');
        console.log('5. Switch User (Test Auth)');
        console.log('6. Exit');

        const choice = await ask('Select option: ');

        try {
            switch (choice) {
                case '1': {
                    const msg = await ask('You: ');
                    if (!msg.trim()) break;

                    process.stdout.write('AI: Thinking...');
                    const response = await engine.processTurn(session.id, msg, actorId);

                    // Clear "Thinking..."
                    readline.clearLine(process.stdout, 0);
                    readline.cursorTo(process.stdout, 0);

                    console.log(`AI: ${response}`);
                    break;
                }
                case '2': {
                    const memories = await memoryManager.getAllUserMemories(userId);
                    console.log(`\nFound ${memories.length} memories for ${userId}:`);
                    memories.forEach(m => {
                        console.log(`[${m.id}] (${m.type}) ${m.content.fact}`);
                        console.log(`   Confidence: ${m.provenance.confidence}, Accessed: ${m.lastAccessedAt?.toISOString() || 'Never'}`);
                    });
                    break;
                }
                case '3': {
                    const memId = await ask('Enter Memory ID to edit: ');
                    const newFact = await ask('Enter new fact: ');

                    console.log('Dispatching UpdateMemory Command...');
                    await commandBus.execute('UpdateMemory', new UpdateMemoryCommand(memId, { fact: newFact }));
                    console.log('Memory updated successfully.');
                    break;
                }
                case '4': {
                    const snapshot = defaultMetrics.getSnapshot();
                    console.log('\n--- Metrics Snapshot ---');
                    console.log(JSON.stringify(snapshot, null, 2));
                    break;
                }
                case '5': {
                    const otherUser = await ask('Enter other User ID to impersonate: ');
                    // Attempt to access current session with other user ID
                    console.log(`Attempting to access ${userId}'s session as ${otherUser}...`);
                    try {
                        await engine.processTurn(session.id, "Hello", otherUser);
                    } catch (e: any) {
                        console.error(`Access Denied: ${e.message}`);
                    }
                    break;
                }
                case '6': {
                    running = false;
                    break;
                }
                default:
                    console.log('Invalid option');
            }
        } catch (e: any) {
            console.error(`Error: ${e.message}`);
        }
    }

    rl.close();
}

main().catch(console.error);
