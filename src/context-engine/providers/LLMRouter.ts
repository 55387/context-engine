
import { LLMProvider, LLMOptions } from '../types';

export enum LLMTaskType {
    COMPLETION = 'completion',
    EMBEDDING = 'embedding',
    TOKEN_COUNT = 'token_count'
}

export interface LLMRouterConfig {
    defaultProvider: LLMProvider;
    embeddingProvider?: LLMProvider; // Optional specific provider for embeddings
    fastProvider?: LLMProvider; // For simple tasks
    smartProvider?: LLMProvider; // For complex reasoning
}

/**
 * LLM Router that delegates to specific providers based on task type.
 * Currently supports a simple split: Embedding vs Completion.
 * Can be extended to route based on prompt complexity or length.
 */
export class LLMRouter implements LLMProvider {
    private defaultProvider: LLMProvider;
    private embeddingProvider: LLMProvider;

    constructor(config: LLMRouterConfig) {
        this.defaultProvider = config.defaultProvider;
        // Use embedding provider if specified, else default
        this.embeddingProvider = config.embeddingProvider || config.defaultProvider;
    }

    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        // Can add logic here: if prompt.length < 500, use fastProvider...
        return this.defaultProvider.complete(prompt, options);
    }

    async embed(text: string): Promise<number[]> {
        return this.embeddingProvider.embed(text);
    }

    async countTokens(text: string): Promise<number> {
        return this.defaultProvider.countTokens(text);
    }
}
