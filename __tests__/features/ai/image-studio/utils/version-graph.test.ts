import { describe, expect, it } from 'vitest';

import {
  computeVersionGraph,
  computeTimelineLayout,
} from '@/features/ai/image-studio/utils/version-graph';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

// ── Factory ──────────────────────────────────────────────────────────────────

const createSlot = (
  overrides: Partial<ImageStudioSlotRecord> & { id: string }
): ImageStudioSlotRecord => ({
  createdAt: '',
  updatedAt: null,
  projectId: 'project-1',
  name: overrides.id,
  folderPath: null,
  metadata: null,
  ...overrides,
});

// ── computeVersionGraph ──────────────────────────────────────────────────────

describe('computeVersionGraph', () => {
  it('returns empty graph for empty slots', () => {
    const result = computeVersionGraph([]);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
    expect(result.rootNodes).toHaveLength(0);
  });

  it('returns single base node for a slot with no parents', () => {
    const slots = [createSlot({ id: 'base-1' })];
    const result = computeVersionGraph(slots);

    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
    expect(result.nodes[0]!.type).toBe('base');
    expect(result.nodes[0]!.depth).toBe(0);
    expect(result.nodes[0]!.parentIds).toEqual([]);
    expect(result.nodes[0]!.childIds).toEqual([]);
    expect(result.rootNodes).toHaveLength(1);
  });

  it('handles linear chain: base → gen → gen', () => {
    const slots = [
      createSlot({ id: 'base-1' }),
      createSlot({
        id: 'gen-1',
        metadata: { role: 'generation', sourceSlotId: 'base-1' },
      }),
      createSlot({
        id: 'gen-2',
        metadata: { role: 'generation', sourceSlotId: 'gen-1' },
      }),
    ];
    const result = computeVersionGraph(slots);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);

    const nodeById = new Map(result.nodes.map((n) => [n.id, n]));
    expect(nodeById.get('base-1')!.depth).toBe(0);
    expect(nodeById.get('base-1')!.type).toBe('base');
    expect(nodeById.get('gen-1')!.depth).toBe(1);
    expect(nodeById.get('gen-1')!.type).toBe('generation');
    expect(nodeById.get('gen-2')!.depth).toBe(2);
    expect(nodeById.get('gen-2')!.type).toBe('generation');
  });

  it('handles branching: base → 2 gens at same depth', () => {
    const slots = [
      createSlot({ id: 'base-1' }),
      createSlot({
        id: 'gen-a',
        metadata: { role: 'generation', sourceSlotId: 'base-1' },
      }),
      createSlot({
        id: 'gen-b',
        metadata: { role: 'generation', sourceSlotId: 'base-1' },
      }),
    ];
    const result = computeVersionGraph(slots);

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);

    const nodeById = new Map(result.nodes.map((n) => [n.id, n]));
    expect(nodeById.get('gen-a')!.depth).toBe(1);
    expect(nodeById.get('gen-b')!.depth).toBe(1);
    expect(nodeById.get('base-1')!.childIds).toContain('gen-a');
    expect(nodeById.get('base-1')!.childIds).toContain('gen-b');
  });

  it('handles merge node with 2 parents', () => {
    const slots = [
      createSlot({ id: 'base-1' }),
      createSlot({ id: 'base-2' }),
      createSlot({
        id: 'merge-1',
        metadata: { role: 'merge', sourceSlotIds: ['base-1', 'base-2'] },
      }),
    ];
    const result = computeVersionGraph(slots);

    expect(result.nodes).toHaveLength(3);

    const mergeNode = result.nodes.find((n) => n.id === 'merge-1')!;
    expect(mergeNode.type).toBe('merge');
    expect(mergeNode.parentIds).toEqual(['base-1', 'base-2']);
    expect(mergeNode.depth).toBe(1);

    const mergeEdges = result.edges.filter((e) => e.target === 'merge-1');
    expect(mergeEdges).toHaveLength(2);
    expect(mergeEdges.every((e) => e.type === 'merge')).toBe(true);
  });

  it('handles composite node', () => {
    const slots = [
      createSlot({ id: 'layer-1' }),
      createSlot({ id: 'layer-2' }),
      createSlot({
        id: 'comp-1',
        metadata: {
          role: 'composite',
          sourceSlotIds: ['layer-1', 'layer-2'],
          compositeConfig: {
            layers: [
              { slotId: 'layer-1', order: 0 },
              { slotId: 'layer-2', order: 1 },
            ],
          },
        },
      }),
    ];
    const result = computeVersionGraph(slots);

    const compNode = result.nodes.find((n) => n.id === 'comp-1')!;
    expect(compNode.type).toBe('composite');
    expect(compNode.parentIds).toEqual(['layer-1', 'layer-2']);

    const compEdges = result.edges.filter((e) => e.target === 'comp-1');
    expect(compEdges).toHaveLength(2);
    expect(compEdges.every((e) => e.type === 'composite')).toBe(true);
  });

  it('computes descendant counts correctly', () => {
    const slots = [
      createSlot({ id: 'root' }),
      createSlot({
        id: 'child-a',
        metadata: { role: 'generation', sourceSlotId: 'root' },
      }),
      createSlot({
        id: 'child-b',
        metadata: { role: 'generation', sourceSlotId: 'root' },
      }),
      createSlot({
        id: 'grandchild',
        metadata: { role: 'generation', sourceSlotId: 'child-a' },
      }),
    ];
    const result = computeVersionGraph(slots);

    const nodeById = new Map(result.nodes.map((n) => [n.id, n]));
    expect(nodeById.get('root')!.descendantCount).toBe(3); // child-a, child-b, grandchild
    expect(nodeById.get('child-a')!.descendantCount).toBe(1); // grandchild
    expect(nodeById.get('child-b')!.descendantCount).toBe(0);
    expect(nodeById.get('grandchild')!.descendantCount).toBe(0);
  });

  it('handles orphan slots gracefully (assigned depth 0)', () => {
    // Slot references a parent that doesn't exist in the set
    const slots = [
      createSlot({
        id: 'orphan',
        metadata: { role: 'generation', sourceSlotId: 'nonexistent' },
      }),
    ];
    const result = computeVersionGraph(slots);

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.depth).toBe(0);
    expect(result.nodes[0]!.type).toBe('base'); // no valid parent → base type
  });

  it('multi-parent depth = max(parent depths) + 1', () => {
    const slots = [
      createSlot({ id: 'root' }),
      createSlot({
        id: 'gen-1',
        metadata: { role: 'generation', sourceSlotId: 'root' },
      }),
      createSlot({
        id: 'gen-2',
        metadata: { role: 'generation', sourceSlotId: 'gen-1' },
      }),
      // Merge from root (depth 0) and gen-2 (depth 2) → depth should be 3
      createSlot({
        id: 'merge-deep',
        metadata: { role: 'merge', sourceSlotIds: ['root', 'gen-2'] },
      }),
    ];
    const result = computeVersionGraph(slots);

    const mergeNode = result.nodes.find((n) => n.id === 'merge-deep')!;
    expect(mergeNode.depth).toBe(3);
  });
});

// ── computeTimelineLayout ────────────────────────────────────────────────────

describe('computeTimelineLayout', () => {
  const makeBaseGraph = () => {
    const slots = [
      createSlot({ id: 'root' }),
      createSlot({
        id: 'gen-1',
        metadata: { role: 'generation', sourceSlotId: 'root' },
      }),
      createSlot({
        id: 'gen-2',
        metadata: { role: 'generation', sourceSlotId: 'gen-1' },
      }),
    ];
    return computeVersionGraph(slots);
  };

  it('returns empty for empty nodes', () => {
    const result = computeTimelineLayout([], [], 'horizontal');
    expect(result.nodes).toHaveLength(0);
  });

  it('horizontal: x increases by sort order', () => {
    const graph = makeBaseGraph();
    const result = computeTimelineLayout(graph.nodes, graph.edges, 'horizontal');

    expect(result.nodes).toHaveLength(3);
    // Verify x values increase
    for (let i = 1; i < result.nodes.length; i++) {
      expect(result.nodes[i]!.x).toBeGreaterThan(result.nodes[i - 1]!.x);
    }
  });

  it('vertical: y increases by sort order', () => {
    const graph = makeBaseGraph();
    const result = computeTimelineLayout(graph.nodes, graph.edges, 'vertical');

    expect(result.nodes).toHaveLength(3);
    // Verify y values increase
    for (let i = 1; i < result.nodes.length; i++) {
      expect(result.nodes[i]!.y).toBeGreaterThan(result.nodes[i - 1]!.y);
    }
  });

  it('roots get separate tracks', () => {
    const slots = [createSlot({ id: 'root-a' }), createSlot({ id: 'root-b' })];
    const graph = computeVersionGraph(slots);
    const result = computeTimelineLayout(graph.nodes, graph.edges, 'horizontal');

    // Two roots should be on different tracks (different y values in horizontal mode)
    const ys = result.nodes.map((n) => n.y);
    expect(new Set(ys).size).toBe(2);
  });
});
