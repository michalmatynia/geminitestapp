import {
  AgentLeaseEventSchema,
  AgentLeaseMutationRequestSchema,
  AgentLeaseMutationResultSchema,
  AgentLeaseRecordSchema,
  AgentLeaseStateSchema,
} from '../contracts/agent-leases';
import { getAgentDiscoverySummary, getAgentResource } from './agent-discovery';
import { agentCapabilityManifest } from './agent-capability-manifest';

const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const MAX_RECENT_EVENTS = 10;

type LeaseRegistry = {
  leases: Map<string, ReturnType<typeof AgentLeaseRecordSchema.parse>>;
  events: Map<string, ReturnType<typeof AgentLeaseEventSchema.parse>[]>;
};

declare global {
  // eslint-disable-next-line no-var
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
  event: ReturnType<typeof AgentLeaseEventSchema.parse>,
) {
  const registry = getRegistry();
  const events = registry.events.get(resourceId) ?? [];
  events.push(event);
  registry.events.set(resourceId, events.slice(-MAX_RECENT_EVENTS));
}

function markExpiredIfNeeded(resourceId: string) {
  const registry = getRegistry();
  const activeLease = registry.leases.get(resourceId);

  if (!activeLease || !isExpired(activeLease.expiresAt)) {
    return;
  }

  registry.leases.delete(resourceId);
  appendEvent(
    resourceId,
    AgentLeaseEventSchema.parse({
      eventId: crypto.randomUUID(),
      kind: 'expired',
      resourceId,
      leaseId: activeLease.leaseId,
      timestamp: nowIso(),
      ownerAgentId: activeLease.ownerAgentId,
      ownerRunId: activeLease.ownerRunId,
      summary: `Lease ${activeLease.leaseId} expired for ${resourceId}.`,
    }),
  );
}

function getRecentEvents(resourceId: string) {
  return (getRegistry().events.get(resourceId) ?? []).slice().reverse();
}

export function listAgentLeaseStates(options?: {
  activeOnly?: boolean;
  resourceType?: string | null;
}) {
  return agentCapabilityManifest.resources
    .filter((resource) => resource.requiresLease)
    .filter((resource) => {
      if (
        options?.resourceType &&
        resource.resourceType !== options.resourceType.trim()
      ) {
        return false;
      }

      return true;
    })
    .map((resource) => getAgentLeaseState(resource.resourceId))
    .filter((state): state is NonNullable<typeof state> => state !== null)
    .filter((state) => {
      if (!options?.activeOnly) {
        return true;
      }

      return state.activeLease !== null;
    });
}

export function getAgentLeaseState(resourceId: string) {
  const resource = getAgentResource(resourceId);

  if (!resource) {
    return null;
  }

  markExpiredIfNeeded(resourceId);
  const activeLease = getRegistry().leases.get(resourceId) ?? null;

  return AgentLeaseStateSchema.parse({
    resource,
    supported: resource.requiresLease,
    activeLease,
    recentEvents: getRecentEvents(resourceId),
  });
}

export function mutateAgentLease(input: unknown) {
  const request = AgentLeaseMutationRequestSchema.parse(input);
  const resource = getAgentResource(request.resourceId);

  if (!resource) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'not_found',
      message: `Unknown agent resource: ${request.resourceId}`,
    });
  }

  if (!resource.requiresLease) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'unsupported',
      message: `Resource ${request.resourceId} does not require a live lease.`,
      state: getAgentLeaseState(request.resourceId),
    });
  }

  if (request.action === 'claim') {
    return claimAgentLease(request);
  }

  if (request.action === 'renew') {
    return renewAgentLease(request);
  }

  return releaseAgentLease(request);
}

function claimAgentLease(
  request: ReturnType<typeof AgentLeaseMutationRequestSchema.parse>,
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

  markExpiredIfNeeded(request.resourceId);
  const currentLease = registry.leases.get(request.resourceId);

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
      leaseId: currentLease.leaseId,
      timestamp: nowIso(),
      ownerAgentId: request.ownerAgentId,
      ownerRunId: request.ownerRunId ?? null,
      summary: `Lease claim blocked for ${request.resourceId}; resource already owned by ${currentLease.ownerAgentId}.`,
    });

    appendEvent(request.resourceId, event);

    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Resource ${request.resourceId} is already leased by ${currentLease.ownerAgentId}.`,
      state: getAgentLeaseState(request.resourceId),
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

  registry.leases.set(request.resourceId, lease);

  const event = AgentLeaseEventSchema.parse({
    eventId: crypto.randomUUID(),
    kind: 'claimed',
    resourceId: request.resourceId,
    leaseId: lease.leaseId,
    timestamp: claimedAt,
    ownerAgentId: lease.ownerAgentId,
    ownerRunId: lease.ownerRunId,
    summary: `Lease ${lease.leaseId} claimed for ${request.resourceId}.`,
  });

  appendEvent(request.resourceId, event);

  return AgentLeaseMutationResultSchema.parse({
    ok: true,
    code: 'claimed',
    message: `Lease claimed for ${request.resourceId}.`,
    state: getAgentLeaseState(request.resourceId),
    lease,
    event,
  });
}

function renewAgentLease(
  request: ReturnType<typeof AgentLeaseMutationRequestSchema.parse>,
) {
  const registry = getRegistry();

  markExpiredIfNeeded(request.resourceId);
  const currentLease = registry.leases.get(request.resourceId);

  if (!currentLease) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'not_found',
      message: `No active lease exists for ${request.resourceId}.`,
      state: getAgentLeaseState(request.resourceId),
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
      leaseId: currentLease.leaseId,
      timestamp: nowIso(),
      ownerAgentId: request.ownerAgentId,
      ownerRunId: request.ownerRunId ?? null,
      summary: `Lease renewal blocked for ${request.resourceId}; caller does not own the active lease.`,
    });

    appendEvent(request.resourceId, event);

    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Only the current owner can renew ${request.resourceId}.`,
      state: getAgentLeaseState(request.resourceId),
      conflictingLease: currentLease,
      event,
    });
  }

  if (request.leaseId && request.leaseId !== currentLease.leaseId) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Lease id mismatch for ${request.resourceId}.`,
      state: getAgentLeaseState(request.resourceId),
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

  registry.leases.set(request.resourceId, renewedLease);

  const event = AgentLeaseEventSchema.parse({
    eventId: crypto.randomUUID(),
    kind: 'renewed',
    resourceId: request.resourceId,
    leaseId: renewedLease.leaseId,
    timestamp: heartbeatAt,
    ownerAgentId: renewedLease.ownerAgentId,
    ownerRunId: renewedLease.ownerRunId,
    summary: `Lease ${renewedLease.leaseId} renewed for ${request.resourceId}.`,
  });

  appendEvent(request.resourceId, event);

  return AgentLeaseMutationResultSchema.parse({
    ok: true,
    code: 'renewed',
    message: `Lease renewed for ${request.resourceId}.`,
    state: getAgentLeaseState(request.resourceId),
    lease: renewedLease,
    event,
  });
}

function releaseAgentLease(
  request: ReturnType<typeof AgentLeaseMutationRequestSchema.parse>,
) {
  const registry = getRegistry();

  markExpiredIfNeeded(request.resourceId);
  const currentLease = registry.leases.get(request.resourceId);

  if (!currentLease) {
    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'not_found',
      message: `No active lease exists for ${request.resourceId}.`,
      state: getAgentLeaseState(request.resourceId),
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
      leaseId: currentLease.leaseId,
      timestamp: nowIso(),
      ownerAgentId: request.ownerAgentId,
      ownerRunId: request.ownerRunId ?? null,
      summary: `Lease release blocked for ${request.resourceId}; caller does not own the active lease.`,
    });

    appendEvent(request.resourceId, event);

    return AgentLeaseMutationResultSchema.parse({
      ok: false,
      code: 'conflict',
      message: `Only the current owner can release ${request.resourceId}.`,
      state: getAgentLeaseState(request.resourceId),
      conflictingLease: currentLease,
      event,
    });
  }

  registry.leases.delete(request.resourceId);

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
    leaseId: currentLease.leaseId,
    timestamp: releasedAt,
    ownerAgentId: currentLease.ownerAgentId,
    ownerRunId: currentLease.ownerRunId,
    summary: `Lease ${currentLease.leaseId} released for ${request.resourceId}.`,
  });

  appendEvent(request.resourceId, event);

  return AgentLeaseMutationResultSchema.parse({
    ok: true,
    code: 'released',
    message: `Lease released for ${request.resourceId}.`,
    state: getAgentLeaseState(request.resourceId),
    lease: releasedLease,
    event,
  });
}

export function getAgentLeaseDiscoveryPayload(options?: {
  activeOnly?: boolean;
  resourceType?: string | null;
}) {
  return {
    leases: listAgentLeaseStates(options),
    limitation:
      'Lease state is currently process-local until the existing runtime broker and import lease implementations are migrated onto this shared service.',
    ...getAgentDiscoverySummary(),
  };
}
