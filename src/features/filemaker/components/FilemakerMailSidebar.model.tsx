'use client';

import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useMemo, useState } from 'react';

import { useMasterFolderTreeShell } from '@/shared/lib/foldertree/public';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { buildFilemakerMailMasterNodes } from '../mail-master-tree';
import { useOptionalMailPageContext } from '../pages/FilemakerMail.context';
import { useSidebarFilterActions, useSidebarSelectionActions } from './FilemakerMailSidebar.actions';
import { useSidebarContextValue } from './FilemakerMailSidebar.context-value';
import { useFilemakerMailData } from './FilemakerMailSidebar.hooks';
import { buildSidebarModel } from './FilemakerMailSidebar.model-output';
import { resolveFilters, resolveSelection } from './FilemakerMailSidebar.selection';
import { resolveInitiallyExpandedNodeIds, resolveSelectedNodeId } from './FilemakerMailSidebar.tree';
import type {
  FilemakerMailSidebarData,
  FilemakerMailSidebarFilters,
  FilemakerMailSidebarModel,
  FilemakerMailSidebarPageContext,
  FilemakerMailSidebarProps,
  FilemakerMailSidebarSelection,
  FilemakerMailTreeShell,
} from './FilemakerMailSidebar.types';
import { FilemakerMailSidebarNode } from './FilemakerMailSidebarNode';

type SidebarResolvedState = {
  data: FilemakerMailSidebarData;
  filters: FilemakerMailSidebarFilters;
  pageContext: FilemakerMailSidebarPageContext;
  selection: FilemakerMailSidebarSelection;
  setStatusUpdatingAccountId: (id: string | null) => void;
  statusUpdatingAccountId: string | null;
};

type SidebarTreeModel = {
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.JSX.Element;
  treeShell: FilemakerMailTreeShell;
  visibleRecentThreads: FilemakerMailSidebarData['recentThreads'];
};

type SidebarContextFlags = {
  effectiveSearchAccountId: string | null;
  isRecentContext: boolean;
  isSearchContext: boolean;
};

type SidebarContextActions = {
  onAccountUpdated: NonNullable<Parameters<typeof useSidebarContextValue>[0]>['onAccountUpdated'];
  onNewMailbox: NonNullable<Parameters<typeof useSidebarContextValue>[0]>['onNewMailbox'];
  onSelectAccount: NonNullable<Parameters<typeof useSidebarContextValue>[0]>['onSelectAccount'];
  onSelectAccountSettings: NonNullable<Parameters<typeof useSidebarContextValue>[0]>['onSelectAccountSettings'];
  onSelectAttention: NonNullable<Parameters<typeof useSidebarContextValue>[0]>['onSelectAttention'];
  onSelectFolder: NonNullable<Parameters<typeof useSidebarContextValue>[0]>['onSelectFolder'];
  onSelectRecent: NonNullable<Parameters<typeof useSidebarContextValue>[0]>['onSelectRecent'];
  onSelectSearch: NonNullable<Parameters<typeof useSidebarContextValue>[0]>['onSelectSearch'];
};

const withFallback = <Value,>(value: Value | undefined, fallback: Value): Value => value ?? fallback;

const isPanelContext = (
  selection: FilemakerMailSidebarSelection,
  panel: 'recent' | 'search'
): boolean => selection.panel === panel || selection.originPanel === panel;

const resolveEffectiveSearchAccountId = (
  filters: FilemakerMailSidebarFilters,
  isSearchContext: boolean,
  selection: FilemakerMailSidebarSelection
): string | null => {
  if (isSearchContext) return filters.searchContextAccountId;
  return selection.accountId;
};

const resolveContextFlags = (
  filters: FilemakerMailSidebarFilters,
  selection: FilemakerMailSidebarSelection
): SidebarContextFlags => {
  const isRecentContext = isPanelContext(selection, 'recent');
  const isSearchContext = isPanelContext(selection, 'search');
  return {
    effectiveSearchAccountId: resolveEffectiveSearchAccountId(filters, isSearchContext, selection),
    isRecentContext,
    isSearchContext,
  };
};

const resolveOnNewMailbox = (
  propsActions: FilemakerMailSidebarProps['actions'],
  pageContext: FilemakerMailSidebarPageContext
): SidebarContextActions['onNewMailbox'] => {
  const actions = propsActions ?? {};
  if (actions.onNewMailbox !== undefined) return actions.onNewMailbox;
  if (pageContext === null) return undefined;
  return pageContext.onNewMailbox;
};

const resolveContextActions = (input: {
  onNewMailbox: SidebarContextActions['onNewMailbox'];
  openSelection: ReturnType<typeof useSidebarSelectionActions>;
  pageContext: FilemakerMailSidebarPageContext;
  propsActions: FilemakerMailSidebarProps['actions'];
}): SidebarContextActions => {
  const actions = input.propsActions ?? {};
  return {
    onAccountUpdated: actions.onAccountUpdated,
    onNewMailbox: input.onNewMailbox,
    onSelectAccount: withFallback(actions.onSelectAccount, input.openSelection.openAccountSettings),
    onSelectAccountSettings: withFallback(
      actions.onSelectAccountSettings,
      input.openSelection.openAccountSettings
    ),
    onSelectAttention: withFallback(actions.onSelectAttention, input.openSelection.openAttentionPanel),
    onSelectFolder: withFallback(actions.onSelectFolder, input.openSelection.openFolder),
    onSelectRecent: withFallback(actions.onSelectRecent, input.openSelection.openRecentPanel),
    onSelectSearch: withFallback(
      actions.onSelectSearch,
      input.pageContext !== null ? input.openSelection.openSearchPanel : undefined
    ),
  };
};

const useResolvedSidebarData = (
  selection: FilemakerMailSidebarSelection,
  pageContext: FilemakerMailSidebarPageContext,
  refreshKey: number
): FilemakerMailSidebarData => {
  const fallbackData = useFilemakerMailData({
    enabled: pageContext === null,
    refreshKey,
    selectedAccountId: selection.accountId,
    selectedMailboxPath: selection.mailboxPath,
  });
  if (pageContext === null) return fallbackData;
  return {
    accounts: pageContext.accounts,
    fetchAccountsAndFolders: pageContext.loadNavigation,
    folders: pageContext.folders,
    isLoading: pageContext.isNavigationLoading,
    recentThreads: pageContext.recentPreviewThreads,
    setAccounts: pageContext.setAccounts,
    setSyncingAccountId: pageContext.setSyncingAccountId,
    syncingAccountId: pageContext.syncingAccountId,
    threads: pageContext.threads,
  };
};

const useSidebarResolvedState = ({
  filters: propsFilters,
  refreshKey = 0,
  selection: propsSelection,
}: FilemakerMailSidebarProps): SidebarResolvedState => {
  const pageContext = useOptionalMailPageContext();
  const selection = useMemo(
    () => resolveSelection(propsSelection, pageContext),
    [pageContext, propsSelection]
  );
  const filters = useMemo(() => resolveFilters(propsFilters, pageContext), [pageContext, propsFilters]);
  const data = useResolvedSidebarData(selection, pageContext, refreshKey);
  const [statusUpdatingAccountId, setStatusUpdatingAccountId] = useState<string | null>(null);
  return {
    data,
    filters,
    pageContext,
    selection,
    setStatusUpdatingAccountId,
    statusUpdatingAccountId,
  };
};

const useSidebarTreeModel = (input: {
  data: FilemakerMailSidebarData;
  selection: FilemakerMailSidebarSelection;
  statusUpdatingAccountId: string | null;
}): SidebarTreeModel => {
  const visibleRecentThreads = input.data.recentThreads;
  const treeNodes = useMemo(
    (): MasterTreeNode[] =>
      buildFilemakerMailMasterNodes({
        accounts: input.data.accounts,
        folders: input.data.folders,
        recentThreads: visibleRecentThreads,
        threads: input.data.threads,
      }),
    [input.data.accounts, input.data.folders, input.data.threads, visibleRecentThreads]
  );
  const selectedNodeId = resolveSelectedNodeId({
    originPanel: input.selection.originPanel,
    selectedAccountId: input.selection.accountId,
    selectedMailboxPath: input.selection.mailboxPath,
    selectedPanel: input.selection.panel,
    selectedThreadId: input.selection.threadId,
    statusUpdatingAccountId: input.statusUpdatingAccountId,
    syncingAccountId: input.data.syncingAccountId,
    treeNodes,
  });
  const initiallyExpandedNodeIds = resolveInitiallyExpandedNodeIds({
    accounts: input.data.accounts,
    selectedAccountId: input.selection.accountId,
    selectedMailboxPath: input.selection.mailboxPath,
    visibleRecentCount: visibleRecentThreads.length,
  });
  const treeShell = useMasterFolderTreeShell({
    initiallyExpandedNodeIds,
    instance: 'filemaker_mail',
    nodes: treeNodes,
    selectedNodeId,
  });
  const renderNode = useCallback(
    (renderInput: FolderTreeViewportRenderNodeInput): React.JSX.Element => (
      <FilemakerMailSidebarNode input={renderInput} />
    ),
    []
  );
  return { renderNode, treeShell, visibleRecentThreads };
};

export const useFilemakerMailSidebarModel = ({
  actions: propsActions,
  filters,
  refreshKey,
  selection,
}: FilemakerMailSidebarProps): FilemakerMailSidebarModel => {
  const router = useRouter();
  const state = useSidebarResolvedState({ actions: propsActions, filters, refreshKey, selection });
  const tree = useSidebarTreeModel({
    data: state.data,
    selection: state.selection,
    statusUpdatingAccountId: state.statusUpdatingAccountId,
  });
  const flags = resolveContextFlags(state.filters, state.selection);
  const openSelection = useSidebarSelectionActions({
    effectiveSearchAccountId: flags.effectiveSearchAccountId,
    pageContext: state.pageContext,
  });
  const filterActions = useSidebarFilterActions({
    filters: state.filters,
    pageContext: state.pageContext,
    router,
    selectedAccountId: state.selection.accountId,
  });
  const onNewMailbox = resolveOnNewMailbox(propsActions, state.pageContext);
  const contextActions = resolveContextActions({ onNewMailbox, openSelection, pageContext: state.pageContext, propsActions });
  const contextValue = useSidebarContextValue({
    data: state.data,
    effectiveSearchAccountId: flags.effectiveSearchAccountId,
    filters: state.filters,
    isSearchContext: flags.isSearchContext,
    ...contextActions,
    originPanel: state.selection.originPanel,
    selectedPanel: state.selection.panel,
    setStatusUpdatingAccountId: state.setStatusUpdatingAccountId,
    statusUpdatingAccountId: state.statusUpdatingAccountId,
  });
  return buildSidebarModel({
    contextValue,
    data: state.data,
    filterActions,
    filters: state.filters,
    isRecentContext: flags.isRecentContext,
    isSearchContext: flags.isSearchContext,
    onNewMailbox,
    renderNode: tree.renderNode,
    router,
    selection: state.selection,
    treeShell: tree.treeShell,
    visibleRecentThreads: tree.visibleRecentThreads,
  });
};
