
/**
 * Command Interface
 * A command represents an intent to change the system state.
 */
export interface Command<TResult = void> {
    // Marker interface
}

/**
 * Command Handler Interface
 */
export interface CommandHandler<TCommand extends Command<TResult>, TResult = void> {
    execute(command: TCommand): Promise<TResult>;
}

/**
 * Query Interface
 * A query represents an intent to retrieve data without side effects.
 */
export interface Query<TResult> {
    // Marker interface
}

/**
 * Query Handler Interface
 */
export interface QueryHandler<TQuery extends Query<TResult>, TResult> {
    execute(query: TQuery): Promise<TResult>;
}

/**
 * Command Bus
 * Dispatches commands to their registered handlers.
 */
export class CommandBus {
    private handlers = new Map<string, CommandHandler<any, any>>();

    register<TCommand extends Command<TResult>, TResult>(
        commandName: string,
        handler: CommandHandler<TCommand, TResult>
    ): void {
        this.handlers.set(commandName, handler);
    }

    async execute<TResult>(commandName: string, command: Command<TResult>): Promise<TResult> {
        const handler = this.handlers.get(commandName);
        if (!handler) {
            throw new Error(`No handler registered for command: ${commandName}`);
        }
        return handler.execute(command);
    }
}

/**
 * Query Bus
 * Dispatches queries to their registered handlers.
 */
export class QueryBus {
    private handlers = new Map<string, QueryHandler<any, any>>();

    register<TQuery extends Query<TResult>, TResult>(
        queryName: string,
        handler: QueryHandler<TQuery, TResult>
    ): void {
        this.handlers.set(queryName, handler);
    }

    async execute<TResult>(queryName: string, query: Query<TResult>): Promise<TResult> {
        const handler = this.handlers.get(queryName);
        if (!handler) {
            throw new Error(`No handler registered for query: ${queryName}`);
        }
        return handler.execute(query);
    }
}
