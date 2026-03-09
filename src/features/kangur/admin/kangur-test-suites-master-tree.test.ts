import { describe, expect, it } from 'vitest';

import {
  buildKangurTestSuiteCatalogMasterNodes,
  buildKangurTestSuiteMasterNodes,
  fromKangurTestSuiteNodeId,
  resolveKangurTestSuiteOrderFromNodes,
  toKangurTestSuiteNodeId,
} from '@/features/kangur/admin/kangur-test-suites-master-tree';
import { KANGUR_TEST_SUITE_SORT_ORDER_GAP } from '@/features/kangur/test-suites';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

const makeSuite = (overrides: Partial<KangurTestSuite> = {}): KangurTestSuite => ({
  id: 's1',
  title: 'Suite A',
  description: 'Desc A',
  year: 2024,
  gradeLevel: 'III–IV',
  category: 'matematyczny',
  enabled: true,
  publicationStatus: 'draft',
  sortOrder: 1000,
  ...overrides,
});

// ─── toKangurTestSuiteNodeId / fromKangurTestSuiteNodeId ─────────────────────

describe('toKangurTestSuiteNodeId / fromKangurTestSuiteNodeId', () => {
  it('round-trips a suiteId through node id encoding', () => {
    const nodeId = toKangurTestSuiteNodeId('suite-abc123');
    const restored = fromKangurTestSuiteNodeId(nodeId);
    expect(restored).toBe('suite-abc123');
  });

  it('node id has the expected prefix', () => {
    expect(toKangurTestSuiteNodeId('my-suite')).toMatch(/^kangur-test-suite:/);
  });

  it('returns null for a node id without the expected prefix', () => {
    expect(fromKangurTestSuiteNodeId('some-other-node:id')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(fromKangurTestSuiteNodeId('')).toBeNull();
  });

  it('returns null when prefix is present but suiteId portion is empty', () => {
    expect(fromKangurTestSuiteNodeId('kangur-test-suite:')).toBeNull();
  });
});

// ─── buildKangurTestSuiteMasterNodes ─────────────────────────────────────────

describe('buildKangurTestSuiteMasterNodes', () => {
  it('returns an empty array for no suites', () => {
    expect(buildKangurTestSuiteMasterNodes([])).toEqual([]);
  });

  it('returns one file node per suite', () => {
    const suites = [makeSuite({ id: 's1' }), makeSuite({ id: 's2' })];
    const nodes = buildKangurTestSuiteMasterNodes(suites);
    expect(nodes).toHaveLength(2);
    expect(nodes.every((n) => n.type === 'file')).toBe(true);
  });

  it('sorts nodes by sortOrder ascending and reassigns sortOrder with gap', () => {
    const suites = [
      makeSuite({ id: 's2', sortOrder: 3000 }),
      makeSuite({ id: 's1', sortOrder: 1000 }),
    ];
    const nodes = buildKangurTestSuiteMasterNodes(suites);
    expect(nodes[0]?.id).toBe(toKangurTestSuiteNodeId('s1'));
    expect(nodes[0]?.sortOrder).toBe(KANGUR_TEST_SUITE_SORT_ORDER_GAP);
    expect(nodes[1]?.sortOrder).toBe(KANGUR_TEST_SUITE_SORT_ORDER_GAP * 2);
  });

  it('uses suite title as node name', () => {
    const suites = [makeSuite({ id: 's1', title: 'Kangur 2024' })];
    const nodes = buildKangurTestSuiteMasterNodes(suites);
    expect(nodes[0]?.name).toBe('Kangur 2024');
  });

  it('nodes have no parent (top-level flat list)', () => {
    const suites = [makeSuite()];
    const nodes = buildKangurTestSuiteMasterNodes(suites);
    expect(nodes[0]?.parentId).toBeNull();
  });

  it('embeds suiteId, enabled, category in metadata', () => {
    const suites = [makeSuite({ id: 's1', enabled: false, category: 'training' })];
    const nodes = buildKangurTestSuiteMasterNodes(suites);
    const meta = nodes[0]?.metadata as Record<string, unknown>;
    const suiteMeta = meta?.['kangurTestSuite'] as Record<string, unknown>;
    expect(suiteMeta?.['suiteId']).toBe('s1');
    expect(suiteMeta?.['enabled']).toBe(false);
    expect(suiteMeta?.['category']).toBe('training');
  });
});

// ─── buildKangurTestSuiteCatalogMasterNodes ───────────────────────────────────

describe('buildKangurTestSuiteCatalogMasterNodes', () => {
  it('always emits two group folder nodes (enabled + disabled)', () => {
    const nodes = buildKangurTestSuiteCatalogMasterNodes([]);
    const folders = nodes.filter((n) => n.type === 'folder');
    expect(folders).toHaveLength(2);
    expect(folders.some((f) => f.name === 'Active suites')).toBe(true);
    expect(folders.some((f) => f.name === 'Disabled suites')).toBe(true);
  });

  it('places enabled suites under the "Active suites" folder', () => {
    const suites = [
      makeSuite({ id: 's-on', enabled: true }),
      makeSuite({ id: 's-off', enabled: false }),
    ];
    const nodes = buildKangurTestSuiteCatalogMasterNodes(suites);
    const activeFolder = nodes.find((n) => n.name === 'Active suites');
    const enabledFile = nodes.find((n) => n.id === toKangurTestSuiteNodeId('s-on'));
    expect(enabledFile?.parentId).toBe(activeFolder?.id);
  });

  it('places disabled suites under the "Disabled suites" folder', () => {
    const suites = [makeSuite({ id: 's-off', enabled: false })];
    const nodes = buildKangurTestSuiteCatalogMasterNodes(suites);
    const disabledFolder = nodes.find((n) => n.name === 'Disabled suites');
    const disabledFile = nodes.find((n) => n.id === toKangurTestSuiteNodeId('s-off'));
    expect(disabledFile?.parentId).toBe(disabledFolder?.id);
  });

  it('encodes suiteCount in the folder metadata', () => {
    const suites = [
      makeSuite({ id: 's1', enabled: true }),
      makeSuite({ id: 's2', enabled: true }),
      makeSuite({ id: 's3', enabled: false }),
    ];
    const nodes = buildKangurTestSuiteCatalogMasterNodes(suites);
    const activeFolder = nodes.find((n) => n.name === 'Active suites');
    const activeMeta = activeFolder?.metadata as Record<string, unknown>;
    const groupMeta = activeMeta?.['kangurTestSuiteGroup'] as Record<string, unknown>;
    expect(groupMeta?.['suiteCount']).toBe(2);
  });
});

// ─── resolveKangurTestSuiteOrderFromNodes ────────────────────────────────────

describe('resolveKangurTestSuiteOrderFromNodes', () => {
  const s1 = makeSuite({ id: 's1', sortOrder: 1000 });
  const s2 = makeSuite({ id: 's2', sortOrder: 2000 });
  const suiteById = new Map([
    ['s1', s1],
    ['s2', s2],
  ]);

  it('returns suites in the order defined by node sortOrder', () => {
    const nodes = buildKangurTestSuiteMasterNodes([s2, s1]);
    const result = resolveKangurTestSuiteOrderFromNodes(nodes, suiteById);
    expect(result[0]?.id).toBe('s1');
    expect(result[1]?.id).toBe('s2');
  });

  it('reassigns sortOrder with gap increments', () => {
    const nodes = buildKangurTestSuiteMasterNodes([s1, s2]);
    const result = resolveKangurTestSuiteOrderFromNodes(nodes, suiteById);
    expect(result[0]?.sortOrder).toBe(KANGUR_TEST_SUITE_SORT_ORDER_GAP);
    expect(result[1]?.sortOrder).toBe(KANGUR_TEST_SUITE_SORT_ORDER_GAP * 2);
  });

  it('ignores folder nodes and non-suite file nodes', () => {
    const nodes = [
      ...buildKangurTestSuiteMasterNodes([s1]),
      {
        id: 'kangur-test-suite-group:enabled',
        type: 'folder' as const,
        kind: 'group',
        parentId: null,
        name: 'Group',
        path: 'enabled',
        sortOrder: 500,
        metadata: {},
      },
    ];
    const result = resolveKangurTestSuiteOrderFromNodes(nodes, suiteById);
    expect(result.every((s) => s.id === 's1')).toBe(true);
  });

  it('falls back to suiteById order when no matching file nodes found', () => {
    const result = resolveKangurTestSuiteOrderFromNodes([], suiteById);
    expect(result).toHaveLength(2);
  });

  it('skips node ids that do not resolve to a known suite', () => {
    const nodes = buildKangurTestSuiteMasterNodes([s1, s2]);
    const partialMap = new Map([['s1', s1]]);
    const result = resolveKangurTestSuiteOrderFromNodes(nodes, partialMap);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('s1');
  });
});
