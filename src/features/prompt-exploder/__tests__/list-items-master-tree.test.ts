import { describe, expect, it } from 'vitest';

import {
  buildPromptExploderMasterNodes as buildPromptExploderListItemMasterNodes,
  rebuildPromptExploderListFromMasterNodes as rebuildPromptExploderListItemsFromMasterNodes,
} from '@/features/prompt-exploder/hierarchy-master-tree';
import type { PromptExploderListItem } from '@/features/prompt-exploder/types';

const createItem = (
  id: string,
  text: string,
  children: PromptExploderListItem[] = []
): PromptExploderListItem => ({
  id,
  text,
  logicalOperator: null,
  logicalConditions: [],
  referencedParamPath: null,
  referencedComparator: null,
  referencedValue: null,
  children,
});

describe('list-items-master-tree', () => {
  it('rebuilds nested children after a cross-parent move', () => {
    const items = [
      createItem('item-a', 'A', [createItem('item-a1', 'A1')]),
      createItem('item-b', 'B'),
    ];
    const nodes = buildPromptExploderListItemMasterNodes(items);
    const movedNodes = nodes.map((node) => {
      if (node.metadata && node.id.endsWith('item-b')) {
        return {
          ...node,
          parentId: nodes[0]!.id,
          sortOrder: 1,
        };
      }
      return node;
    });

    const rebuilt = rebuildPromptExploderListItemsFromMasterNodes({
      nodes: movedNodes,
      previousItems: items,
    });

    expect(rebuilt).toHaveLength(1);
    expect(rebuilt[0]?.children.map((item) => item.id)).toEqual(['item-a1', 'item-b']);
  });
});
