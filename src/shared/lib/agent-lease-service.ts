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

type LeaseRecord = ReturnType<typeof AgentLeaseRecordSchema.parse>;
type LeaseEvent = ReturnType<typeof AgentLeaseEventSchema.parse>;
type LeaseState = ReturnType<typeof AgentLeaseStateSchema.parse>;
type LeaseRegistry = {
  leases: Map<string, LeaseRecord>;
  events: Map<string, LeaseEvent[]>;
};

declare global {
  var __geminitestappAgentLeaseRegistry: LeaseRegistry | undefined;
}

function getRegistry(): LeaseRegistry {
  if (!globalThis.__geminitestappAgentLeaseRegistry) {
    globalThis.__geminitestappAgentLeaseRegistry = {
      leases: new Map(),
      events: new Map(),
    };
  }

  return globalThis.__geminitestappAgentLeaseRegistry;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeScopeId(scopeId: string | null | undefined) {
  const normalized = typeof scopeId === 'string' ? scopeId.trim() : '';
  return normalized.length > 0 ? normalized : null;
}

function buildScopedLeaseKey(resourceId: string, scopeId: string | null) {
  return `${resourceId}::${scopeId ?? DEFAULT_SCOPE_KEY}`;
}

function defaultLeaseMs(resourceId: string) {
  const resource = getAgentResource(resourceId);
  return resource?.leaseMs ?? resource?.staleAfterMs ?? DEFAULT_LEASE_MS;
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() <= Date.now();
}

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

function getRecentEvents(resourceId: string, scopeId: string | null) {
  const scopedLeaseKey = buildScopedLeaseKey(resourceId, scopeId);
  return (getRegistry().events.get(scopedLeaseKey) ?? []).slice().reverse();
}

function markExpiredIfNeeded(resourceId: string, scopeId: string | null) {
  const registry = getRegistry();
  const scopedLeaseKey = buildScopedLeaseKey(resourceId, scopeId);
  const activeLease = registry.leases.get(scopedLeaseKey);

  if (!activeLease || !isExpired(activeLease.expiresAt)) {
    return;
  }

  registry.leases.delete(scopedLeaseKey);
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

function resolveRuntimeBrokerDir(rootDir = process.cwd()) {
  return (
    process.env['PLAYWRIGHT_RUNTIME_BROKER_DIR']?.trim() ||
    path.join(rootDir, 'tmp', 'playwright-runtime-broker')
  );
}

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

    if (resource.resourceId === PLAYWRIGHT_BROKER_RESOURCE_ID) {
      states.push(
        ...(await readPlaywrightBrokerLeaseStates({
          scopeId,
          activeOnly: options?.activeOnly,
        })),
      );
      continue;
    }

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

export function mutateAgentLease(input: unknown) {
  const request = AgentLeaseMutationRequestSchema.parse(input);
  const resource = getAgentResource(request.resourceId);
  const scopeId = normalizeScopeId(request.scopeId ?? null);

  if (!resource) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'not_found',
      message: `Unknown agent resource: ${request.resourceId}`,
    });
  }

  if (request.resourceId === PLAYWRIGHT_BROKER_RESOURCE_ID) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'unsupported',
      message:
        'Playwright runtime broker scopes are managed by runtime-broker.mjs. Use GET /api/agent/leases for discovery and acquire broker runtimes through the broker entrypoint.',
    });
  }

  if (!resource.requiresLease) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'unsupported',
      message: `Resource ${request.resourceId} does not require a live lease.`,
      state: getInternalLeaseState(request.resourceId, scopeId),
    });
  }

  if (resource.scopeRequired && !scopeId) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'unsupported',
      message: `Resource ${request.resourceId} requires a scopeId (${resource.scopeDescription ?? 'scope identifier'}).`,
    });
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

  if (currentLease) {
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

  if (request.leaseId && request.leaseId !== currentLease.leaseId) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Lease id mismatch for ${request.resourceId}${request.scopeId ? ` scope ${request.scopeId}` : ''}.`,
      state: getInternalLeaseState(request.resourceId, request.scopeId),
      conflictingLease: currentLease,
    });
  }

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
