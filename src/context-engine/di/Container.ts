
/**
 * Dependency Injection Container
 * 
 * A lightweight, type-safe DI container for managing Context Engine components.
 */

export type ServiceIdentifier<T> = string | symbol | { new(...args: any[]): T };

type Factory<T> = (container: Container) => T;

interface ServiceProvider<T> {
    factory: Factory<T>;
    value?: T;
    singleton: boolean;
}

export class Container {
    private providers = new Map<ServiceIdentifier<any>, ServiceProvider<any>>();

    /**
     * Register a singleton service
     */
    registerSingleton<T>(id: ServiceIdentifier<T>, factory: Factory<T>): void {
        this.providers.set(id, { factory, singleton: true });
    }

    /**
     * Register a transient service (created every time)
     */
    registerTransient<T>(id: ServiceIdentifier<T>, factory: Factory<T>): void {
        this.providers.set(id, { factory, singleton: false });
    }

    /**
     * Register a constant value
     */
    registerValue<T>(id: ServiceIdentifier<T>, value: T): void {
        this.providers.set(id, { factory: () => value, value, singleton: true });
    }

    /**
     * Resolve a service
     */
    resolve<T>(id: ServiceIdentifier<T>): T {
        const provider = this.providers.get(id);
        if (!provider) {
            const name = typeof id === 'function' ? id.name : String(id);
            throw new Error(`Service not registered: ${name}`);
        }

        if (provider.singleton) {
            if (!provider.value) {
                provider.value = provider.factory(this);
            }
            return provider.value;
        }

        return provider.factory(this);
    }

    /**
     * Check if a service is registered
     */
    has(id: ServiceIdentifier<any>): boolean {
        return this.providers.has(id);
    }
}

// Global container instance for convenience (optional)
export const globalContainer = new Container();
