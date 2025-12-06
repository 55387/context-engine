
import dotenv from 'dotenv';

// Load .env explicitly if needed, though usually done at app entry
dotenv.config();

export interface LLMConfig {
    provider: 'mock' | 'gemini' | 'openai' | 'deepseek';
    apiKey?: string;
    modelName?: string;
    embeddingModelName?: string;
    temperature?: number;
}

export interface StorageConfig {
    type: 'memory' | 'filesystem' | 'sqlite';
    baseDir: string;
    encryptionKey?: string;
    sqliteDbPath?: string;
}

export interface AppSessionConfig {
    maxTokens: number;
    ttlMs: number;
}

export interface AppConfig {
    llm: LLMConfig;
    storage: StorageConfig;
    session: AppSessionConfig;
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
    };
}

/**
 * Default Configuration
 */
const defaultConfig: AppConfig = {
    llm: {
        provider: 'mock',
        modelName: 'default-model',
        temperature: 0.7
    },
    storage: {
        type: 'memory',
        baseDir: './data'
    },
    session: {
        maxTokens: 4000,
        ttlMs: 24 * 60 * 60 * 1000 // 24 hours
    },
    logging: {
        level: 'info'
    }
};

/**
 * Configuration Loader
 * Reads from environment variables and merges with defaults.
 */
export class ConfigLoader {
    static load(): AppConfig {
        return {
            llm: {
                provider: (process.env.LLM_PROVIDER as any) || defaultConfig.llm.provider,
                apiKey: process.env.GOOGLE_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY,
                modelName: process.env.LLM_MODEL || defaultConfig.llm.modelName,
                embeddingModelName: process.env.EMBEDDING_MODEL,
                temperature: process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : defaultConfig.llm.temperature
            },
            storage: {
                type: (process.env.STORAGE_TYPE as any) || defaultConfig.storage.type,
                baseDir: process.env.STORAGE_BASE_DIR || process.env.STORAGE_DIR || defaultConfig.storage.baseDir,
                encryptionKey: process.env.APP_SECRET || process.env.ENCRYPTION_KEY,
                sqliteDbPath: process.env.SQLITE_DB_PATH || './data/memories.db',
            },
            session: {
                maxTokens: process.env.SESSION_MAX_TOKENS ? parseInt(process.env.SESSION_MAX_TOKENS) : defaultConfig.session.maxTokens,
                ttlMs: process.env.SESSION_TTL_MS ? parseInt(process.env.SESSION_TTL_MS) : defaultConfig.session.ttlMs
            },
            logging: {
                level: (process.env.LOG_LEVEL as any) || defaultConfig.logging.level
            }
        };
    }
}
