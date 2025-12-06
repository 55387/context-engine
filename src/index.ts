/**
 * Main entry point for the @link/context-engine package
 * 
 * @packageDocumentation
 */

// Core exports
export { ContextEngine } from './context-engine/core/ContextEngine';
export { ContextEventEmitter, eventBus } from './context-engine/core/EventEmitter';
export type { ContextEngineEvents } from './context-engine/core/EventEmitter';

// Session Management
export { SessionManager } from './context-engine/session/SessionManager';

// Memory Management
export { MemoryManager } from './context-engine/memory/MemoryManager';

// Storage
export {
    FileSystemSessionStorage,
    FileSystemMemoryStorage,
    InMemoryMemoryStorage,
    InMemorySessionStorage,
    SQLiteMemoryStorage,
} from './context-engine/storage';

// LLM Providers
export {
    GeminiLLMProvider,
    MockLLMProvider,
    DeepSeekLLMProvider,
} from './context-engine/providers';

// Security & Authorization
export { AuthorizationService } from './context-engine/security/AuthorizationService';

// Observability
export { Logger, defaultLogger } from './context-engine/observability/Logger';
export { MetricsCollector, defaultMetrics } from './context-engine/observability/Metrics';

// Configuration
export { ConfigLoader } from './context-engine/config/Config';
export type { AppConfig, LLMConfig, StorageConfig, AppSessionConfig } from './context-engine/config/Config';

// Types - Export all types for TypeScript users
export * from './context-engine/types';

// Utilities
export * from './context-engine/utils';

// Domain Events
export * from './context-engine/domain/events';

// Dependency Injection
export * from './context-engine/di';

// Audit
export * from './context-engine/audit';
