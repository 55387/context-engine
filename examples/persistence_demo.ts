
import path from 'path';
import dotenv from 'dotenv';
import { ContextEngine } from '../src/context-engine/core/ContextEngine';
import { GeminiLLMProvider } from '../src/context-engine/providers/GeminiLLMProvider';
import { SessionManager } from '../src/context-engine/session/SessionManager';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { FileSystemSessionStorage } from '../src/context-engine/storage/FileSystemSessionStorage';
import { FileSystemMemoryStorage } from '../src/context-engine/storage/FileSystemMemoryStorage';
import { InMemoryAuditLogger } from '../src/context-engine/audit/InMemoryAuditLogger';
import { eventBus } from '../src/context-engine/core/EventEmitter';
import { Memory } from '../src/context-engine/types';

// Load environment variables
dotenv.config();

async function main() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('Error: GOOGLE_API_KEY not found in .env file');
        process.exit(1);
    }

    console.log('🚀 Starting Persistence Demo (持久化演示)...');

    // 1. Setup Persistent Storage (in ./data directory)
    const dataDir = path.join(__dirname, '../data');
    console.log(`📁 Data Directory: ${dataDir}`);

    const sessionStorage = new FileSystemSessionStorage({ baseDir: dataDir });
    // Use an encryption key for security at rest!
    const memoryStorage = new FileSystemMemoryStorage({
        baseDir: dataDir,
        encryptionKey: process.env.ENCRYPTION_KEY || 'default-demo-key'
    });

    // 2. Initialize Components
    const llmProvider = new GeminiLLMProvider(
        apiKey,
        process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    );

    // Audit Logger to see what's happening
    const auditLogger = new InMemoryAuditLogger();

    const sessionManager = new SessionManager(sessionStorage);
    const memoryManager = new MemoryManager(memoryStorage, llmProvider, { async: false }, auditLogger); // Async false for demo clarity

    const engine = new ContextEngine({
        sessionManager,
        memoryManager,
        llmProvider,
        auditLogger,
        systemInstructions: '你是一个乐于助人的中文AI助手。请用简短的中文回答用户。'
    });

    const userId = 'user_demo_persistence';

    // 3. Check State
    const existingMemories = await memoryStorage.listByUser(userId);
    const isFirstRun = existingMemories.length === 0;

    if (isFirstRun) {
        console.log('\n--- 🟢 Run 1: Initialization (第一次运行: 初始化) ---');
        console.log('System: No existing memories found. Creating new session.');

        const session = await sessionManager.createSession({ userId });

        const input1 = "你好！我是陈明。我是一名资深全栈工程师，最近在研究 Context Engineering。我非常喜欢 Rust 语言。";
        console.log(`\n👤 User: ${input1}`);

        const response1 = await engine.processTurn(session.id, input1);
        console.log(`🤖 Agent: ${response1}`);

        console.log('\n⏳ Waiting for memory consolidation...');
        // In real app this is async, but we forced async: false so it's already done in processTurn

        // Verify what happened
        const logs = await auditLogger.query({ action: 'create' });
        console.log(`\n📋 Audit Log (New Memories):`);
        logs.forEach(l => console.log(` - [${l.entityType}] ${l.description}`));

        console.log('\n✅ Run 1 Complete. Data has been saved to disk.');
        console.log('👉 Please run this script again to test "Long Term Memory" recall.');

    } else {
        console.log('\n--- 🟠 Run 2: Recall (第二次运行: 记忆唤醒) ---');
        console.log(`System: Found ${existingMemories.length} existing memories on disk.`);

        // Show what we loaded (decrypted)
        console.log('🧠 Loaded Memories:');
        existingMemories.forEach(m => console.log(` - ${m.content.fact} [Emb: ${!!m.embedding}, ID: ${m.id}]`));

        const session = await sessionManager.createSession({ userId }); // New session, different ID

        const input2 = "我上次跟你提过我最喜欢哪种编程语言吗？还有我最近在研究什么？";
        console.log(`\n👤 User: ${input2}`);

        // Hook for debugging retrieval
        eventBus.on('memory:retrieved', (uid: string, memories: Memory[]) => {
            console.log(`🔍 Debug: Retrieved ${memories.length} memories for query.`);
            memories.forEach(m => console.log(`   -> ${m.content.fact}`));
        });

        const response2 = await engine.processTurn(session.id, input2);
        console.log(`🤖 Agent: ${response2}`);

        console.log('\n✅ Run 2 Complete. The agent successfully recalled information from the previous run!');

        // Cleanup option
        // await memoryStorage.deleteByUser(userId);
        // console.log('Data cleared for next demo.');
    }
}

main().catch(console.error);
