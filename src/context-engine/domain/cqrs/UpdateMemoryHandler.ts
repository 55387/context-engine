
import { Command, CommandHandler } from './CQRS';
import { Memory } from '../../types';
import { MemoryManager } from '../../memory/MemoryManager';
import { ContextEngineError, ContextEngineErrorCode } from '../../types';

export class UpdateMemoryCommand implements Command<Memory> {
    constructor(
        public readonly memoryId: string,
        public readonly updates: {
            fact?: string;
            scope?: 'user' | 'global';
            // potentially other fields like metadata
        }
    ) { }
}

export class UpdateMemoryHandler implements CommandHandler<UpdateMemoryCommand, Memory> {
    constructor(private memoryManager: MemoryManager) { }

    async execute(command: UpdateMemoryCommand): Promise<Memory> {
        // We need a method in MemoryManager to update memory explicitly.
        // Currently it only has storeMemory (create) and consolidate (internal).
        // We will add updateMemory method.
        return this.memoryManager.updateMemory(command.memoryId, command.updates);
    }
}
