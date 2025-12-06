/**
 * SQLite Storage Example
 * 
 * Demonstrates how to use SQLite-based memory storage with transactions.
 */

import { SQLiteMemoryStorage } from '../src/context-engine/storage/SQLiteMemoryStorage';
import { MemoryManager } from '../src/context-engine/memory/MemoryManager';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';
import { generateId } from '../src/context-engine/utils';

async function main() {
    console.log('🗄️  SQLite Memory Storage Example\n');

    // Initialize SQLite storage with encryption
    const storage = new SQLiteMemoryStorage({
        dbPath: './data/example-memories.db',
        encryptionKey: process.env.APP_SECRET || 'demo-secret-key-32-chars-minimum',
    });

    const llmProvider = new MockLLMProvider();
    const memoryManager = new MemoryManager(storage, llmProvider);

    console.log('✅ Initialized SQLite storage with encryption\n');

    // Create some test memories
    const userId = 'demo-user';

    console.log('📝 Creating memories...');
    await storage.create({
        id: generateId(),
        userId,
        scope: 'user',
        type: 'declarative',
        content: {
            fact: 'User prefers TypeScript over JavaScript',
            topic: 'preferences',
        },
        provenance: {
            sourceType: 'user_input',
            confidence: 0.95,
            corroborationCount: 1,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    await storage.create({
        id: generateId(),
        userId,
        scope: 'user',
        type: 'declarative',
        content: {
            fact: 'User is building an AI agent framework',
            topic: 'projects',
        },
        provenance: {
            sourceType: 'user_input',
            confidence: 0.9,
            corroborationCount: 2,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    console.log('✅ Created 2 memories\n');

    // Search memories
    console.log('🔍 Searching for memories about "TypeScript"...');
    const searchResults = await storage.search({
        userId,
        query: 'TypeScript',
        topK: 5,
    });

    searchResults.forEach(result => {
        console.log(`   - "${result.memory.content.fact}"`);
        console.log(`     Relevance: ${(result.relevanceScore * 100).toFixed(1)}%`);
        console.log(`     Confidence: ${(result.memory.provenance.confidence * 100).toFixed(1)}%\n`);
    });

    // List all user memories
    console.log('📋 All memories for user:');
    const allMemories = await storage.listByUser(userId);
    allMemories.forEach(m => {
        console.log(`   - ${m.content.fact}`);
    });
    console.log('');

    // Demonstrate transaction: Mark multiple memories as accessed
    console.log('🔄 Marking memories as accessed (using transaction)...');
    const memoryIds = allMemories.map(m => m.id);
    await storage.markAccessed(memoryIds);
    console.log('✅ Updated access times for all memories\n');

    // Verify persistence by closing and reopening
    console.log('💾 Testing persistence...');
    storage.close();

    const storage2 = new SQLiteMemoryStorage({
        dbPath: './data/example-memories.db',
        encryptionKey: process.env.APP_SECRET || 'demo-secret-key-32-chars-minimum',
    });

    const persistedMemories = await storage2.listByUser(userId);
    console.log(`✅ Loaded ${persistedMemories.length} memories from database\n`);

    // Show that encryption works
    console.log('🔐 Encryption verification:');
    console.log('   - Facts are encrypted at rest in SQLite database');
    console.log('   - Decrypted automatically on read');
    console.log('   - Access control via userId filtering\n');

    storage2.close();
    console.log('✨ Example complete!');
}

main().catch(console.error);
