# 快速开始指南

## 🚀 5分钟快速上手

### 1. 安装

```bash
npm install @55387.ai/context-engine
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
# 复制示例配置
cp node_modules/@55387.ai/context-engine/.env.example .env

# 编辑并添加你的 API key
GOOGLE_API_KEY=your_api_key_here
```

或者手动创建 `.env` 文件：

```bash
GOOGLE_API_KEY=your_api_key_here
STORAGE_BASE_DIR=./data
APP_SECRET=your_super_secret_key_at_least_32_chars_long
```

### 3. 创建第一个应用

创建 `index.ts` 或 `index.js`:

```typescript
import {
  ContextEngine,
  SessionManager,
  MemoryManager,
  FileSystemSessionStorage,
  FileSystemMemoryStorage,
  GeminiLLMProvider,
} from '@55387.ai/context-engine';

async function main() {
  // 初始化存储
  const sessionStorage = new FileSystemSessionStorage({ 
    baseDir: './data' 
  });
  
  const memoryStorage = new FileSystemMemoryStorage({
    baseDir: './data',
    encryptionKey: process.env.APP_SECRET
  });

  // 初始化 LLM
  const llmProvider = new GeminiLLMProvider(process.env.GOOGLE_API_KEY!);

  // 创建管理器
  const sessionManager = new SessionManager(sessionStorage, { llmProvider });
  const memoryManager = new MemoryManager(memoryStorage, llmProvider);

  // 初始化引擎
  const engine = new ContextEngine({
    sessionManager,
    memoryManager,
    llmProvider,
  });

  // 创建会话
  const session = await sessionManager.createSession({ 
    userId: 'demo-user' 
  });

  console.log(`会话已创建: ${session.id}\n`);

  // 第一轮对话
  console.log('用户: 你好，我叫 Alice，我是一名软件工程师');
  const response1 = await engine.processTurn(
    session.id,
    '你好，我叫 Alice，我是一名软件工程师'
  );
  console.log(`AI: ${response1}\n`);

  // 第二轮对话
  console.log('用户: 我主要使用 TypeScript 和 Python');
  const response2 = await engine.processTurn(
    session.id,
    '我主要使用 TypeScript 和 Python'
  );
  console.log(`AI: ${response2}\n`);

  // 查看记忆
  const memories = await memoryManager.getAllUserMemories('demo-user');
  console.log('\n--- 长期记忆 ---');
  memories.forEach(m => {
    console.log(`- ${m.content.fact} (置信度: ${m.provenance.confidence})`);
  });
}

main().catch(console.error);
```

### 4. 运行

```bash
# 使用 tsx (推荐)
npx tsx index.ts

# 或使用 ts-node
npx ts-node index.ts

# 或先编译再运行
tsc index.ts
node index.js
```

## 🎯 使用 CLI 工具

如果你只想快速测试，可以直接使用 CLI：

```bash
# 全局安装
npm install -g @55387.ai/context-engine

# 或使用 npx
npx @55387.ai/context-engine chat -u alice
```

在对话中：
```
You: 你好，我叫 Alice，我是一名软件工程师
AI: 你好 Alice！很高兴认识你...

You: 我主要用 TypeScript
AI: 明白了，TypeScript 是很好的选择...

You: exit
```

然后查看记忆：
```bash
context-engine memories -u alice
```

## 📚 下一步

- 查看 [完整示例](../examples/) 了解更多用法
- 阅读 [技术文档](./TECHNICAL_DOCS.md) 深入理解架构
- 查看 [CLI 指南](./CLI_GUIDE.md) 了解所有 CLI 命令
- 探索不同的[存储选项](#storage-options)

## 🔧 常见配置

### 使用 SQLite 存储（推荐生产环境）

```typescript
import { SQLiteMemoryStorage } from '@55387.ai/context-engine';

const memoryStorage = new SQLiteMemoryStorage({
  dbPath: './data/memories.db',
  encryptionKey: process.env.APP_SECRET
});
```

### 使用内存存储（测试环境）

```typescript
import { 
  InMemorySessionStorage, 
  InMemoryMemoryStorage 
} from '@55387.ai/context-engine';

const sessionStorage = new InMemorySessionStorage();
const memoryStorage = new InMemoryMemoryStorage({
  encryptionKey: process.env.APP_SECRET
});
```

### 配置会话压缩策略

```typescript
const sessionManager = new SessionManager(sessionStorage, {
  llmProvider,
  compactionConfig: {
    strategy: 'hybrid',       // 'truncate_oldest' | 'token_limit' | 'recursive_summary' | 'hybrid'
    maxTurns: 20,             // 保留最近的 20 轮对话
    trigger: 'count_based',   // 'count_based' | 'token_based' | 'time_based'
    maxTokens: 100000,        // Token 限制
  }
});
```

### 自定义记忆主题

```typescript
const memoryManager = new MemoryManager(memoryStorage, llmProvider, {
  topics: [
    {
      label: 'user_preference',
      description: '用户的偏好、喜好和限制'
    },
    {
      label: 'user_fact',
      description: '关于用户的事实信息（姓名、职业、位置等）'
    },
    {
      label: 'project_context',
      description: '用户正在进行的项目和目标'
    }
  ],
  maxMemories: 10,
  async: true
});
```

## ❓ 常见问题

### Q: 如何清除用户数据？

```typescript
// 删除用户的所有记忆
await memoryManager.deleteByUser(userId);

// 删除用户的所有会话
const sessions = await sessionManager.listUserSessions(userId);
for (const session of sessions) {
  await sessionManager.deleteSession(session.id);
}
```

### Q: 如何切换 LLM 提供商？

```typescript
import { DeepSeekLLMProvider } from '@55387.ai/context-engine';

const llmProvider = new DeepSeekLLMProvider(process.env.DEEPSEEK_API_KEY!);
```

### Q: 如何启用日志记录？

```typescript
import { defaultLogger } from '@55387.ai/context-engine';

const engine = new ContextEngine({
  sessionManager,
  memoryManager,
  llmProvider,
  logger: defaultLogger
});

// 在 .env 中设置日志级别
// LOG_LEVEL=debug
```

### Q: 包太大，如何优化？

Context Engine 包含完整功能，约 351KB（未压缩）。如果只需要部分功能，可以：

1. 使用 tree-shaking（自动，如果你使用现代打包工具）
2. 只导入需要的模块
3. 在生产环境使用 SQLite 而不是 FileSystem 存储

## 🆘 获取帮助

- 📖 [完整文档](./TECHNICAL_DOCS.md)
- 💬 [GitHub Discussions](https://github.com/your-org/context-engine/discussions)
- 🐛 [报告问题](https://github.com/your-org/context-engine/issues)
