
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from '../src/context-engine/config/Config';

describe('ConfigLoader', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.LLM_PROVIDER;
        delete process.env.GOOGLE_API_KEY;
        delete process.env.STORAGE_TYPE;
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should load default values', () => {
        const config = ConfigLoader.load();
        expect(config.llm.provider).toBe('mock');
        expect(config.storage.type).toBe('memory');
    });

    it('should load values from environment', () => {
        process.env.LLM_PROVIDER = 'gemini';
        process.env.GOOGLE_API_KEY = 'test-key';
        process.env.STORAGE_TYPE = 'filesystem';
        process.env.STORAGE_BASE_DIR = '/tmp/test'; // Changed from STORAGE_DIR

        const config = ConfigLoader.load();

        expect(config.llm.provider).toBe('gemini');
        expect(config.llm.apiKey).toBe('test-key');
        expect(config.storage.type).toBe('filesystem');
        expect(config.storage.baseDir).toBe('/tmp/test');
    });

    it('should parse numeric values', () => {
        process.env.SESSION_MAX_TOKENS = '8000';
        process.env.LLM_TEMPERATURE = '0.5';

        const config = ConfigLoader.load();

        expect(config.session.maxTokens).toBe(8000);
        expect(config.llm.temperature).toBe(0.5);
    });
});
