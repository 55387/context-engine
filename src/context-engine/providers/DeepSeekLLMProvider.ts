
import pRetry, { AbortError } from 'p-retry';
import { LLMProvider, LLMOptions, ContextEngineError, ContextEngineErrorCode } from '../types';

/**
 * DeepSeek LLM Provider
 * Connects to DeepSeek API (OpenAI compatible)
 */
export class DeepSeekLLMProvider implements LLMProvider {
    private apiKey: string;
    private baseUrl: string;
    private modelName: string;

    constructor(
        apiKey: string,
        modelName: string = 'deepseek-chat',
        baseUrl: string = 'https://api.deepseek.com'
    ) {
        if (!apiKey) {
            throw new ContextEngineError(
                ContextEngineErrorCode.VALIDATION_ERROR,
                'DeepSeek API key is required'
            );
        }
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    private async withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
        return pRetry(operation, {
            retries: 3,
            factor: 2,
            minTimeout: 1000,
            onFailedAttempt: error => {
                console.warn(
                    `[DeepSeek] Attempt ${error.attemptNumber} failed for ${context}. ${error.retriesLeft} retries left.`
                );
            }
        });
    }

    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        return this.withRetry(async () => {
            const url = `${this.baseUrl}/chat/completions`;

            const body = {
                model: this.modelName,
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens,
                stop: options?.stopSequences
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`DeepSeek API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json() as any;
            return data.choices?.[0]?.message?.content || '';
        }, 'DeepSeek completion');
    }

    async embed(text: string): Promise<number[]> {
        return this.withRetry(async () => {
            // DeepSeek doesn't fully support embeddings yet in this adapter
            throw new AbortError(new ContextEngineError(
                ContextEngineErrorCode.LLM_ERROR,
                'DeepSeek embedding not fully supported in this adapter. Please use LLMRouter with a distinct embedding provider.'
            ));
        }, 'DeepSeek embedding');
    }

    async countTokens(text: string): Promise<number> {
        // Simple estimation
        return Math.ceil(text.length / 3.5);
    }
}
