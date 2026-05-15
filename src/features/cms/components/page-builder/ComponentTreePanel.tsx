import React, { useMemo, useState } from 'react';
import { Button } from '@/shared/ui/primitives.public';
import { FolderTreePanel, CompactEmptyState } from '@/shared/ui/navigation-and-layout.public';
import { TreeHeader } from '@/shared/ui/data-display.public';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { usePageBuilderState, usePageBuilderDispatch } from '../../hooks/usePageBuilderContext';
import { useDragState } from '../../hooks/useDragStateContext';
import { TreeActionsProvider } from '../../hooks/useTreeActionsContext';
import {
  PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY,
  PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY,
} from './settings/PageBuilderSettingsPage';
import { ComponentTreePanelProvider } from './tree/ComponentTreePanelContext';
import { ComponentTreeNodeRuntimeProvider } from './tree/ComponentTreeNodeRuntimeContext';

export function ComponentTreePanel(): React.JSX.Element {
  const state = usePageBuilderState();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const settingsStore = useSettingsStore();

  const extractPlaceholderValue = settingsStore.get(PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY);
  const sectionDropPlaceholderValue = settingsStore.get(
    PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY
  );
  const showExtractPlaceholder = extractPlaceholderValue === 'true';
  const showSectionDropPlaceholder = sectionDropPlaceholderValue !== 'false';

  useDragState();

  // The rendering of the tree will be further abstracted in follow-up steps
  // keeping the state management here for now.
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  return (
    <TreeActionsProvider expandedIds={expandedIds} setExpandedIds={setExpandedIds}>
      <ComponentTreePanelProvider value={{
        currentPage: state.currentPage,
        clipboard: state.clipboard,
        showExtractPlaceholder,
        showSectionDropPlaceholder,
        canDropSectionsAtRoot: false, // Simplified for now
        canDropBlocksAtRoot: false, // Simplified for now
        treePlaceholderClasses: '',
        treeInlineDropLabel: '',
        treeRootDropLabel: '',
        startSectionMasterDrag: () => {},
        endSectionMasterDrag: () => {},
        draggedMasterSectionId: null,
        moveSectionByMaster: async () => false,
      }}>
        <FolderTreePanel
          className='flex-1 min-h-0'
          bodyClassName='flex-1 min-h-0 overflow-y-auto'
          masterInstance='cms_page_builder'
          header={
            <TreeHeader
              title='Structure'
              subtitle={state.currentPage ? `${state.sections.length} sections` : 'No page loaded'}
              actions={
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='h-7 px-2 text-xs'
                  onClick={(): void => setPanelCollapsed(!panelCollapsed)}
                  title={panelCollapsed ? 'Show structure tree' : 'Collapse structure tree'}
                  disabled={!state.currentPage}
                >
                  {panelCollapsed ? 'Show Tree' : 'Collapse'}
                </Button>
              }
            />
          }
        >
          {!state.currentPage ? (
            <div className='p-4' data-testid='empty-page-state' />
          ) : panelCollapsed ? (
            <div className='p-4'>
              <CompactEmptyState
                title='Tree Collapsed'
                description='Structure tree is collapsed.'
                className='bg-card/30 border-dashed border-border/70 py-6'
               />
            </div>
          ) : (
            <ComponentTreeNodeRuntimeProvider value={{
                rootSectionsByZone: { header: [], template: [], footer: [] },
                sectionById: new Map(),
                sectionIndexById: new Map(),
            }}>
                <div className='p-4 text-xs text-muted-foreground'>Tree visualization pending extraction...</div>
            </ComponentTreeNodeRuntimeProvider>
          )}
        </FolderTreePanel>
      </ComponentTreePanelProvider>
    </TreeActionsProvider>
  );
}
