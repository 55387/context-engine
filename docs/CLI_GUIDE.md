
# Context Engine CLI 使用指南

## 快速开始

### 1. 启动对话
```bash
npx tsx src/cli/index.ts chat -u <用户名>
```

示例：
```bash
npx tsx src/cli/index.ts chat -u alice
```

### 2. 查看用户记忆
```bash
npx tsx src/cli/index.ts memories -u <用户名>
```

示例：
```bash
npx tsx src/cli/index.ts memories -u alice
```

### 3. 查看用户会话
```bash
npx tsx src/cli/index.ts session -u <用户名>
```

### 4. 查看帮助
```bash
npx tsx src/cli/index.ts --help
```

## 功能特性

### 长期记忆
- AI 会自动从对话中提取关键信息并存储为长期记忆
- 即使开始新的会话，AI 也能记住之前的对话内容
- 记忆会随时间衰减，但经常访问的记忆会保持新鲜

### 多用户支持
- 使用 `-u` 参数指定不同的用户
- 每个用户的记忆和会话是独立的
- 支持权限控制和审计日志

### 智能上下文管理
- 自动压缩历史对话以适应 token 限制
- 优先保留重要信息
- 支持混合压缩策略（摘要 + 截断）

## 配置

编辑 `.env` 文件来配置系统：

```bash
# LLM Provider
GOOGLE_API_KEY=your_api_key_here

# 加密密钥（至少32字符）
APP_SECRET=your_super_secret_key_at_least_32_chars_long_123

# 存储目录
STORAGE_BASE_DIR=./data

# 日志级别
LOG_LEVEL=info
```

## 常见问题

### Q: 为什么使用 MockLLM？
A: 如果 `.env` 中没有配置 `GOOGLE_API_KEY`，系统会自动使用 MockLLM。配置 API key 后会自动切换到 Gemini。

### Q: 如何清除用户数据？
A: 删除 `data/<namespace>/` 目录下对应的文件即可。

### Q: 支持哪些 LLM？
A: 目前支持 Google Gemini。可以通过实现 `LLMProvider` 接口来添加其他 LLM。

## 示例对话

```bash
$ npx tsx src/cli/index.ts chat -u alice

Using LLM Provider: GeminiLLMProvider (with API key)
Starting chat for user: alice
Session ID: xxx-xxx-xxx
Type "exit" to quit.

You: 你好，我是一名软件工程师
AI: 你好！很高兴认识你。作为软件工程师，你主要使用什么技术栈呢？

You: 我主要用 TypeScript 和 Node.js
AI: 很棒的选择！TypeScript 和 Node.js 是现代 Web 开发的强大组合...

You: exit
```

下次对话时：
```bash
$ npx tsx src/cli/index.ts chat -u alice

You: 我之前说我用什么技术？
AI: 你之前提到你主要使用 TypeScript 和 Node.js...
```

## 高级用法

### 查看指标
```typescript
import { defaultMetrics } from './src/context-engine/observability/Metrics';
console.log(defaultMetrics.getSnapshot());
```

### 编程式使用
参考 `examples/full_demo.ts` 了解如何在代码中使用 Context Engine。
