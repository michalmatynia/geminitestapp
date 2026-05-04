'use client';

import React, { useCallback, useMemo } from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/v2/components/types';
import {
  createMasterFolderTreeTransactionAdapter,
  useMasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import {
  KANGUR_GRID_ROOMY_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  canonicalizeKangurTestSuites,
  KANGUR_TEST_SUITE_SORT_ORDER_GAP,
} from '../test-suites';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { TestSuiteTreeRow } from './components/TestSuiteTreeRow';
import {
  buildKangurTestSuiteCatalogMasterNodes,
  buildKangurTestSuiteMasterNodes,
  resolveKangurTestSuiteOrderFromNodes,
} from './kangur-test-suites-master-tree';

import { TestSuitesManagerProvider, useTestSuitesManager } from './test-suites-manager/test-suites-manager.context';
import { useTestSuitesManagerLogic } from './test-suites-manager/test-suites-manager.logic';
import { LibraryStatusSidebar } from './test-suites-manager/LibraryStatusSidebar';
import { QuestionsManagerWorkspace } from './test-suites-manager/QuestionsManagerWorkspace';
import { ORDERED_TREE_INSTANCE, CATALOG_TREE_INSTANCE } from './test-suites-manager/test-suites-manager.contracts';

import { MainWorkspace } from './test-suites-manager/MainWorkspace';
import { useMasterFolderTreeSearch } from '@/shared/lib/foldertree/public';

function useTestSuitesTreeAdapter(
  treeMode: string,
  logic: ReturnType<typeof useTestSuitesManagerLogic>,
  updateSetting: ReturnType<typeof useUpdateSetting>
): ReturnType<typeof createMasterFolderTreeTransactionAdapter> {
  return useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (transaction): Promise<void> => {
          if (treeMode === 'catalog') return;
          const internalAdapter = createMasterFolderTreeTransactionAdapter({ onApply: () => {} });
          const applied = await internalAdapter.apply(transaction, {
            tx: transaction,
            preparedAt: Date.now(),
          });
          if (applied?.nodes === undefined) return;
          const nextOrder = resolveKangurTestSuiteOrderFromNodes(applied.nodes, logic.suiteById);
          const nextSuites = canonicalizeKangurTestSuites(
            logic.suites.map((suite: KangurTestSuite) => ({
              ...suite,
              sortOrder:
                (nextOrder.findIndex((ns) => ns.id === suite.id) + 1) *
                KANGUR_TEST_SUITE_SORT_ORDER_GAP,
            }))
          );
          await updateSetting.mutateAsync({
            key: KANGUR_TEST_SUITES_SETTING_KEY,
            value: serializeSetting(nextSuites),
          });
        },
      }),
    [treeMode, logic.suiteById, logic.suites, updateSetting]
  );
}

function useTestSuiteTreeRenderer(
  logic: ReturnType<typeof useTestSuitesManagerLogic>,
  state: ReturnType<typeof useTestSuitesManager>
): (input: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const handleEditGroup = useCallback((title: string) => {
    state.setEditingGroupOriginalTitle(title);
    state.setGroupTitle(title);
    state.setGroupDescription(logic.groupById.get(title)?.description ?? '');
  }, [state, logic.groupById]);

  const handleMoveSuite = useCallback((suite: KangurTestSuite) => {
    state.setSuiteToMove(suite);
    state.setSuiteMoveTargetGroupTitle(logic.groupTitleBySuiteId.get(suite.id) ?? '');
  }, [state, logic.groupTitleBySuiteId]);

  return useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <TestSuiteTreeRow
        input={input}
        suiteById={logic.suiteById}
        groupTitleBySuiteId={logic.groupTitleBySuiteId}
        questionCountBySuiteId={logic.questionCountBySuiteId}
        suiteHealthById={logic.suiteHealthById}
        onEditGroup={handleEditGroup}
        onDeleteGroup={state.setGroupToDeleteTitle}
        onMoveSuiteToGroup={handleMoveSuite}
        onEdit={logic.openEditModal}
        onManageQuestions={(s) => logic.openQuestionsManager(s)}
        onGoLive={(s) => { void logic.handleGoLiveSuite(s); }}
        onTakeOffline={(s) => { void logic.handleTakeSuiteOffline(s); }}
        onPublishReady={(s) => { void logic.handlePublishReadyForSuite(s); }}
        onReviewQueue={(s) => logic.openQuestionsManager(s, { sortMode: 'review-queue' })}
        onDelete={state.setSuiteToDelete}
        isUpdating={logic.isUpdating}
      />
    ),
    [logic, state, handleEditGroup, handleMoveSuite]
  );
}

function TestSuitesManagerLayout({
  standalone,
  content,
}: {
  standalone: boolean;
  content: React.ReactNode;
}): React.JSX.Element {
  if (!standalone) return <>{content}</>;

  return (
    <KangurAdminContentShell
      title='Kangur Tests'
      description='Create and manage test suites with questions, illustrations, and scoring.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Tests' },
      ]}
      className='h-full'
      panelClassName='flex h-full min-h-0 flex-col'
      contentClassName='flex min-h-0 flex-1 flex-col'
    >
      {content}
    </KangurAdminContentShell>
  );
}

function TestSuitesManagerInner({ standalone }: { standalone: boolean }): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const state = useTestSuitesManager();
  const logic = useTestSuitesManagerLogic(settingsStore);
  const updateSetting = useUpdateSetting();
  const activeTreeInstance = state.treeMode === 'catalog' ? CATALOG_TREE_INSTANCE : ORDERED_TREE_INSTANCE;

  const masterNodes = useMemo(() =>
    state.treeMode === 'catalog'
      ? buildKangurTestSuiteCatalogMasterNodes(logic.suites, logic.groupTitleBySuiteId)
      : buildKangurTestSuiteMasterNodes(logic.suites),
    [logic.groupTitleBySuiteId, state.treeMode, logic.suites]
  );

  const adapter = useTestSuitesTreeAdapter(state.treeMode, logic, updateSetting);
  const { controller, capabilities, appearance: { rootDropUi }, viewport: { scrollToNodeRef } } =
    useMasterFolderTreeShell({ instance: activeTreeInstance, nodes: masterNodes, adapter });

  const searchState = useMasterFolderTreeSearch(masterNodes, state.searchQuery, {
    config: capabilities.search,
  });

  const renderNode = useTestSuiteTreeRenderer(logic, state);

  if (state.managingSuite) return <QuestionsManagerWorkspace standalone={standalone} />;

  const workspace = (
    <MainWorkspace
      logic={logic} state={state} controller={{ ...controller, capabilities }}
      scrollToNodeRef={scrollToNodeRef} searchState={searchState}
      rootDropUi={rootDropUi} renderNode={renderNode} settingsStore={settingsStore}
    />
  );

  const content = standalone ? (
    <div className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]`}>
      <div className='min-h-0'>{workspace}</div>
      <LibraryStatusSidebar />
    </div>
  ) : workspace;

  return <TestSuitesManagerLayout standalone={standalone} content={content} />;
}

export function AdminKangurTestSuitesManagerPage({
  standalone = true,
}: {
  standalone?: boolean;
}): React.JSX.Element {
  return (
    <TestSuitesManagerProvider>
      <TestSuitesManagerInner standalone={standalone} />
    </TestSuitesManagerProvider>
  );
}
