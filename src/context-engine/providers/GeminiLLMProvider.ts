/**
 * Google Gemini LLM Provider
 * 
 * Implementation of the LLMProvider interface using Google's Gemini API.
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import pRetry from 'p-retry';
import { LLMProvider, LLMOptions, ContextEngineError, ContextEngineErrorCode } from '../types';

export class GeminiLLMProvider implements LLMProvider {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private embeddingModel: GenerativeModel;

    constructor(apiKey: string, modelName: string = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp', embeddingModelName: string = 'text-embedding-004') {
        if (!apiKey) {
            throw new ContextEngineError(
                ContextEngineErrorCode.VALIDATION_ERROR,
                'Google API key is required'
            );
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: modelName });
        this.embeddingModel = this.genAI.getGenerativeModel({ model: embeddingModelName });
    }

    private async withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
        return pRetry(operation, {
            retries: 3,
            factor: 2,
            minTimeout: 1000,
            onFailedAttempt: error => {
                console.warn(
                    `Attempt ${error.attemptNumber} failed for ${context}. There are ${error.retriesLeft} retries left.`
                );
            }
        });
    }

    /**
     * Generate text completion
     */
    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        return this.withRetry(async () => {
            try {
                const generationConfig = {
                    temperature: options?.temperature,
                    maxOutputTokens: options?.maxTokens,
                    stopSequences: options?.stopSequences,
                };

                const result = await this.model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig,
                });

                const response = await result.response;
                return response.text();
            } catch (error: any) {
                // Only retry on transient errors (e.g. 503, 429) or network issues
                // This basic check retries most GoogleGenerativeAI errors, but could be refined
                throw new ContextEngineError(
                    ContextEngineErrorCode.LLM_ERROR,
                    `Gemini completion failed: ${error.message}`,
                    { originalError: error }
                );
            }
        }, 'Gemini completion');
    }

    /**
     * Generate embeddings
     */
    async embed(text: string): Promise<number[]> {
        return this.withRetry(async () => {
            try {
                const result = await this.embeddingModel.embedContent(text);
                const embedding = result.embedding;
                return embedding.values;
            } catch (error: any) {
                throw new ContextEngineError(
                    ContextEngineErrorCode.LLM_ERROR,
                    `Gemini embedding failed: ${error.message}`,
                    { originalError: error }
                );
            }
        }, 'Gemini embedding');
    }

    /**
     * Count tokens
     */
    async countTokens(text: string): Promise<number> {
        // Retry usually not needed for countTokens but good for stability
        return this.withRetry(async () => {
            try {
                const { totalTokens } = await this.model.countTokens(text);
                return totalTokens;
            } catch (error: any) {
                console.warn('Gemini countTokens failed, falling back to estimation', error);
                return Math.ceil(text.length / 4);
            }
        }, 'Gemini countTokens');
    }
}
