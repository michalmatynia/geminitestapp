import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { PathConfig, RuntimeState } from '@/shared/contracts/ai-paths';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { serializePathConfigToSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';
import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PortablePathValidationError,
  buildPortablePathPackage,
  resolvePortablePathInput,
  runPortablePathClient,
  validatePortablePathInput,
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
});
