# Context Engine 使用说明书

本指南将帮助你快速在项目中使用 Context Engine 来构建具备长期记忆能力的 AI Agent。

## 1. 安装与配置

### 环境要求
- Node.js >= 18.0.0
- TypeScript >= 5.0

### 安装依赖
在项目根目录下运行：

```bash
npm install
# 或者
yarn install
```

确保安装了核心依赖：
- `uuid`: 用于生成唯一 ID
- `eventemitter3`: 用于事件驱动通信

## 2. 快速开始

推荐直接运行我们提供的完整示例，体验 Context Engine 的记忆能力。

1. 配置环境变量：
   ```bash
   cp .env.example .env
   # 编辑 .env 填入你的 GOOGLE_API_KEY
   ```

2. 运行演示：
   ```bash
   npx ts-node examples/gemini_demo.ts
   ```

### 分步集成指南

首先需要初始化存储层和 LLM 提供者。

```typescript
import { 
  ContextEngine, 
  SessionManager, 
  MemoryManager, 
  InMemorySessionStorage, 
  InMemoryMemoryStorage,
  MockLLMProvider 
} from '@55387.ai/context-engine';

// 1. 准备存储 (生产环境建议使用持久化数据库)
const sessionStorage = new InMemorySessionStorage();
const memoryStorage = new InMemoryMemoryStorage();

// 2. 准备 LLM (你需要实现 LLMProvider 接口对接真实的 API，如 OpenAI/Gemini/DeepSeek)
// 这里使用 Mock 来演示
const llmProvider = new MockLLMProvider();
```

### 第二步：配置管理器

```typescript
// 配置会话管理器：设置自动压缩策略
const sessionManager = new SessionManager(sessionStorage, {
  llmProvider,
  compactionConfig: {
    strategy: 'hybrid', // 混合策略：摘要 + 截断
    trigger: 'token_limit', // 当 Token 超过限制时触发
    maxTokens: 4000
  }
});

// 配置记忆管理器：设置提取逻辑
const memoryManager = new MemoryManager(memoryStorage, llmProvider, {
  async: true, // 异步执行记忆提取，不阻塞回复
  topics: [    // 定义你感兴趣的记忆主题
    { label: 'preference', description: '用户的个人喜好' },
    { label: 'project_info', description: '用户项目相关的细节' }
  ]
});
```

### 第三步：启动引擎并交互

```typescript
// 初始化引擎
const engine = new ContextEngine({
  sessionManager,
  memoryManager,
  llmProvider,
  systemInstructions: '你是一个专业的编程助手。' // 你的 System Prompt
});

// 创建用户会话
const session = await sessionManager.createSession({ userId: 'user-001' });

// 处理用户消息
const response = await engine.processTurn(session.id, "我不喜欢写 Java，我更喜欢 TypeScript。");
console.log('AI回复:', response);

// 此时，MemoryManager 会在后台自动提取 "用户喜欢 TypeScript" 这一事实并存入记忆库。
```

### 3. 持久化演示 (Persistence Demo)
演示数据如何在多次运行之间通过文件系统保存和加密。
```bash
npx ts-node examples/persistence_demo.ts
```
第一次运行会创建记忆，第二次运行会读取记忆。

## 4. 核心功能及 API

### 4.1 记忆检索 (Memory Retrieval)
Context Engine 会在每次对话时自动检索相关记忆。如果你想手动查看某个用户的所有记忆：

```typescript
const memories = await memoryManager.getAllUserMemories('user-001');
memories.forEach(m => {
    console.log(`[${m.content.topic}] ${m.content.fact} (置信度: ${m.provenance.confidence})`);
});
```

### 3.2 强制压缩 (Manual Compaction)
虽然系统支持自动压缩，你也可以手动触发：

```typescript
await sessionManager.compactSession(session.id);
```

### 3.3 事件监听 (Event Listening)
你可以通过事件总线监控系统内部运行状态：

```typescript
import { eventBus } from '@55387.ai/context-engine';

// 监听新记忆的生成
eventBus.on('memory:created', (memory) => {
    console.log('新记忆生成:', memory.content.fact);
});

// 监听会话压缩
eventBus.on('session:compacted', (sessionId, summary) => {
    console.log('会话已压缩，摘要:', summary);
});
```

## 4. 自定义扩展

### 对接真实 LLM
你需要实现 `LLMProvider` 接口：

```typescript
class MyOpenAIProvider implements LLMProvider {
  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    // 调用 OpenAI API
    return chatCompletion.choices[0].message.content;
  }
  
  async embed(text: string): Promise<number[]> {
    // 调用 Embedding API
    return embedding.data[0].embedding;
  }
  
  async countTokens(text: string): Promise<number> {
    // 计算 Token 数
    return encode(text).length;
  }
}
```

## 5. 常见问题 (FAQ)

*   **Q: 记忆提取慢怎么办？**
    *   A: `MemoryManager` 默认开启 `async: true`，提取过程在后台运行，不会阻塞用户的实时对话响应。
*   **Q: 如何持久化数据？**
    *   A: 请实现 `SessionStorage` 和 `MemoryStorage` 接口，对接 Redis、PostgreSQL 或 Vector DB (如 Pinecone)。
*   **Q: 为什么刚说完的话没有立即变成记忆？**
    *   A: 记忆生成是异步的，通常需要几秒钟。在下一轮对话时，如果该记忆已生成，就会被检索并注入到 Context 中。

---
**版本**: 1.0.0
**作者**: Context Engine Team
