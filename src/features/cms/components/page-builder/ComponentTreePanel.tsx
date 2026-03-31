'use client';

import React, { useMemo, useState } from 'react';

import { FolderTreeViewportV2, useMasterFolderTreeShell } from '@/shared/lib/foldertree/public';
import type { PageZone, SectionInstance } from '@/shared/contracts/cms';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, FolderTreePanel, TreeHeader, CompactEmptyState } from '@/shared/ui';
import { canNestTreeNodeV2, type MasterTreeNode } from '@/shared/utils';

import {
  PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY,
  PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY,
} from './settings/PageBuilderSettingsPage';
import { ComponentTreeNodeRenderer } from './tree/ComponentTreeNodeRenderer';
import {
  ComponentTreeNodeRuntimeProvider,
  type ComponentTreeNodeRuntimeContextValue,
} from './tree/ComponentTreeNodeRuntimeContext';
import {
  ComponentTreePanelProvider,
  type ComponentTreePanelContextValue,
} from './tree/ComponentTreePanelContext';
import {
  CMS_ZONE_ORDER,
  buildCmsMasterNodes,
  fromCmsSectionNodeId,
  toCmsSectionNodeId,
  toCmsZoneNodeId,
} from './utils/cms-master-tree';
import { createCmsMasterTreeAdapter } from './utils/cms-master-tree-adapter';
import { buildHierarchyIndexes } from '../../hooks/page-builder/section-hierarchy';
import { useDragState } from '../../hooks/useDragStateContext';
import { usePageBuilderState, usePageBuilderDispatch } from '../../hooks/usePageBuilderContext';
import { TreeActionsProvider } from '../../hooks/useTreeActionsContext';

export function ComponentTreePanel(): React.ReactNode {
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const settingsStore = useSettingsStore();

  const extractPlaceholderValue = settingsStore.get(PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY);
  const sectionDropPlaceholderValue = settingsStore.get(
    PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY
  );
  const showExtractPlaceholder = extractPlaceholderValue === 'true';
  const showSectionDropPlaceholder = sectionDropPlaceholderValue !== 'false';

  // Ensure drag state context is available.
  useDragState();

  const hierarchy = useMemo(() => buildHierarchyIndexes(state.sections), [state.sections]);
  const rootSectionsByZone = useMemo(() => {
    const grouped: Record<PageZone, SectionInstance[]> = {
      header: [],
      template: [],
      footer: [],
    };
    const rootIds = hierarchy.childrenByParent.get(null) ?? [];
    rootIds.forEach((sectionId: string) => {
      const section = hierarchy.nodeById.get(sectionId);
      if (!section) return;
      grouped[section.zone].push(section);
    });
    return grouped;
  }, [hierarchy.childrenByParent, hierarchy.nodeById]);

  const sectionById = useMemo(() => {
    const next = new Map<string, SectionInstance>();
    state.sections.forEach((section: SectionInstance) => {
      next.set(section.id, section);
    });
    return next;
  }, [state.sections]);

  const sectionIndexById = useMemo(() => {
    const next = new Map<string, number>();
    CMS_ZONE_ORDER.forEach((zone: PageZone) => {
      rootSectionsByZone[zone].forEach((section: SectionInstance, index: number) => {
        next.set(section.id, index);
      });
    });
    hierarchy.childrenByParent.forEach((sectionIds: string[], parentId: string | null) => {
      if (parentId === null) return;
      sectionIds.forEach((sectionId: string, index: number) => {
        next.set(sectionId, index);
      });
    });
    return next;
  }, [hierarchy.childrenByParent, rootSectionsByZone]);

  const masterNodes = useMemo(
    (): MasterTreeNode[] => buildCmsMasterNodes(state.sections),
    [state.sections]
  );
  const structureRevision = useMemo(
    () =>
      masterNodes
        .map((node: MasterTreeNode) => `${node.id}:${node.parentId ?? 'root'}:${node.sortOrder}`)
        .join('|'),
    [masterNodes]
  );
  const selectedMasterNodeId = useMemo((): string | null => {
    if (!state.selectedNodeId) return null;
    return sectionById.has(state.selectedNodeId) ? toCmsSectionNodeId(state.selectedNodeId) : null;
  }, [sectionById, state.selectedNodeId]);
  const initiallyExpandedZoneNodeIds = useMemo(
    () => CMS_ZONE_ORDER.map((zone: PageZone) => toCmsZoneNodeId(zone)),
    []
  );
  const applySectionMoveInTree = React.useCallback(
    (
      sectionId: string,
      toZone: PageZone,
      toParentSectionId: string | null,
      toIndex: number
    ): void => {
      dispatch({
        type: 'MOVE_SECTION_IN_TREE',
        sectionId,
        toZone,
        toParentSectionId: toParentSectionId ?? null,
        toIndex,
      });
    },
    [dispatch]
  );
  const cmsTreeAdapter = useMemo(
    () => createCmsMasterTreeAdapter(applySectionMoveInTree),
    [applySectionMoveInTree]
  );

  const {
    profile: treeProfile,
    appearance: { placeholderClasses: treePlaceholderClasses, rootDropUi: treeRootDropUi },
    controller: structureController,
    panel: { collapsed: panelCollapsed, setCollapsed: setPanelCollapsed },
  } = useMasterFolderTreeShell({
    instance: 'cms_page_builder',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    initiallyExpandedNodeIds: initiallyExpandedZoneNodeIds,
    externalRevision: structureRevision,
    adapter: cmsTreeAdapter,
  });
  const {
    moveNode: moveMasterNode,
    startDrag: startMasterDrag,
    clearDrag: clearMasterDrag,
  } = structureController;
  const draggedMasterSectionId = useMemo((): string | null => {
    const draggedNodeId = structureController.dragState?.draggedNodeId;
    if (!draggedNodeId) return null;
    return fromCmsSectionNodeId(draggedNodeId);
  }, [structureController.dragState?.draggedNodeId]);
  const startSectionMasterDrag = React.useCallback(
    (sectionId: string): void => {
      startMasterDrag(toCmsSectionNodeId(sectionId));
    },
    [startMasterDrag]
  );
  const endSectionMasterDrag = React.useCallback((): void => {
    clearMasterDrag();
  }, [clearMasterDrag]);
  const moveSectionByMaster = React.useCallback(
    async (
      sectionId: string,
      zone: PageZone,
      toIndex: number,
      toParentSectionId: string | null = null
    ): Promise<boolean> => {
      const targetParentNodeId = toParentSectionId
        ? toCmsSectionNodeId(toParentSectionId)
        : toCmsZoneNodeId(zone);
      const result = await moveMasterNode(
        toCmsSectionNodeId(sectionId),
        targetParentNodeId,
        toIndex
      );
      if (result.ok && toParentSectionId) {
        structureController.expandNode(targetParentNodeId);
      }
      return result.ok;
    },
    [moveMasterNode, structureController]
  );
  const canDropSectionsAtRoot = useMemo(
    () =>
      canNestTreeNodeV2({
        profile: treeProfile,
        nodeType: 'folder',
        nodeKind: 'section',
        targetType: 'root',
      }),
    [treeProfile]
  );
  const canDropBlocksAtRoot = useMemo(
    () =>
      canNestTreeNodeV2({
        profile: treeProfile,
        nodeType: 'file',
        nodeKind: 'block',
        targetType: 'root',
      }),
    [treeProfile]
  );

  const sectionCount = state.sections.length;
  const panelContextValue = useMemo<ComponentTreePanelContextValue>(
    () => ({
      currentPage: state.currentPage,
      clipboard: state.clipboard,
      showExtractPlaceholder,
      showSectionDropPlaceholder,
      canDropSectionsAtRoot,
      canDropBlocksAtRoot,
      treePlaceholderClasses,
      treeInlineDropLabel: treeProfile.placeholders.inlineDropLabel,
      treeRootDropLabel: treeRootDropUi.label,
      startSectionMasterDrag,
      endSectionMasterDrag,
      draggedMasterSectionId,
      moveSectionByMaster,
    }),
    [
      state.currentPage,
      state.clipboard,
      showExtractPlaceholder,
      showSectionDropPlaceholder,
      canDropSectionsAtRoot,
      canDropBlocksAtRoot,
      treePlaceholderClasses,
      treeProfile.placeholders.inlineDropLabel,
      treeRootDropUi.label,
      startSectionMasterDrag,
      endSectionMasterDrag,
      draggedMasterSectionId,
      moveSectionByMaster,
    ]
  );
  const nodeRuntimeContextValue = useMemo<ComponentTreeNodeRuntimeContextValue>(
    () => ({
      rootSectionsByZone,
      sectionById,
      sectionIndexById,
    }),
    [rootSectionsByZone, sectionById, sectionIndexById]
  );

  return (
    <TreeActionsProvider expandedIds={expandedIds} setExpandedIds={setExpandedIds}>
      <ComponentTreePanelProvider value={panelContextValue}>
        <FolderTreePanel
          className='flex-1 min-h-0'
          bodyClassName='flex-1 min-h-0 overflow-y-auto'
          masterInstance='cms_page_builder'
          header={
            <TreeHeader
              title='Structure'
              subtitle={state.currentPage ? `${sectionCount} sections` : 'No page loaded'}
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
            <ComponentTreeNodeRuntimeProvider value={nodeRuntimeContextValue}>
              <FolderTreeViewportV2
                controller={structureController}
                enableDnd={false}
                className='space-y-0.5'
                renderNode={(input) => <ComponentTreeNodeRenderer {...input} />}
              />
            </ComponentTreeNodeRuntimeProvider>
          )}
        </FolderTreePanel>
      </ComponentTreePanelProvider>
    </TreeActionsProvider>
  );
}
