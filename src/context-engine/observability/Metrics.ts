
/**
 * Metric Types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram';

/**
 * Metric Value
 */
export type MetricValue = number;

/**
 * Metrics Collector Interface
 */
export interface MetricsCollector {
    /** Increment a counter */
    increment(name: string, value?: number, labels?: Record<string, string>): void;
    /** Set a gauge value */
    gauge(name: string, value: number, labels?: Record<string, string>): void;
    /** Record a histogram value (latency, size) */
    histogram(name: string, value: number, labels?: Record<string, string>): void;
    /** Retrieve current metrics snapshot */
    getSnapshot(): Record<string, any>;
}

/**
 * In-Memory Metrics Collector
 */
export class InMemoryMetricsCollector implements MetricsCollector {
    private metrics: Map<string, { type: MetricType; values: any[] }> = new Map();

    private getKey(name: string, labels?: Record<string, string>): string {
        if (!labels || Object.keys(labels).length === 0) return name;
        const labelStr = Object.entries(labels)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        return `${name}{${labelStr}}`;
    }

    increment(name: string, value: number = 1, labels?: Record<string, string>) {
        const key = this.getKey(name, labels);
        if (!this.metrics.has(key)) {
            this.metrics.set(key, { type: 'counter', values: [0] });
        }
        const metric = this.metrics.get(key)!;
        metric.values[0] += value;
    }

    gauge(name: string, value: number, labels?: Record<string, string>) {
        const key = this.getKey(name, labels);
        this.metrics.set(key, { type: 'gauge', values: [value] });
    }

    histogram(name: string, value: number, labels?: Record<string, string>) {
        const key = this.getKey(name, labels);
        if (!this.metrics.has(key)) {
            this.metrics.set(key, { type: 'histogram', values: [] });
        }
        this.metrics.get(key)!.values.push(value);
    }

    getSnapshot(): Record<string, any> {
        const snapshot: Record<string, any> = {};
        for (const [key, data] of this.metrics.entries()) {
            if (data.type === 'histogram') {
                // Calculate simple stats for histogram
                const values = data.values as number[];
                const min = Math.min(...values);
                const max = Math.max(...values);
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const count = values.length;
                snapshot[key] = { min, max, avg, count };
            } else {
                snapshot[key] = data.values[0];
            }
        }
        return snapshot;
    }
}

// Default instance
export const defaultMetrics = new InMemoryMetricsCollector();
