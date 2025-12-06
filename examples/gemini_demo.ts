import { config } from 'dotenv';
import {
    ContextEngine,
    SessionManager,
    MemoryManager,
    InMemorySessionStorage,
    InMemoryMemoryStorage,
    GeminiLLMProvider,
    eventBus,
} from '../src/context-engine';

// Load environment variables
config();

async function main() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        console.error('❌ Error: GOOGLE_API_KEY is not defined in .env file');
        process.exit(1);
    }

    console.log('🚀 Starting Context Engine with Google Gemini...\n');

    // 1. Initialize Components
    const llmProvider = new GeminiLLMProvider(apiKey);
    const sessionStorage = new InMemorySessionStorage();
    const memoryStorage = new InMemoryMemoryStorage();

    // 2. Setup Managers
    const sessionManager = new SessionManager(sessionStorage, {
        llmProvider,
        compactionConfig: {
            strategy: 'recursive_summary', // Use smart LLM summarization
            trigger: 'count_based',
            maxTurns: 5
        }
    });

    const memoryManager = new MemoryManager(memoryStorage, llmProvider, {
        async: true,
        maxMemories: 20,
        topics: [
            { label: 'user_profile', description: '用户的名字、职业和个人详细信息' },
            { label: 'preferences', description: '用户的编码偏好和风格约束' },
            { label: 'project_context', description: '用户正在构建的项目详情' }
        ]
    });

    // 3. Initialize Engine
    const engine = new ContextEngine({
        sessionManager,
        memoryManager,
        llmProvider,
        systemInstructions: `你是一个拥有长期记忆的高级编程助手。
    在回答之前，请始终确认你所了解的关于用户的信息。`
    });

    // 4. Setup Visibility (Logs)
    eventBus.on('session:created', (s) => console.log(`[System] New Session: ${s.id}`));
    eventBus.on('memory:extracted', (_, memories) => {
        console.log(`[Memory] Extracted ${memories.length} new insights:`);
        memories.forEach(m => console.log(`   - [${m.content.topic}] ${m.content.fact}`));
    });
    eventBus.on('memory:consolidated', (results) => {
        results.forEach(r => {
            if (r.operation === 'update') {
                console.log(`[Memory] Updated knowledge: "${r.newMemory?.content.fact}" (Merged with previous)`);
            }
        });
    });
    eventBus.on('session:compacted', (_, summary) => {
        console.log(`[Session] History compacted. Summary: "${summary}"`);
    });

    // 5. Run Demo Scenario
    const userId = 'developer-001';
    const session = await sessionManager.createSession({ userId });

    console.log('\n--- Turn 1: Introduction (自我介绍) ---');
    let response = await engine.processTurn(session.id,
        "你好，我是 Alex。我是一名高级前端工程师，正在开发一个 React Native 应用。"
    );
    console.log('Gemini:', response);

    // Wait for async memory extraction
    console.log('...(Processing memories)...');
    await new Promise(r => setTimeout(r, 4000));

    console.log('\n--- Turn 2: Stating Constraints (声明偏好) ---');
    response = await engine.processTurn(session.id,
        "我严格偏好使用 Tailwind CSS 进行样式设计，即使在 React Native 中也是如此（使用 NativeWind）。"
    );
    console.log('Gemini:', response);

    await new Promise(r => setTimeout(r, 4000));

    console.log('\n--- Turn 3: Context Recall (新会话记忆召回) ---');
    // Simulate a new day/session to prove memory persistence
    const newSession = await sessionManager.createSession({ userId });
    console.log(`[System] Started fresh session ${newSession.id} for user ${userId}`);

    response = await engine.processTurn(newSession.id,
        "我需要设计一个按钮组件。给我一个代码示例。"
    );
    console.log('Gemini:', response);
    // Gemini should implicitly know to use Tailwind/NativeWind because of the memory

    console.log('\nDemo Complete. Check the console for memory extraction logs.');
}

main().catch(console.error);
