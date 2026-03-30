import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAgentLeaseDiscoveryPayload,
  getAgentLeaseState,
  mutateAgentLease,
  SHARED_LEASE_LIMITATION,
} from './agent-lease-service';

describe('agent-lease-service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-22T13:00:00.000Z'));
    globalThis.__geminitestappAgentLeaseRegistry = undefined;
    let nextUuid = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++nextUuid}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    globalThis.__geminitestappAgentLeaseRegistry = undefined;
  });

  it('rejects unknown, non-leased, and missing-scope lease mutations', () => {
    expect(
      mutateAgentLease({
        action: 'claim',
        resourceId: 'missing-resource',
        ownerAgentId: 'agent-1',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'not_found',
      }),
    );

    expect(
      mutateAgentLease({
        action: 'claim',
        resourceId: 'ai-paths.run.queue',
        ownerAgentId: 'agent-1',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'unsupported',
        message: 'Resource ai-paths.run.queue does not require a live lease.',
      }),
    );

    expect(
      mutateAgentLease({
        action: 'claim',
        resourceId: 'integrations.base-import.run',
        ownerAgentId: 'agent-1',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'unsupported',
        message:
          'Resource integrations.base-import.run requires a scopeId (Use the base import runId as the lease scope.).',
      }),
    );
  });

  it('claims, renews, releases, and reports discovery state for scoped leases', async () => {
    const claimed = mutateAgentLease({
      action: 'claim',
      resourceId: 'integrations.base-import.run',
      scopeId: ' run-42 ',
      ownerAgentId: 'agent-1',
      ownerRunId: 'run-a',
      leaseMs: 60_000,
    });

    expect(claimed).toEqual(
      expect.objectContaining({
        ok: true,
        code: 'claimed',
        lease: expect.objectContaining({
          leaseId: expect.any(String),
          scopeId: 'run-42',
          ownerAgentId: 'agent-1',
        }),
        event: expect.objectContaining({
          kind: 'claimed',
        }),
      }),
    );
    const leaseId = claimed.lease?.leaseId;

    const renewed = mutateAgentLease({
      action: 'renew',
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-42',
      ownerAgentId: 'agent-1',
      ownerRunId: 'run-a',
      leaseId,
      leaseMs: 120_000,
    });

    expect(renewed).toEqual(
      expect.objectContaining({
        ok: true,
        code: 'renewed',
        lease: expect.objectContaining({
          leaseId,
          leaseMs: 120_000,
        }),
        event: expect.objectContaining({
          kind: 'renewed',
        }),
      }),
    );

    const state = await getAgentLeaseState('integrations.base-import.run', 'run-42');
    expect(state).toEqual(
      expect.objectContaining({
        managedBy: 'shared_service',
        activeLease: expect.objectContaining({
          leaseId,
          ownerAgentId: 'agent-1',
        }),
        recentEvents: [
          expect.objectContaining({ kind: 'renewed' }),
          expect.objectContaining({ kind: 'claimed' }),
        ],
      }),
    );

    const discovery = await getAgentLeaseDiscoveryPayload({
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-42',
    });
    expect(discovery.limitation).toBe(SHARED_LEASE_LIMITATION);
    expect(discovery.leases).toEqual([
      expect.objectContaining({
        activeLease: expect.objectContaining({
          leaseId,
        }),
      }),
    ]);

    const released = mutateAgentLease({
      action: 'release',
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-42',
      ownerAgentId: 'agent-1',
      leaseId,
      reason: 'completed',
    });

    expect(released).toEqual(
      expect.objectContaining({
        ok: true,
        code: 'released',
        lease: expect.objectContaining({
          status: 'released',
          releaseReason: 'completed',
        }),
        event: expect.objectContaining({
          kind: 'released',
        }),
      }),
    );

    expect(
      await getAgentLeaseState('integrations.base-import.run', 'run-42'),
    ).toEqual(
      expect.objectContaining({
        activeLease: null,
        recentEvents: expect.arrayContaining([
          expect.objectContaining({ kind: 'released' }),
        ]),
      }),
    );
  });

  it('reports conflicts and expires short-lived leases on read', async () => {
    const claimed = mutateAgentLease({
      action: 'claim',
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-short',
      ownerAgentId: 'agent-a',
      leaseMs: 10,
    });

    expect(claimed).toEqual(
      expect.objectContaining({
        ok: true,
        code: 'claimed',
        lease: expect.objectContaining({
          leaseId: expect.any(String),
        }),
      }),
    );
    const leaseId = claimed.lease?.leaseId;

    const conflicted = mutateAgentLease({
      action: 'claim',
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-short',
      ownerAgentId: 'agent-b',
    });

    expect(conflicted).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'conflict',
        conflictingLease: expect.objectContaining({
          leaseId,
          ownerAgentId: 'agent-a',
        }),
      }),
    );

    vi.advanceTimersByTime(20);

    expect(
      await getAgentLeaseState('integrations.base-import.run', 'run-short'),
    ).toEqual(
      expect.objectContaining({
        activeLease: null,
        recentEvents: expect.arrayContaining([
          expect.objectContaining({ kind: 'expired' }),
        ]),
      }),
    );
  });

  it('auto-renews when the same owner claims an already-held scoped lease', () => {
    const claimed = mutateAgentLease({
      action: 'claim',
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-auto-renew',
      ownerAgentId: 'agent-a',
      ownerRunId: 'run-a',
      leaseMs: 30_000,
    });

    const renewed = mutateAgentLease({
      action: 'claim',
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-auto-renew',
      ownerAgentId: 'agent-a',
      ownerRunId: 'run-a',
      leaseMs: 45_000,
    });

    expect(claimed.ok).toBe(true);
    expect(renewed).toEqual(
      expect.objectContaining({
        ok: true,
        code: 'renewed',
        lease: expect.objectContaining({
          leaseId: claimed.lease?.leaseId,
          leaseMs: 45_000,
        }),
      }),
    );
  });

  it('rejects broker mutations and renewals without an active lease', () => {
    expect(
      mutateAgentLease({
        action: 'claim',
        resourceId: 'testing.playwright.runtime-broker',
        scopeId: 'browser-1',
        ownerAgentId: 'agent-1',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'unsupported',
        message: expect.stringContaining('runtime-broker.mjs'),
      }),
    );

    expect(
      mutateAgentLease({
        action: 'renew',
        resourceId: 'integrations.base-import.run',
        scopeId: 'run-missing',
        ownerAgentId: 'agent-1',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'not_found',
        message: 'No active lease exists for integrations.base-import.run scope run-missing.',
      }),
    );
  });

  it('rejects renewals from non-owners and with mismatched lease ids', () => {
    const claimed = mutateAgentLease({
      action: 'claim',
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-renew-conflict',
      ownerAgentId: 'agent-a',
      ownerRunId: 'run-a',
    });

    expect(
      mutateAgentLease({
        action: 'renew',
        resourceId: 'integrations.base-import.run',
        scopeId: 'run-renew-conflict',
        ownerAgentId: 'agent-b',
        ownerRunId: 'run-b',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'conflict',
        message: 'Only the current owner can renew integrations.base-import.run scope run-renew-conflict.',
        conflictingLease: expect.objectContaining({
          leaseId: claimed.lease?.leaseId,
          ownerAgentId: 'agent-a',
        }),
      }),
    );

    expect(
      mutateAgentLease({
        action: 'renew',
        resourceId: 'integrations.base-import.run',
        scopeId: 'run-renew-conflict',
        ownerAgentId: 'agent-a',
        ownerRunId: 'run-a',
        leaseId: 'lease-mismatch',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'conflict',
        message: 'Lease id mismatch for integrations.base-import.run scope run-renew-conflict.',
      }),
    );
  });

  it('rejects releases from non-owners and with mismatched lease ids', () => {
    const claimed = mutateAgentLease({
      action: 'claim',
      resourceId: 'integrations.base-import.run',
      scopeId: 'run-release-conflict',
      ownerAgentId: 'agent-a',
      ownerRunId: 'run-a',
    });

    expect(
      mutateAgentLease({
        action: 'release',
        resourceId: 'integrations.base-import.run',
        scopeId: 'run-release-conflict',
        ownerAgentId: 'agent-b',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'conflict',
        message: 'Only the current owner can release integrations.base-import.run scope run-release-conflict.',
        conflictingLease: expect.objectContaining({
          leaseId: claimed.lease?.leaseId,
          ownerAgentId: 'agent-a',
        }),
      }),
    );

    expect(
      mutateAgentLease({
        action: 'release',
        resourceId: 'integrations.base-import.run',
        scopeId: 'run-release-conflict',
        ownerAgentId: 'agent-a',
        leaseId: 'lease-mismatch',
      }),
    ).toEqual(
      expect.objectContaining({
        ok: false,
        code: 'conflict',
        message: 'Only the current owner can release integrations.base-import.run scope run-release-conflict.',
      }),
    );
  });
});
