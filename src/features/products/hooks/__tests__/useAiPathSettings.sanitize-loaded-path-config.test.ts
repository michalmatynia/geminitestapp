import { describe, expect, it } from 'vitest';

import { sanitizeLoadedPathConfig } from '@/features/products/hooks/useAiPathSettings';
import type { AiNode, Edge, PathConfig } from '@/shared/contracts/ai-paths';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node',
    type: 'viewer',
    title: 'Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
    ...patch,
  }) as AiNode;

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
  it('rejects deprecated database schemaSnapshot payloads', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-db-1',
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
      /deprecated database schemaSnapshot/i
    );
  });

  it('rejects deprecated database query provider "all"', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-db-1',
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
      /deprecated database query provider "all"/i
    );
  });

  it('rejects legacy trigger data edges', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-trigger-1',
          type: 'trigger',
          outputs: ['trigger'],
        }),
        buildNode({
          id: 'node-parser-1',
          type: 'parser',
          inputs: ['context'],
          outputs: ['value'],
        }),
      ],
      [
        {
          id: 'edge-legacy-trigger-context',
          from: 'node-trigger-1',
          to: 'node-parser-1',
          fromPort: 'context',
          toPort: 'context',
        },
      ]
    );

    expect(() => sanitizeLoadedPathConfig(config)).toThrowError(
      /Legacy AI Paths trigger data edges are no longer supported/i
    );
  });

  it('keeps canonical path configs loadable', () => {
    const config = buildConfig(
      [
        buildNode({
          id: 'node-trigger-1',
          type: 'trigger',
          outputs: ['trigger'],
        }),
        buildNode({
          id: 'node-parser-1',
          type: 'parser',
          inputs: ['trigger'],
          outputs: ['value'],
        }),
      ],
      [
        {
          id: 'edge-trigger-parser',
          from: 'node-trigger-1',
          to: 'node-parser-1',
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
