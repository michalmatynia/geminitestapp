'use client';

import { useCallback, useMemo, useState } from 'react';

import { type CollectionCardState } from './collection-cards-cms.client';
import {
  MasterFolderTreeViewport,
  type MasterFolderTreeViewModel,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const VISIBLE_GROUP_NODE_ID = 'universe-cards:visible';
const HIDDEN_GROUP_NODE_ID = 'universe-cards:hidden';
const EXPANDED_GROUP_NODE_IDS = [VISIBLE_GROUP_NODE_ID, HIDDEN_GROUP_NODE_ID];

export const getUniverseCardNodeId = (index: number): string => `universe-card:${index}`;

const parseUniverseCardNodeId = (nodeId: string | null | undefined): number | null => {
  if (typeof nodeId !== 'string' || !nodeId.startsWith('universe-card:')) return null;
  const index = Number(nodeId.slice('universe-card:'.length));
  return Number.isInteger(index) && index >= 0 ? index : null;
};

const createGroupNode = (id: string, name: string, sortOrder: number): MasterTreeNode => ({
  id,
  type: 'folder',
  kind: 'universe_card_group',
  parentId: null,
  name,
  path: id,
  sortOrder,
});

const createCardNode = (card: CollectionCardState, index: number): MasterTreeNode => ({
  id: getUniverseCardNodeId(index),
  type: 'file',
  kind: 'ecommerce_universe_card',
  parentId: card.visible ? VISIBLE_GROUP_NODE_ID : HIDDEN_GROUP_NODE_ID,
  name: card.label.trim().length > 0 ? card.label : `Universe card ${index + 1}`,
  path: `${card.visible ? 'visible' : 'hidden'}/${card.id}`,
  sortOrder: index,
  metadata: {
    _status: card.visible ? 'success' : 'warning',
    cardIndex: index,
    href: card.href,
    imageUrl: card.imageUrl,
    selectorType: card.selectorType,
  },
});

const buildUniverseCardNodes = (cards: CollectionCardState[]): MasterTreeNode[] => [
  createGroupNode(VISIBLE_GROUP_NODE_ID, 'Visible on home', 0),
  createGroupNode(HIDDEN_GROUP_NODE_ID, 'Hidden', 1),
  ...cards.map(createCardNode),
];

const resolveSelectedIndex = (
  cards: CollectionCardState[],
  selectedNodeId: string | null
): number | null => {
  const selectedIndex = parseUniverseCardNodeId(selectedNodeId);
  if (selectedIndex === null) return null;
  return selectedIndex < cards.length ? selectedIndex : null;
};

export function useUniverseCardsTree(cards: CollectionCardState[]): {
  selectedIndex: number | null;
  selectCardIndex: (index: number) => void;
  tree: MasterFolderTreeViewModel;
} {
  const [requestedNodeId, setRequestedNodeId] = useState<string | null>(null);
  const nodes = useMemo(() => buildUniverseCardNodes(cards), [cards]);
  const defaultSelectedNodeId = cards.length > 0 ? getUniverseCardNodeId(0) : null;
  const tree = useMasterFolderTreeViewModel({
    instance: 'ecommerce_universe_cards',
    nodes,
    selectedNodeId: requestedNodeId ?? defaultSelectedNodeId,
    initiallyExpandedNodeIds: EXPANDED_GROUP_NODE_IDS,
  });
  const selectCardIndex = useCallback((index: number): void => {
    const nodeId = getUniverseCardNodeId(index);
    setRequestedNodeId(nodeId);
    tree.controller.selectNode(nodeId);
  }, [tree.controller]);

  return {
    selectedIndex: resolveSelectedIndex(cards, tree.controller.selectedNodeId),
    selectCardIndex,
    tree,
  };
}

export function UniverseCardsTreePanel({
  cardCount,
  tree,
}: {
  cardCount: number;
  tree: MasterFolderTreeViewModel;
}): React.JSX.Element {
  return (
    <FolderTreePanel
      className='min-h-80 rounded-md border bg-card/30 p-2'
      bodyClassName='space-y-0.5'
      masterInstance='ecommerce_universe_cards'
      header={
        <div className='mb-2 flex items-center justify-between gap-3 px-1'>
          <div className='text-sm font-medium'>Universe cards</div>
          <div className='text-xs text-muted-foreground'>{cardCount} cards</div>
        </div>
      }
    >
      <MasterFolderTreeViewport
        tree={tree}
        enableDnd={false}
        emptyLabel='No universe cards'
        className='space-y-0.5'
      />
    </FolderTreePanel>
  );
}
