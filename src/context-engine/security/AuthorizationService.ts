
import { Session, Memory, ContextEngineError, ContextEngineErrorCode } from '../types';

export interface AccessControlPolicy {
    /**
     * Determine if an actor can read a resource
     */
    canRead(actorId: string, resource: Session | Memory): boolean;

    /**
     * Determine if an actor can write/modify a resource
     */
    canWrite(actorId: string, resource: Session | Memory): boolean;
}

/**
 * Default Ownership Policy
 * Users can only access resources where they are the 'userId' owner.
 */
export class OwnershipPolicy implements AccessControlPolicy {
    canRead(actorId: string, resource: Session | Memory): boolean {
        return resource.userId === actorId;
    }

    canWrite(actorId: string, resource: Session | Memory): boolean {
        return resource.userId === actorId;
    }
}

/**
 * Authorization Service
 * Enforces access control policies.
 */
export class AuthorizationService {
    private policy: AccessControlPolicy;

    constructor(policy: AccessControlPolicy = new OwnershipPolicy()) {
        this.policy = policy;
    }

    /**
     * Verify read access or throw
     */
    verifyRead(actorId: string, resource: Session | Memory, resourceType: 'Session' | 'Memory'): void {
        if (!this.policy.canRead(actorId, resource)) {
            throw new ContextEngineError(
                ContextEngineErrorCode.PERMISSION_ERROR,
                `Access Denied: Actor ${actorId} cannot read ${resourceType} ${resource.id} belonging to ${resource.userId}`
            );
        }
    }

    /**
     * Verify write access or throw
     */
    verifyWrite(actorId: string, resource: Session | Memory, resourceType: 'Session' | 'Memory'): void {
        if (!this.policy.canWrite(actorId, resource)) {
            throw new ContextEngineError(
                ContextEngineErrorCode.PERMISSION_ERROR,
                `Access Denied: Actor ${actorId} cannot write ${resourceType} ${resource.id} belonging to ${resource.userId}`
            );
        }
    }
}
