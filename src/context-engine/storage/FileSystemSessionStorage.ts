import fs from 'fs';
import path from 'path';
import {
    Session,
    SessionStorage,
    Event,
    SessionState,
    ContextEngineError,
    ContextEngineErrorCode,
} from '../types';
import { deepClone } from '../utils';

export interface FileSystemSessionStorageConfig {
    baseDir: string;
}

export class FileSystemSessionStorage implements SessionStorage {
    private baseDir: string;
    private sessionsDir: string;

    constructor(config: FileSystemSessionStorageConfig) {
        this.baseDir = config.baseDir;
        this.sessionsDir = path.join(this.baseDir, 'sessions');
        this.ensureDir();
    }

    private ensureDir() {
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
    }

    private getFilePath(sessionId: string): string {
        return path.join(this.sessionsDir, `${sessionId}.json`);
    }

    private async saveToFile(session: Session): Promise<void> {
        const filePath = this.getFilePath(session.id);
        const data = JSON.stringify(session, null, 2);
        await fs.promises.writeFile(filePath, data, 'utf-8');
    }

    private async readFromFile(sessionId: string): Promise<Session | null> {
        const filePath = this.getFilePath(sessionId);
        if (!fs.existsSync(filePath)) {
            return null;
        }
        try {
            const data = await fs.promises.readFile(filePath, 'utf-8');
            const session = JSON.parse(data, (key, value) => {
                // Revive Dates
                if (key === 'createdAt' || key === 'updatedAt' || key === 'timestamp') {
                    return new Date(value);
                }
                return value;
            });
            return session as Session;
        } catch (error) {
            console.error(`Failed to read session file ${sessionId}:`, error);
            return null;
        }
    }

    async create(session: Session): Promise<Session> {
        if (await this.readFromFile(session.id)) {
            throw new ContextEngineError(
                ContextEngineErrorCode.VALIDATION_ERROR,
                `Session with ID ${session.id} already exists`
            );
        }
        await this.saveToFile(session);
        return deepClone(session);
    }

    async get(sessionId: string): Promise<Session | null> {
        const session = await this.readFromFile(sessionId);
        if (!session) return null;

        // Check TTL (Simplified: read -> check -> delete if expired)
        if (session.config.ttlMs) {
            const expiresAt = new Date(
                session.updatedAt.getTime() + session.config.ttlMs
            );
            if (new Date() > expiresAt) {
                await this.delete(sessionId);
                return null;
            }
        }
        return session;
    }

    async update(session: Session): Promise<Session> {
        if (!(await this.readFromFile(session.id))) {
            throw new ContextEngineError(
                ContextEngineErrorCode.SESSION_NOT_FOUND,
                `Session with ID ${session.id} not found`
            );
        }
        const updatedSession = deepClone(session);
        updatedSession.updatedAt = new Date();
        await this.saveToFile(updatedSession);
        return updatedSession;
    }

    async delete(sessionId: string): Promise<void> {
        const filePath = this.getFilePath(sessionId);
        if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    }

    async listByUser(userId: string, limit: number = 100): Promise<Session[]> {
        const files = await fs.promises.readdir(this.sessionsDir);
        const sessions: Session[] = [];

        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const sessionId = file.replace('.json', '');
            const session = await this.get(sessionId); // Use get to handle TTL
            if (session && session.userId === userId) {
                sessions.push(session);
            }
        }

        sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return sessions.slice(0, limit);
    }

    async appendEvent(sessionId: string, event: Event): Promise<void> {
        const session = await this.get(sessionId);
        if (!session) {
            throw new ContextEngineError(
                ContextEngineErrorCode.SESSION_NOT_FOUND,
                `Session with ID ${sessionId} not found`
            );
        }

        session.events.push(deepClone(event));

        // Check max events limit
        if (session.config.maxEvents && session.events.length > session.config.maxEvents) {
            session.events = session.events.slice(-session.config.maxEvents);
        }

        await this.update(session);
    }

    async updateState(sessionId: string, state: SessionState): Promise<void> {
        const session = await this.get(sessionId);
        if (!session) {
            throw new ContextEngineError(
                ContextEngineErrorCode.SESSION_NOT_FOUND,
                `Session with ID ${sessionId} not found`
            );
        }
        session.state = { ...session.state, ...state };
        await this.update(session);
    }
}
