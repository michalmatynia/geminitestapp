'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import React, { createContext, useContext, useMemo, useState } from 'react';

import {
  MasterFolderTree,
  useMasterFolderTreeInstance,
} from '@/features/foldertree';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { FolderTreePanel, TreeHeader } from '@/shared/ui';
import {
  canNestTreeNodeV2,
  cn,
  type FolderTreePlaceholderClassSet,
  type MasterTreeNode,
} from '@/shared/utils';

import { SectionPicker } from './SectionPicker';
import {
  PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY,
  PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY,
} from './settings/PageBuilderSettingsPage';
import { SectionNodeItem } from './tree';
import {
  CMS_ZONE_LABELS,
  CMS_ZONE_ORDER,
  buildCmsMasterNodes,
  fromCmsSectionNodeId,
  fromCmsZoneFooterNodeId,
  fromCmsZoneNodeId,
  toCmsSectionNodeId,
  toCmsZoneNodeId,
} from './utils/cms-master-tree';
import { createCmsMasterTreeAdapter } from './utils/cms-master-tree-adapter';
import { isCmsSectionSamePositionDrop } from './utils/cms-tree-external-drop';
import { useDragState } from '../../hooks/useDragStateContext';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';
import { TreeActionsProvider, useTreeActions } from '../../hooks/useTreeActionsContext';
import { readSectionDragData } from '../../utils/page-builder-dnd';

import type { PageZone, SectionInstance } from '../../types/page-builder';

// Block types that can be promoted to standalone sections
const PROMOTABLE_BLOCK_TYPES = [
  'ImageElement',
  'TextElement',
  'ButtonElement',
  'Block',
  'TextAtom',
  'Model3DElement',
  'Slideshow',
];

type ComponentTreeClipboard = { type: 'section' | 'block'; data: unknown } | null;

type ComponentTreePanelContextValue = {
  currentPage: unknown;
  clipboard: ComponentTreeClipboard;
  showExtractPlaceholder: boolean;
  showSectionDropPlaceholder: boolean;
  canDropSectionsAtRoot: boolean;
  canDropBlocksAtRoot: boolean;
  treePlaceholderClasses: FolderTreePlaceholderClassSet;
  treeInlineDropLabel: string;
  treeRootDropLabel: string;
  startSectionMasterDrag: (sectionId: string) => void;
  endSectionMasterDrag: () => void;
  draggedMasterSectionId: string | null;
  moveSectionByMaster: (sectionId: string, zone: PageZone, toIndex: number) => Promise<boolean>;
};

const ComponentTreePanelContext = createContext<ComponentTreePanelContextValue | null>(null);

function useComponentTreePanelContext(): ComponentTreePanelContextValue {
  const context = useContext(ComponentTreePanelContext);
  if (!context) {
    throw new Error('useComponentTreePanelContext must be used within ComponentTreePanelContext.Provider');
  }
  return context;
}

export function ComponentTreePanel(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const settingsStore = useSettingsStore();

  const extractPlaceholderValue = settingsStore.get(PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY);
  const sectionDropPlaceholderValue = settingsStore.get(PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY);
  const showExtractPlaceholder = extractPlaceholderValue === 'true';
  const showSectionDropPlaceholder = sectionDropPlaceholderValue !== 'false';

  // Ensure drag state context is available.
  useDragState();

  const sectionsByZone = useMemo(
    () =>
      CMS_ZONE_ORDER.reduce<Record<PageZone, SectionInstance[]>>(
        (acc, zone) => {
          acc[zone] = state.sections.filter((section: SectionInstance) => section.zone === zone);
          return acc;
        },
        { header: [], template: [], footer: [] }
      ),
    [state.sections]
  );

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
      sectionsByZone[zone].forEach((section: SectionInstance, index: number) => {
        next.set(section.id, index);
      });
    });
    return next;
  }, [sectionsByZone]);

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
  const applySectionMoveByZoneIndex = React.useCallback(
    (sectionId: string, zone: PageZone, toIndex: number): void => {
      const section = state.sections.find((item: SectionInstance): boolean => item.id === sectionId);
      if (!section) return;

      if (section.zone === zone) {
        const zoneSections = state.sections.filter(
          (item: SectionInstance): boolean => item.zone === zone
        );
        const fromIndex = zoneSections.findIndex(
          (item: SectionInstance): boolean => item.id === sectionId
        );
        if (fromIndex === -1 || fromIndex === toIndex) return;
        dispatch({ type: 'REORDER_SECTIONS', zone, fromIndex, toIndex });
        return;
      }

      dispatch({ type: 'MOVE_SECTION_TO_ZONE', sectionId, toZone: zone, toIndex });
    },
    [dispatch, state.sections]
  );
  const cmsTreeAdapter = useMemo(
    () => createCmsMasterTreeAdapter(applySectionMoveByZoneIndex),
    [applySectionMoveByZoneIndex]
  );

  const {
    profile: treeProfile,
    appearance: { placeholderClasses: treePlaceholderClasses, rootDropUi: treeRootDropUi },
    controller: structureController,
  } = useMasterFolderTreeInstance({
    instance: 'cms_page_builder',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    initiallyExpandedNodeIds: initiallyExpandedZoneNodeIds,
    externalRevision: structureRevision,
    adapter: cmsTreeAdapter,
  });
  const { moveNode: moveMasterNode, startDrag: startMasterDrag, clearDrag: clearMasterDrag } = structureController;
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
    async (sectionId: string, zone: PageZone, toIndex: number): Promise<boolean> => {
      const result = await moveMasterNode(
        toCmsSectionNodeId(sectionId),
        toCmsZoneNodeId(zone),
        toIndex
      );
      return result.ok;
    },
    [moveMasterNode]
  );
  const canDropSectionsAtRoot = useMemo(
    () =>
      canNestTreeNodeV2({
        profile: treeProfile,
        nodeType: 'file',
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

  return (
    <TreeActionsProvider expandedIds={expandedIds} setExpandedIds={setExpandedIds}>
      <ComponentTreePanelContext.Provider value={panelContextValue}>
        <FolderTreePanel
          className='flex-1 min-h-0'
          bodyClassName='flex-1 min-h-0 overflow-y-auto'
          header={(
            <TreeHeader
              title='Structure'
              subtitle={state.currentPage ? `${sectionCount} sections` : 'No page loaded'}
            />
          )}
        >
          {!state.currentPage ? (
            <div className='p-4' />
          ) : (
            <MasterFolderTree
              controller={structureController}
              enableDnd={false}
              className='space-y-0.5'
              renderNode={({ node, isExpanded, toggleExpand }) => {
                const zoneFromNode = fromCmsZoneNodeId(node.id);
                if (zoneFromNode) {
                  const zoneSections = sectionsByZone[zoneFromNode];
                  return (
                    <div className='border-b border-border/50 px-4 py-2.5'>
                      <button
                        type='button'
                        onClick={toggleExpand}
                        className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 transition hover:text-gray-300'
                      >
                        {isExpanded ? (
                          <ChevronDown className='size-3.5' />
                        ) : (
                          <ChevronRight className='size-3.5' />
                        )}
                        <span>{CMS_ZONE_LABELS[zoneFromNode]}</span>
                        {zoneSections.length > 0 ? (
                          <span className='ml-1 text-[10px] text-gray-500'>({zoneSections.length})</span>
                        ) : null}
                      </button>
                    </div>
                  );
                }

                const sectionId = fromCmsSectionNodeId(node.id);
                if (sectionId) {
                  const section = sectionById.get(sectionId);
                  if (!section) return null;
                  const sectionIndex = sectionIndexById.get(sectionId) ?? 0;
                  return (
                    <div className='px-2'>
                      <SectionDropTarget zone={section.zone} toIndex={sectionIndex} />
                      <SectionNodeItem
                        section={section}
                        sectionIndex={sectionIndex}
                        moveSectionByMaster={moveSectionByMaster}
                        startSectionMasterDrag={startSectionMasterDrag}
                        endSectionMasterDrag={endSectionMasterDrag}
                      />
                    </div>
                  );
                }

                const zoneFromFooter = fromCmsZoneFooterNodeId(node.id);
                if (!zoneFromFooter) return null;
                return (
                  <div className='px-2 pb-2'>
                    <ZoneFooterNode
                      zone={zoneFromFooter}
                      sectionCount={sectionsByZone[zoneFromFooter].length}
                    />
                  </div>
                );
              }}
            />
          )}
        </FolderTreePanel>
      </ComponentTreePanelContext.Provider>
    </TreeActionsProvider>
  );
}

function ZoneFooterNode({
  zone,
  sectionCount,
}: {
  zone: PageZone;
  sectionCount: number;
}): React.ReactNode {
  const {
    currentPage,
    clipboard,
    canDropSectionsAtRoot,
    treePlaceholderClasses,
    treeRootDropLabel,
    draggedMasterSectionId,
    moveSectionByMaster,
  } = useComponentTreePanelContext();
  const [isZoneDragOver, setIsZoneDragOver] = useState(false);
  const { state: dragState, endSectionDrag } = useDragState();
  const { sectionActions } = useTreeActions();

  const draggedSectionId = dragState.section.id ?? draggedMasterSectionId;
  const hasSections = sectionCount > 0;

  return (
    <>
      {hasSections ? (
        <SectionDropTarget zone={zone} toIndex={sectionCount} />
      ) : (
        <div
          onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
            if (!draggedSectionId) return;
            if (!canDropSectionsAtRoot) return;
            event.preventDefault();
            event.stopPropagation();
            setIsZoneDragOver(true);
          }}
          onDragLeave={(): void => {
            setIsZoneDragOver(false);
          }}
          onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
            event.preventDefault();
            event.stopPropagation();
            setIsZoneDragOver(false);
            if (!draggedSectionId) return;
            if (!canDropSectionsAtRoot) return;
            void moveSectionByMaster(draggedSectionId, zone, 0).finally(() => {
              endSectionDrag();
            });
          }}
          className={`rounded border border-dashed px-3 py-3 text-center text-xs transition ${
            isZoneDragOver
              ? treePlaceholderClasses.rootActive
              : treePlaceholderClasses.rootIdle
          }`}
        >
          {isZoneDragOver ? treeRootDropLabel : 'No sections'}
        </div>
      )}

      <div className='mt-2 flex flex-wrap items-center gap-1'>
        {clipboard?.type === 'section' ? (
          <button
            type='button'
            onClick={(): void => sectionActions.paste(zone)}
            className='rounded px-1.5 py-0.5 text-[10px] text-gray-400 transition hover:bg-foreground/10 hover:text-gray-200'
            title='Paste section'
          >
            Paste
          </button>
        ) : null}
        <SectionPicker
          disabled={!currentPage}
          zone={zone}
          onSelect={(sectionType: string): void => sectionActions.add(sectionType, zone)}
        />
      </div>
    </>
  );
}

interface SectionDropTargetProps {
  zone: PageZone;
  toIndex: number;
}

function SectionDropTarget({
  zone,
  toIndex,
}: SectionDropTargetProps): React.ReactNode {
  const {
    showExtractPlaceholder,
    showSectionDropPlaceholder,
    canDropSectionsAtRoot,
    canDropBlocksAtRoot,
    treePlaceholderClasses,
    treeInlineDropLabel,
    draggedMasterSectionId,
    moveSectionByMaster,
  } = useComponentTreePanelContext();
  const [isOver, setIsOver] = useState(false);
  const { state: dragState, endBlockDrag, endSectionDrag } = useDragState();
  const { sectionActions } = useTreeActions();

  const draggedBlockId = dragState.block.id;
  const draggedBlockType = dragState.block.type;
  const draggedFromSectionId = dragState.block.fromSectionId;
  const draggedFromColumnId = dragState.block.fromColumnId;
  const draggedFromParentBlockId = dragState.block.fromParentBlockId;
  const draggedSectionId = dragState.section.id ?? draggedMasterSectionId;
  const draggedSectionZone = dragState.section.zone;
  const draggedSectionIndex = dragState.section.index;

  const isDraggingBlock = Boolean(draggedBlockId);
  const isDraggingSection = showSectionDropPlaceholder && canDropSectionsAtRoot && Boolean(draggedSectionId);
  const canPromoteBlock =
    showExtractPlaceholder &&
    canDropBlocksAtRoot &&
    isDraggingBlock &&
    PROMOTABLE_BLOCK_TYPES.includes(draggedBlockType ?? '');
  const isDragging = isDraggingSection || canPromoteBlock;

  if (!isDragging) return null;

  return (
    <div
      onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
        if (isDraggingSection) {
          const sectionDrag = readSectionDragData(event.dataTransfer, {
            id: draggedSectionId,
            zone: draggedSectionZone,
            index: draggedSectionIndex,
          });
          const dragSectionId = sectionDrag.id;
          if (!dragSectionId) return;
          const dragZone = (sectionDrag.zone as PageZone | null) ?? null;
          const dragIndex = sectionDrag.index;
          const isSamePosition = isCmsSectionSamePositionDrop({
            draggedZone: dragZone,
            draggedIndex: dragIndex,
            targetZone: zone,
            targetIndex: toIndex,
          });
          if (isSamePosition) return;
        }
        event.preventDefault();
        event.stopPropagation();
        setIsOver(true);
      }}
      onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setIsOver(false);
      }}
      onDrop={(event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        setIsOver(false);

        if (isDraggingSection) {
          const sectionDrag = readSectionDragData(event.dataTransfer, {
            id: draggedSectionId,
            zone: draggedSectionZone,
            index: draggedSectionIndex,
          });
          const dragSectionId = sectionDrag.id;
          if (!dragSectionId) return;
          const dragZone = (sectionDrag.zone as PageZone | null) ?? null;
          const dragIndex = sectionDrag.index;
          const isSamePosition = isCmsSectionSamePositionDrop({
            draggedZone: dragZone,
            draggedIndex: dragIndex,
            targetZone: zone,
            targetIndex: toIndex,
          });
          if (isSamePosition) return;
          void moveSectionByMaster(dragSectionId, zone, toIndex).finally(() => {
            endSectionDrag();
          });
          return;
        }

        if (canPromoteBlock && draggedBlockId && draggedFromSectionId) {
          sectionActions.promoteBlockToSection(
            draggedBlockId,
            draggedFromSectionId,
            draggedFromColumnId ?? undefined,
            draggedFromParentBlockId ?? undefined,
            zone,
            toIndex
          );
          endBlockDrag();
        }
      }}
      className={`relative z-10 overflow-hidden transition-[height] ${
        isDragging ? 'h-8' : 'h-0'
      }`}
    >
      <div
        className={`absolute inset-x-1 top-1/2 flex -translate-y-1/2 items-center justify-center rounded border-2 border-dashed transition ${
          isOver
            ? canPromoteBlock
              ? 'border-emerald-500 bg-emerald-600/40 h-6'
              : `${treePlaceholderClasses.rootActive} h-6`
            : canPromoteBlock
              ? 'border-emerald-500/50 bg-emerald-600/20 h-5'
              : `${treePlaceholderClasses.rootIdle} h-5`
        }`}
      >
        {canPromoteBlock ? (
          <span className={`text-[9px] font-medium ${isOver ? 'text-emerald-200' : 'text-emerald-400'}`}>
            {isOver ? 'Release to extract' : 'Drop here to extract'}
          </span>
        ) : null}
        {isDraggingSection && !canPromoteBlock ? (
          <span
            className={cn(
              'text-[9px] font-medium',
              isOver ? treePlaceholderClasses.badgeActive : treePlaceholderClasses.badgeIdle
            )}
          >
            {isOver ? 'Release to move' : treeInlineDropLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
