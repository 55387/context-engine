/**
 * Mock LLM Provider for Development and Testing
 */

import { LLMProvider, LLMOptions } from '../types';

export class MockLLMProvider implements LLMProvider {
    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        console.log(`[MockLLM] Generating completion for prompt length: ${prompt.length}`);

        // Simulate latency
        await new Promise(resolve => setTimeout(resolve, 500));

        // Handle memory extraction requests (MemoryManager.extractMemories)
        // Pattern: "Analyze the following conversation..."
        if (prompt.includes('Analyze the following conversation')) {
            // Check if this is a test case with specific trigger
            if (prompt.includes('Extract extracted memories')) {
                // Return memories for test case
                return JSON.stringify([
                    {
                        fact: "User likes TypeScript",
                        topic: "user_preference",
                        confidence: 0.9
                    }
                ]);
            }
            // Default: Return empty extraction result to avoid JSON parse errors in CLI/demo
            return JSON.stringify({
                memories: []
            });
        }

        // Legacy trigger (for backwards compatibility with old tests)
        if (prompt.includes('Extract extracted memories')) {
            return JSON.stringify([
                {
                    fact: "User likes TypeScript",
                    topic: "user_preference",
                    confidence: 0.9
                }
            ]);
        }

        if (prompt.includes('Summarize the following conversation')) {
            return "The user and agent discussed context engineering. The user asked for a TypeScript implementation.";
        }

        if (prompt.includes('Compare these two memories')) {
            return JSON.stringify({
                action: "MERGE",
                mergedFact: "User really likes TypeScript and building agents."
            });
        }

        return "I am a mock AI response. I received your message.";
    }

    async embed(text: string): Promise<number[]> {
        // Generate deterministic fake embedding based on text length
        const dim = 128;
        const vec = new Array(dim).fill(0);
        for (let i = 0; i < text.length; i++) {
            vec[i % dim] += text.charCodeAt(i);
        }
        // Normalize
        const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
        return vec.map(v => v / (norm || 1));
    }

    async countTokens(text: string): Promise<number> {
        return Math.ceil(text.length / 4);
    }
}
