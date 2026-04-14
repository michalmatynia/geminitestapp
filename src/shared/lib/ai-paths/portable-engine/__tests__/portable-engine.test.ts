import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { RuntimeState } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { serializePathConfigToSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';
import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY,
  addPortablePathPackageFingerprint,
  buildPortablePathPackageEnvelope,
  buildPortablePathPackage,
  computePortablePathFingerprintSync,
  getPortablePathEnvelopeVerificationAuditSinkSnapshot,
  getPortablePathEnvelopeVerificationObservabilitySnapshot,
  getPortablePathMigratorObservabilitySnapshot,
  listPortablePathEnvelopeVerificationAuditSinkIds,
  listPortablePathPackageMigratorVersions,
  migratePortablePathInput,
  registerPortablePathEnvelopeVerificationAuditSink,
  registerPortablePathEnvelopeVerificationObservabilityHook,
  registerPortablePathMigratorObservabilityHook,
  registerPortablePathPackageMigrator,
  resetPortablePathEnvelopeVerificationAuditSinkSnapshot,
  resetPortablePathEnvelopeVerificationObservabilitySnapshot,
  resetPortablePathSigningPolicyUsageSnapshot,
  resetPortablePathMigratorObservabilitySnapshot,
  resolvePortablePathInput,
  resolvePortablePathInputAsync,
  unregisterPortablePathEnvelopeVerificationAuditSink,
  unregisterPortablePathPackageMigrator,
  validatePortablePathConfig,
  validatePortablePathInput,
} from '../index';
import {
  buildInvalidCompilePath,
  ensureCryptoSubtleDigestForTest,
} from './portable-engine.test-support';

vi.mock('@/shared/lib/ai-paths/core/runtime/engine-client', () => ({
  evaluateGraphClient: vi.fn(),
}));

const mockedEvaluateGraphClient = vi.mocked(evaluateGraphClient);

describe('portable AI-path engine scaffold', () => {
  beforeEach(() => {
    mockedEvaluateGraphClient.mockReset();
    resetPortablePathMigratorObservabilitySnapshot();
    resetPortablePathEnvelopeVerificationObservabilitySnapshot();
    resetPortablePathSigningPolicyUsageSnapshot();
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

  it('builds a portable package and resolves it from JSON payload', () => {
    const pathConfig = createDefaultPathConfig('path_portable_package_roundtrip');
    const portablePackage = buildPortablePathPackage(pathConfig, {
      createdAt: '2026-03-05T00:00:00.000Z',
      metadata: {
        sourceSurface: 'Canvas',
      },
    });

    expect(portablePackage.specVersion).toBe(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION);

    const parsed = resolvePortablePathInput(JSON.stringify(portablePackage));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.source).toBe('portable_package');
    expect(parsed.value.pathConfig.id).toBe(pathConfig.id);
    expect(parsed.value.portablePackage?.metadata?.['sourceSurface']).toBe('Canvas');
  });

  it.each([
    {
      nodeType: 'description_updater',
      title: 'Description Updater',
      pathId: 'path_removed_legacy_description_updater_portable',
      expectedMessage: /Database node/i,
    },
  ])(
    'rejects removed legacy $nodeType nodes from raw path payloads with a targeted error',
    ({ nodeType, title, pathId, expectedMessage }) => {
      const pathConfig = createDefaultPathConfig(pathId);
      pathConfig.nodes = pathConfig.nodes.map((node, index) =>
        index === 0
          ? ({
              ...node,
              type: nodeType,
              title,
            } as unknown as typeof node)
          : node
      );

      const parsed = resolvePortablePathInput(pathConfig);
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;

      expect(parsed.error).toMatch(/removed legacy node/i);
      expect(parsed.error).toMatch(expectedMessage);
    }
  );

  it.each(['simulation_required', 'simulation_preferred'] as const)(
    'rejects removed legacy trigger context mode %s from raw path payloads',
    (contextMode) => {
      const pathConfig = createDefaultPathConfig(`path_removed_trigger_context_${contextMode}`);
      const seedNode = pathConfig.nodes[0];
      expect(seedNode).toBeDefined();
      if (!seedNode) return;
      pathConfig.nodes = [
        {
          ...seedNode,
          type: 'trigger',
          title: 'Trigger',
          inputs: ['context'],
          outputs: ['trigger', 'context', 'entityId', 'entityType'],
          config: {
            trigger: {
              event: 'manual',
              contextMode,
            },
          },
        },
      ];
      pathConfig.edges = [];

      const parsed = resolvePortablePathInput(pathConfig);
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(parsed.error).toMatch(/removed legacy Trigger context modes/i);
    }
  );

  it('embeds node code object manifest metadata when building portable package', () => {
    const pathConfig = createDefaultPathConfig('path_portable_manifest_embed');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const metadataRecord = portablePackage.metadata;
    const manifest = metadataRecord?.[PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY] as
      | {
          schemaVersion?: string;
          entries?: Array<{ nodeType?: string; objectHash?: string }>;
        }
      | undefined;

    expect(manifest?.schemaVersion).toBe('ai-paths.node-code-object-manifest.v1');
    expect(Array.isArray(manifest?.entries)).toBe(true);
    expect((manifest?.entries?.length ?? 0) > 0).toBe(true);
  });

  it('warns or blocks on node code object hash mismatch based on verification mode', () => {
    const pathConfig = createDefaultPathConfig('path_portable_manifest_mismatch');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const metadataRecord = portablePackage.metadata ?? {};
    const manifest = metadataRecord[PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY] as
      | {
          schemaVersion?: string;
          contractsSchemaVersion?: string;
          contractsHashAlgorithm?: 'sha256';
          contractsHash?: string;
          generatedAt?: string;
          entries?: Array<{ nodeType: string; objectHashAlgorithm: 'sha256'; objectHash: string }>;
        }
      | undefined;
    const firstEntry = manifest?.entries?.[0];
    expect(firstEntry).toBeTruthy();
    if (!firstEntry || !manifest) return;
    const mutatedHash = firstEntry.objectHash.startsWith('0')
      ? `1${firstEntry.objectHash.slice(1)}`
      : `0${firstEntry.objectHash.slice(1)}`;

    const tamperedManifest = {
      ...manifest,
      entries: [
        {
          ...firstEntry,
          objectHash: mutatedHash,
        },
        ...(manifest.entries?.slice(1) ?? []),
      ],
    };
    const tamperedPackage = {
      ...portablePackage,
      metadata: {
        ...metadataRecord,
        [PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY]: tamperedManifest,
      },
    };

    const warnParsed = resolvePortablePathInput(tamperedPackage, {
      nodeCodeObjectHashVerificationMode: 'warn',
    });
    expect(warnParsed.ok).toBe(true);
    if (warnParsed.ok) {
      expect(
        warnParsed.value.migrationWarnings.some(
          (warning) => warning.code === 'node_code_object_hash_mismatch'
        )
      ).toBe(true);
    }

    const strictParsed = resolvePortablePathInput(tamperedPackage, {
      nodeCodeObjectHashVerificationMode: 'strict',
    });
    expect(strictParsed.ok).toBe(false);
    if (!strictParsed.ok) {
      expect(strictParsed.error.toLowerCase()).toContain('node code object');
    }
  });

  it('warns or blocks on invalid node code object manifest by verification mode', () => {
    const pathConfig = createDefaultPathConfig('path_portable_manifest_invalid');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const tamperedPackage = {
      ...portablePackage,
      metadata: {
        ...(portablePackage.metadata ?? {}),
        [PORTABLE_NODE_CODE_OBJECT_MANIFEST_METADATA_KEY]: {
          schemaVersion: 'invalid.manifest',
        },
      },
    };

    const warnParsed = resolvePortablePathInput(tamperedPackage, {
      nodeCodeObjectHashVerificationMode: 'warn',
    });
    expect(warnParsed.ok).toBe(true);
    if (warnParsed.ok) {
      expect(
        warnParsed.value.migrationWarnings.some(
          (warning) => warning.code === 'node_code_object_manifest_invalid'
        )
      ).toBe(true);
    }

    const strictParsed = resolvePortablePathInput(tamperedPackage, {
      nodeCodeObjectHashVerificationMode: 'strict',
    });
    expect(strictParsed.ok).toBe(false);
    if (!strictParsed.ok) {
      expect(strictParsed.error.toLowerCase()).toContain('node code object');
    }
  });

  it('resolves semantic canvas documents directly', () => {
    const pathConfig = createDefaultPathConfig('path_portable_semantic_direct');
    const semanticDocument = serializePathConfigToSemanticCanvas(pathConfig, {
      includeConnections: false,
    });

    const parsed = resolvePortablePathInput(semanticDocument);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.source).toBe('semantic_canvas');
    expect(parsed.value.pathConfig.nodes.length).toBe(pathConfig.nodes.length);
    expect(parsed.value.pathConfig.edges.length).toBe(pathConfig.edges.length);
  });

  it('canonicalizes alias-only path-config edge fields when resolving raw payloads', () => {
    const pathConfig = createDefaultPathConfig('path_portable_alias_edges');
    const fromNode = pathConfig.nodes[0]!;
    const toNode = pathConfig.nodes[1]!;
    pathConfig.edges = [
      {
        id: 'edge-legacy-alias-only',
        source: fromNode.id,
        target: toNode.id,
        sourceHandle: 'context',
        targetHandle: 'context',
      },
    ];

    const parsed = resolvePortablePathInput(pathConfig);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const edge = parsed.value.pathConfig.edges[0];
    expect(parsed.value.source).toBe('path_config');
    expect(edge?.from).toBe(fromNode.id);
    expect(edge?.to).toBe(toNode.id);
    expect(edge?.fromPort).toBe('context');
    expect(edge?.toPort).toBe('context');
    expect(edge?.source).toBeUndefined();
    expect(edge?.target).toBeUndefined();
    expect(edge?.sourceHandle).toBeUndefined();
    expect(edge?.targetHandle).toBeUndefined();
  });

  it('returns compile findings for invalid path payloads', () => {
    const parsed = validatePortablePathInput(buildInvalidCompilePath());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.value.ok).toBe(false);
    expect(parsed.value.compileReport.errors).toBeGreaterThan(0);
    expect(
      parsed.value.compileReport.findings.some(
        (finding) =>
          finding.code === 'required_input_missing_wiring' && finding.severity === 'error'
      )
    ).toBe(true);
  });

  it('supports strict validation mode with run preflight report', () => {
    const report = validatePortablePathConfig(buildInvalidCompilePath(), {
      mode: 'strict',
    });
    expect(report.mode).toBe('strict');
    expect(report.preflightReport).not.toBeNull();
    expect(report.ok).toBe(false);
    expect(report.preflightReport?.shouldBlock).toBe(true);
  });

  it('migrates path config payload to portable package v1', () => {
    const pathConfig = createDefaultPathConfig('path_portable_migrate_legacy');
    const migrated = migratePortablePathInput(pathConfig);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;

    expect(migrated.value.source).toBe('path_config');
    expect(migrated.value.portablePackage.specVersion).toBe(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION);
    expect(
      migrated.value.migrationWarnings.some((warning) => warning.code === 'path_config_upgraded')
    ).toBe(true);
  });

  it('repairs raw path-config edges that still use semantic edge aliases', () => {
    const pathConfig = createDefaultPathConfig('path_portable_legacy_edge_aliases');
    const legacyEdgeConfig = {
      ...pathConfig,
      edges: (pathConfig.edges ?? []).map((edge) => ({
        id: edge.id,
        fromNodeId: edge.from,
        toNodeId: edge.to,
        sourceHandle: edge.fromPort ?? null,
        targetHandle: edge.toPort ?? null,
        label: edge.label ?? null,
        ...(typeof edge.type === 'string' ? { type: edge.type } : {}),
        ...(edge.data && typeof edge.data === 'object' ? { data: edge.data } : {}),
        ...(typeof edge.createdAt === 'string' ? { createdAt: edge.createdAt } : {}),
        ...(typeof edge.updatedAt === 'string' || edge.updatedAt === null
          ? { updatedAt: edge.updatedAt }
          : {}),
      })),
    };

    const resolved = resolvePortablePathInput(legacyEdgeConfig);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    expect(resolved.value.source).toBe('path_config');
    expect(
      resolved.value.pathConfig.edges.map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        fromPort: edge.fromPort,
        toPort: edge.toPort,
      }))
    ).toEqual(
      pathConfig.edges.map((edge) => ({
        id: edge.id,
        from: edge.from,
        to: edge.to,
        fromPort: edge.fromPort,
        toPort: edge.toPort,
      }))
    );
    expect(
      Object.prototype.hasOwnProperty.call(resolved.value.pathConfig.edges[0] ?? {}, 'fromNodeId')
    ).toBe(false);
  });

  it('migrates portable package v2 payload through migration registry', () => {
    const pathConfig = createDefaultPathConfig('path_portable_migrate_v2');
    const v1Package = buildPortablePathPackage(pathConfig);
    const migrated = migratePortablePathInput({
      ...v1Package,
      specVersion: 'ai-paths.portable-engine.v2',
    });
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;

    expect(migrated.value.source).toBe('portable_package');
    expect(migrated.value.portablePackage.specVersion).toBe(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION);
    expect(
      migrated.value.migrationWarnings.some(
        (warning) => warning.code === 'portable_package_version_upgraded'
      )
    ).toBe(true);
  });

  it('rejects unsupported portable package spec versions', () => {
    const pathConfig = createDefaultPathConfig('path_portable_migrate_v99');
    const v1Package = buildPortablePathPackage(pathConfig);
    const migrated = migratePortablePathInput({
      ...v1Package,
      specVersion: 'ai-paths.portable-engine.v99',
    });
    expect(migrated.ok).toBe(false);
    if (migrated.ok) return;
    expect(migrated.error).toContain('Unsupported portable package spec version');
  });

  it('publishes registered portable package migration versions', () => {
    const versions = listPortablePathPackageMigratorVersions();
    expect(versions).toContain(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION);
    expect(versions).toContain('ai-paths.portable-engine.v2');
  });

  it('supports custom registered migrator success path', () => {
    const customVersion = 'ai-paths.portable-engine.v15';
    const pathConfig = createDefaultPathConfig('path_portable_custom_migrator_success');
    const basePackage = buildPortablePathPackage(pathConfig);
    const migratedPackage = buildPortablePathPackage({
      ...pathConfig,
      name: `${pathConfig.name} migrated`,
    });
    let invocationCount = 0;

    registerPortablePathPackageMigrator(customVersion, () => {
      invocationCount += 1;
      return {
        ok: true,
        value: {
          portablePackage: migratedPackage,
          migrationWarnings: [
            {
              code: 'portable_package_version_upgraded',
              message: 'Custom migrator upgraded v15 to v1.',
            },
          ],
        },
      };
    });

    try {
      const migrated = migratePortablePathInput({
        ...basePackage,
        specVersion: customVersion,
      });
      expect(migrated.ok).toBe(true);
      if (!migrated.ok) return;
      expect(invocationCount).toBe(1);
      expect(migrated.value.portablePackage.name).toBe(`${pathConfig.name} migrated`);
      expect(
        migrated.value.migrationWarnings.some(
          (warning) => warning.code === 'portable_package_version_upgraded'
        )
      ).toBe(true);
    } finally {
      unregisterPortablePathPackageMigrator(customVersion);
    }
  });

  it('surfaces custom migrator failure path', () => {
    const customVersion = 'ai-paths.portable-engine.v16';
    const pathConfig = createDefaultPathConfig('path_portable_custom_migrator_failure');
    const basePackage = buildPortablePathPackage(pathConfig);

    registerPortablePathPackageMigrator(customVersion, () => ({
      ok: false,
      error: 'Custom migration exploded.',
    }));

    try {
      const migrated = migratePortablePathInput({
        ...basePackage,
        specVersion: customVersion,
      });
      expect(migrated.ok).toBe(false);
      if (migrated.ok) return;
      expect(migrated.error).toContain('Custom migration exploded');
    } finally {
      unregisterPortablePathPackageMigrator(customVersion);
    }
  });

  it('rejects invalid custom migrator versions and protects built-ins', () => {
    expect(() =>
      registerPortablePathPackageMigrator('portable-bad-version', () => ({
        ok: false,
        error: 'nope',
      }))
    ).toThrow('Invalid portable package spec version');

    expect(() =>
      unregisterPortablePathPackageMigrator(AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION)
    ).toThrow('Cannot unregister built-in portable package migrator');
  });

  it('captures migrator observability snapshot across source paths and version failures', () => {
    const pathConfig = createDefaultPathConfig('path_portable_observability_snapshot');
    const v1Package = buildPortablePathPackage(pathConfig);

    const pathConfigMigrated = migratePortablePathInput(pathConfig);
    expect(pathConfigMigrated.ok).toBe(true);

    const v2Migrated = migratePortablePathInput({
      ...v1Package,
      specVersion: 'ai-paths.portable-engine.v2',
    });
    expect(v2Migrated.ok).toBe(true);

    const v99Migrated = migratePortablePathInput({
      ...v1Package,
      specVersion: 'ai-paths.portable-engine.v99',
    });
    expect(v99Migrated.ok).toBe(false);

    const snapshot = getPortablePathMigratorObservabilitySnapshot();
    expect(snapshot.totals.migrationAttempts).toBe(2);
    expect(snapshot.totals.migrationSuccesses).toBe(1);
    expect(snapshot.totals.migrationFailures).toBe(1);
    expect(snapshot.sourceCounts.path_config).toBe(1);
    expect(snapshot.sourceCounts.portable_package).toBe(1);
    expect(snapshot.bySpecVersion['ai-paths.portable-engine.v2']?.successes).toBe(1);
    expect(snapshot.bySpecVersion['ai-paths.portable-engine.v99']?.failures).toBe(1);
    expect(snapshot.recentFailures[0]?.reason).toBe('missing_migrator');
  });

  it('emits migrator observability hook events for register/failure/unregister flow', () => {
    const customVersion = 'ai-paths.portable-engine.v17';
    const pathConfig = createDefaultPathConfig('path_portable_observability_events');
    const v1Package = buildPortablePathPackage(pathConfig);
    const events: Array<{ type: string; specVersion?: string; reason?: string }> = [];
    const unsubscribe = registerPortablePathMigratorObservabilityHook((event) => {
      events.push({
        type: event.type,
        ...('specVersion' in event ? { specVersion: event.specVersion } : {}),
        ...('reason' in event ? { reason: event.reason } : {}),
      });
    });

    registerPortablePathPackageMigrator(customVersion, () => ({
      ok: false,
      error: 'v17 custom failure',
    }));
    try {
      const migrated = migratePortablePathInput({
        ...v1Package,
        specVersion: customVersion,
      });
      expect(migrated.ok).toBe(false);
    } finally {
      unregisterPortablePathPackageMigrator(customVersion);
      unsubscribe();
    }

    expect(
      events.some(
        (event) => event.type === 'migrator_registered' && event.specVersion === customVersion
      )
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === 'migration_failed' &&
          event.specVersion === customVersion &&
          event.reason === 'migrator_error'
      )
    ).toBe(true);
    expect(
      events.some(
        (event) => event.type === 'migrator_unregistered' && event.specVersion === customVersion
      )
    ).toBe(true);
  });

  it('warns on missing portable package fingerprint in warn mode', () => {
    const pathConfig = createDefaultPathConfig('path_portable_warn_missing_fingerprint');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const parsed = resolvePortablePathInput(portablePackage, {
      fingerprintVerificationMode: 'warn',
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      parsed.value.migrationWarnings.some(
        (warning) => warning.code === 'package_fingerprint_missing'
      )
    ).toBe(true);
  });

  it('blocks missing portable package fingerprint in strict mode', () => {
    const pathConfig = createDefaultPathConfig('path_portable_strict_missing_fingerprint');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const parsed = resolvePortablePathInput(portablePackage, {
      fingerprintVerificationMode: 'strict',
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain('fingerprint');
  });

  it('blocks mismatched portable package fingerprint in strict mode', () => {
    const pathConfig = createDefaultPathConfig('path_portable_strict_mismatch_fingerprint');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const parsed = resolvePortablePathInput(
      {
        ...portablePackage,
        fingerprint: {
          algorithm: 'stable_hash_v1',
          value: 'deadbeefdeadbeef',
        },
      },
      {
        fingerprintVerificationMode: 'strict',
      }
    );
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toContain('does not match');
  });

  it('accepts matching stable fingerprint in strict mode', () => {
    const pathConfig = createDefaultPathConfig('path_portable_strict_matching_fingerprint');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const parsed = resolvePortablePathInput(
      {
        ...portablePackage,
        fingerprint: computePortablePathFingerprintSync(portablePackage),
      },
      {
        fingerprintVerificationMode: 'strict',
      }
    );
    expect(parsed.ok).toBe(true);
  });

  it('verifies matching sha256 fingerprint in strict mode with async resolver', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_async_sha256_ok');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const withFingerprint = await addPortablePathPackageFingerprint(portablePackage);
      expect(withFingerprint.fingerprint?.algorithm).toBe('sha256');

      const parsed = await resolvePortablePathInputAsync(withFingerprint, {
        fingerprintVerificationMode: 'strict',
      });
      expect(parsed.ok).toBe(true);
    } finally {
      restoreCrypto();
    }
  });

  it('blocks mismatched sha256 fingerprint in strict mode with async resolver', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_async_sha256_mismatch');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const withFingerprint = await addPortablePathPackageFingerprint(portablePackage);
      expect(withFingerprint.fingerprint?.algorithm).toBe('sha256');

      const parsed = await resolvePortablePathInputAsync(
        {
          ...withFingerprint,
          fingerprint: {
            algorithm: 'sha256',
            value: 'deadbeefdeadbeef',
          },
        },
        {
          fingerprintVerificationMode: 'strict',
        }
      );
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(parsed.error).toContain('does not match');
    } finally {
      restoreCrypto();
    }
  });

  it('warns that sha256 requires async verification in sync warn mode', () => {
    const pathConfig = createDefaultPathConfig('path_portable_warn_unsupported_fingerprint');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const parsed = resolvePortablePathInput(
      {
        ...portablePackage,
        fingerprint: {
          algorithm: 'sha256',
          value: 'deadbeefdeadbeef',
        },
      },
      {
        fingerprintVerificationMode: 'warn',
      }
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      parsed.value.migrationWarnings.some(
        (warning) => warning.code === 'package_fingerprint_async_required'
      )
    ).toBe(true);
  });

  it('warns on unsupported fingerprint algorithms in async warn mode', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_warn_sha3_fingerprint');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const parsed = await resolvePortablePathInputAsync(
      {
        ...portablePackage,
        fingerprint: {
          algorithm: 'sha3',
          value: 'deadbeefdeadbeef',
        },
      },
      {
        fingerprintVerificationMode: 'warn',
      }
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      parsed.value.migrationWarnings.some(
        (warning) => warning.code === 'package_fingerprint_unsupported_algorithm'
      )
    ).toBe(true);
  });

  it('resolves signed package envelopes in async strict mode', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_envelope_async_strict');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const signedEnvelope = await buildPortablePathPackageEnvelope(portablePackage, {
        secret: 'portable-test-secret',
        keyId: 'test-key-1',
      });

      const parsed = await resolvePortablePathInputAsync(signedEnvelope, {
        envelopeSignatureVerificationMode: 'strict',
        envelopeSignatureSecret: 'portable-test-secret',
      });
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.value.source).toBe('portable_envelope');
      expect(parsed.value.portableEnvelope?.signature.algorithm).toBe('hmac_sha256');
    } finally {
      restoreCrypto();
    }
  });

  it('requires async envelope verification in sync strict mode for hmac signatures', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_envelope_sync_strict');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const signedEnvelope = await buildPortablePathPackageEnvelope(portablePackage, {
        secret: 'portable-test-secret',
      });
      const parsed = resolvePortablePathInput(signedEnvelope, {
        envelopeSignatureVerificationMode: 'strict',
        envelopeSignatureSecret: 'portable-test-secret',
      });
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(parsed.error).toContain('asynchronous verification');
    } finally {
      restoreCrypto();
    }
  });

  it('fails async strict envelope verification when secret is missing', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_envelope_missing_secret');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const signedEnvelope = await buildPortablePathPackageEnvelope(portablePackage, {
        secret: 'portable-test-secret',
      });
      const parsed = await resolvePortablePathInputAsync(signedEnvelope, {
        envelopeSignatureVerificationMode: 'strict',
      });
      expect(parsed.ok).toBe(false);
      if (parsed.ok) return;
      expect(parsed.error).toContain('verification secret');
    } finally {
      restoreCrypto();
    }
  });

  it('verifies async strict envelope signatures via key-id secret map', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_envelope_key_map');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const signedEnvelope = await buildPortablePathPackageEnvelope(portablePackage, {
        secret: 'portable-key-secret-v2',
        keyId: 'rotating-key-v2',
      });
      const parsed = await resolvePortablePathInputAsync(signedEnvelope, {
        envelopeSignatureVerificationMode: 'strict',
        envelopeSignatureSecretsByKeyId: {
          'rotating-key-v1': 'portable-key-secret-v1',
          'rotating-key-v2': 'portable-key-secret-v2',
        },
      });
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.value.portableEnvelope?.signature.keyId).toBe('rotating-key-v2');
    } finally {
      restoreCrypto();
    }
  });

  it('verifies async strict envelope signatures via pluggable key resolver rotation', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_envelope_key_resolver');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const signedEnvelope = await buildPortablePathPackageEnvelope(portablePackage, {
        secret: 'portable-key-secret-current',
        keyId: 'rotating-key-current',
      });
      const resolverCalls: Array<{ keyId: string | null; algorithm: string; phase: string }> = [];
      const parsed = await resolvePortablePathInputAsync(signedEnvelope, {
        envelopeSignatureVerificationMode: 'strict',
        envelopeSignatureKeyResolver: (context) => {
          resolverCalls.push({
            keyId: context.keyId,
            algorithm: context.algorithm,
            phase: context.phase,
          });
          return ['portable-key-secret-old', 'portable-key-secret-current'];
        },
      });
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(resolverCalls.length).toBeGreaterThan(0);
      expect(resolverCalls[0]?.keyId).toBe('rotating-key-current');
      expect(resolverCalls[0]?.algorithm).toBe('hmac_sha256');
      expect(resolverCalls[0]?.phase).toBe('async');
    } finally {
      restoreCrypto();
    }
  });

  it('records envelope verification audit outcomes by key id', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_envelope_audit_key_id');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const signedEnvelope = await buildPortablePathPackageEnvelope(portablePackage, {
        secret: 'portable-key-secret-v4',
        keyId: 'rotating-key-v4',
      });
      const parsed = await resolvePortablePathInputAsync(signedEnvelope, {
        envelopeSignatureVerificationMode: 'strict',
        envelopeSignatureSecretsByKeyId: {
          'rotating-key-v4': 'portable-key-secret-v4',
        },
      });
      expect(parsed.ok).toBe(true);
      const snapshot = getPortablePathEnvelopeVerificationObservabilitySnapshot();
      expect(snapshot.totals.events).toBeGreaterThan(0);
      expect(snapshot.totals.verified).toBeGreaterThan(0);
      expect(snapshot.byKeyId['rotating-key-v4']?.verified).toBeGreaterThan(0);
      expect(snapshot.byKeyId['rotating-key-v4']?.lastOutcome).toBe('verified');
      expect(snapshot.recentEvents[0]?.keyId).toBe('rotating-key-v4');
    } finally {
      restoreCrypto();
    }
  });

  it('emits envelope verification observability hook events', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_envelope_audit_events');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const unsignedEnvelope = {
      specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
      kind: 'path_package_envelope' as const,
      signedAt: '2026-03-05T00:00:00.000Z',
      package: portablePackage,
    };
    const events: Array<{ outcome: string; status: string; keyId: string | null }> = [];
    const unsubscribe = registerPortablePathEnvelopeVerificationObservabilityHook((event) => {
      events.push({
        outcome: event.outcome,
        status: event.status,
        keyId: event.keyId,
      });
    });
    try {
      const parsed = await resolvePortablePathInputAsync(unsignedEnvelope, {
        envelopeSignatureVerificationMode: 'strict',
      });
      expect(parsed.ok).toBe(false);
    } finally {
      unsubscribe();
    }
    expect(
      events.some(
        (event) =>
          event.outcome === 'signature_missing' &&
          event.status === 'rejected' &&
          event.keyId === null
      )
    ).toBe(true);
  });

  it('dispatches envelope verification events to registered audit sinks', async () => {
    const restoreCrypto = ensureCryptoSubtleDigestForTest();
    try {
      const pathConfig = createDefaultPathConfig('path_portable_envelope_sink_success');
      const portablePackage = buildPortablePathPackage(pathConfig);
      const signedEnvelope = await buildPortablePathPackageEnvelope(portablePackage, {
        secret: 'portable-key-secret-sink',
        keyId: 'portable-key-sink-1',
      });
      const sinkEvents: Array<{ keyId: string | null; outcome: string; status: string }> = [];
      const unregister = registerPortablePathEnvelopeVerificationAuditSink({
        id: 'test-envelope-sink-success',
        write: (event) => {
          sinkEvents.push({
            keyId: event.keyId,
            outcome: event.outcome,
            status: event.status,
          });
        },
      });
      try {
        const parsed = await resolvePortablePathInputAsync(signedEnvelope, {
          envelopeSignatureVerificationMode: 'strict',
          envelopeSignatureSecretsByKeyId: {
            'portable-key-sink-1': 'portable-key-secret-sink',
          },
        });
        expect(parsed.ok).toBe(true);
      } finally {
        unregister();
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      const sinkSnapshot = getPortablePathEnvelopeVerificationAuditSinkSnapshot();
      expect(sinkSnapshot.totals.registrationCount).toBe(1);
      expect(sinkSnapshot.totals.unregistrationCount).toBe(1);
      expect(sinkSnapshot.totals.writesAttempted).toBeGreaterThan(0);
      expect(sinkSnapshot.totals.writesSucceeded).toBeGreaterThan(0);
      expect(sinkSnapshot.bySinkId['test-envelope-sink-success']?.writesSucceeded).toBeGreaterThan(
        0
      );
      expect(sinkEvents.some((event) => event.keyId === 'portable-key-sink-1')).toBe(true);
      expect(
        sinkEvents.some((event) => event.outcome === 'verified' && event.status === 'verified')
      ).toBe(true);
      expect(listPortablePathEnvelopeVerificationAuditSinkIds()).toEqual([]);
    } finally {
      restoreCrypto();
    }
  });

  it('isolates envelope audit sink failures from verification flow and records telemetry', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_envelope_sink_failure');
    const portablePackage = buildPortablePathPackage(pathConfig);
    const unsignedEnvelope = {
      specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
      kind: 'path_package_envelope' as const,
      signedAt: '2026-03-05T00:00:00.000Z',
      package: portablePackage,
    };
    const unregister = registerPortablePathEnvelopeVerificationAuditSink({
      id: 'test-envelope-sink-failure',
      write: async () => {
        throw new Error('sink exploded');
      },
    });
    try {
      const parsed = await resolvePortablePathInputAsync(unsignedEnvelope, {
        envelopeSignatureVerificationMode: 'warn',
      });
      expect(parsed.ok).toBe(true);
    } finally {
      unregister();
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    const sinkSnapshot = getPortablePathEnvelopeVerificationAuditSinkSnapshot();
    expect(sinkSnapshot.totals.writesAttempted).toBeGreaterThan(0);
    expect(sinkSnapshot.totals.writesFailed).toBeGreaterThan(0);
    expect(sinkSnapshot.bySinkId['test-envelope-sink-failure']?.writesFailed).toBeGreaterThan(0);
    expect(sinkSnapshot.bySinkId['test-envelope-sink-failure']?.lastError).toContain(
      'sink exploded'
    );
    expect(sinkSnapshot.recentFailures.length).toBeGreaterThan(0);
    expect(unregisterPortablePathEnvelopeVerificationAuditSink('test-envelope-sink-failure')).toBe(
      false
    );
  });
});
