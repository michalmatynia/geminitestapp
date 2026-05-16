/**
 * Agent Lease Service
 * 
 * Shared service for managing resource leases and ownership for AI agents.
 * Provides:
 * - Scoped resource leasing (claiming, renewing, releasing)
 * - Lease state discovery and monitoring
 * - Expiration and stale lease detection
 * - External adapter support (e.g., Playwright broker)
 * - Conflict detection for concurrent agent operations
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { agentCapabilityManifest } from './agent-capability-manifest';
import { getAgentDiscoverySummary, getAgentResource } from './agent-discovery';
import {
  AgentLeaseEventSchema,
  AgentLeaseMutationRequestSchema,
  AgentLeaseMutationResultSchema,
  AgentLeaseRecordSchema,
  AgentLeaseStateSchema,
} from '../contracts/agent-leases';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const MAX_RECENT_EVENTS = 10;
const DEFAULT_SCOPE_KEY = '__default__';
const PLAYWRIGHT_BROKER_RESOURCE_ID = 'testing.playwright.runtime-broker';

const SHARED_LEASE_LIMITATION =
  'Base import scopes use the shared in-process lease registry. Playwright runtime broker scopes are discovered from the broker lease files until broker-side mutations are fully routed through the shared lease API.';

/**
 * Record representing an active or historical lease.
 */
type LeaseRecord = ReturnType<typeof AgentLeaseRecordSchema.parse>;
/**
 * Event representing a change or attempt in lease state.
 */
type LeaseEvent = ReturnType<typeof AgentLeaseEventSchema.parse>;
/**
 * Snapshot of the current lease state for a resource.
 */
type LeaseState = ReturnType<typeof AgentLeaseStateSchema.parse>;

/**
 * Internal registry for storing leases and events in memory.
 */
type LeaseRegistry = {
  /** Map of scoped lease keys to their active lease record. */
  leases: Map<string, LeaseRecord>;
  /** Map of scoped lease keys to their recent events history. */
  events: Map<string, LeaseEvent[]>;
};

declare global {
  var __geminitestappAgentLeaseRegistry: LeaseRegistry | undefined;
}

/**
 * Retrieves the global lease registry, initializing it if necessary.
 * 
 * @returns The singleton LeaseRegistry instance.
 */
function getRegistry(): LeaseRegistry {
  if (!globalThis.__geminitestappAgentLeaseRegistry) {
    globalThis.__geminitestappAgentLeaseRegistry = {
      leases: new Map(),
      events: new Map(),
    };
  }

  return globalThis.__geminitestappAgentLeaseRegistry;
}

/**
 * Gets the current time in ISO format.
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Normalizes a scope ID by trimming and checking for empty strings.
 */
function normalizeScopeId(scopeId: string | null | undefined) {
  const normalized = typeof scopeId === 'string' ? scopeId.trim() : '';
  return normalized.length > 0 ? normalized : null;
}

/**
 * Builds a unique lookup key for a resource and its scope.
 */
function buildScopedLeaseKey(resourceId: string, scopeId: string | null) {
  return `${resourceId}::${scopeId ?? DEFAULT_SCOPE_KEY}`;
}

/**
 * Resolves the default lease duration for a resource.
 */
function defaultLeaseMs(resourceId: string) {
  const resource = getAgentResource(resourceId);
  return resource?.leaseMs ?? resource?.staleAfterMs ?? DEFAULT_LEASE_MS;
}

/**
 * Checks if a given timestamp has passed.
 */
function isExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

/**
 * Appends a lease event to the recent history for a scoped resource.
 */
function appendEvent(
  resourceId: string,
  scopeId: string | null,
  event: LeaseEvent,
) {
  const registry = getRegistry();
  const scopedLeaseKey = buildScopedLeaseKey(resourceId, scopeId);
  const events = registry.events.get(scopedLeaseKey) ?? [];
  events.push(event);
  registry.events.set(scopedLeaseKey, events.slice(-MAX_RECENT_EVENTS));
}

/**
 * Retrieves the most recent events for a scoped resource, in reverse chronological order.
 */
function getRecentEvents(resourceId: string, scopeId: string | null) {
  const scopedLeaseKey = buildScopedLeaseKey(resourceId, scopeId);
  return (getRegistry().events.get(scopedLeaseKey) ?? []).slice().reverse();
}

/**
 * Checks if the active lease for a resource has expired and removes it if so.
 * This "lazy cleanup" ensures that stale leases are detected before any new claim or read.
 */
function markExpiredIfNeeded(resourceId: string, scopeId: string | null) {
  const registry = getRegistry();
  const scopedLeaseKey = buildScopedLeaseKey(resourceId, scopeId);
  const activeLease = registry.leases.get(scopedLeaseKey);

  // If there's no lease or it hasn't expired yet, do nothing
  if (!activeLease || !isExpired(activeLease.expiresAt)) {
    return;
  }

  // Stale lease detected - remove it from registry
  registry.leases.delete(scopedLeaseKey);
  
  // Log the expiration event for audit purposes
  appendEvent(
    resourceId,
    scopeId,
    AgentLeaseEventSchema.parse({
      eventId: crypto.randomUUID(),
      kind: 'expired',
      resourceId,
      scopeId,
      leaseId: activeLease.leaseId,
      timestamp: nowIso(),
      ownerAgentId: activeLease.ownerAgentId,
      ownerRunId: activeLease.ownerRunId,
      summary: `Lease ${activeLease.leaseId} expired for ${resourceId}${scopeId ? ` scope ${scopeId}` : ''}.`,
    }),
  );
}

/**
 * Gets the current lease state for an internal resource.
 */
function getInternalLeaseState(resourceId: string, scopeId: string | null = null) {
  const resource = getAgentResource(resourceId);

  if (!resource) {
    return null;
  }

  markExpiredIfNeeded(resourceId, scopeId);
  const activeLease = getRegistry().leases.get(buildScopedLeaseKey(resourceId, scopeId)) ?? null;

  return AgentLeaseStateSchema.parse({
    resource,
    scopeId,
    supported: resource.requiresLease,
    managedBy: 'shared_service',
    activeLease,
    recentEvents: getRecentEvents(resourceId, scopeId),
  });
}

/**
 * Lists all lease states for a specific resource across all active scopes.
 */
function listInternalLeaseStatesForResource(options: {
  resourceId: string;
  scopeId?: string | null;
  activeOnly?: boolean;
}) {
  const resource = getAgentResource(options.resourceId);

  if (!resource) {
    return [] as LeaseState[];
  }

  const scopeId = normalizeScopeId(options.scopeId ?? null);
  const registry = getRegistry();

  // Perform lazy cleanup for all relevant leases
  for (const lease of registry.leases.values()) {
    if (lease.resourceId !== options.resourceId) {
      continue;
    }

    if (scopeId && lease.scopeId !== scopeId) {
      continue;
    }

    markExpiredIfNeeded(options.resourceId, lease.scopeId ?? null);
  }

  const activeLeases = Array.from(registry.leases.values())
    .filter((lease) => lease.resourceId === options.resourceId)
    .filter((lease) => !scopeId || lease.scopeId === scopeId)
    .sort((left, right) => (left.scopeId ?? '').localeCompare(right.scopeId ?? ''));

  if (activeLeases.length === 0) {
    if (options.activeOnly) {
      return [] as LeaseState[];
    }

    return [
      AgentLeaseStateSchema.parse({
        resource,
        scopeId,
        supported: resource.requiresLease,
        managedBy: 'shared_service',
        activeLease: null,
        recentEvents: getRecentEvents(options.resourceId, scopeId),
      }),
    ];
  }

  return activeLeases.map((lease) =>
    AgentLeaseStateSchema.parse({
      resource,
      scopeId: lease.scopeId ?? null,
      supported: resource.requiresLease,
      managedBy: 'shared_service',
      activeLease: lease,
      recentEvents: getRecentEvents(options.resourceId, lease.scopeId ?? null),
    }),
  );
}

/**
 * Resolves the directory where Playwright runtime broker leases are stored.
 */
function resolveRuntimeBrokerDir(rootDir = process.cwd()) {
  return (
    process.env['PLAYWRIGHT_RUNTIME_BROKER_DIR']?.trim() ||
    path.join(rootDir, 'tmp', 'playwright-runtime-broker')
  );
}

/**
 * Checks if a process with the given PID is still alive.
 */
async function isProcessAlive(pid: number | null) {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return false;
  }
}

/**
 * Discovers lease states from external Playwright broker lease files.
 * This bridge allows the shared lease service to report on external runtimes.
 */
async function readPlaywrightBrokerLeaseStates(options?: {
  scopeId?: string | null;
  activeOnly?: boolean;
}) {
  const resource = getAgentResource(PLAYWRIGHT_BROKER_RESOURCE_ID);

  if (!resource) {
    return [] as LeaseState[];
  }

  const scopeId = normalizeScopeId(options?.scopeId ?? null);
  const leaseDir = path.join(resolveRuntimeBrokerDir(), 'leases');

  let files: string[] = [];
  try {
    files = await fsPromises.readdir(leaseDir);
  } catch (error) {
    void ErrorSystem.captureException(error);
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return options?.activeOnly
        ? []
        : [
          AgentLeaseStateSchema.parse({
            resource,
            scopeId,
            supported: resource.requiresLease,
            managedBy: 'external_adapter',
            activeLease: null,
            recentEvents: [],
          }),
        ];
    }

    throw error;
  }

  const states: LeaseState[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }

    const filePath = path.join(leaseDir, file);
    let parsed: Record<string, unknown> | null = null;

    try {
      const raw = await fsPromises.readFile(filePath, 'utf8');
      const candidate = JSON.parse(raw) as unknown;
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
        parsed = candidate as Record<string, unknown>;
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        continue;
      }

      throw error;
    }

    if (!parsed) {
      continue;
    }

    const resolvedScopeId = normalizeScopeId(
      typeof parsed['agentLeaseScopeId'] === 'string'
        ? parsed['agentLeaseScopeId']
        : typeof parsed['leaseKey'] === 'string'
          ? parsed['leaseKey']
          : path.basename(file, '.json'),
    );

    if (scopeId && resolvedScopeId !== scopeId) {
      continue;
    }

    const pid =
      typeof parsed['pid'] === 'number'
        ? parsed['pid']
        : typeof parsed['pid'] === 'string'
          ? Number(parsed['pid'])
          : null;
    const normalizedPid =
      typeof pid === 'number' && Number.isFinite(pid) ? Math.trunc(pid) : null;
    
    // For external broker runtimes, "liveness" is checked by PID presence
    const running = await isProcessAlive(normalizedPid);
    const claimedAt =
      typeof parsed['startedAt'] === 'string' ? parsed['startedAt'] : nowIso();
    const heartbeatAt =
      typeof parsed['leaseHeartbeatAt'] === 'string'
        ? parsed['leaseHeartbeatAt']
        : claimedAt;
    const ownerAgentId =
      typeof parsed['agentId'] === 'string' && parsed['agentId'].trim().length > 0
        ? parsed['agentId'].trim()
        : 'unknown-agent';
    const leaseId =
      typeof parsed['leaseKey'] === 'string' && parsed['leaseKey'].trim().length > 0
        ? parsed['leaseKey'].trim()
        : resolvedScopeId ?? crypto.randomUUID();
    const activeLease = running
      ? AgentLeaseRecordSchema.parse({
        leaseId,
        resourceId: PLAYWRIGHT_BROKER_RESOURCE_ID,
        scopeId: resolvedScopeId,
        resourceType: resource.resourceType,
        ownerAgentId,
        ownerRunId: null,
        mode: resource.mode,
        status: 'active',
        leaseMs: resource.staleAfterMs ?? DEFAULT_LEASE_MS,
        heartbeatMs: resource.heartbeatMs ?? null,
        claimedAt,
        heartbeatAt,
        expiresAt: null,
      })
      : null;

    const recentEvents = [
      AgentLeaseEventSchema.parse({
        eventId: `${leaseId}:${running ? 'active' : 'expired'}`,
        kind: running ? (parsed['reused'] === true ? 'renewed' : 'claimed') : 'expired',
        resourceId: PLAYWRIGHT_BROKER_RESOURCE_ID,
        scopeId: resolvedScopeId,
        leaseId,
        timestamp: heartbeatAt,
        ownerAgentId,
        ownerRunId: null,
        summary: running
          ? `Broker runtime ${leaseId} is active for scope ${resolvedScopeId ?? DEFAULT_SCOPE_KEY}.`
          : `Broker runtime ${leaseId} is no longer running for scope ${resolvedScopeId ?? DEFAULT_SCOPE_KEY}.`,
      }),
    ];

    if (options?.activeOnly && !activeLease) {
      continue;
    }

    states.push(
      AgentLeaseStateSchema.parse({
        resource,
        scopeId: resolvedScopeId,
        supported: resource.requiresLease,
        managedBy: 'external_adapter',
        activeLease,
        recentEvents,
      }),
    );
  }

  if (states.length === 0 && !options?.activeOnly) {
    return [
      AgentLeaseStateSchema.parse({
        resource,
        scopeId,
        supported: resource.requiresLease,
        managedBy: 'external_adapter',
        activeLease: null,
        recentEvents: [],
      }),
    ];
  }

  return states.sort((left, right) => (left.scopeId ?? '').localeCompare(right.scopeId ?? ''));
}

/**
 * Lists all agent lease states across all supported resources.
 * 
 * @param options - Filtering options for resource type, ID, scope, and active status.
 * @returns An array of LeaseState snapshots.
 */
export async function listAgentLeaseStates(options?: {
  activeOnly?: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  scopeId?: string | null;
}) {
  const resourceId = options?.resourceId?.trim() || null;
  const scopeId = normalizeScopeId(options?.scopeId ?? null);
  const states: LeaseState[] = [];

  for (const resource of agentCapabilityManifest.resources) {
    if (!resource.requiresLease) {
      continue;
    }

    if (options?.resourceType && resource.resourceType !== options.resourceType.trim()) {
      continue;
    }

    if (resourceId && resource.resourceId !== resourceId) {
      continue;
    }

    // Playwright broker resources use a file-based adapter
    if (resource.resourceId === PLAYWRIGHT_BROKER_RESOURCE_ID) {
      states.push(
        ...(await readPlaywrightBrokerLeaseStates({
          scopeId,
          activeOnly: options?.activeOnly,
        })),
      );
      continue;
    }

    // Other resources use the internal in-process registry
    states.push(
      ...listInternalLeaseStatesForResource({
        resourceId: resource.resourceId,
        scopeId,
        activeOnly: options?.activeOnly,
      }),
    );
  }

  return states;
}

/**
 * Gets the lease state for a specific scoped resource.
 * 
 * @param resourceId - The ID of the resource.
 * @param scopeId - Optional scope identifier.
 * @returns The LeaseState snapshot or null if not found.
 */
export async function getAgentLeaseState(resourceId: string, scopeId?: string | null) {
  const states = await listAgentLeaseStates({
    resourceId,
    scopeId,
  });

  if (states.length === 0) {
    return null;
  }

  return states[0] ?? null;
}

/**
 * Entrypoint for mutating (claiming, renewing, releasing) agent leases.
 * Validates the request against the capability manifest and resource policies.
 * 
 * @param input - The raw mutation request payload.
 * @returns A result object indicating success or failure.
 */
import { configurationError } from '@/shared/errors/app-error';

// ...

export function mutateAgentLease(input: unknown) {
  const request = AgentLeaseMutationRequestSchema.parse(input);
  const resource = getAgentResource(request.resourceId);
  const scopeId = normalizeScopeId(request.scopeId ?? null);

  if (!resource) {
    throw configurationError(`Unknown agent resource: ${request.resourceId}`, {
      resourceId: request.resourceId,
    });
  }

  // Broker leases cannot be mutated through this API; they are managed by the broker runtime
  if (request.resourceId === PLAYWRIGHT_BROKER_RESOURCE_ID) {
    throw configurationError(
      'Playwright runtime broker scopes are managed by runtime-broker.mjs. Use GET /api/agent/leases for discovery.',
      {
        resourceId: request.resourceId,
        action: 'unsupported',
      }
    );
  }

  if (!resource.requiresLease) {
    throw configurationError(`Resource ${request.resourceId} does not require a live lease.`, {
      resourceId: request.resourceId,
    });
  }

  if (resource.scopeRequired && !scopeId) {
    throw configurationError(
      `Resource ${request.resourceId} requires a scopeId (${resource.scopeDescription ?? 'scope identifier'}).`,
      {
        resourceId: request.resourceId,
        scopeDescription: resource.scopeDescription,
      }
    );
  }

  const normalizedRequest = {
    ...request,
    scopeId,
  };

  if (request.action === 'claim') {
    return claimAgentLease(normalizedRequest);
  }

  if (request.action === 'renew') {
    return renewAgentLease(normalizedRequest);
  }

  return releaseAgentLease(normalizedRequest);
}

/**
 * Internal logic for claiming a lease on a resource.
 * Checks for existing ownership and handles lease re-acquisition by the same owner.
 */
function claimAgentLease(
  request: ReturnType<typeof AgentLeaseMutationRequestSchema.parse> & {
    scopeId: string | null;
  },
) {
  const registry = getRegistry();
  const resource = getAgentResource(request.resourceId);

  if (!resource) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'not_found',
      message: `Unknown agent resource: ${request.resourceId}`,
    });
  }

  markExpiredIfNeeded(request.resourceId, request.scopeId);
  const scopedLeaseKey = buildScopedLeaseKey(request.resourceId, request.scopeId);
  const currentLease = registry.leases.get(scopedLeaseKey);

  // If already leased
  if (currentLease) {
    // If the caller already owns the lease, treat the claim as a renewal
    if (
      currentLease.ownerAgentId === request.ownerAgentId &&
      currentLease.ownerRunId === (request.ownerRunId ?? null)
    ) {
      return renewAgentLease({
        ...request,
        action: 'renew',
        leaseId: currentLease.leaseId,
      });
    }

    // Conflict: resource is owned by someone else
    const event = AgentLeaseEventSchema.parse({
      eventId: crypto.randomUUID(),
      kind: 'conflicted',
      resourceId: request.resourceId,
      scopeId: request.scopeId,
      leaseId: currentLease.leaseId,
      timestamp: nowIso(),
      ownerAgentId: request.ownerAgentId,
      ownerRunId: request.ownerRunId ?? null,
      summary: `Lease claim blocked for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}; resource already owned by ${currentLease.ownerAgentId}.`,
    });

    appendEvent(request.resourceId, request.scopeId, event);

    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Resource ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''} is already leased by ${currentLease.ownerAgentId}.`,
      state: getInternalLeaseState(request.resourceId, request.scopeId),
      conflictingLease: currentLease,
      event,
    });
  }

  // Resource is free, create new lease record
  const claimedAt = nowIso();
  const leaseMs = request.leaseMs ?? defaultLeaseMs(request.resourceId);
  const heartbeatMs = resource.heartbeatMs ?? null;
  const expiresAt = new Date(Date.now() + leaseMs).toISOString();
  const lease = AgentLeaseRecordSchema.parse({
    leaseId: crypto.randomUUID(),
    resourceId: request.resourceId,
    scopeId: request.scopeId,
    resourceType: resource.resourceType,
    ownerAgentId: request.ownerAgentId,
    ownerRunId: request.ownerRunId ?? null,
    mode: resource.mode,
    status: 'active',
    leaseMs,
    heartbeatMs,
    claimedAt,
    heartbeatAt: claimedAt,
    expiresAt,
  });

  registry.leases.set(scopedLeaseKey, lease);

  const event = AgentLeaseEventSchema.parse({
    eventId: crypto.randomUUID(),
    kind: 'claimed',
    resourceId: request.resourceId,
    scopeId: request.scopeId,
    leaseId: lease.leaseId,
    timestamp: claimedAt,
    ownerAgentId: lease.ownerAgentId,
    ownerRunId: lease.ownerRunId,
    summary: `Lease ${lease.leaseId} claimed for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
  });

  appendEvent(request.resourceId, request.scopeId, event);

  return AgentLeaseMutationResultSchema.parse({
    ok: true,
    code: 'claimed',
    message: `Lease claimed for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
    state: getInternalLeaseState(request.resourceId, request.scopeId),
    lease,
    event,
  });
}

/**
 * Internal logic for renewing an existing lease.
 * Only the current owner can renew a lease.
 */
function renewAgentLease(
  request: ReturnType<typeof AgentLeaseMutationRequestSchema.parse> & {
    scopeId: string | null;
  },
) {
  const registry = getRegistry();
  const scopedLeaseKey = buildScopedLeaseKey(request.resourceId, request.scopeId);

  markExpiredIfNeeded(request.resourceId, request.scopeId);
  const currentLease = registry.leases.get(scopedLeaseKey);

  if (!currentLease) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'not_found',
      message: `No active lease exists for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
      state: getInternalLeaseState(request.resourceId, request.scopeId),
    });
  }

  // Ensure caller is the owner
  if (
    currentLease.ownerAgentId !== request.ownerAgentId ||
    currentLease.ownerRunId !== (request.ownerRunId ?? currentLease.ownerRunId)
  ) {
    const event = AgentLeaseEventSchema.parse({
      eventId: crypto.randomUUID(),
      kind: 'conflicted',
      resourceId: request.resourceId,
      scopeId: request.scopeId,
      leaseId: currentLease.leaseId,
      timestamp: nowIso(),
      ownerAgentId: request.ownerAgentId,
      ownerRunId: request.ownerRunId ?? null,
      summary: `Lease renewal blocked for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}; caller does not own the active lease.`,
    });

    appendEvent(request.resourceId, request.scopeId, event);

    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Only the current owner can renew ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
      state: getInternalLeaseState(request.resourceId, request.scopeId),
      conflictingLease: currentLease,
      event,
    });
  }

  // If an explicit leaseId was provided, it must match the current one
  if (request.leaseId && request.leaseId !== currentLease.leaseId) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Lease id mismatch for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
      state: getInternalLeaseState(request.resourceId, request.scopeId),
      conflictingLease: currentLease,
    });
  }

  // Update expiration time and heartbeat
  const leaseMs = request.leaseMs ?? currentLease.leaseMs;
  const heartbeatAt = nowIso();
  const renewedLease = AgentLeaseRecordSchema.parse({
    ...currentLease,
    leaseMs,
    heartbeatAt,
    expiresAt: new Date(Date.now() + leaseMs).toISOString(),
    status: 'active',
  });

  registry.leases.set(scopedLeaseKey, renewedLease);

  const event = AgentLeaseEventSchema.parse({
    eventId: crypto.randomUUID(),
    kind: 'renewed',
    resourceId: request.resourceId,
    scopeId: request.scopeId,
    leaseId: renewedLease.leaseId,
    timestamp: heartbeatAt,
    ownerAgentId: renewedLease.ownerAgentId,
    ownerRunId: renewedLease.ownerRunId,
    summary: `Lease ${renewedLease.leaseId} renewed for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
  });

  appendEvent(request.resourceId, request.scopeId, event);

  return AgentLeaseMutationResultSchema.parse({
    ok: true,
    code: 'renewed',
    message: `Lease renewed for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
    state: getInternalLeaseState(request.resourceId, request.scopeId),
    lease: renewedLease,
    event,
  });
}

/**
 * Internal logic for releasing a lease.
 * Only the current owner can release a lease.
 */
function releaseAgentLease(
  request: ReturnType<typeof AgentLeaseMutationRequestSchema.parse> & {
    scopeId: string | null;
  },
) {
  const registry = getRegistry();
  const scopedLeaseKey = buildScopedLeaseKey(request.resourceId, request.scopeId);

  markExpiredIfNeeded(request.resourceId, request.scopeId);
  const currentLease = registry.leases.get(scopedLeaseKey);

  if (!currentLease) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'not_found',
      message: `No active lease exists for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
      state: getInternalLeaseState(request.resourceId, request.scopeId),
    });
  }

  // Verify ownership before releasing
  if (
    currentLease.ownerAgentId !== request.ownerAgentId ||
    (request.leaseId && request.leaseId !== currentLease.leaseId)
  ) {
    const event = AgentLeaseEventSchema.parse({
      eventId: crypto.randomUUID(),
      kind: 'conflicted',
      resourceId: request.resourceId,
      scopeId: request.scopeId,
      leaseId: currentLease.leaseId,
      timestamp: nowIso(),
      ownerAgentId: request.ownerAgentId,
      ownerRunId: request.ownerRunId ?? null,
      summary: `Lease release blocked for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}; caller does not own the active lease.`,
    });

    appendEvent(request.resourceId, request.scopeId, event);

    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Only the current owner can release ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
      state: getInternalLeaseState(request.resourceId, request.scopeId),
      conflictingLease: currentLease,
      event,
    });
  }

  // Explicit release
  registry.leases.delete(scopedLeaseKey);

  const releasedAt = nowIso();
  const releasedLease = AgentLeaseRecordSchema.parse({
    ...currentLease,
    status: 'released',
    releasedAt,
    releaseReason: request.reason ?? null,
  });

  const event = AgentLeaseEventSchema.parse({
    eventId: crypto.randomUUID(),
    kind: 'released',
    resourceId: request.resourceId,
    scopeId: request.scopeId,
    leaseId: currentLease.leaseId,
    timestamp: releasedAt,
    ownerAgentId: currentLease.ownerAgentId,
    ownerRunId: currentLease.ownerRunId,
    summary: `Lease ${currentLease.leaseId} released for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
  });

  appendEvent(request.resourceId, request.scopeId, event);

  return AgentLeaseMutationResultSchema.parse({
    ok: true,
    code: 'released',
    message: `Lease released for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
    state: getInternalLeaseState(request.resourceId, request.scopeId),
    lease: releasedLease,
    event,
  });
}

/**
 * Retrieves the full discovery payload for agent leases.
 * Includes active leases, limitations, and discovery summary.
 */
export async function getAgentLeaseDiscoveryPayload(options?: {
  activeOnly?: boolean;
  resourceType?: string | null;
  resourceId?: string | null;
  scopeId?: string | null;
}) {
  return {
    leases: await listAgentLeaseStates(options),
    limitation: SHARED_LEASE_LIMITATION,
    ...getAgentDiscoverySummary(),
  };
}

export { SHARED_LEASE_LIMITATION };
