import { describe, it, expect, beforeEach } from 'vitest';

import {
  registerNode,
  registerNodes,
  searchNodes,
  resolveNodes,
  getRelatedNodes,
  getEntitySchema,
  __testOnly,
} from '../context-registry';

import type { ContextNode } from '@/shared/contracts/ai-context-registry';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const buildNode = (patch: Partial<ContextNode> & Pick<ContextNode, 'id'>): ContextNode => ({
  kind: 'page',
  name: 'Test Page',
  description: 'A test page description',
  tags: ['test', 'admin'],
  version: '1.0.0',
  ...patch,
});

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  __testOnly.clearRegistry();
});

// ─── Registration ─────────────────────────────────────────────────────────────

describe('registerNode / registerNodes', () => {
  it('registers a single node and makes it retrievable', () => {
    registerNode(buildNode({ id: 'page:home' }));
    expect(resolveNodes(['page:home']).nodes).toHaveLength(1);
  });

  it('overwrites a node when registered with the same ID', () => {
    registerNode(buildNode({ id: 'page:home', name: 'Old Name' }));
    registerNode(buildNode({ id: 'page:home', name: 'New Name' }));
    const { nodes } = resolveNodes(['page:home']);
    expect(nodes[0]?.name).toBe('New Name');
  });

  it('registers multiple nodes in one call', () => {
    registerNodes([
      buildNode({ id: 'page:a' }),
      buildNode({ id: 'page:b' }),
      buildNode({ id: 'collection:c', kind: 'collection' }),
    ]);
    expect(resolveNodes(['page:a', 'page:b', 'collection:c']).nodes).toHaveLength(3);
  });
});

// ─── Search ───────────────────────────────────────────────────────────────────

describe('searchNodes', () => {
  beforeEach(() => {
    registerNodes([
      buildNode({
        id: 'page:products',
        kind: 'page',
        name: 'Products',
        tags: ['products', 'admin'],
      }),
      buildNode({
        id: 'collection:orders',
        kind: 'collection',
        name: 'Orders',
        description: 'Order collection',
        tags: ['orders', 'commerce'],
      }),
      buildNode({
        id: 'action:export',
        kind: 'action',
        name: 'Export Products',
        tags: ['products', 'export'],
      }),
    ]);
  });

  it('returns all nodes when given an empty request', () => {
    const result = searchNodes({});
    expect(result.nodes).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('filters by kind', () => {
    const result = searchNodes({ kind: 'collection' });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe('collection:orders');
  });

  it('filters by query substring in name', () => {
    const result = searchNodes({ query: 'export' });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe('action:export');
  });

  it('filters by query substring in description', () => {
    const result = searchNodes({ query: 'order collection' });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe('collection:orders');
  });

  it('filters by ALL tags (AND logic)', () => {
    const result = searchNodes({ tags: ['products', 'export'] });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe('action:export');
  });

  it('returns empty when no nodes match tags', () => {
    const result = searchNodes({ tags: ['nonexistent'] });
    expect(result.nodes).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns empty when no nodes match the query', () => {
    const result = searchNodes({ query: 'zzznomatch' });
    expect(result.nodes).toHaveLength(0);
  });

  it('respects the limit', () => {
    const result = searchNodes({ limit: 2 });
    expect(result.nodes).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('combines kind and query filters', () => {
    const result = searchNodes({ kind: 'action', query: 'export' });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe('action:export');
  });
});

// ─── Resolve ──────────────────────────────────────────────────────────────────

describe('resolveNodes', () => {
  it('returns found nodes and lists missing IDs', () => {
    registerNode(buildNode({ id: 'page:home' }));
    const result = resolveNodes(['page:home', 'page:missing']);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]?.id).toBe('page:home');
    expect(result.missing).toEqual(['page:missing']);
  });

  it('returns empty nodes and all ids as missing when registry is empty', () => {
    const result = resolveNodes(['page:anything']);
    expect(result.nodes).toHaveLength(0);
    expect(result.missing).toEqual(['page:anything']);
  });

  it('returns all nodes when all ids are known', () => {
    registerNodes([
      buildNode({ id: 'page:a' }),
      buildNode({ id: 'page:b' }),
    ]);
    const result = resolveNodes(['page:a', 'page:b']);
    expect(result.nodes).toHaveLength(2);
    expect(result.missing).toHaveLength(0);
  });
});

// ─── Related ──────────────────────────────────────────────────────────────────

describe('getRelatedNodes', () => {
  it('returns forward-referenced related nodes', () => {
    registerNodes([
      buildNode({ id: 'page:products', relatedIds: ['collection:products'] }),
      buildNode({ id: 'collection:products', kind: 'collection' }),
    ]);
    const result = getRelatedNodes('page:products');
    expect(result.sourceId).toBe('page:products');
    expect(result.nodes.map((n) => n.id)).toContain('collection:products');
  });

  it('returns reverse-referenced nodes (nodes that reference the source)', () => {
    registerNodes([
      buildNode({ id: 'page:products', relatedIds: ['collection:products'] }),
      buildNode({ id: 'collection:products', kind: 'collection' }),
    ]);
    const result = getRelatedNodes('collection:products');
    expect(result.nodes.map((n) => n.id)).toContain('page:products');
  });

  it('returns empty nodes array for unknown IDs', () => {
    const result = getRelatedNodes('page:nonexistent');
    expect(result.nodes).toHaveLength(0);
    expect(result.sourceId).toBe('page:nonexistent');
  });

  it('does not include the source node itself in results', () => {
    registerNode(buildNode({ id: 'page:self', relatedIds: ['page:self'] }));
    const result = getRelatedNodes('page:self');
    expect(result.nodes.map((n) => n.id)).not.toContain('page:self');
  });
});

// ─── Schema lookup ────────────────────────────────────────────────────────────

describe('getEntitySchema', () => {
  it('finds schema by matching node ID suffix', () => {
    registerNode(
      buildNode({
        id: 'collection:products',
        kind: 'collection',
        schema: { type: 'object', properties: { sku: { type: 'string' } } },
      })
    );
    const schema = getEntitySchema('products');
    expect(schema).toMatchObject({ type: 'object' });
  });

  it('is case-insensitive', () => {
    registerNode(
      buildNode({
        id: 'collection:orders',
        kind: 'collection',
        schema: { type: 'object' },
      })
    );
    expect(getEntitySchema('ORDERS')).toMatchObject({ type: 'object' });
  });

  it('returns null when entity exists but has no schema defined', () => {
    registerNode(buildNode({ id: 'collection:no-schema', kind: 'collection' }));
    expect(getEntitySchema('no-schema')).toBeNull();
  });

  it('returns null for unregistered entity', () => {
    expect(getEntitySchema('ghost')).toBeNull();
  });
});
