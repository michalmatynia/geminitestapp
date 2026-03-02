import { describe, it, expect } from 'vitest';

import { CodeFirstRegistryBackend } from '../backend';
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
  name: 'Test Page',
  description: 'A test page description',
  tags: ['test', 'admin'],
  permissions: BASE_PERMISSIONS,
  version: '1.0.0',
  updatedAtISO: '2026-01-01T00:00:00.000Z',
  source: BASE_SOURCE,
  ...patch,
});

const nodePage = buildNode({ id: 'page:home', kind: 'page', name: 'Home Page', tags: ['home', 'ui'] });
const nodeCollection = buildNode({
  id: 'collection:products',
  kind: 'collection',
  name: 'Products',
  description: 'MongoDB products collection',
  tags: ['products', 'mongo'],
});
const nodeAction = buildNode({
  id: 'action:export',
  kind: 'action',
  name: 'Export Products',
  description: 'Bulk export action',
  tags: ['export', 'bulk', 'admin'],
});
const nodePolicy = buildNode({
  id: 'policy:publish',
  kind: 'policy',
  name: 'Publish Policy',
  description: 'Product publish policy rules',
  tags: ['policy', 'publish'],
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CodeFirstRegistryBackend', () => {
  describe('constructor', () => {
    it('builds from provided nodes', () => {
      const backend = new CodeFirstRegistryBackend([nodePage, nodeCollection]);
      expect(backend.listAll()).toHaveLength(2);
    });

    it('works with an empty node list', () => {
      const backend = new CodeFirstRegistryBackend([]);
      expect(backend.listAll()).toHaveLength(0);
    });
  });

  describe('getByIds', () => {
    const backend = new CodeFirstRegistryBackend([nodePage, nodeCollection, nodeAction]);

    it('returns found nodes in any order', () => {
      const result = backend.getByIds(['collection:products', 'page:home']);
      expect(result.map((n) => n.id).sort()).toEqual(['collection:products', 'page:home']);
    });

    it('returns empty array for unknown ids', () => {
      expect(backend.getByIds(['unknown:id'])).toEqual([]);
    });

    it('silently skips missing ids and returns only found ones', () => {
      const result = backend.getByIds(['page:home', 'missing:node']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('page:home');
    });
  });

  describe('listAll', () => {
    it('returns all nodes', () => {
      const backend = new CodeFirstRegistryBackend([nodePage, nodeCollection, nodeAction, nodePolicy]);
      expect(backend.listAll()).toHaveLength(4);
    });
  });

  describe('getVersion', () => {
    it('returns deterministic codefirst:{count} string', () => {
      const backend = new CodeFirstRegistryBackend([nodePage, nodeCollection]);
      expect(backend.getVersion()).toBe('codefirst:2');
    });

    it('reflects actual node count', () => {
      const backend = new CodeFirstRegistryBackend([nodePage, nodeCollection, nodeAction, nodePolicy]);
      expect(backend.getVersion()).toBe('codefirst:4');
    });
  });

  describe('search — no query', () => {
    const backend = new CodeFirstRegistryBackend([nodePage, nodeCollection, nodeAction, nodePolicy]);

    it('returns all nodes when no filters applied', () => {
      expect(backend.search({ limit: 100 })).toHaveLength(4);
    });

    it('filters by single kind', () => {
      const results = backend.search({ kinds: ['collection'], limit: 100 });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('collection:products');
    });

    it('filters by multiple kinds (OR)', () => {
      const results = backend.search({ kinds: ['page', 'action'], limit: 100 });
      expect(results.map((n) => n.id).sort()).toEqual(['action:export', 'page:home']);
    });

    it('filters by tags (AND — node must have ALL tags)', () => {
      const results = backend.search({ tags: ['admin'], limit: 100 });
      // nodePage has 'admin'... wait nodePage has ['home', 'ui'], nodeAction has ['export','bulk','admin']
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('action:export');
    });

    it('respects limit', () => {
      const results = backend.search({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('returns empty for kind with no matching nodes', () => {
      const results = backend.search({ kinds: ['event'], limit: 100 });
      expect(results).toHaveLength(0);
    });
  });

  describe('search — with query', () => {
    const backend = new CodeFirstRegistryBackend([nodePage, nodeCollection, nodeAction, nodePolicy]);

    it('finds nodes by name (case-insensitive)', () => {
      const results = backend.search({ query: 'EXPORT', limit: 10 });
      expect(results.map((n) => n.id)).toContain('action:export');
    });

    it('finds nodes by description token', () => {
      const results = backend.search({ query: 'mongo', limit: 10 });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('collection:products');
    });

    it('finds nodes by tag', () => {
      const results = backend.search({ query: 'bulk', limit: 10 });
      expect(results.map((n) => n.id)).toContain('action:export');
    });

    it('finds nodes by id token', () => {
      const results = backend.search({ query: 'publish', limit: 10 });
      expect(results.map((n) => n.id)).toContain('policy:publish');
    });

    it('returns empty for unmatched query', () => {
      const results = backend.search({ query: 'xyznomatch', limit: 10 });
      expect(results).toHaveLength(0);
    });

    it('combines query with kind filter', () => {
      // 'product' matches both collection:products and action:export (description: 'Bulk export action')? no.
      // 'products' matches collection:products (name) and action:export (name 'Export Products' → 'products' token)
      const results = backend.search({ query: 'products', kinds: ['collection'], limit: 10 });
      expect(results.every((n) => n.kind === 'collection')).toBe(true);
    });

    it('respects limit on scored results', () => {
      const results = backend.search({ query: 'test', limit: 1 });
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('handles punctuation in query (normalizer strips non-alphanumeric)', () => {
      const results = backend.search({ query: 'mongo!!!', limit: 10 });
      expect(results.map((n) => n.id)).toContain('collection:products');
    });
  });
});
