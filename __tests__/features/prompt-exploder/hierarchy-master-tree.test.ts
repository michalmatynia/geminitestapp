import { describe, expect, it } from 'vitest';

import {
  buildPromptExploderMasterNodes,
  rebuildPromptExploderListFromMasterNodes,
  removePromptExploderListItemById,
  toPromptExploderMasterNodeId,
  updatePromptExploderListItemById,
} from '@/features/prompt-exploder/hierarchy-master-tree';
import type { PromptExploderListItem } from '@/shared/contracts/prompt-exploder';

const SAMPLE_ITEMS: PromptExploderListItem[] = [
  {
    id: 'qa_r1',
    text: 'QA_R1 Relighting Applied',
    logicalOperator: 'if',
    logicalConditions: [
      {
        id: 'condition_1',
        paramPath: 'apply_studio_relighting',
        comparator: 'equals',
        value: true,
        joinWithPrevious: null,
      },
    ],
    referencedParamPath: 'apply_studio_relighting',
    referencedComparator: 'equals',
    referencedValue: true,
    children: [
      {
        id: 'qa_r1_pass',
        text: 'PASS if lighting is visibly different and realistic.',
        logicalOperator: null,
        logicalConditions: [],
        referencedParamPath: null,
        referencedComparator: null,
        referencedValue: null,
        children: [],
      },
      {
        id: 'qa_r1_fail',
        text: 'FAIL if only global exposure changed.',
        logicalOperator: null,
        logicalConditions: [],
        referencedParamPath: null,
        referencedComparator: null,
        referencedValue: null,
        children: [],
      },
    ],
  },
  {
    id: 'qa_r2',
    text: 'QA_R2 Relighting Coherence',
    logicalOperator: null,
    logicalConditions: [],
    referencedParamPath: null,
    referencedComparator: null,
    referencedValue: null,
    children: [],
  },
];

describe('prompt exploder hierarchy master tree adapter', () => {
  it('roundtrips hierarchy and logical metadata via master nodes', () => {
    const nodes = buildPromptExploderMasterNodes(SAMPLE_ITEMS);
    const roundtrip = rebuildPromptExploderListFromMasterNodes({
      nodes,
      previousItems: SAMPLE_ITEMS,
    });

    expect(roundtrip).toEqual(SAMPLE_ITEMS);
  });

  it('rebuilds list order from master node sort order', () => {
    const nodes = buildPromptExploderMasterNodes(SAMPLE_ITEMS).map((node) => {
      if (node.id === toPromptExploderMasterNodeId('qa_r1')) {
        return { ...node, sortOrder: 1 };
      }
      if (node.id === toPromptExploderMasterNodeId('qa_r2')) {
        return { ...node, sortOrder: 0 };
      }
      return node;
    });

    const rebuilt = rebuildPromptExploderListFromMasterNodes({
      nodes,
      previousItems: SAMPLE_ITEMS,
    });

    expect(rebuilt.map((item) => item.id)).toEqual(['qa_r2', 'qa_r1']);
    expect(rebuilt[1]?.children.map((item) => item.id)).toEqual(['qa_r1_pass', 'qa_r1_fail']);
  });

  it('updates and removes nested list items by id', () => {
    const updated = updatePromptExploderListItemById(
      SAMPLE_ITEMS,
      'qa_r1_fail',
      (item) => ({
        ...item,
        text: 'FAIL if relighting is missing.',
      })
    );
    expect(updated[0]?.children[1]?.text).toBe('FAIL if relighting is missing.');

    const removed = removePromptExploderListItemById(updated, 'qa_r1_pass');
    expect(removed[0]?.children.map((item) => item.id)).toEqual(['qa_r1_fail']);
  });
});
