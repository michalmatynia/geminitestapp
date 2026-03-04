import { describe, expect, it } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths';
import type { AiNode } from '@/shared/contracts/ai-paths';

import {
  collectInvalidRunEnqueuePayloadIssues,
  collectInvalidRunEnqueueSerializationIssues,
  collectInvalidRunNodePayloadIssues,
} from '../payload-validation';

describe('collectInvalidRunNodePayloadIssues', () => {
  it('returns no issues for canonical nodes', () => {
    const config = createDefaultPathConfig('path_payload_guard_ok');
    const issues = collectInvalidRunNodePayloadIssues(config.nodes);
    expect(issues).toEqual([]);
  });

  it('reports missing node timestamp metadata', () => {
    const config = createDefaultPathConfig('path_payload_guard_missing');
    const [first, ...rest] = config.nodes;
    expect(first).toBeDefined();
    const brokenNode = {
      ...(first as AiNode),
      createdAt: undefined,
      updatedAt: undefined,
    } as unknown as AiNode;
    const issues = collectInvalidRunNodePayloadIssues([brokenNode, ...rest]);

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      nodeId: brokenNode.id,
      missingFields: ['createdAt', 'updatedAt'],
    });
  });
});

describe('collectInvalidRunEnqueuePayloadIssues', () => {
  it('returns no issues for canonical enqueue payload', () => {
    const config = createDefaultPathConfig('path_enqueue_payload_guard_ok');
    const triggerNode = config.nodes.find((node) => node.type === 'trigger');
    const issues = collectInvalidRunEnqueuePayloadIssues({
      pathId: config.id,
      pathName: config.name,
      nodes: config.nodes,
      edges: config.edges,
      triggerEvent: config.trigger,
      triggerNodeId: triggerNode?.id,
      triggerContext: { source: 'test' },
      meta: { source: 'ai_paths_ui' },
    });

    expect(issues).toEqual([]);
  });

  it('reports field-level issues for invalid enqueue payload', () => {
    const config = createDefaultPathConfig('path_enqueue_payload_guard_invalid');
    const [firstNode, ...restNodes] = config.nodes;
    expect(firstNode).toBeDefined();
    const brokenNode = {
      ...(firstNode as AiNode),
      createdAt: undefined,
    } as unknown as AiNode;
    const [firstEdge, ...restEdges] = config.edges;
    const brokenEdge = {
      ...firstEdge,
      id: 42,
    } as unknown as (typeof config.edges)[number];
    const issues = collectInvalidRunEnqueuePayloadIssues({
      pathId: config.id,
      nodes: [brokenNode, ...restNodes],
      edges: [brokenEdge, ...restEdges],
      triggerContext: null,
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'nodes.0.createdAt',
        }),
        expect.objectContaining({
          path: 'edges.0.id',
        }),
      ])
    );
  });
});

describe('collectInvalidRunEnqueueSerializationIssues', () => {
  it('returns no issues for JSON-safe enqueue payloads', () => {
    const config = createDefaultPathConfig('path_enqueue_serialization_guard_ok');
    const issues = collectInvalidRunEnqueueSerializationIssues({
      pathId: config.id,
      pathName: config.name,
      nodes: config.nodes,
      edges: config.edges,
      triggerContext: { source: 'test' },
    });

    expect(issues).toEqual([]);
  });

  it('reports non-serializable values before enqueue', () => {
    const config = createDefaultPathConfig('path_enqueue_serialization_guard_invalid');
    const [firstNode, ...restNodes] = config.nodes;
    expect(firstNode).toBeDefined();
    const nodeWithBigInt = {
      ...(firstNode as AiNode),
      data: {
        bad: BigInt(1),
      },
    } as unknown as AiNode;
    const issues = collectInvalidRunEnqueueSerializationIssues({
      pathId: config.id,
      pathName: config.name,
      nodes: [nodeWithBigInt, ...restNodes],
      edges: config.edges,
      triggerContext: { source: 'test' },
    });

    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0]).toMatchObject({ path: '(root)' });
    expect(issues[0]?.message.toLowerCase()).toContain('serialize');
  });
});
