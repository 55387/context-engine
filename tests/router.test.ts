
import { describe, it, expect, vi } from 'vitest';
import { LLMRouter } from '../src/context-engine/providers/LLMRouter';
import { MockLLMProvider } from '../src/context-engine/providers/MockLLMProvider';

describe('LLMRouter', () => {
    it('should route embeddings to embedding provider', async () => {
        const defaultProvider = new MockLLMProvider();
        const embeddingProvider = new MockLLMProvider();

        const embedSpy = vi.spyOn(embeddingProvider, 'embed');
        const defaultEmbedSpy = vi.spyOn(defaultProvider, 'embed');

        const router = new LLMRouter({
            defaultProvider,
            embeddingProvider
        });

        await router.embed('test');

        expect(embedSpy).toHaveBeenCalledWith('test');
        expect(defaultEmbedSpy).not.toHaveBeenCalled();
    });

    it('should route completion to default provider', async () => {
        const defaultProvider = new MockLLMProvider();
        const embeddingProvider = new MockLLMProvider();

        const completeSpy = vi.spyOn(defaultProvider, 'complete');
        const embeddingCompleteSpy = vi.spyOn(embeddingProvider, 'complete');

        const router = new LLMRouter({
            defaultProvider,
            embeddingProvider
        });

        await router.complete('test');

        expect(completeSpy).toHaveBeenCalledWith('test', undefined);
        expect(embeddingCompleteSpy).not.toHaveBeenCalled();
    });

    it('should fallback to default if no embedding provider specified', async () => {
        const defaultProvider = new MockLLMProvider();
        const embedSpy = vi.spyOn(defaultProvider, 'embed');

        const router = new LLMRouter({
            defaultProvider
        });

        await router.embed('test');
        expect(embedSpy).toHaveBeenCalledWith('test');
    });
});
