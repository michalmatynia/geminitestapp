import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import type {
  PortablePathEnvelopeVerificationAuditEvent,
  PortablePathEnvelopeVerificationAuditSinkSnapshot,
  PortablePathEnvelopeVerificationObservabilitySnapshot,
  PortablePathSigningPolicyUsageSnapshot,
} from '../index';
import {
  listPortablePathEnvelopeVerificationAuditSinkIds,
  resetPortablePathEnvelopeVerificationAuditSinkSnapshot,
  resetPortablePathSigningPolicyUsageSnapshot,
  resolvePortablePathInput,
} from '../index';

const { logSystemEventMock } = vi.hoisted(() => ({
  logSystemEventMock: vi.fn(),
}));

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import {
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND,
  PORTABLE_PATH_SIGNING_POLICY_TREND_KIND,
  appendPortablePathSigningPolicyTrendSnapshot,
  bootstrapPortablePathEnvelopeVerificationAuditSinks,
  bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment,
  bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks,
  createPortablePathSigningPolicyTrendReporter,
  loadPortablePathSigningPolicyTrendSnapshots,
  createPortablePathEnvelopeVerificationLogForwardingSink,
  createPortablePathEnvelopeVerificationMongoSink,
  resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment,
  resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment,
  resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment,
  resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment,
  resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment,
} from '../sinks.server';

const createEvent = (
  overrides?: Partial<PortablePathEnvelopeVerificationAuditEvent>
): PortablePathEnvelopeVerificationAuditEvent => ({
  at: '2026-03-05T00:00:00.000Z',
  phase: 'async',
  mode: 'strict',
  algorithm: 'hmac_sha256',
  keyId: 'key-v1',
  candidateSecretCount: 2,
  matchedSecretIndex: 1,
  outcome: 'verified',
  status: 'verified',
  ...(overrides ?? {}),
});

const createSnapshot = (
  event: PortablePathEnvelopeVerificationAuditEvent
): PortablePathEnvelopeVerificationObservabilitySnapshot => ({
  totals: {
    events: 3,
    verified: 2,
    warned: 1,
    rejected: 0,
  },
  byKeyId: {
    'key-v1': {
      events: 2,
      verified: 2,
      warned: 0,
      rejected: 0,
      lastOutcome: event.outcome,
      lastSeenAt: event.at,
      lastAlgorithm: event.algorithm,
    },
  },
  recentEvents: [event],
});

const createSigningPolicyUsageSnapshot = (
  uses: number
): PortablePathSigningPolicyUsageSnapshot => ({
  totals: { uses },
  byProfile: {
    dev: {
      uses,
      bySurface: { canvas: 0, product: uses, api: 0 },
      fingerprintModeCounts: { off: uses, warn: 0, strict: 0 },
      envelopeModeCounts: { off: uses, warn: 0, strict: 0 },
      lastUsedAt: '2026-03-05T00:00:00.000Z',
      lastSurface: 'product',
    },
    staging: {
      uses: 0,
      bySurface: { canvas: 0, product: 0, api: 0 },
      fingerprintModeCounts: { off: 0, warn: 0, strict: 0 },
      envelopeModeCounts: { off: 0, warn: 0, strict: 0 },
      lastUsedAt: null,
      lastSurface: null,
    },
    prod: {
      uses: 0,
      bySurface: { canvas: 0, product: 0, api: 0 },
      fingerprintModeCounts: { off: 0, warn: 0, strict: 0 },
      envelopeModeCounts: { off: 0, warn: 0, strict: 0 },
      lastUsedAt: null,
      lastSurface: null,
    },
  },
  bySurface: { canvas: 0, product: uses, api: 0 },
  recentEvents: [],
});

const createAuditSinkSnapshot = (
  writesFailed: number
): PortablePathEnvelopeVerificationAuditSinkSnapshot => ({
  totals: {
    registrationCount: 1,
    unregistrationCount: 0,
    writesAttempted: writesFailed,
    writesSucceeded: 0,
    writesFailed,
  },
  registeredSinkIds: ['test-sink'],
  bySinkId: {
    'test-sink': {
      writesAttempted: writesFailed,
      writesSucceeded: 0,
      writesFailed,
      lastError: writesFailed > 0 ? 'sink_down' : null,
      lastWrittenAt: writesFailed > 0 ? '2026-03-05T00:00:00.000Z' : null,
    },
  },
  recentFailures:
    writesFailed > 0
      ? [{ sinkId: 'test-sink', error: 'sink_down', at: '2026-03-05T00:00:00.000Z' }]
      : [],
});

const createPersistedTrendSnapshot = (at: string, uses: number) => ({
  at,
  trigger: 'manual' as const,
  reportEveryUses: 5,
  usageTotals: createSigningPolicyUsageSnapshot(uses).totals,
  usageBySurface: createSigningPolicyUsageSnapshot(uses).bySurface,
  usageByProfile: createSigningPolicyUsageSnapshot(uses).byProfile,
  sinkTotals: createAuditSinkSnapshot(0).totals,
  sinkRegisteredIds: createAuditSinkSnapshot(0).registeredSinkIds,
  sinkRecentFailures: [],
  expectedProfilesBySurface: {
    canvas: ['prod'],
    product: ['prod'],
    api: ['prod'],
  },
  driftAlerts: [],
});

describe('portable-engine envelope verification sink factories', () => {
  beforeEach(() => {
    logSystemEventMock.mockReset().mockResolvedValue(undefined);
    const defaultInsertOneMock = vi.fn().mockResolvedValue({});
    const defaultCollectionMock = vi.fn().mockReturnValue({
      insertOne: defaultInsertOneMock,
    });
    getMongoDbMock.mockReset().mockResolvedValue({
      collection: defaultCollectionMock,
    });
    resetPortablePathSigningPolicyUsageSnapshot();
    resetPortablePathEnvelopeVerificationAuditSinkSnapshot({
      clearRegisteredSinks: true,
    });
  });

  it('forwards sink events via logSystemEvent transport', async () => {
    const event = createEvent();
    const snapshot = createSnapshot(event);
    const sink = createPortablePathEnvelopeVerificationLogForwardingSink({
      id: 'sink-log-forwarding-test',
    });

    await sink.write(event, snapshot);

    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    expect(logSystemEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        source: 'ai-paths.portable-engine.envelope-verification',
        context: expect.objectContaining({
          category: 'ai_path_portable_envelope_verification_audit',
        }),
      })
    );
  });

  it('writes sink events to Mongo collection transport', async () => {
    const event = createEvent({
      status: 'warned',
      outcome: 'key_missing',
      keyId: null,
    });
    const snapshot = createSnapshot(event);
    const insertOneMock = vi.fn().mockResolvedValue({});
    const collectionMock = vi.fn().mockReturnValue({
      insertOne: insertOneMock,
    });
    getMongoDbMock.mockResolvedValue({
      collection: collectionMock,
    });
    const sink = createPortablePathEnvelopeVerificationMongoSink({
      id: 'sink-mongo-test',
    });

    await sink.write(event, snapshot);

    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
    expect(collectionMock).toHaveBeenCalledWith('ai_path_portable_envelope_verification_audit');
    expect(insertOneMock).toHaveBeenCalledTimes(1);
    expect(insertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        kind: 'ai-paths.portable-envelope-verification-audit.v1',
      })
    );
  });

  it('resolves sink profile defaults from NODE_ENV', () => {
    expect(
      resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment('production')
    ).toBe('prod');
    expect(resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment('staging')).toBe(
      'staging'
    );
    expect(
      resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment('development')
    ).toBe('dev');
  });

  it('resolves sink profile and health policy overrides from environment values', () => {
    expect(
      resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment('prod')
    ).toBe('prod');
    expect(
      resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment('stage')
    ).toBe('staging');
    expect(resolvePortablePathEnvelopeVerificationAuditSinkProfileOverrideFromEnvironment('')).toBe(
      null
    );
    expect(
      resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment('error')
    ).toBe('error');
    expect(
      resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment('warning')
    ).toBe('warn');
    expect(resolvePortablePathEnvelopeVerificationAuditSinkHealthPolicyFromEnvironment('')).toBe(
      null
    );
  });

  it('bootstraps sink profile with one call and supports cleanup', () => {
    const result = bootstrapPortablePathEnvelopeVerificationAuditSinks({
      profile: 'dev',
    });
    expect(result.profile).toBe('dev');
    expect(result.registeredSinkIds).toEqual(['portable-envelope-verification-log-forwarding']);
    expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual([
      'portable-envelope-verification-log-forwarding',
    ]);
    result.unregisterAll();
    expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual([]);
  });

  it('bootstraps custom sink inclusion for staging profile', () => {
    const result = bootstrapPortablePathEnvelopeVerificationAuditSinks({
      profile: 'staging',
      includeLogForwarding: false,
      includeMongo: true,
      mongo: {
        id: 'custom-mongo-sink',
      },
    });
    expect(result.profile).toBe('staging');
    expect(result.registeredSinkIds).toEqual(['custom-mongo-sink']);
    expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual(['custom-mongo-sink']);
    result.unregisterAll();
    expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual([]);
  });

  it('runs startup health checks for bootstrapped sinks', async () => {
    const result = bootstrapPortablePathEnvelopeVerificationAuditSinks({
      profile: 'dev',
    });

    const summary = await result.runStartupHealthChecks({
      policy: 'warn',
      emitSystemLog: false,
    });

    expect(summary.status).toBe('healthy');
    expect(summary.failedSinkIds).toEqual([]);
    expect(summary.diagnostics).toEqual([
      expect.objectContaining({
        sinkId: 'portable-envelope-verification-log-forwarding',
        status: 'healthy',
      }),
    ]);
    expect(logSystemEventMock).toHaveBeenCalledTimes(1);
    result.unregisterAll();
  });

  it('degrades startup health in warn mode when a sink check fails', async () => {
    const failingMongoInsert = vi.fn().mockRejectedValue(new Error('permission_denied'));
    const result = bootstrapPortablePathEnvelopeVerificationAuditSinks({
      profile: 'staging',
      includeLogForwarding: false,
      mongo: {
        id: 'failing-mongo-sink',
        getDb: async () => ({
          collection: () => ({
            insertOne: failingMongoInsert,
          }),
        }),
      },
    });

    const summary = await result.runStartupHealthChecks({
      policy: 'warn',
      emitSystemLog: false,
    });

    expect(summary.status).toBe('degraded');
    expect(summary.failedSinkIds).toEqual(['failing-mongo-sink']);
    expect(summary.diagnostics).toEqual([
      expect.objectContaining({
        sinkId: 'failing-mongo-sink',
        status: 'failed',
        error: 'permission_denied',
      }),
    ]);
    result.unregisterAll();
  });

  it('rolls back registered sinks when strict startup health checks fail', async () => {
    const failingMongoInsert = vi.fn().mockRejectedValue(new Error('permission_denied'));

    await expect(
      bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks({
        profile: 'staging',
        includeLogForwarding: false,
        mongo: {
          id: 'failing-mongo-sink',
          getDb: async () => ({
            collection: () => ({
              insertOne: failingMongoInsert,
            }),
          }),
        },
        healthChecks: {
          policy: 'error',
          emitSystemLog: false,
        },
      })
    ).rejects.toThrow(
      'Portable envelope verification audit sink startup health checks failed for sinks: failing-mongo-sink.'
    );
    expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual([]);
  });

  it('bootstraps sinks from environment with startup health checks', async () => {
    const result = await bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment({
      env: {
        NODE_ENV: 'production',
        PORTABLE_PATH_AUDIT_SINK_PROFILE: 'staging',
        PORTABLE_PATH_AUDIT_SINK_HEALTH_POLICY: 'warn',
        PORTABLE_PATH_AUDIT_SINK_HEALTH_TIMEOUT_MS: '2000',
      },
      emitSystemLog: false,
    });
    expect(result.enabled).toBe(true);
    expect(result.profile).toBe('staging');
    expect(result.healthPolicy).toBe('warn');
    expect(result.healthTimeoutMs).toBe(2000);
    expect(result.startupHealthSummary?.status).toBe('healthy');
    expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual([
      'portable-envelope-verification-log-forwarding',
      'portable-envelope-verification-mongo',
    ]);
    result.unregisterAll();
    expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual([]);
  });

  it('supports environment toggle to disable sink bootstrap', async () => {
    const result = await bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment({
      env: {
        NODE_ENV: 'production',
        PORTABLE_PATH_AUDIT_SINK_BOOTSTRAP_ENABLED: 'false',
      },
      emitSystemLog: false,
    });
    expect(result.enabled).toBe(false);
    expect(result.profile).toBe('prod');
    expect(result.startupHealthSummary).toBeNull();
    expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual([]);
  });

  it('resolves signing-policy trend reporter env controls', () => {
    expect(resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment('warning')).toBe('warn');
    expect(resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment('strict')).toBe('error');
    expect(resolvePortablePathSigningPolicyTrendAlertLevelFromEnvironment('')).toBeNull();
    expect(resolvePortablePathAuditSinkFailureAlertLevelFromEnvironment('false')).toBe('off');
    expect(resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment('17')).toBe(17);
    expect(resolvePortablePathSigningPolicyTrendReportEveryUsesFromEnvironment('abc')).toBeNull();
    expect(resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment('true')).toBe(
      true
    );
    expect(resolvePortablePathSigningPolicyTrendPersistenceEnabledFromEnvironment('')).toBeNull();
    expect(resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment('25')).toBe(
      25
    );
    expect(
      resolvePortablePathSigningPolicyTrendPersistenceMaxSnapshotsFromEnvironment('invalid')
    ).toBeNull();
  });

  it('emits trend and drift alerts for disallowed signing-policy profile usage', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_signing_policy_drift');
    const reporter = createPortablePathSigningPolicyTrendReporter({
      reportEveryUses: 1,
      driftAlertLevel: 'warn',
      sinkFailureAlertLevel: 'off',
      expectedProfilesBySurface: {
        product: ['prod'],
      },
    });

    try {
      const resolved = resolvePortablePathInput(pathConfig, {
        signingPolicyProfile: 'dev',
        signingPolicyTelemetrySurface: 'product',
      });
      expect(resolved.ok).toBe(true);
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    } finally {
      reporter.stop();
    }

    expect(
      logSystemEventMock.mock.calls.some(
        ([input]) =>
          input.context?.['kind'] === PORTABLE_PATH_SIGNING_POLICY_TREND_KIND &&
          input.context?.['alertType'] === 'signing_policy_profile_drift'
      )
    ).toBe(true);
  });

  it('alerts when sink failure totals increase across trend reports', async () => {
    let usageSnapshot = createSigningPolicyUsageSnapshot(0);
    let sinkSnapshot = createAuditSinkSnapshot(0);
    const reporter = createPortablePathSigningPolicyTrendReporter({
      reportEveryUses: 1,
      driftAlertLevel: 'off',
      sinkFailureAlertLevel: 'warn',
      subscribeUsageHook: () => () => {},
      getUsageSnapshot: () => usageSnapshot,
      getSinkSnapshot: () => sinkSnapshot,
    });

    usageSnapshot = createSigningPolicyUsageSnapshot(3);
    sinkSnapshot = createAuditSinkSnapshot(2);
    await reporter.reportNow();
    reporter.stop();

    expect(
      logSystemEventMock.mock.calls.some(
        ([input]) =>
          input.context?.['kind'] === PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_KIND &&
          input.context?.['alertType'] === 'portable_audit_sink_failures_increased'
      )
    ).toBe(true);
  });

  it('appends and trims persisted trend snapshots with injected read/write adapters', async () => {
    let rawStore: string | null = null;
    const writeRawMock = vi.fn(async (raw: string): Promise<boolean> => {
      rawStore = raw;
      return true;
    });
    const readRaw = async (): Promise<string | null> => rawStore;

    await appendPortablePathSigningPolicyTrendSnapshot(
      createPersistedTrendSnapshot('2026-03-05T00:00:00.000Z', 1),
      {
        maxSnapshots: 2,
        readRaw,
        writeRaw: writeRawMock,
      }
    );
    await appendPortablePathSigningPolicyTrendSnapshot(
      createPersistedTrendSnapshot('2026-03-05T00:01:00.000Z', 2),
      {
        maxSnapshots: 2,
        readRaw,
        writeRaw: writeRawMock,
      }
    );
    await appendPortablePathSigningPolicyTrendSnapshot(
      createPersistedTrendSnapshot('2026-03-05T00:02:00.000Z', 3),
      {
        maxSnapshots: 2,
        readRaw,
        writeRaw: writeRawMock,
      }
    );

    const loaded = await loadPortablePathSigningPolicyTrendSnapshots({
      maxSnapshots: 2,
      readRaw,
    });

    expect(writeRawMock).toHaveBeenCalledTimes(3);
    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.at).toBe('2026-03-05T00:01:00.000Z');
    expect(loaded[1]?.at).toBe('2026-03-05T00:02:00.000Z');
  });

  it('tracks persistence success in reporter state when snapshot writes are enabled', async () => {
    let usageSnapshot = createSigningPolicyUsageSnapshot(0);
    let sinkSnapshot = createAuditSinkSnapshot(0);
    const persistSnapshotMock = vi.fn().mockResolvedValue(true);
    const reporter = createPortablePathSigningPolicyTrendReporter({
      reportEveryUses: 1,
      persistenceEnabled: true,
      persistenceMaxSnapshots: 3,
      persistSnapshot: persistSnapshotMock,
      subscribeUsageHook: () => () => {},
      getUsageSnapshot: () => usageSnapshot,
      getSinkSnapshot: () => sinkSnapshot,
    });

    usageSnapshot = createSigningPolicyUsageSnapshot(1);
    await reporter.reportNow();
    const state = reporter.getState();
    reporter.stop();

    expect(persistSnapshotMock).toHaveBeenCalledTimes(1);
    expect(state.persistenceWritesSucceeded).toBe(1);
    expect(state.persistenceWritesFailed).toBe(0);
  });
});
