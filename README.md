# Context Engine

[![npm version](https://badge.fury.io/js/%4055387.ai%2Fcontext-engine.svg)](https://www.npmjs.com/package/@55387.ai/context-engine)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A production-ready TypeScript implementation of Context Engineering for LLM agents, providing robust session management, long-term memory, and intelligent context assembly.

## ✨ Features

- 🧠 **Long-term Memory** - Intelligent memory extraction, consolidation, and retrieval with vector similarity search
- 💬 **Session Management** - Turn-by-turn conversation history with automatic compaction strategies
- 🎯 **Context Assembly** - Dynamic prompt construction with relevant memories and conversation history
- 🔌 **Pluggable Architecture** - Support for multiple storage backends (Memory, FileSystem, SQLite)
- 🤖 **Multi-LLM Support** - Gemini, DeepSeek, and extensible provider interface
- 🔐 **Security** - Built-in authorization, audit logging, and encryption support
- 📊 **Observability** - Comprehensive logging and metrics
- 🛠️ **CLI Tool** - Interactive command-line interface for testing and management
- 📘 **TypeScript** - Full type safety and IntelliSense support

## 📦 Installation

```bash
npm install @55387.ai/context-engine
```

## 🚀 Quick Start

### Using the CLI

```bash
# Install globally
npm install -g @55387.ai/context-engine

# Start an interactive chat
context-engine chat -u alice

# List memories for a user
context-engine memories -u alice

# Show recent sessions
context-engine session -u alice
```

### Programmatic Usage

```typescript
import {
  ContextEngine,
  SessionManager,
  MemoryManager,
  FileSystemSessionStorage,
  FileSystemMemoryStorage,
  GeminiLLMProvider,
  ConfigLoader
} from '@55387.ai/context-engine';

// 1. Load configuration (from .env or defaults)
const config = ConfigLoader.load();

// 2. Initialize storage
const sessionStorage = new FileSystemSessionStorage({ 
  baseDir: config.storage.baseDir 
});

const memoryStorage = new FileSystemMemoryStorage({
  baseDir: config.storage.baseDir,
  encryptionKey: config.storage.encryptionKey
});

// 3. Initialize LLM provider
const llmProvider = new GeminiLLMProvider(config.llm.apiKey!);

// 4. Create managers
const sessionManager = new SessionManager(sessionStorage, {
  llmProvider,
  compactionConfig: { strategy: 'hybrid', maxTurns: 20 }
});

const memoryManager = new MemoryManager(memoryStorage, llmProvider);

// 5. Initialize the Context Engine
const engine = new ContextEngine({
  sessionManager,
  memoryManager,
  llmProvider
});

// 6. Create a session and start chatting
const session = await sessionManager.createSession({ 
  userId: 'alice' 
});

const response = await engine.processTurn(
  session.id, 
  "Hello! I'm a software engineer working with TypeScript."
);

console.log('AI:', response);

// Later, in a new conversation...
const response2 = await engine.processTurn(
  session.id,
  "What programming languages do I use?"
);
// AI will remember from long-term memory!
```

## 🏗️ Architecture

### Core Components

- **ContextEngine**: Main orchestrator that coordinates session and memory management
- **SessionManager**: Manages short-term conversation context with automatic compaction
- **MemoryManager**: Handles long-term memory extraction, consolidation, and retrieval
- **Storage Backends**: Pluggable storage (In-Memory, FileSystem, SQLite)
- **LLM Providers**: Abstracted interface supporting multiple LLM vendors

### Storage Options

```typescript
// In-Memory (for testing)
import { InMemorySessionStorage, InMemoryMemoryStorage } from '@55387.ai/context-engine';

// File System (for development)
import { FileSystemSessionStorage, FileSystemMemoryStorage } from '@55387.ai/context-engine';

// SQLite (for production)
import { SQLiteMemoryStorage } from '@55387.ai/context-engine';

const memoryStorage = new SQLiteMemoryStorage({
  dbPath: './data/memories.db',
  encryptionKey: process.env.ENCRYPTION_KEY
});
```

### LLM Providers

```typescript
// Google Gemini
import { GeminiLLMProvider } from '@55387.ai/context-engine';
const llm = new GeminiLLMProvider(process.env.GOOGLE_API_KEY!);

// DeepSeek
import { DeepSeekLLMProvider } from '@55387.ai/context-engine';
const llm = new DeepSeekLLMProvider(process.env.DEEPSEEK_API_KEY!);

// Mock (for testing)
import { MockLLMProvider } from '@55387.ai/context-engine';
const llm = new MockLLMProvider();
```

## ⚙️ Configuration

Create a `.env` file (see `.env.example`):

```bash
# LLM Provider
GOOGLE_API_KEY=your_api_key_here
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-pro

# Storage
STORAGE_TYPE=filesystem  # or 'memory', 'sqlite'
STORAGE_BASE_DIR=./data
SQLITE_DB_PATH=./data/memories.db

# Security
APP_SECRET=your_super_secret_key_at_least_32_chars_long_123

# Session
SESSION_MAX_TOKENS=4000
SESSION_TTL_MS=86400000

# Logging
LOG_LEVEL=info
```

## 📖 Documentation

- [CLI Guide](./docs/CLI_GUIDE.md) - Complete CLI usage guide
- [Technical Docs](./docs/TECHNICAL_DOCS.md) - Detailed technical documentation
- [Architecture](./docs/ARCHITECTURE_AUDIT.md) - System architecture and design
- [Publishing Guide](./docs/NPM_PUBLISH_GUIDE.md) - Guide for maintaining this package

## 🧪 Examples

Check out the [examples](./examples) directory:

- `basic-usage.ts` - Simple example of the Context Engine
- `full_demo.ts` - Comprehensive demonstration with all features

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Build the project
npm run build

# Run linter
npm run lint

# Watch mode (development)
npm run dev
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details

## 🙏 Acknowledgments

This implementation is inspired by the Context Engineering whitepaper and best practices in LLM agent design.

## 📬 Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/context-engine/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/context-engine/discussions)

