import { describe, it, expect } from 'vitest';
import {
    extractText,
    estimateTokens,
    deepMerge,
    cosineSimilarity,
    combineScores
} from '../src/context-engine/utils/index';
import { ContentPart } from '../src/context-engine/types';

describe('Utils', () => {
    it('extractText should join text parts', () => {
        const parts: ContentPart[] = [
            { type: 'text', text: 'Hello' },
            { type: 'image' },
            { type: 'text', text: 'World' }
        ];
        expect(extractText(parts)).toBe('Hello\nWorld');
    });

    it('estimateTokens should approximate correctly', () => {
        expect(estimateTokens('abcd')).toBe(1);
        expect(estimateTokens('abcdefgh')).toBe(2);
        expect(estimateTokens('')).toBe(0);
    });

    it('deepMerge should merge objects deeply', () => {
        const obj1 = { a: 1, b: { c: 2 } };
        const obj2 = { b: { d: 3 }, e: 4 };
        const merged = deepMerge(obj1, obj2);

        expect(merged).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
    });

    it('cosineSimilarity should calculate correctly', () => {
        const v1 = [1, 0];
        const v2 = [1, 0]; // Identical
        expect(cosineSimilarity(v1, v2)).toBeCloseTo(1);

        const v3 = [0, 1]; // Orthogonal
        expect(cosineSimilarity(v1, v3)).toBeCloseTo(0);

        const v4 = [-1, 0]; // Opposite
        expect(cosineSimilarity(v1, v4)).toBeCloseTo(-1);
    });

    it('combineScores should weight correctly', () => {
        const scores = [
            { value: 1.0, weight: 0.5 },
            { value: 0.0, weight: 0.5 }
        ];
        expect(combineScores(scores)).toBe(0.5);

        const scores2 = [
            { value: 1.0, weight: 0.8 },
            { value: 0.5, weight: 0.2 }
        ];
        // 0.8 + 0.1 = 0.9
        expect(combineScores(scores2)).toBeCloseTo(0.9);
    });
});
