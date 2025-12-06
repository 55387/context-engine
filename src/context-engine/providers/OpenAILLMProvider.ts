
import { LLMProvider, LLMOptions } from '../types';

export class OpenAILLMProvider implements LLMProvider {
    // In a real implementation we would import OpenAI SDK
    // import OpenAI from 'openai';

    private apiKey: string;
    private modelName: string;
    private embeddingModelName: string;

    constructor(
        apiKey: string,
        modelName: string = 'gpt-3.5-turbo',
        embeddingModelName: string = 'text-embedding-3-small'
    ) {
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.embeddingModelName = embeddingModelName;
    }

    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        // Mock implementation to avoid installing SDK now
        // But structured to allow easy swap
        if (!this.apiKey) throw new Error('OpenAI API key missing');

        console.warn(`[OpenAILLMProvider] Mock completion call to ${this.modelName}`);

        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 500));

        return "This is a mock response from OpenAI provider. If you want real responses, please install 'openai' package and uncomment implementation.";
    }

    async embed(text: string): Promise<number[]> {
        if (!this.apiKey) throw new Error('OpenAI API key missing');
        console.warn(`[OpenAILLMProvider] Mock embedding call to ${this.embeddingModelName}`);
        // Return 1536 dim random vector (standard for openai v3 small)
        return Array.from({ length: 1536 }, () => Math.random());
    }

    async countTokens(text: string): Promise<number> {
        // Rough estimation
        return Math.ceil(text.length / 4);
    }
}
