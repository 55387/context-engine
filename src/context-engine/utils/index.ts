/**
 * Utility functions for the Context Engine
 */

import { v4 as uuidv4 } from 'uuid';
import { Event, ContentPart, Role, EventType } from '../types';
export * from './EncryptionService';
/**
 * Generate a unique ID
 */
export function generateId(): string {
    return uuidv4();
}

/**
 * Create a text content part
 */
export function textPart(text: string): ContentPart {
    return { type: 'text', text };
}

/**
 * Create an event
 */
export function createEvent(
    type: EventType,
    role: Role,
    parts: ContentPart[],
    metadata?: Record<string, unknown>
): Event {
    return {
        id: generateId(),
        type,
        role,
        parts,
        timestamp: new Date(),
        metadata,
    };
}

/**
 * Create a user input event
 */
export function userEvent(text: string, metadata?: Record<string, unknown>): Event {
    return createEvent('user_input', 'user', [textPart(text)], metadata);
}

/**
 * Create an agent response event
 */
export function agentEvent(text: string, metadata?: Record<string, unknown>): Event {
    return createEvent('agent_response', 'model', [textPart(text)], metadata);
}

/**
 * Extract text from content parts
 */
export function extractText(parts: ContentPart[]): string {
    return parts
        .filter(part => part.type === 'text' && part.text)
        .map(part => part.text!)
        .join('\n');
}

/**
 * Extract text from an event
 */
export function extractEventText(event: Event): string {
    return extractText(event.parts);
}

/**
 * Simple token counter (approximate - 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Estimate tokens for events
 */
export function estimateEventsTokens(events: Event[]): number {
    return events.reduce((total, event) => {
        const text = extractEventText(event);
        return total + estimateTokens(text);
    }, 0);
}

/**
 * Truncate text to fit within token limit
 */
export function truncateToTokens(text: string, maxTokens: number): string {
    const estimatedChars = maxTokens * 4;
    if (text.length <= estimatedChars) return text;
    return text.slice(0, estimatedChars - 3) + '...';
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
    return date.toISOString();
}

/**
 * Check if a date has expired
 */
export function isExpired(expiresAt: Date | undefined): boolean {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
}

/**
 * Calculate time-to-live date
 */
export function calculateTTL(ttlMs: number): Date {
    return new Date(Date.now() + ttlMs);
}

/**
 * Deep clone an object, preserving Date objects
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (obj instanceof Date) {
        return new Date(obj.getTime()) as any;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepClone(item)) as any;
    }

    const result: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = deepClone((obj as any)[key]);
        }
    }
    return result;
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(
    target: T,
    source: Partial<T>
): T {
    const result = { ...target };
    for (const key in source) {
        if (source[key] !== undefined) {
            if (
                typeof source[key] === 'object' &&
                source[key] !== null &&
                !Array.isArray(source[key])
            ) {
                result[key] = deepMerge(
                    target[key] as Record<string, unknown>,
                    source[key] as Record<string, unknown>
                ) as T[Extract<keyof T, string>];
            } else {
                result[key] = source[key] as T[Extract<keyof T, string>];
            }
        }
    }
    return result;
}

/**
 * Cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate recency score (0-1) based on age
 */
export function calculateRecencyScore(date: Date, maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const ageMs = Date.now() - date.getTime();
    if (ageMs <= 0) return 1;
    if (ageMs >= maxAgeMs) return 0;
    return 1 - (ageMs / maxAgeMs);
}

/**
 * Combine multiple scores with weights
 */
export function combineScores(
    scores: { value: number; weight: number }[]
): number {
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
    return weightedSum / totalWeight;
}

/**
 * Deduplicate array by key
 */
export function deduplicateBy<T>(
    array: T[],
    keyFn: (item: T) => string
): T[] {
    const seen = new Set<string>();
    return array.filter(item => {
        const key = keyFn(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (attempt < maxRetries - 1) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    fn: T,
    delayMs: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    return (...args: Parameters<T>) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delayMs);
    };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    fn: T,
    limitMs: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => { inThrottle = false; }, limitMs);
        }
    };
}
