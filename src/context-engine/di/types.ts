
import { ServiceIdentifier } from './Container';
import {
    SessionStorage,
    MemoryStorage,
    LLMProvider,
    AuditLogger
} from '../types';
import { SessionManager } from '../session/SessionManager';
import { MemoryManager } from '../memory/MemoryManager';
import { ContextEngine } from '../core/ContextEngine';
import { AuthorizationService } from '../security/AuthorizationService';
import { Logger } from '../observability/Logger';
import { MetricsCollector } from '../observability/Metrics';

/**
 * Service Identifiers for Dependency Injection
 */
export const ServiceIds = {
    // Core
    ContextEngine: 'ContextEngine' as ServiceIdentifier<ContextEngine>,

    // Managers
    SessionManager: 'SessionManager' as ServiceIdentifier<SessionManager>,
    MemoryManager: 'MemoryManager' as ServiceIdentifier<MemoryManager>,

    // Services
    AuthorizationService: 'AuthorizationService' as ServiceIdentifier<AuthorizationService>,
    AuditLogger: 'AuditLogger' as ServiceIdentifier<AuditLogger>,
    Logger: 'Logger' as ServiceIdentifier<Logger>,
    MetricsCollector: 'MetricsCollector' as ServiceIdentifier<MetricsCollector>,

    // Storage
    SessionStorage: 'SessionStorage' as ServiceIdentifier<SessionStorage>,
    MemoryStorage: 'MemoryStorage' as ServiceIdentifier<MemoryStorage>,

    // Providers
    LLMProvider: 'LLMProvider' as ServiceIdentifier<LLMProvider>,

    // Config
    Config: 'Config' as ServiceIdentifier<any>,
};
