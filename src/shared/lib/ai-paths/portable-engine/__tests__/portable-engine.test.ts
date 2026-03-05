import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

import type { PathConfig, RuntimeState } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { serializePathConfigToSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';
import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PortablePathValidationError,
  addPortablePathPackageFingerprint,
  buildPortablePathPackage,
  buildPortablePathJsonSchemaCatalog,
  computePortablePathFingerprintSync,
  listPortablePathPackageMigratorVersions,
  migratePortablePathInput,
  resolvePortablePathInput,
  resolvePortablePathInputAsync,
  runPortablePathClient,
  validatePortablePathConfig,
  validatePortablePathInput,
} from '../index';

vi.mock('@/shared/lib/ai-paths/core/runtime/engine-client', () => ({
  evaluateGraphClient: vi.fn(),
}));

const mockedEvaluateGraphClient = vi.mocked(evaluateGraphClient);

const ensureCryptoSubtleDigestForTest = (): (() => void) => {
  if (globalThis.crypto?.subtle && typeof globalThis.crypto.subtle.digest === 'function') {
    return () => {};
  }
  const previous = globalThis.crypto;
  const subtle = {
    digest: async (_algorithm: string, data: BufferSource): Promise<ArrayBuffer> => {
      const bytes =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
      const digest = createHash('sha256').update(Buffer.from(bytes)).digest();
      return digest.buffer.slice(digest.byteOffset, digest.byteOffset + digest.byteLength);
    },
  };
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    writable: true,
    value: { subtle },
  });
  return () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      writable: true,
      value: previous,
    });
  };
};

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

describe('portable AI-path engine scaffold', () => {
  beforeEach(() => {
    mockedEvaluateGraphClient.mockReset();
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

  it('normalizes path-config edge aliases when resolving raw path payloads', () => {
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

  it('migrates legacy path config payload to portable package v1', () => {
    const pathConfig = createDefaultPathConfig('path_portable_migrate_legacy');
    const migrated = migratePortablePathInput(pathConfig);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;

    expect(migrated.value.source).toBe('path_config');
    expect(migrated.value.portablePackage.specVersion).toBe(
      AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION
    );
    expect(
      migrated.value.migrationWarnings.some(
        (warning) => warning.code === 'legacy_path_config_upgraded'
      )
    ).toBe(true);
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
    expect(migrated.value.portablePackage.specVersion).toBe(
      AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION
    );
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

  it('publishes json schema catalog for portable contracts', () => {
    const catalog = buildPortablePathJsonSchemaCatalog();
    expect(catalog.portable_package['type']).toBe('object');
    expect(catalog.semantic_canvas['type']).toBe('object');
    expect(catalog.path_config['type']).toBe('object');
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

  it('adds deterministic fingerprint to portable package', async () => {
    const pathConfig = createDefaultPathConfig('path_portable_fingerprint');
    const packagePayload = buildPortablePathPackage(pathConfig);
    const withFingerprint = await addPortablePathPackageFingerprint(packagePayload);
    expect(withFingerprint.fingerprint).toBeDefined();
    expect(withFingerprint.fingerprint?.value.length).toBeGreaterThanOrEqual(8);
  });
});
