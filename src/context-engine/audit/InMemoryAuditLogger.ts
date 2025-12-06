import { v4 as uuidv4 } from 'uuid';
import { AuditLogger, AuditLogEntry } from '../types';

/**
 * In-memory implementation of AuditLogger for testing and development.
 * In production, this should be replaced with a persistent logger (e.g. DB, multiple files).
 */
export class InMemoryAuditLogger implements AuditLogger {
    private logs: AuditLogEntry[] = [];

    async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
        const fullEntry: AuditLogEntry = {
            ...entry,
            id: uuidv4(),
            timestamp: new Date()
        };
        this.logs.push(fullEntry);
        // Optional: Console output for visibility during demo
        if (process.env.DEBUG_AUDIT) {
            console.log(`[Audit] ${fullEntry.timestamp.toISOString()} | ${fullEntry.action} ${fullEntry.entityType} ${fullEntry.entityId} by ${fullEntry.actorId}`);
        }
    }

    async query(filter: Partial<AuditLogEntry>): Promise<AuditLogEntry[]> {
        return this.logs.filter(log => {
            for (const key in filter) {
                const k = key as keyof AuditLogEntry;
                if (log[k] !== filter[k]) return false;
            }
            return true;
        }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    async clear(): Promise<void> {
        this.logs = [];
    }
}
