
import { LLMProvider, LLMOptions } from '../../src/context-engine/types';

export class ScriptedLLMProvider implements LLMProvider {
    private scripts: Map<string, string> = new Map();
    private defaultResponse: string = "I don't know.";

    constructor(defaultResponse?: string) {
        if (defaultResponse) this.defaultResponse = defaultResponse;
    }

    on(triggerPhrase: string, response: string) {
        this.scripts.set(triggerPhrase, response);
    }

    async complete(prompt: string, options?: LLMOptions): Promise<string> {
        // Find all matching triggers
        const matches: { trigger: string; response: string }[] = [];
        for (const [trigger, response] of this.scripts.entries()) {
            if (prompt.includes(trigger)) {
                matches.push({ trigger, response });
            }
        }

        // Sort by trigger length descending (longest match wins)
        if (matches.length > 0) {
            matches.sort((a, b) => b.trigger.length - a.trigger.length);
            return matches[0].response;
        }

        return this.defaultResponse;
    }

    async embed(text: string): Promise<number[]> {
        // Simple deterministic embedding based on string char codes for testing
        // This ensures same text = same embedding
        const vec = new Array(10).fill(0);
        for (let i = 0; i < text.length; i++) {
            vec[i % 10] += text.charCodeAt(i) / 1000;
        }
        return vec;
    }

    async countTokens(text: string): Promise<number> {
        return text.split(' ').length;
    }
}
