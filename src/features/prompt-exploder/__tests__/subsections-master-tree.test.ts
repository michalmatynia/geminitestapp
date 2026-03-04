import { describe, expect, it } from 'vitest';

import {
  buildPromptExploderSubsectionMasterNodes,
  rebuildPromptExploderSubsectionsFromMasterNodes,
} from '@/features/prompt-exploder/tree/subsections-master-tree';
import { toPromptExploderTreeNodeId } from '@/features/prompt-exploder/tree/types';
import type {
  PromptExploderListItem,
  PromptExploderSubsection,
} from '@/features/prompt-exploder/types';

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

const createSubsection = (
  id: string,
  title: string,
  items: PromptExploderListItem[] = []
): PromptExploderSubsection => ({
  id,
  title,
  code: null,
  condition: null,
  guidance: null,
  items,
});

describe('subsections-master-tree', () => {
  it('rebuilds reordered subsections from master nodes', () => {
    const subsections = [createSubsection('sub-a', 'A'), createSubsection('sub-b', 'B')];
    const nodes = buildPromptExploderSubsectionMasterNodes(subsections);
    const reorderedNodes = [nodes[1]!, nodes[0]!].map((node, index) => ({
      ...node,
      sortOrder: index,
    }));

    const rebuilt = rebuildPromptExploderSubsectionsFromMasterNodes({
      nodes: reorderedNodes,
      previousSubsections: subsections,
    });

    expect(rebuilt.map((subsection) => subsection.id)).toEqual(['sub-b', 'sub-a']);
  });

  it('moves subsection items across subsections through master-tree parent ids', () => {
    const subsections = [
      createSubsection('sub-a', 'A', [createItem('item-a1', 'A1')]),
      createSubsection('sub-b', 'B', []),
    ];
    const nodes = buildPromptExploderSubsectionMasterNodes(subsections);
    const movedNodes = nodes.map((node) => {
      if (node.id === toPromptExploderTreeNodeId('subsection_item', 'item-a1')) {
        return {
          ...node,
          parentId: toPromptExploderTreeNodeId('subsection', 'sub-b'),
          sortOrder: 0,
        };
      }
      return node;
    });

    const rebuilt = rebuildPromptExploderSubsectionsFromMasterNodes({
      nodes: movedNodes,
      previousSubsections: subsections,
    });

    expect(rebuilt[0]?.items).toEqual([]);
    expect(rebuilt[1]?.items?.map((item) => item.id)).toEqual(['item-a1']);
  });
});
