#!/usr/bin/env node
import { parseArgs } from 'util';
import { ContextEngine } from '../context-engine/core/ContextEngine';
import { SessionManager } from '../context-engine/session/SessionManager';
import { MemoryManager } from '../context-engine/memory/MemoryManager';
import { FileSystemSessionStorage } from '../context-engine/storage/FileSystemSessionStorage';
import { FileSystemMemoryStorage } from '../context-engine/storage/FileSystemMemoryStorage';
import { GeminiLLMProvider } from '../context-engine/providers/GeminiLLMProvider';
import { MockLLMProvider } from '../context-engine/providers/MockLLMProvider';
import { AuthorizationService } from '../context-engine/security/AuthorizationService';
import { defaultLogger } from '../context-engine/observability/Logger';
import { defaultMetrics } from '../context-engine/observability/Metrics';
import { ConfigLoader } from '../context-engine/config/Config';
import path from 'path';
import readline from 'readline';

// Config & Setup
const config = ConfigLoader.load();
const BASE_DIR = config.storage.baseDir;

// Initialize Services
const sessionStorage = new FileSystemSessionStorage({ baseDir: BASE_DIR });
const memoryStorage = new FileSystemMemoryStorage({
    baseDir: BASE_DIR,
    encryptionKey: config.storage.encryptionKey
});

const apiKey = config.llm.apiKey;
const llmProvider = apiKey ? new GeminiLLMProvider(apiKey) : new MockLLMProvider();

console.log(`Using LLM Provider: ${llmProvider.constructor.name}${apiKey ? ' (with API key)' : ' (mock mode)'}`);

const sessionManager = new SessionManager(sessionStorage, {
    llmProvider,
    compactionConfig: { strategy: 'hybrid', maxTurns: 20 }
});
const memoryManager = new MemoryManager(memoryStorage, llmProvider);
const authService = new AuthorizationService();

const engine = new ContextEngine({
    sessionManager,
    memoryManager,
    llmProvider,
    authService,
    logger: defaultLogger,
    metrics: defaultMetrics
});

// CLI Logic
async function main() {
    const { values, positionals } = parseArgs({
        args: process.argv.slice(2),
        options: {
            user: { type: 'string', short: 'u', default: 'default-user' },
            help: { type: 'boolean', short: 'h' },
            debug: { type: 'boolean', short: 'd' }
        },
        allowPositionals: true
    });

    if (values.help || positionals.length === 0) {
        showHelp();
        return;
    }

    const command = positionals[0];
    const userId = values.user!;

    try {
        switch (command) {
            case 'chat':
                await startChat(userId);
                break;
            case 'memories':
                await listMemories(userId);
                break;
            case 'session':
                await showSession(userId);
                break;
            default:
                console.error(`Unknown command: ${command}`);
                showHelp();
        }
    } catch (error: any) {
        console.error('Error:', error.message);
        if (values.debug) console.error(error);
    }
}

function showHelp() {
    console.log(`
Context Engine CLI

Usage:
  context-engine <command> [options]

Commands:
  chat        Start an interactive chat session
  memories    List long-term memories for a user
  session     Show current session details

Options:
  -u, --user  User ID (default: default-user)
  -h, --help  Show this help message
  -d, --debug Enable debug output
    `);
}

async function startChat(userId: string) {
    console.log(`Starting chat for user: ${userId}`);
    const session = await sessionManager.createSession({ userId });
    console.log(`Session ID: ${session.id}`);
    console.log('Type "exit" to quit.\n');

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>(r => rl.question(q, r));

    while (true) {
        const input = await ask('You: ');
        if (input.toLowerCase() === 'exit') break;
        if (!input.trim()) continue;

        process.stdout.write('AI: Thinking...');
        const response = await engine.processTurn(session.id, input, userId);

        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        console.log(`AI: ${response}`);
    }
    rl.close();
}

async function listMemories(userId: string) {
    const memories = await memoryManager.getAllUserMemories(userId);
    if (memories.length === 0) {
        console.log(`No memories found for user ${userId}.`);
        return;
    }
    console.log(`Memories for ${userId} (${memories.length}):`);
    memories.forEach(m => {
        console.log(`- [${m.id}] ${m.content.fact} (Confidence: ${m.provenance.confidence})`);
    });
}

async function showSession(userId: string) {
    const sessions = await sessionManager.listUserSessions(userId, 5);
    if (sessions.length === 0) {
        console.log(`No active sessions for user ${userId}.`);
        return;
    }
    console.log(`Recent Sessions for ${userId}:`);
    for (const s of sessions) {
        console.log(`- ${s.id} (Turns: ${s.events.length / 2}, Updated: ${s.updatedAt.toISOString()})`);
    }
}

main();
