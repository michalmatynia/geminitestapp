import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PathConfig, RuntimeState } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PortablePathValidationError,
  addPortablePathPackageFingerprint,
  buildPortablePathJsonSchemaCatalog,
  buildPortablePathJsonSchemaDiffReport,
  buildPortablePathPackage,
  getPortablePathRunExecutionSnapshot,
  getPortablePathSigningPolicy,
  getPortablePathSigningPolicyUsageSnapshot,
  registerPortablePathRunExecutionHook,
  registerPortablePathSigningPolicyUsageHook,
  resetPortablePathEnvelopeVerificationAuditSinkSnapshot,
  resetPortablePathEnvelopeVerificationObservabilitySnapshot,
  resetPortablePathMigratorObservabilitySnapshot,
  resetPortablePathRunExecutionSnapshot,
  resetPortablePathSigningPolicyUsageSnapshot,
  resolvePortablePathInput,
  resolvePortablePathInputAsync,
  runPortablePathClient,
} from '../index';

vi.mock('@/shared/lib/ai-paths/core/runtime/engine-client', () => ({
  evaluateGraphClient: vi.fn(),
}));

const mockedEvaluateGraphClient = vi.mocked(evaluateGraphClient);

const buildInvalidCompilePath = (): PathConfig => {
  const base = createDefaultPathConfig('path_portable_invalid_compile');
  const sourceNode = base.nodes[0]!;
  return {
    ...base,
    nodes: [
      {
        ...sourceNode,
        type: 'model',
        title: 'Model',
        description: 'Model without required prompt wiring.',
        inputs: ['prompt'],
        outputs: ['result'],
      },
    ],
    edges: [],
  };
};

describe('portable AI-path engine scaffold signing policy, limits, and client runtime', () => {
  beforeEach(() => {
    mockedEvaluateGraphClient.mockReset();
    resetPortablePathMigratorObservabilitySnapshot();
    resetPortablePathEnvelopeVerificationObservabilitySnapshot();
    resetPortablePathSigningPolicyUsageSnapshot();
    resetPortablePathRunExecutionSnapshot();
    resetPortablePathEnvelopeVerificationAuditSinkSnapshot({
      clearRegisteredSinks: true,
    });
    mockedEvaluateGraphClient.mockResolvedValue({
      status: 'completed',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {},
    } as RuntimeState);
  });

  it('publishes signing policy profile defaults', () => {
    expect(getPortablePathSigningPolicy('dev')).toEqual({
      profile: 'dev',
      fingerprintVerificationMode: 'off',
      envelopeSignatureVerificationMode: 'off',
    });
    expect(getPortablePathSigningPolicy('staging')).toEqual({
      profile: 'staging',
      fingerprintVerificationMode: 'warn',
      envelopeSignatureVerificationMode: 'warn',
    });
    expect(getPortablePathSigningPolicy('prod')).toEqual({
      profile: 'prod',
      fingerprintVerificationMode: 'strict',
      envelopeSignatureVerificationMode: 'strict',
    });
  });

  it('records signing policy usage snapshot with per-surface counters', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_signing_surface_counters');
    const hookEvents: Array<{ profile: string; surface: string }> = [];
    const unsubscribe = registerPortablePathSigningPolicyUsageHook((event) => {
      hookEvents.push({
        profile: event.profile,
        surface: event.surface,
      });
    });
    try {
      const canvasResolved = resolvePortablePathInput(pathConfig, {
        signingPolicyProfile: 'dev',
        signingPolicyTelemetrySurface: 'canvas',
      });
      expect(canvasResolved.ok).toBe(true);

      const productResolved = resolvePortablePathInput(pathConfig, {
        signingPolicyProfile: 'staging',
        signingPolicyTelemetrySurface: 'product',
      });
      expect(productResolved.ok).toBe(true);

      const apiResolved = await resolvePortablePathInputAsync(pathConfig, {
        signingPolicyProfile: 'prod',
        signingPolicyTelemetrySurface: 'api',
      });
      expect(apiResolved.ok).toBe(true);
    } finally {
      unsubscribe();
    }

    const snapshot = getPortablePathSigningPolicyUsageSnapshot();
    expect(snapshot.totals.uses).toBe(3);
    expect(snapshot.bySurface.canvas).toBe(1);
    expect(snapshot.bySurface.product).toBe(1);
    expect(snapshot.bySurface.api).toBe(1);
    expect(snapshot.byProfile.dev.bySurface.canvas).toBe(1);
    expect(snapshot.byProfile.staging.bySurface.product).toBe(1);
    expect(snapshot.byProfile.prod.bySurface.api).toBe(1);
    expect(snapshot.byProfile.dev.envelopeModeCounts.off).toBe(1);
    expect(snapshot.byProfile.staging.envelopeModeCounts.warn).toBe(1);
    expect(snapshot.byProfile.prod.envelopeModeCounts.strict).toBe(1);
    expect(snapshot.recentEvents).toHaveLength(3);
    expect(hookEvents).toEqual([
      { profile: 'dev', surface: 'canvas' },
      { profile: 'staging', surface: 'product' },
      { profile: 'prod', surface: 'api' },
    ]);
  });

  it('enforces strict envelope verification with prod signing policy profile', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_signing_profile_prod');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const unsignedEnvelope = {
      specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
      kind: 'path_package_envelope' as const,
      signedAt: '2026-03-05T00:00:00.000Z',
      package: portablePackage,
    };
    const parsed = await resolvePortablePathInputAsync(unsignedEnvelope, {
      signingPolicyProfile: 'prod',
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain('signature is missing');
  });

  it('allows profile override of envelope verification mode', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_signing_profile_override');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const unsignedEnvelope = {
      specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
      kind: 'path_package_envelope' as const,
      signedAt: '2026-03-05T00:00:00.000Z',
      package: portablePackage,
    };
    const parsed = await resolvePortablePathInputAsync(unsignedEnvelope, {
      signingPolicyProfile: 'prod',
      envelopeSignatureVerificationMode: 'warn',
      fingerprintVerificationMode: 'off',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      parsed.value.migrationWarnings.some(
        (warning) => warning.code === 'package_envelope_signature_missing'
      )
    ).toBe(true);
  });

  it('publishes json schema catalog for portable contracts', () => {
    const catalog = buildPortablePathJsonSchemaCatalog();
    expect(catalog.portable_envelope['type']).toBe('object');
    expect(catalog.portable_package['type']).toBe('object');
    expect(catalog.semantic_canvas['type']).toBe('object');
    expect(catalog.path_config['type']).toBe('object');
  });

  it('publishes schema diff report for current vs vnext preview', () => {
    const report = buildPortablePathJsonSchemaDiffReport();
    expect(report.baseline).toBe('current');
    expect(report.target).toBe('vnext_preview');
    expect(report.entries.length).toBeGreaterThan(0);
    expect(report.entries.every((entry) => typeof entry.currentHash === 'string')).toBe(true);
    expect(report.entries.every((entry) => typeof entry.vNextHash === 'string')).toBe(true);
  });

  it('rejects payloads that exceed graph limits', () => {
    const pathConfig = createDefaultPathConfig('path_portable_limits');
    const parsed = resolvePortablePathInput(pathConfig, {
      limits: { maxNodeCount: 1 },
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain('max node count');
  });

  it('rejects payloads with unsafe object keys', () => {
    const parsed = resolvePortablePathInput('{"root":{"__proto__":{"polluted":true}}}');
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain('unsafe key');
  });

  it('rejects circular object payloads before migration', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    const parsed = resolvePortablePathInput(circular);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain('circular reference');
  });

  it('enforces payload byte limits for object inputs', () => {
    const pathConfig = createDefaultPathConfig('path_portable_size_limit_object');
    const parsed = resolvePortablePathInput(pathConfig, {
      limits: { maxPayloadBytes: 16 },
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain('max size');
  });

  it('reports payload byte size for object payload inputs', () => {
    const pathConfig = createDefaultPathConfig('path_portable_size_reporting');
    const parsed = resolvePortablePathInput(pathConfig);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.payloadByteSize).not.toBeNull();
    expect(parsed.value.payloadByteSize).toBeGreaterThan(0);
  });

  it('runs client execution with parsed nodes/edges', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_client_run');
    const result = await runPortablePathClient(pathConfig, {
      validateBeforeRun: false,
    });

    expect(mockedEvaluateGraphClient).toHaveBeenCalledTimes(1);
    expect(result.resolved.pathConfig.id).toBe(pathConfig.id);
    expect(result.runtimeState.status).toBe('completed');
  });

  it('blocks client execution on validation failures', async () => {
    await expect(runPortablePathClient(buildInvalidCompilePath())).rejects.toBeInstanceOf(
      PortablePathValidationError
    );
    expect(mockedEvaluateGraphClient).not.toHaveBeenCalled();
  });

  it('tracks client run execution telemetry across resolve/validation/runtime outcomes', async () => {
    const telemetryEvents: Array<{
      outcome: 'success' | 'failure';
      failureStage: 'resolve' | 'validation' | 'runtime' | null;
    }> = [];
    const unsubscribe = registerPortablePathRunExecutionHook((event) => {
      telemetryEvents.push({
        outcome: event.outcome,
        failureStage: event.failureStage,
      });
    });
    const pathConfig = createDefaultPathConfig('path_portable_client_telemetry');
    const originalImpl = mockedEvaluateGraphClient.getMockImplementation();
    try {
      await runPortablePathClient(pathConfig, {
        validateBeforeRun: false,
      });
      await expect(runPortablePathClient(buildInvalidCompilePath())).rejects.toBeInstanceOf(
        PortablePathValidationError
      );
      mockedEvaluateGraphClient.mockRejectedValueOnce(new Error('runtime failure from client'));
      await expect(
        runPortablePathClient(pathConfig, {
          validateBeforeRun: false,
        })
      ).rejects.toThrow('runtime failure from client');
      await expect(runPortablePathClient('{')).rejects.toThrow('Invalid AI-Path payload');
    } finally {
      unsubscribe();
      mockedEvaluateGraphClient.mockReset();
      if (originalImpl) {
        mockedEvaluateGraphClient.mockImplementation(originalImpl);
      }
      mockedEvaluateGraphClient.mockResolvedValue({
        status: 'completed',
        nodeStatuses: {},
        nodeOutputs: {},
        variables: {},
        events: [],
        inputs: {},
        outputs: {},
      } as RuntimeState);
    }

    const snapshot = getPortablePathRunExecutionSnapshot();
    expect(snapshot.totals.attempts).toBe(4);
    expect(snapshot.totals.successes).toBe(1);
    expect(snapshot.totals.failures).toBe(3);
    expect(snapshot.byRunner.client.attempts).toBe(4);
    expect(snapshot.byRunner.client.successes).toBe(1);
    expect(snapshot.byRunner.client.failures).toBe(3);
    expect(snapshot.failureStageCounts.resolve).toBe(1);
    expect(snapshot.failureStageCounts.validation).toBe(1);
    expect(snapshot.failureStageCounts.runtime).toBe(1);
    expect(snapshot.bySource.path_config.attempts).toBe(3);
    expect(snapshot.bySource.path_config.successes).toBe(1);
    expect(snapshot.bySource.path_config.failures).toBe(2);
    expect(snapshot.bySurface.canvas.attempts).toBe(4);
    expect(snapshot.recentEvents).toHaveLength(4);
    expect(telemetryEvents).toEqual([
      { outcome: 'success', failureStage: null },
      { outcome: 'failure', failureStage: 'validation' },
      { outcome: 'failure', failureStage: 'runtime' },
      { outcome: 'failure', failureStage: 'resolve' },
    ]);
  });

  it('adds deterministic fingerprint to portable package', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_fingerprint');
    const packagePayload = buildPortablePathPackage(pathConfig);
    const withFingerprint = await addPortablePathPackageFingerprint(packagePayload);
    expect(withFingerprint.fingerprint).toBeDefined();
    expect(withFingerprint.fingerprint?.value.length).toBeGreaterThanOrEqual(8);
  });
});
