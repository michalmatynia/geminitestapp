import { describe, it, expect } from 'vitest';

import { ContextRetrievalService } from '../retrieval';
import { CodeFirstRegistryBackend } from '../../registry/backend';
import type { ContextNode } from '@/shared/contracts/ai-context-registry';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_PERMISSIONS = {
  readScopes: ['ctx:read'],
  riskTier: 'low' as const,
  classification: 'internal' as const,
};

const BASE_SOURCE = { type: 'code' as const, ref: 'test.ts' };

const buildNode = (patch: Partial<ContextNode> & Pick<ContextNode, 'id'>): ContextNode => ({
  kind: 'page',
  name: `Node ${patch.id}`,
  description: `Description for ${patch.id}`,
  tags: [],
  permissions: BASE_PERMISSIONS,
  version: '1.0.0',
  updatedAtISO: '2026-01-01T00:00:00.000Z',
  source: BASE_SOURCE,
  ...patch,
});

// Node graph:
//  A → B → C
//      B → D
const nodeA = buildNode({
  id: 'page:a',
  relationships: [{ type: 'uses', targetId: 'page:b' }],
});
const nodeB = buildNode({
  id: 'page:b',
  relationships: [
    { type: 'uses', targetId: 'page:c' },
    { type: 'uses', targetId: 'page:d' },
  ],
});
const nodeC = buildNode({ id: 'page:c' });
const nodeD = buildNode({ id: 'page:d' });

const nodeWithSchema = buildNode({
  id: 'collection:x',
  kind: 'collection',
  jsonSchema2020: { type: 'object', properties: { _id: { type: 'string' } } },
  examples: [{ title: 'Example', input: { foo: 1 } }],
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ContextRetrievalService', () => {
  const backend = new CodeFirstRegistryBackend([nodeA, nodeB, nodeC, nodeD, nodeWithSchema]);
  const svc = new ContextRetrievalService(backend);

  describe('resolveWithExpansion', () => {
    it('depth=0 returns only root nodes, no expansion', () => {
      const result = svc.resolveWithExpansion({ ids: ['page:a'], depth: 0 });
      expect(result.nodes.map((n) => n.id)).toEqual(['page:a']);
      expect(result.truncated).toBe(false);
      expect(result.visitedIds).toContain('page:a');
    });

    it('depth=1 (default) returns root + direct targets', () => {
      const result = svc.resolveWithExpansion({ ids: ['page:a'], depth: 1 });
      const ids = result.nodes.map((n) => n.id).sort();
      expect(ids).toContain('page:a');
      expect(ids).toContain('page:b');
      expect(ids).not.toContain('page:c'); // one hop from B, not from A
    });

    it('depth=2 returns root + 2 hops', () => {
      const result = svc.resolveWithExpansion({ ids: ['page:a'], depth: 2 });
      const ids = result.nodes.map((n) => n.id).sort();
      expect(ids).toContain('page:a');
      expect(ids).toContain('page:b');
      expect(ids).toContain('page:c');
      expect(ids).toContain('page:d');
    });

    it('does not visit same node twice', () => {
      const result = svc.resolveWithExpansion({ ids: ['page:a', 'page:b'], depth: 1 });
      const pageB = result.nodes.filter((n) => n.id === 'page:b');
      expect(pageB).toHaveLength(1);
    });

    it('truncates when maxNodes exceeded', () => {
      // Only allow 1 node → truncated after root
      const result = svc.resolveWithExpansion({ ids: ['page:a'], depth: 2, maxNodes: 1 });
      expect(result.truncated).toBe(true);
      expect(result.nodes).toHaveLength(1);
    });

    it('returns truncated=false when under maxNodes limit', () => {
      const result = svc.resolveWithExpansion({ ids: ['page:a'], depth: 2, maxNodes: 100 });
      expect(result.truncated).toBe(false);
    });

    it('visitedIds includes all visited node ids', () => {
      const result = svc.resolveWithExpansion({ ids: ['page:a'], depth: 2 });
      expect(result.visitedIds).toContain('page:a');
      expect(result.visitedIds).toContain('page:b');
    });

    it('includeSchemas=false strips jsonSchema2020', () => {
      const result = svc.resolveWithExpansion({
        ids: ['collection:x'],
        depth: 0,
        includeSchemas: false,
      });
      expect(result.nodes[0].jsonSchema2020).toBeUndefined();
    });

    it('includeSchemas=true preserves jsonSchema2020', () => {
      const result = svc.resolveWithExpansion({
        ids: ['collection:x'],
        depth: 0,
        includeSchemas: true,
      });
      expect(result.nodes[0].jsonSchema2020).toBeDefined();
    });

    it('includeExamples=false strips examples', () => {
      const result = svc.resolveWithExpansion({
        ids: ['collection:x'],
        depth: 0,
        includeExamples: false,
      });
      expect(result.nodes[0].examples).toBeUndefined();
    });

    it('includeExamples=true preserves examples', () => {
      const result = svc.resolveWithExpansion({
        ids: ['collection:x'],
        depth: 0,
        includeExamples: true,
      });
      expect(result.nodes[0].examples).toBeDefined();
    });

    it('handles unknown ids gracefully (no crash)', () => {
      const result = svc.resolveWithExpansion({
        ids: ['nonexistent:node'],
        depth: 0,
      });
      expect(result.nodes).toHaveLength(0);
      expect(result.truncated).toBe(false);
    });
  });

  describe('getRelatedNodes', () => {
    it('returns forward-referenced nodes', () => {
      const result = svc.getRelatedNodes('page:a');
      const ids = result.nodes.map((n) => n.id);
      expect(ids).toContain('page:b');
    });

    it('returns reverse-referenced nodes', () => {
      // page:b is referenced by page:a
      const result = svc.getRelatedNodes('page:b');
      const ids = result.nodes.map((n) => n.id);
      expect(ids).toContain('page:a'); // reverse reference
      expect(ids).toContain('page:c'); // forward reference
      expect(ids).toContain('page:d'); // forward reference
    });

    it('does not include the source node itself', () => {
      const result = svc.getRelatedNodes('page:a');
      expect(result.nodes.find((n) => n.id === 'page:a')).toBeUndefined();
    });

    it('returns sourceId in result', () => {
      const result = svc.getRelatedNodes('page:a');
      expect(result.sourceId).toBe('page:a');
    });

    it('returns empty nodes for unknown id', () => {
      const result = svc.getRelatedNodes('nonexistent:node');
      expect(result.nodes).toHaveLength(0);
      expect(result.sourceId).toBe('nonexistent:node');
    });
  });
});
