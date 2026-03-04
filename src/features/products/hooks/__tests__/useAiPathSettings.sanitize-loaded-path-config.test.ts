import { beforeEach, describe, expect, it } from 'vitest';

import { sanitizeLoadedPathConfig } from '@/features/products/hooks/useAiPathSettings';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import {
  createNodeInstanceId,
  resolveNodeTypeId,
} from '@/shared/lib/ai-paths/core/utils/node-identity';
import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';

const usedNodeIds = new Set<string>();

const buildNode = (patch: Partial<AiNode>): AiNode => {
  const id = patch.id ?? createNodeInstanceId(usedNodeIds);
  const baseNode = {
    type: 'viewer',
    title: 'Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    ...patch,
    id,
  } as AiNode;

  return {
    ...baseNode,
    instanceId: patch.instanceId ?? id,
    nodeTypeId: patch.nodeTypeId ?? resolveNodeTypeId(baseNode, palette),
  } as AiNode;
};

const buildConfig = (nodes: AiNode[], edges: Edge[]): PathConfig =>
  ({
    id: 'path-1',
    version: 1,
    name: 'Path 1',
    description: '',
    trigger: 'manual',
    updatedAt: new Date().toISOString(),
    nodes,
    edges,
  }) as PathConfig;

describe('sanitizeLoadedPathConfig', () => {
  beforeEach(() => {
    usedNodeIds.clear();
  });

  it('rejects unsupported database schemaSnapshot payloads', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-c0ffee001122334455667788',
          instanceId: 'node-c0ffee001122334455667788',
          type: 'database',
          config: {
            database: {
              operation: 'query',
              schemaSnapshot: {
                collections: [],
                sources: {},
              },
            },
          },
        }),
      ],
      []
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(
      /unsupported database schemaSnapshot/i
    );
  });

  it('rejects unsupported database query provider "all"', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-c0ffee001122334455667788',
          instanceId: 'node-c0ffee001122334455667788',
          type: 'database',
          config: {
            database: {
              operation: 'query',
              query: {
                provider: 'all',
              },
            },
          },
        }),
      ],
      []
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(
      /unsupported database query provider "all"/i
    );
  });

  it('rejects unsupported parameter inference target path aliases', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-c0ffee001122334455667788',
          instanceId: 'node-c0ffee001122334455667788',
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
      ],
      []
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(
      /unsupported parameter inference target path/i
    );
  });

  it('rejects unsupported collection aliases', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-c0ffee001122334455667788',
          instanceId: 'node-c0ffee001122334455667788',
          type: 'database',
          config: {
            database: {
              operation: 'query',
              query: {
                collection: 'product_draft',
              },
            },
          },
        }),
      ],
      []
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(/unsupported collection aliases/i);
  });

  it('rejects legacy node identities', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-legacy-trigger',
          instanceId: 'node-legacy-trigger',
          type: 'trigger',
          outputs: ['trigger'],
        }),
        buildNode({
          id: 'node-legacy-parser',
          instanceId: 'node-legacy-parser',
          type: 'parser',
          inputs: ['trigger'],
          outputs: ['value'],
        }),
      ],
      [
        {
          id: 'edge-trigger-parser',
          from: 'node-legacy-trigger',
          to: 'node-legacy-parser',
          fromPort: 'trigger',
          toPort: 'trigger',
        },
      ]
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(/unsupported node identities/i);
  });

  it('rejects legacy trigger data edges', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-c0ffee001122334455667788',
          instanceId: 'node-c0ffee001122334455667788',
          type: 'trigger',
          outputs: ['trigger'],
        }),
        buildNode({
          id: 'node-deadbeef0011223344556677',
          instanceId: 'node-deadbeef0011223344556677',
          type: 'parser',
          inputs: ['context'],
          outputs: ['value'],
        }),
      ],
      [
        {
          id: 'edge-legacy-trigger-context',
          from: 'node-c0ffee001122334455667788',
          to: 'node-deadbeef0011223344556677',
          fromPort: 'context',
          toPort: 'context',
        },
      ]
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(
      /AI Path config contains unsupported trigger data edges\./i
    );
  });

  it('rejects invalid or non-canonical edges', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-c0ffee001122334455667788',
          instanceId: 'node-c0ffee001122334455667788',
          type: 'trigger',
          outputs: ['trigger'],
        }),
        buildNode({
          id: 'node-deadbeef0011223344556677',
          instanceId: 'node-deadbeef0011223344556677',
          type: 'parser',
          inputs: ['trigger'],
          outputs: ['value'],
        }),
      ],
      [
        {
          id: 'edge-trigger-parser',
          from: 'node-c0ffee001122334455667788',
          to: 'node-missing001122334455667788',
          fromPort: 'trigger',
          toPort: 'trigger',
        },
      ]
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(/invalid or non-canonical edges/i);
  });

  it('rejects alias-only edge fields instead of accepting legacy edge shape', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-c0ffee001122334455667788',
          instanceId: 'node-c0ffee001122334455667788',
          type: 'trigger',
          outputs: ['trigger'],
        }),
        buildNode({
          id: 'node-deadbeef0011223344556677',
          instanceId: 'node-deadbeef0011223344556677',
          type: 'parser',
          inputs: ['trigger'],
          outputs: ['value'],
        }),
      ],
      [
        {
          id: 'edge-legacy-alias-shape',
          source: 'node-c0ffee001122334455667788',
          target: 'node-deadbeef0011223344556677',
          sourceHandle: 'trigger',
          targetHandle: 'trigger',
        } as unknown as Edge,
      ]
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(/invalid or non-canonical edges/i);
  });

  it('keeps canonical path configs loadable', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-c0ffee001122334455667788',
          instanceId: 'node-c0ffee001122334455667788',
          type: 'trigger',
          outputs: ['trigger'],
        }),
        buildNode({
          id: 'node-deadbeef0011223344556677',
          instanceId: 'node-deadbeef0011223344556677',
          type: 'parser',
          inputs: ['trigger'],
          outputs: ['value'],
        }),
      ],
      [
        {
          id: 'edge-trigger-parser',
          from: 'node-c0ffee001122334455667788',
          to: 'node-deadbeef0011223344556677',
          fromPort: 'trigger',
          toPort: 'trigger',
        },
      ]
    );

    const sanitized = sanitizeLoadedPathConfig(config);

    expect(sanitized.nodes).toHaveLength(2);
    expect(sanitized.edges).toHaveLength(1);
  });
});
