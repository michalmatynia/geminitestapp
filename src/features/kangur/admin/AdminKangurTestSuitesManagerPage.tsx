'use client';

import React, { useCallback, useMemo } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree';
import { FolderTreeSearchBar, useMasterFolderTreeSearch } from '@/features/foldertree';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import {
  FolderTreePanel,
  Skeleton,
} from '@/features/kangur/shared/ui';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import {
  KANGUR_GRID_ROOMY_CLASSNAME,
  KANGUR_STACK_ROOMY_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  canonicalizeKangurTestSuites,
  KANGUR_TEST_SUITE_SORT_ORDER_GAP,
} from '../test-suites';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminWorkspaceIntroCard } from './components/KangurAdminWorkspaceIntroCard';
import { renderKangurTestSuiteMetricsGrid } from './components/KangurTestSuiteMetricsGrid';
import { TestSuiteTreeRow } from './components/TestSuiteTreeRow';
import {
  buildKangurTestSuiteCatalogMasterNodes,
  buildKangurTestSuiteMasterNodes,
  resolveKangurTestSuiteOrderFromNodes,
} from './kangur-test-suites-master-tree';

import { TestSuitesManagerProvider, useTestSuitesManager } from './test-suites-manager/test-suites-manager.context';
import { useTestSuitesManagerLogic } from './test-suites-manager/test-suites-manager.logic';
import { TestSuitesModals } from './test-suites-manager/TestSuitesModals';
import { TestSuiteLibraryHeader } from './test-suites-manager/TestSuiteLibraryHeader';
import { LibraryStatusSidebar } from './test-suites-manager/LibraryStatusSidebar';
import { QuestionsManagerWorkspace } from './test-suites-manager/QuestionsManagerWorkspace';
import { GroupMetadataPanel } from './test-suites-manager/GroupMetadataPanel';
import { ORDERED_TREE_INSTANCE, CATALOG_TREE_INSTANCE } from './test-suites-manager/test-suites-manager.contracts';

function TestSuitesManagerInner({ standalone }: { standalone: boolean }) {
  const isStandalone = standalone;
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const state = useTestSuitesManager();
  const logic = useTestSuitesManagerLogic(settingsStore);

  const activeTreeInstance = state.treeMode === 'catalog' ? CATALOG_TREE_INSTANCE : ORDERED_TREE_INSTANCE;

  const masterNodes = useMemo(
    () =>
      state.treeMode === 'catalog'
        ? buildKangurTestSuiteCatalogMasterNodes(logic.suites, logic.groupTitleBySuiteId)
        : buildKangurTestSuiteMasterNodes(logic.suites),
    [logic.groupTitleBySuiteId, state.treeMode, logic.suites]
  );

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (transaction): Promise<void> => {
          if (state.treeMode === 'catalog') return;
          const internalAdapter = createMasterFolderTreeTransactionAdapter({ onApply: () => {} });
          const applied = await internalAdapter.apply(transaction, {
            tx: transaction,
            preparedAt: Date.now(),
          });
          if (!applied?.nodes) return;
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
    [state.treeMode, logic.suiteById, logic.suites, updateSetting]
  );

  const {
    controller,
    capabilities,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({ instance: activeTreeInstance, nodes: masterNodes, adapter });

  const searchState = useMasterFolderTreeSearch(masterNodes, state.searchQuery, {
    config: capabilities.search,
  });

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <TestSuiteTreeRow
        input={input}
        suiteById={logic.suiteById}
        groupTitleBySuiteId={logic.groupTitleBySuiteId}
        questionCountBySuiteId={logic.questionCountBySuiteId}
        suiteHealthById={logic.suiteHealthById}
        onEditGroup={(title) => {
          state.setEditingGroupOriginalTitle(title);
          state.setGroupTitle(title);
          state.setGroupDescription(logic.groupById.get(title)?.description ?? '');
        }}
        onDeleteGroup={state.setGroupToDeleteTitle}
        onMoveSuiteToGroup={(suite) => {
          state.setSuiteToMove(suite);
          state.setSuiteMoveTargetGroupTitle(logic.groupTitleBySuiteId.get(suite.id) ?? '');
        }}
        onEdit={logic.openEditModal}
        onManageQuestions={(suite) => logic.openQuestionsManager(suite)}
        onGoLive={(suite) => {
          void logic.handleGoLiveSuite(suite);
        }}
        onTakeOffline={(suite) => {
          void logic.handleTakeSuiteOffline(suite);
        }}
        onPublishReady={(suite) => {
          void logic.handlePublishReadyForSuite(suite);
        }}
        onReviewQueue={(suite) =>
          logic.openQuestionsManager(suite, {
            sortMode: 'review-queue',
          })
        }
        onDelete={state.setSuiteToDelete}
        isUpdating={logic.isUpdating}
      />
    ),
    [
      logic.handleGoLiveSuite,
      logic.handleTakeSuiteOffline,
      logic.handlePublishReadyForSuite,
      logic.groupTitleBySuiteId,
      logic.openQuestionsManager,
      logic.openEditModal,
      logic.questionCountBySuiteId,
      logic.suiteById,
      logic.suiteHealthById,
      logic.isUpdating,
      state.setGroupToDeleteTitle,
      state.setSuiteToDelete,
    ]
  );

  if (state.managingSuite) {
    return <QuestionsManagerWorkspace standalone={isStandalone} />;
  }

  const mainWorkspace = (
    <div className={`${KANGUR_STACK_ROOMY_CLASSNAME} h-full overflow-hidden`}>
      <KangurAdminWorkspaceIntroCard
        title='Question bank'
        description='Manage Kangur test suites with the same editorial health model used inside the question workspace. Review-fix pressure and live publish readiness are visible before you open each suite.'
        badge='Shared triage'
      />

      {renderKangurTestSuiteMetricsGrid({
        libraryHealthSummary: logic.libraryHealthSummary,
        groupCount: logic.groups.length,
      })}

      <GroupMetadataPanel />

      <FolderTreePanel
        className='min-h-0 flex-1'
        header={
          <div className='space-y-4'>
            <TestSuiteLibraryHeader />

            {capabilities.search.enabled ? (
              <div className='rounded-2xl border border-border/60 bg-card/25 p-4'>
                <FolderTreeSearchBar
                  value={state.searchQuery}
                  onChange={state.setSearchQuery}
                  placeholder='Search suites...'
                />
              </div>
            ) : null}
          </div>
        }
      >
        {settingsStore.isLoading ? (
          <div className='space-y-2 p-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : (
          <div className='min-h-0 flex-1 overflow-auto p-2'>
            <FolderTreeViewportV2
              controller={controller}
              scrollToNodeRef={scrollToNodeRef}
              searchState={searchState}
              rootDropUi={state.treeMode === 'catalog' ? { ...rootDropUi, enabled: false } : rootDropUi}
              renderNode={renderNode}
              enableDnd={state.treeMode !== 'catalog' && !logic.isUpdating}
              emptyLabel='No test suites yet. Add the first suite or import legacy data.'
            />
          </div>
        )}
      </FolderTreePanel>

      <TestSuitesModals />
    </div>
  );

  const content = standalone ? (
    <div
      className={`${KANGUR_GRID_ROOMY_CLASSNAME} xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]`}
    >
      <div className='min-h-0'>{mainWorkspace}</div>
      <LibraryStatusSidebar />
    </div>
  ) : (
    mainWorkspace
  );

  if (!standalone) {
    return content;
  }

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

export function AdminKangurTestSuitesManagerPage({
  standalone = true,
}: {
  standalone?: boolean;
}): React.JSX.Element {
  const isStandalone = standalone;

  return (
    <TestSuitesManagerProvider>
      <TestSuitesManagerInner standalone={isStandalone} />
    </TestSuitesManagerProvider>
  );
}
