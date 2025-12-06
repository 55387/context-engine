
# Context Engine Technical Documentation

## Overview

The Context Engine is a state-of-the-art, context-aware AI agent framework designed to manage conversation history, long-term memory, and LLM interactions with high efficiency and reliability.

### Key Features

*   **Session Management**: Persistent conversation history with automatic compaction strategies.
*   **Long-Term Memory**: Vector-based retrieval of relevant facts with automatic decay and consolidation.
*   **Context Management**: Intelligent context window management tailored to token budgets.
*   **CQRS Architecture**: Separation of read (queries) and write (commands) operations for scalability.
*   **Security**: Built-in encryption for storage, role-based access control, and audit logging.
*   **Observability**: Structured logging and metrics for production monitoring.

---

## Architecture

The system is built on a modular architecture using Dependency Injection (DI) and CQRS patterns.

### Core Components

1.  **ContextEngine**: The main orchestrator. It coordinates Session, Memory, and LLM providers to process user turns.
2.  **SessionManager**: Manages the lifecycle of conversation sessions (`Session`). Handles event storage and history compaction.
3.  **MemoryManager**: Manages long-term memories (`Memory`). Handles extraction, embedding, retrieval, and storage.
4.  **LLMProvider**: Abstraction layer for different LLMs (e.g., Google Gemini, Mock).

### Directory Structure

```
src/context-engine/
├── core/           # ContextEngine, EventEmitter
├── session/        # SessionManager
├── memory/         # MemoryManager
├── storage/        # Storage Adapters (InMemory, FileSystem, Vector)
├── providers/      # LLM Providers (Gemini, etc.)
├── domain/         # CQRS Commands/Handlers, Domain Events
├── security/       # Authorization, Encryption
├── observability/  # Logging, Metrics
├── config/         # Configuration loading
└── types/          # Shared interfaces
```

---

## Installation & Setup

1.  **Prerequisites**: Node.js v16+ (v18+ recommended)
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Configuration**:
    Copy `.env.example` to `.env` and fill in your keys.
    ```bash
    cp .env.example .env
    ```
    *   `GOOGLE_API_KEY`: Required for real LLM features.
    *   `APP_SECRET`: Required for memory encryption (32+ chars).

4.  **Run Tests**:
    ```bash
    npm test
    ```

---

## Usage Guide

### 1. Initialization

Initialize the engine with desired storage and provider configurations.

```typescript
import { ContextEngine } from './src/context-engine/core/ContextEngine';
import { SessionManager } from './src/context-engine/session/SessionManager';
import { MemoryManager } from './src/context-engine/memory/MemoryManager';
import { FileSystemSessionStorage } from './src/context-engine/storage/FileSystemSessionStorage';
import { SQLiteMemoryStorage } from './src/context-engine/storage/SQLiteMemoryStorage';
import { GeminiLLMProvider } from './src/context-engine/providers/GeminiLLMProvider';
import { AuthorizationService } from './src/context-engine/security/AuthorizationService';
import { defaultLogger } from './src/context-engine/observability/Logger';
import { defaultMetrics } from './src/context-engine/observability/Metrics';

// 1. Configure Storage
const sessionStorage = new FileSystemSessionStorage({ baseDir: './data' });

// Option A: SQLite Storage (Recommended for Production)
const memoryStorage = new SQLiteMemoryStorage({ 
    dbPath: './data/memories.db',
    encryptionKey: process.env.APP_SECRET 
});

// Option B: FileSystem Storage
// const memoryStorage = new FileSystemMemoryStorage({ 
//     baseDir: './data', 
//     encryptionKey: process.env.APP_SECRET 
// });


// 2. Configure LLM
const llmProvider = new GeminiLLMProvider(process.env.GOOGLE_API_KEY);

// 3. Initialize Managers
const sessionManager = new SessionManager(sessionStorage, {
    llmProvider,
    compactionConfig: { strategy: 'hybrid', maxTurns: 20 }
});
const memoryManager = new MemoryManager(memoryStorage, llmProvider);
const authService = new AuthorizationService();

// 4. Create Engine
const engine = new ContextEngine({
    sessionManager,
    memoryManager,
    llmProvider,
    authService,
    logger: defaultLogger,
    metrics: defaultMetrics
});
```

### 2. Processing Conversations

Use `processTurn` to handle user interactions. This method automatically manages context retrieval, prompt construction, LLM calling, and memory generation.

```typescript
// Create a new session
const session = await sessionManager.createSession({ userId: 'user-123' });

// User sends a message
const response = await engine.processTurn(
    session.id, 
    "My name is Alice and I am a software engineer.",
    'user-123' // Actor ID for auth check
);

console.log(response); 
// AI: "Hello Alice! Nice to meet you. Being a software engineer is exciting."
// (Agent automatically stores "Name is Alice" and "Is software engineer" in memory)
```

### 3. Managing Memories

You can programmatically interact with memories or allow the user to edit them via CQRS commands.

```typescript
import { CommandBus } from './src/context-engine/domain/cqrs/CQRS';
import { UpdateMemoryHandler, UpdateMemoryCommand } from './src/context-engine/domain/cqrs/UpdateMemoryHandler';

// Setup Command Bus
const commandBus = new CommandBus();
commandBus.register('UpdateMemory', new UpdateMemoryHandler(memoryManager));

// Retrieve user memories
const memories = await memoryManager.getAllUserMemories('user-123');

// Edit a memory
const memoryId = memories[0].id;
await commandBus.execute('UpdateMemory', new UpdateMemoryCommand(
    memoryId, 
    { fact: "My name is Alice Smith." } // User correction
));
```

### 4. Observability

Monitor the system using the built-in logger and metrics collector.

```typescript
import { defaultMetrics } from './src/context-engine/observability/Metrics';

// Get current metrics snapshot
const metrics = defaultMetrics.getSnapshot();
console.log(metrics);
/* Output:
{
  "token_usage_total{sessionId='...'}": 1500,
  "turn_latency_ms{sessionId='...'}": { avg: 450, count: 5, ... },
  ...
}
*/
```

---

## Advanced Configuration

### Memory Compaction Strategies
The `SessionManager` supports multiple strategies to keep context within limits:
*   `truncate_oldest`: Removes oldest messages (fastest).
*   `token_limit`: Removes messages to fit token budget.
*   `recursive_summary`: Summarizes older messages using LLM.
*   `hybrid`: Summaries + truncation (balanced).

### Memory Decay
Memories automatically decay in relevance over time unless accessed (`accessedAt` updates). This prioritizes recent and frequently used information during retrieval.

### Security
*   **Encryption**: All memory content (`fact`) is AES-256 encrypted at rest if `encryptionKey` is provided.
*   **Authorization**: `AuthorizationService` enforces checks (e.g., verifying `actorId` matches `session.userId`) before accessing data.

---

## Development

*   **Running the Demo**: `npx tsx examples/full_demo.ts`
*   **Testing**: `npm test` (Runs Unit, E2E, and Benchmark tests)

