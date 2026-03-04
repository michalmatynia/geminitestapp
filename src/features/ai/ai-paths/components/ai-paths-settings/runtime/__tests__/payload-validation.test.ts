import { describe, expect, it } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths';
import type { AiNode } from '@/shared/contracts/ai-paths';

import {
  compactTriggerContextForEnqueue,
  collectInvalidRunEnqueuePayloadIssues,
  collectInvalidRunEnqueueSerializationIssues,
  collectInvalidRunNodePayloadIssues,
  isInvalidEnqueuePayloadError,
  sanitizeTriggerContextForEnqueue,
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

describe('sanitizeTriggerContextForEnqueue', () => {
  it('drops non-serializable/circular values and normalizes non-finite numbers', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    const sanitized = sanitizeTriggerContextForEnqueue({
      event: {
        pointer: {
          clientX: Number.POSITIVE_INFINITY,
          clientY: Number.NaN,
          button: 0,
        },
        ignored: () => 'noop',
      },
      circular,
      list: [1, Number.NEGATIVE_INFINITY, BigInt(3), undefined],
    });

    expect(sanitized).toMatchObject({
      event: {
        pointer: {
          clientX: null,
          clientY: null,
          button: 0,
        },
      },
      list: [1, null, '3'],
    });
    expect(sanitized['circular']).toEqual({});
  });
});

describe('compactTriggerContextForEnqueue', () => {
  it('reduces oversized trigger contexts while preserving key routing metadata', () => {
    const hugeContext = {
      timestamp: '2026-03-04T00:00:00.000Z',
      entityId: 'product-1',
      entityType: 'product',
      source: {
        pathId: 'path_1',
        pathName: 'Description',
        tab: 'description',
      },
      event: {
        id: 'manual',
        nodeId: 'trigger-node',
        nodeTitle: 'Trigger',
        type: 'click',
        pointer: {
          clientX: 100,
          clientY: 200,
          button: 0,
        },
      },
      largePayload: Array.from({ length: 32 }, (_value, index) => ({
        id: index,
        blob: `${index}:${'x'.repeat(1_500)}`,
      })),
    } as Record<string, unknown>;

    const compact = compactTriggerContextForEnqueue(hugeContext);
    const compactJson = JSON.stringify(compact);

    expect(compact['entityId']).toBe('product-1');
    expect(compact['entityType']).toBe('product');
    expect(compact['source']).toMatchObject({ pathId: 'path_1' });
    expect(compact['event']).toMatchObject({ nodeId: 'trigger-node' });
    expect(compact['largePayload']).toBeUndefined();
    expect(typeof compactJson).toBe('string');
    expect(compactJson.length).toBeLessThan(12_000);
  });
});

describe('isInvalidEnqueuePayloadError', () => {
  it('detects canonical invalid payload errors from enqueue responses', () => {
    expect(isInvalidEnqueuePayloadError('Invalid payload')).toBe(true);
    expect(isInvalidEnqueuePayloadError('invalid payload: nodes[0]')).toBe(true);
    expect(isInvalidEnqueuePayloadError('Failed to enqueue server run.')).toBe(false);
    expect(isInvalidEnqueuePayloadError(undefined)).toBe(false);
  });
});
