import { describe, expect, it } from 'vitest';

import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';

import {
  CANONICAL_PARAMETER_INFERENCE_TARGET_PATH,
  rewritePathConfigParameterInferenceTargetPaths,
} from './ai-paths-parameter-inference-target-path';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: patch.id ?? 'node-1',
    instanceId: patch.instanceId ?? patch.id ?? 'node-1',
    nodeTypeId: patch.nodeTypeId,
    type: patch.type ?? 'viewer',
    title: patch.title ?? 'Node',
    description: patch.description ?? '',
    inputs: patch.inputs ?? [],
    outputs: patch.outputs ?? [],
    position: patch.position ?? { x: 0, y: 0 },
    data: patch.data ?? {},
    config: patch.config,
  }) as AiNode;

const buildConfig = (nodes: AiNode[], edges: Edge[] = []): PathConfig =>
  ({
    id: 'path-parameter-target-path',
    version: 1,
    name: 'Path',
    description: '',
    trigger: 'manual',
    updatedAt: new Date().toISOString(),
    nodes,
    edges,
  }) as PathConfig;

describe('rewritePathConfigParameterInferenceTargetPaths', () => {
  it('rewrites simpleParameters alias to canonical parameters target path', () => {
    const config = buildConfig([
      buildNode({
        id: 'node-db-1',
        type: 'database',
        config: {
          database: {
            operation: 'update',
            parameterInferenceGuard: {
              enabled: true,
              targetPath: 'simpleParameters',
            },
          },
        },
      }),
    ]);

    const rewritten = rewritePathConfigParameterInferenceTargetPaths(config);
    const node = rewritten.config.nodes[0] as AiNode;
    const targetPath = node.config?.database?.parameterInferenceGuard?.targetPath;

    expect(rewritten.changed).toBe(true);
    expect(targetPath).toBe(CANONICAL_PARAMETER_INFERENCE_TARGET_PATH);
    expect(rewritten.updates).toHaveLength(1);
    expect(rewritten.issues).toHaveLength(0);
  });

  it('rewrites translation payload alias to canonical parameters target path', () => {
    const config = buildConfig([
      buildNode({
        id: 'node-db-2',
        type: 'database',
        config: {
          database: {
            operation: 'update',
            parameterInferenceGuard: {
              enabled: true,
              targetPath: '__translation_parameters_payload__',
            },
          },
        },
      }),
    ]);

    const rewritten = rewritePathConfigParameterInferenceTargetPaths(config);
    const node = rewritten.config.nodes[0] as AiNode;
    const targetPath = node.config?.database?.parameterInferenceGuard?.targetPath;

    expect(rewritten.changed).toBe(true);
    expect(targetPath).toBe(CANONICAL_PARAMETER_INFERENCE_TARGET_PATH);
    expect(rewritten.updates).toHaveLength(1);
    expect(rewritten.issues).toHaveLength(0);
  });

  it('fills missing targetPath when parameter inference guard is enabled', () => {
    const config = buildConfig([
      buildNode({
        id: 'node-db-3',
        type: 'database',
        config: {
          database: {
            operation: 'update',
            parameterInferenceGuard: {
              enabled: true,
              targetPath: ' ',
            },
          },
        },
      }),
    ]);

    const rewritten = rewritePathConfigParameterInferenceTargetPaths(config);
    const node = rewritten.config.nodes[0] as AiNode;
    const targetPath = node.config?.database?.parameterInferenceGuard?.targetPath;

    expect(rewritten.changed).toBe(true);
    expect(targetPath).toBe(CANONICAL_PARAMETER_INFERENCE_TARGET_PATH);
    expect(rewritten.updates[0]?.reason).toBe('enabled_guard_missing_target_path');
    expect(rewritten.issues).toHaveLength(0);
  });

  it('keeps disabled guard with blank targetPath unchanged', () => {
    const config = buildConfig([
      buildNode({
        id: 'node-db-4',
        type: 'database',
        config: {
          database: {
            operation: 'update',
            parameterInferenceGuard: {
              enabled: false,
              targetPath: ' ',
            },
          },
        },
      }),
    ]);

    const rewritten = rewritePathConfigParameterInferenceTargetPaths(config);

    expect(rewritten.changed).toBe(false);
    expect(rewritten.updates).toHaveLength(0);
    expect(rewritten.issues).toHaveLength(0);
  });

  it('reports unknown targetPath values for manual review without rewriting', () => {
    const config = buildConfig([
      buildNode({
        id: 'node-db-5',
        type: 'database',
        config: {
          database: {
            operation: 'update',
            parameterInferenceGuard: {
              enabled: true,
              targetPath: '__custom_legacy_target__',
            },
          },
        },
      }),
    ]);

    const rewritten = rewritePathConfigParameterInferenceTargetPaths(config);

    expect(rewritten.changed).toBe(false);
    expect(rewritten.updates).toHaveLength(0);
    expect(rewritten.issues).toEqual([
      {
        nodeId: 'node-db-5',
        targetPath: '__custom_legacy_target__',
        reason: 'unknown_target_path',
      },
    ]);
  });
});
