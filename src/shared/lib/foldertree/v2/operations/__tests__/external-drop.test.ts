import { describe, expect, it } from 'vitest';

import { resolveRootTopReorderAnchor } from '@/shared/lib/foldertree/v2/operations/external-drop';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const rootNode = (id: string): Pick<MasterTreeNode, 'id'> => ({ id });

describe('external-drop', () => {
  it('resolves first root anchor excluding dragged entity', () => {
    const anchor = resolveRootTopReorderAnchor({
      roots: [rootNode('folder:alpha'), rootNode('folder:beta')],
      decodeNodeId: (nodeId: string): string | null =>
        nodeId.startsWith('folder:') ? nodeId.slice('folder:'.length) : null,
      draggedEntityId: 'beta',
    });

    expect(anchor).toBe('alpha');
  });

  it('returns null when no eligible root anchor exists', () => {
    const anchor = resolveRootTopReorderAnchor({
      roots: [rootNode('folder:beta')],
      decodeNodeId: (nodeId: string): string | null =>
        nodeId.startsWith('folder:') ? nodeId.slice('folder:'.length) : null,
      draggedEntityId: 'beta',
    });

    expect(anchor).toBeNull();
  });
});
