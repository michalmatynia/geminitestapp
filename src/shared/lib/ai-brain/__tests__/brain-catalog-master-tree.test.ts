import { describe, expect, it } from 'vitest';

import type { AiBrainCatalogEntry } from '@/shared/lib/ai-brain/settings';
import {
  buildBrainCatalogMasterNodes,
  createBrainCatalogNodeEntryMap,
  resolveBrainCatalogOrderFromNodes,
  toBrainCatalogNodeId,
} from '@/shared/lib/ai-brain/components/brain-catalog-master-tree';

describe('brain catalog master tree mapping', () => {
  const entries: AiBrainCatalogEntry[] = [
    { pool: 'modelPresets', value: 'gpt-4o-mini' },
    { pool: 'paidModels', value: 'gpt-4.1' },
    { pool: 'ollamaModels', value: 'llama3.1' },
  ];

  it('maps entries to root-level file nodes', () => {
    const nodes = buildBrainCatalogMasterNodes(entries);
    expect(nodes).toHaveLength(3);
    expect(nodes.every((node) => node.type === 'file')).toBe(true);
    expect(nodes.every((node) => node.parentId === null)).toBe(true);
    expect(nodes.map((node) => node.id)).toEqual(
      entries.map((entry) => toBrainCatalogNodeId(entry))
    );
  });

  it('reconstructs reordered entry list from node order', () => {
    const nodes = buildBrainCatalogMasterNodes(entries);
    const entryByNodeId = createBrainCatalogNodeEntryMap(entries);

    const reorderedNodes = [
      { ...nodes[2]!, sortOrder: 1000 },
      { ...nodes[0]!, sortOrder: 2000 },
      { ...nodes[1]!, sortOrder: 3000 },
    ];

    expect(resolveBrainCatalogOrderFromNodes(reorderedNodes, entryByNodeId)).toEqual([
      entries[2],
      entries[0],
      entries[1],
    ]);
  });
});
