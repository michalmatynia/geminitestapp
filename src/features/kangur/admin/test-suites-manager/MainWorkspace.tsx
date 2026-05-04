'use client';

import React from 'react';
import type {
  MasterFolderTreeController,
  MasterFolderTreeSearchState,
} from '@/shared/contracts/master-folder-tree';
import type { MasterTreeId } from '@/shared/utils/master-folder-tree-contract';
import type { ResolvedFolderTreeSearchConfig } from '@/shared/utils/folder-tree-profiles-v2';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/v2/components/types';
import { FolderTreeViewportV2 } from '@/shared/lib/foldertree/v2/components/FolderTreeViewportV2';
import { FolderTreeSearchBar } from '@/shared/lib/foldertree/public';
import {
  FolderTreePanel,
  Skeleton,
} from '@/features/kangur/shared/ui';
import {
  KANGUR_STACK_ROOMY_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { renderKangurAdminWorkspaceIntroCard } from '../components/KangurAdminWorkspaceIntroCard';
import { renderKangurTestSuiteMetricsGrid } from '../components/KangurTestSuiteMetricsGrid';
import { TestSuiteLibraryHeader } from './TestSuiteLibraryHeader';
import { TestSuitesModals } from './TestSuitesModals';
import { GroupMetadataPanel } from './GroupMetadataPanel';
import type { TestSuitesManagerContextValue } from './test-suites-manager.context';
import type { SettingsStoreValue } from '@/features/kangur/shared/providers/SettingsStoreProvider';

import type { KangurTestLibraryHealthSummary } from '../test-suite-health';
import type { KangurTestGroup } from '@/features/kangur/shared/contracts/kangur-tests';

interface TestSuitesManagerLogic {
  libraryHealthSummary: KangurTestLibraryHealthSummary;
  groups: KangurTestGroup[];
  isUpdating: boolean;
}

function TestSuiteTreePanelSection({
  logic,
  state,
  controller,
  scrollToNodeRef,
  searchState,
  rootDropUi,
  renderNode,
  settingsStore,
}: {
  logic: TestSuitesManagerLogic;
  state: TestSuitesManagerContextValue;
  controller: MasterFolderTreeController & { capabilities: { search: ResolvedFolderTreeSearchConfig } };
  scrollToNodeRef: React.MutableRefObject<((nodeId: MasterTreeId) => void) | null>;
  searchState: MasterFolderTreeSearchState;
  rootDropUi: { label: string; idleClassName: string; activeClassName: string; enabled?: boolean };
  renderNode: (input: any) => any;
  settingsStore: SettingsStoreValue;
}): React.JSX.Element {
  const isCatalog = state.treeMode === 'catalog';

  return (
    <FolderTreePanel
      className='min-h-0 flex-1'
      header={
        <div className='space-y-4'>
          <TestSuiteLibraryHeader />

          {controller.capabilities.search.enabled === true && (
            <div className='rounded-2xl border border-border/60 bg-card/25 p-4'>
              <FolderTreeSearchBar
                value={state.searchQuery}
                onChange={state.setSearchQuery}
                placeholder='Search suites...'
              />
            </div>
          )}
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
            rootDropUi={isCatalog ? { ...rootDropUi, enabled: false } : rootDropUi}
            renderNode={renderNode}
            enableDnd={!isCatalog && !logic.isUpdating}
            emptyLabel='No test suites yet. Add the first suite or import legacy data.'
          />
        </div>
      )}
    </FolderTreePanel>
  );
}

export function MainWorkspace({
  logic,
  state,
  controller,
  scrollToNodeRef,
  searchState,
  rootDropUi,
  renderNode,
  settingsStore,
}: {
  logic: TestSuitesManagerLogic;
  state: TestSuitesManagerContextValue;
  controller: MasterFolderTreeController & { capabilities: { search: ResolvedFolderTreeSearchConfig } };
  scrollToNodeRef: React.MutableRefObject<((nodeId: MasterTreeId) => void) | null>;
  searchState: MasterFolderTreeSearchState;
  rootDropUi: { label: string; idleClassName: string; activeClassName: string; enabled?: boolean };
  renderNode: (input: any) => any;
  settingsStore: SettingsStoreValue;
}): React.JSX.Element {
  return (
    <div className={`${KANGUR_STACK_ROOMY_CLASSNAME} h-full overflow-hidden`}>
      {renderKangurAdminWorkspaceIntroCard({
        title: 'Question bank',
        description:
          'Manage Kangur test suites with the same editorial health model used inside the question workspace. Review-fix pressure and live publish readiness are visible before you open each suite.',
        badge: 'Shared triage',
      })}

      {renderKangurTestSuiteMetricsGrid({
        libraryHealthSummary: logic.libraryHealthSummary,
        groupCount: logic.groups.length,
      })}

      <GroupMetadataPanel />

      <TestSuiteTreePanelSection
        logic={logic}
        state={state}
        controller={controller}
        scrollToNodeRef={scrollToNodeRef}
        searchState={searchState}
        rootDropUi={rootDropUi}
        renderNode={renderNode}
        settingsStore={settingsStore}
      />

      <TestSuitesModals />
    </div>
  );
}

