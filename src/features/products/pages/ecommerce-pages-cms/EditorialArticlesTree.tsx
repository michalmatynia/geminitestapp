'use client';

import { useCallback, useMemo, useState } from 'react';

import { type EditorialArticleState } from './editorial-articles-cms.client';
import {
  MasterFolderTreeViewport,
  type MasterFolderTreeViewModel,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const VISIBLE_GROUP_NODE_ID = 'editorial-articles:visible';
const HIDDEN_GROUP_NODE_ID = 'editorial-articles:hidden';
const EXPANDED_GROUP_NODE_IDS = [VISIBLE_GROUP_NODE_ID, HIDDEN_GROUP_NODE_ID];

export const getEditorialArticleNodeId = (index: number): string => `editorial-article:${index}`;

const parseEditorialArticleNodeId = (nodeId: string | null | undefined): number | null => {
  if (typeof nodeId !== 'string' || !nodeId.startsWith('editorial-article:')) return null;
  const index = Number(nodeId.slice('editorial-article:'.length));
  return Number.isInteger(index) && index >= 0 ? index : null;
};

const createGroupNode = (id: string, name: string, sortOrder: number): MasterTreeNode => ({
  id,
  type: 'folder',
  kind: 'editorial_article_group',
  parentId: null,
  name,
  path: id,
  sortOrder,
});

const createArticleNode = (article: EditorialArticleState, index: number): MasterTreeNode => ({
  id: getEditorialArticleNodeId(index),
  type: 'file',
  kind: 'ecommerce_editorial_article',
  parentId: article.visible ? VISIBLE_GROUP_NODE_ID : HIDDEN_GROUP_NODE_ID,
  name: article.title.trim().length > 0 ? article.title : `Article ${index + 1}`,
  path: `${article.visible ? 'visible' : 'hidden'}/${article.id}`,
  sortOrder: index,
  metadata: {
    _status: article.visible ? 'success' : 'warning',
    articleIndex: index,
    href: article.href,
    tag: article.tag,
  },
});

const buildEditorialArticleNodes = (articles: EditorialArticleState[]): MasterTreeNode[] => [
  createGroupNode(VISIBLE_GROUP_NODE_ID, 'Visible on home', 0),
  createGroupNode(HIDDEN_GROUP_NODE_ID, 'Hidden', 1),
  ...articles.map(createArticleNode),
];

const resolveSelectedIndex = (
  articles: EditorialArticleState[],
  selectedNodeId: string | null
): number | null => {
  const selectedIndex = parseEditorialArticleNodeId(selectedNodeId);
  if (selectedIndex === null) return null;
  return selectedIndex < articles.length ? selectedIndex : null;
};

export function useEditorialArticlesTree(articles: EditorialArticleState[]): {
  selectedIndex: number | null;
  selectArticleIndex: (index: number) => void;
  tree: MasterFolderTreeViewModel;
} {
  const [requestedNodeId, setRequestedNodeId] = useState<string | null>(null);
  const nodes = useMemo(() => buildEditorialArticleNodes(articles), [articles]);
  const defaultSelectedNodeId = articles.length > 0 ? getEditorialArticleNodeId(0) : null;
  const tree = useMasterFolderTreeViewModel({
    instance: 'ecommerce_editorial_articles',
    nodes,
    selectedNodeId: requestedNodeId ?? defaultSelectedNodeId,
    initiallyExpandedNodeIds: EXPANDED_GROUP_NODE_IDS,
  });
  const selectArticleIndex = useCallback((index: number): void => {
    const nodeId = getEditorialArticleNodeId(index);
    setRequestedNodeId(nodeId);
    tree.controller.selectNode(nodeId);
  }, [tree.controller]);

  return {
    selectedIndex: resolveSelectedIndex(articles, tree.controller.selectedNodeId),
    selectArticleIndex,
    tree,
  };
}

export function EditorialArticlesTreePanel({
  articleCount,
  tree,
}: {
  articleCount: number;
  tree: MasterFolderTreeViewModel;
}): React.JSX.Element {
  return (
    <FolderTreePanel
      className='min-h-80 rounded-md border bg-card/30 p-2'
      bodyClassName='space-y-0.5'
      masterInstance='ecommerce_editorial_articles'
      header={
        <div className='mb-2 flex items-center justify-between gap-3 px-1'>
          <div className='text-sm font-medium'>Lore articles</div>
          <div className='text-xs text-muted-foreground'>{articleCount} articles</div>
        </div>
      }
    >
      <MasterFolderTreeViewport
        tree={tree}
        enableDnd={false}
        emptyLabel='No lore articles'
        className='space-y-0.5'
      />
    </FolderTreePanel>
  );
}
