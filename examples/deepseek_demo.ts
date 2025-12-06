
import path from 'path';
import dotenv from 'dotenv';
import { ContextEngine } from '../src/context-engine/core/ContextEngine';
import { DeepSeekLLMProvider } from '../src/context-engine/providers/DeepSeekLLMProvider';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { FileSystemSessionStorage } from '../src/context-engine/storage/FileSystemSessionStorage';
import { FileSystemMemoryStorage } from '../src/context-engine/storage/FileSystemMemoryStorage';
import { InMemoryAuditLogger } from '../src/context-engine/audit/InMemoryAuditLogger';

// Load environment variables
dotenv.config();

async function main() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        console.error('Error: DEEPSEEK_API_KEY not found in .env file');
        console.log('Skipping DeepSeek Demo.');
        process.exit(0);
    }

    console.log('🚀 Starting DeepSeek Demo...');

    const dataDir = path.join(__dirname, '../data_deepseek');

    // Setup storage
    const sessionStorage = new FileSystemSessionStorage({ baseDir: dataDir });
    const memoryStorage = new FileSystemMemoryStorage({
        baseDir: dataDir,
        encryptionKey: process.env.ENCRYPTION_KEY || 'deepseek-demo-key'
    });

    // Initialize DeepSeek Provider
    const llmProvider = new DeepSeekLLMProvider(apiKey);

    const auditLogger = new InMemoryAuditLogger();
    const sessionManager = new SessionManager(sessionStorage);

    // Note: Since DeepSeek provider in this demo might fail at embedding if not supported,
    // we should be careful. 
    // However, MemoryManager uses `llmProvider.embed`.
    // If DeepSeek API doesn't support embedding, this will crash.
    // For this demo, let's wrap it or assume the user knows.
    // Actually, let's use a Hybrid Router approach for a real robust demo?
    // Or just try. If it crashes, it crashes (and proves the test).

    console.log('⚠️ Note: DeepSeek API for embeddings might not be standard. Using it for chat only is safer.');
    console.log('   - If this crashes on embedding, consider using LLMRouter with OpenAI/Gemini for embedding.');

    const memoryManager = new MemoryManager(memoryStorage, llmProvider, { async: false }, auditLogger);

    const engine = new ContextEngine({
        sessionManager,
        memoryManager,
        llmProvider,
        auditLogger,
        systemInstructions: 'You are a helpful assistant powered by DeepSeek.'
    });

    const session = await sessionManager.createSession({ userId: 'deepseek_user' });

    console.log('\n👤 User: Hello DeepSeek! How are you?');
    const response = await engine.processTurn(session.id, 'Hello DeepSeek! How are you?');
    console.log(`🤖 DeepSeek: ${response}`);

    // Clean up
    await memoryStorage.deleteByUser('deepseek_user');
}

main().catch(console.error);
