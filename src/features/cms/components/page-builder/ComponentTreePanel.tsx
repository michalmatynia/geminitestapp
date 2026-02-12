'use client';

import { ChevronRight, ChevronDown } from 'lucide-react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { FolderTreePanel, TreeHeader } from '@/shared/ui';
import {
  canNestTreeNode,
  cn,
  FOLDER_TREE_PROFILES_SETTING_KEY,
  getFolderTreePlaceholderClasses,
  parseFolderTreeProfiles,
} from '@/shared/utils';

import { SectionPicker } from './SectionPicker';
import { PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY, PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY } from './settings/PageBuilderSettingsPage';
import { SectionNodeItem } from './tree';
import { useDragState } from '../../hooks/useDragStateContext';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';
import { TreeActionsProvider, useTreeActions } from '../../hooks/useTreeActionsContext';
import { readSectionDragData } from '../../utils/page-builder-dnd';

import type { SectionInstance } from '../../types/page-builder';
import type { PageZone } from '../../types/page-builder';

const ZONE_LABELS: Record<PageZone, string> = {
  header: 'Header',
  template: 'Template',
  footer: 'Footer',
};

const ZONE_ORDER: PageZone[] = ['header', 'template', 'footer'];

// Block types that can be promoted to standalone sections
const PROMOTABLE_BLOCK_TYPES = ['ImageElement', 'TextElement', 'ButtonElement', 'Block', 'TextAtom', 'Model3DElement', 'Slideshow'];

type ComponentTreeClipboard = { type: 'section' | 'block'; data: unknown } | null;

type ComponentTreePanelContextValue = {
  currentPage: unknown;
  clipboard: ComponentTreeClipboard;
  showExtractPlaceholder: boolean;
  showSectionDropPlaceholder: boolean;
  canDropSectionsAtRoot: boolean;
  canDropBlocksAtRoot: boolean;
  treePlaceholderClasses: ReturnType<typeof getFolderTreePlaceholderClasses>;
  treeInlineDropLabel: string;
  treeRootDropLabel: string;
  onToggleZone: (zone: PageZone) => void;
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
  const { state } = usePageBuilder();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedZones, setCollapsedZones] = useState<Set<PageZone>>(new Set());
  const settingsStore = useSettingsStore();
  const treeProfilesRaw = settingsStore.get(FOLDER_TREE_PROFILES_SETTING_KEY);
  const treeProfile = useMemo(
    () => parseFolderTreeProfiles(treeProfilesRaw).cms_page_builder,
    [treeProfilesRaw]
  );
  const treePlaceholderClasses = useMemo(
    () => getFolderTreePlaceholderClasses(treeProfile.placeholders.preset),
    [treeProfile.placeholders.preset]
  );
  const canDropSectionsAtRoot = useMemo(
    () =>
      canNestTreeNode({
        profile: treeProfile,
        nodeType: 'file',
        nodeKind: 'section',
        targetIsRoot: true,
      }),
    [treeProfile]
  );
  const canDropBlocksAtRoot = useMemo(
    () =>
      canNestTreeNode({
        profile: treeProfile,
        nodeType: 'file',
        nodeKind: 'block',
        targetIsRoot: true,
      }),
    [treeProfile]
  );

  // Get the settings for showing placeholders
  const extractPlaceholderValue = settingsStore.get(PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY);
  const sectionDropPlaceholderValue = settingsStore.get(PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY);
  const showExtractPlaceholder = extractPlaceholderValue === 'true';
  const showSectionDropPlaceholder = sectionDropPlaceholderValue !== 'false';

  // Ensure drag state context is available
  useDragState();

  const handleToggleZone = useCallback((zone: PageZone): void => {
    setCollapsedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) {
        next.delete(zone);
      } else {
        next.add(zone);
      }
      return next;
    });
  }, []);

  // Group sections by zone
  const sectionsByZone = ZONE_ORDER.reduce<Record<PageZone, SectionInstance[]>>(
    (acc, zone) => {
      acc[zone] = state.sections.filter((s: SectionInstance) => s.zone === zone);
      return acc;
    },
    { header: [], template: [], footer: [] }
  );

  const sectionCount = state.sections.length;
  const panelContextValue = useMemo<ComponentTreePanelContextValue>(() => ({
    currentPage: state.currentPage,
    clipboard: state.clipboard,
    showExtractPlaceholder,
    showSectionDropPlaceholder,
    canDropSectionsAtRoot,
    canDropBlocksAtRoot,
    treePlaceholderClasses,
    treeInlineDropLabel: treeProfile.placeholders.inlineDropLabel,
    treeRootDropLabel: treeProfile.placeholders.rootDropLabel,
    onToggleZone: handleToggleZone,
  }), [
    state.currentPage,
    state.clipboard,
    showExtractPlaceholder,
    showSectionDropPlaceholder,
    canDropSectionsAtRoot,
    canDropBlocksAtRoot,
    treePlaceholderClasses,
    treeProfile.placeholders.inlineDropLabel,
    treeProfile.placeholders.rootDropLabel,
    handleToggleZone,
  ]);

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
            ZONE_ORDER.map((zone) => {
              const isCollapsed = collapsedZones.has(zone);
              const zoneSections = sectionsByZone[zone];

              return (
                <ZoneGroup
                  key={zone}
                  zone={zone}
                  label={ZONE_LABELS[zone]}
                  isCollapsed={isCollapsed}
                  zoneSections={zoneSections}
                />
              );
            })
          )}
        </FolderTreePanel>
      </ComponentTreePanelContext.Provider>
    </TreeActionsProvider>
  );
}

// ---------------------------------------------------------------------------
// Zone group (collapsible zone with section list + drop target)
// ---------------------------------------------------------------------------

interface ZoneGroupProps {
  zone: PageZone;
  label: string;
  isCollapsed: boolean;
  zoneSections: SectionInstance[];
}

function ZoneGroup({
  zone,
  label,
  isCollapsed,
  zoneSections,
}: ZoneGroupProps): React.ReactNode {
  const {
    currentPage,
    clipboard,
    canDropSectionsAtRoot,
    treePlaceholderClasses,
    treeRootDropLabel,
    onToggleZone,
  } = useComponentTreePanelContext();
  const [isZoneDragOver, setIsZoneDragOver] = useState(false);
  const { state: dragState, endSectionDrag } = useDragState();
  const {
    sectionActions,
  } = useTreeActions();

  const draggedSectionId = dragState.section.id;

  return (
    <div className='border-b border-border/50'>
      {/* Zone header */}
      <div className='px-4 py-2.5'>
        <button
          type='button'
          onClick={() => onToggleZone(zone)}
          className='flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-300 transition'
        >
          {isCollapsed ? (
            <ChevronRight className='size-3.5' />
          ) : (
            <ChevronDown className='size-3.5' />
          )}
          <span>{label}</span>
          {zoneSections.length > 0 && (
            <span className='ml-1 text-[10px] text-gray-500'>
              ({zoneSections.length})
            </span>
          )}
        </button>
      </div>

      {/* Zone sections */}
      {!isCollapsed && (
        <div className='px-2 pb-2'>
          {zoneSections.length === 0 ? (
            <div
              onDragOver={(e: React.DragEvent) => {
                if (!draggedSectionId) return;
                if (!canDropSectionsAtRoot) return;
                e.preventDefault();
                e.stopPropagation();
                setIsZoneDragOver(true);
              }}
              onDragLeave={() => setIsZoneDragOver(false)}
              onDrop={(e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsZoneDragOver(false);
                if (!draggedSectionId) return;
                if (!canDropSectionsAtRoot) return;
                sectionActions.dropInZone(draggedSectionId, zone, 0);
                endSectionDrag();
              }}
              className={`rounded border border-dashed px-3 py-3 text-center text-xs transition ${
                isZoneDragOver
                  ? treePlaceholderClasses.rootActive
                  : treePlaceholderClasses.rootIdle
              }`}
            >
              {isZoneDragOver ? treeRootDropLabel : 'No sections'}
            </div>
          ) : (
            <div className='space-y-0.5'>
              {zoneSections.map((section: SectionInstance, index: number) => (
                <React.Fragment key={section.id}>
                  <SectionDropTarget
                    zone={zone}
                    toIndex={index}
                  />
                  <SectionNodeItem
                    section={section}
                    sectionIndex={index}
                  />
                </React.Fragment>
              ))}
              <SectionDropTarget
                zone={zone}
                toIndex={zoneSections.length}
              />
            </div>
          )}
          {/* Add section + paste always at the bottom of the zone */}
          <div className='mt-2 flex flex-wrap items-center gap-1'>
            {clipboard?.type === 'section' && (
              <button
                type='button'
                onClick={() => sectionActions.paste(zone)}
                className='rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-foreground/10 hover:text-gray-200 transition'
                title='Paste section'
              >
                Paste
              </button>
            )}
            <SectionPicker
              disabled={!currentPage}
              zone={zone}
              onSelect={(sectionType: string) => sectionActions.add(sectionType, zone)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drop target between sections (visible when dragging a section or block)
// ---------------------------------------------------------------------------

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
  } = useComponentTreePanelContext();
  const [isOver, setIsOver] = useState(false);
  const { state: dragState, endBlockDrag, endSectionDrag } = useDragState();
  const { sectionActions } = useTreeActions();

  const draggedBlockId = dragState.block.id;
  const draggedBlockType = dragState.block.type;
  const draggedFromSectionId = dragState.block.fromSectionId;
  const draggedFromColumnId = dragState.block.fromColumnId;
  const draggedFromParentBlockId = dragState.block.fromParentBlockId;
  const draggedSectionId = dragState.section.id;
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
      onDragOver={(e: React.DragEvent) => {
        if (isDraggingSection) {
          const sectionDrag = readSectionDragData(e.dataTransfer, {
            id: draggedSectionId,
            zone: draggedSectionZone,
            index: draggedSectionIndex,
          });
          const dragSectionId = sectionDrag.id;
          if (!dragSectionId) return;
          const dragZone = (sectionDrag.zone as PageZone | null) ?? null;
          const dragIndex = sectionDrag.index;
          const isSamePosition =
            dragZone === zone &&
            dragIndex !== null &&
            (toIndex === dragIndex || toIndex === dragIndex + 1);
          if (isSamePosition) return;
        }
        e.preventDefault();
        e.stopPropagation();
        setIsOver(true);
      }}
      onDragLeave={(e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsOver(false);
      }}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);

        if (isDraggingSection) {
          const sectionDrag = readSectionDragData(e.dataTransfer, {
            id: draggedSectionId,
            zone: draggedSectionZone,
            index: draggedSectionIndex,
          });
          const dragSectionId = sectionDrag.id;
          if (!dragSectionId) return;
          const dragZone = (sectionDrag.zone as PageZone | null) ?? null;
          const dragIndex = sectionDrag.index;
          const isSamePosition =
            dragZone === zone &&
            dragIndex !== null &&
            (toIndex === dragIndex || toIndex === dragIndex + 1);
          if (isSamePosition) return;
          sectionActions.dropInZone(dragSectionId, zone, toIndex);
          endSectionDrag();
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
        className={`absolute inset-x-1 top-1/2 -translate-y-1/2 rounded border-2 border-dashed transition flex items-center justify-center ${
          isOver
            ? canPromoteBlock
              ? 'border-emerald-500 bg-emerald-600/40 h-6'
              : `${treePlaceholderClasses.rootActive} h-6`
            : canPromoteBlock
              ? 'border-emerald-500/50 bg-emerald-600/20 h-5'
              : `${treePlaceholderClasses.rootIdle} h-5`
        }`}
      >
        {canPromoteBlock && (
          <span className={`text-[9px] font-medium ${isOver ? 'text-emerald-200' : 'text-emerald-400'}`}>
            {isOver ? 'Release to extract' : 'Drop here to extract'}
          </span>
        )}
        {isDraggingSection && !canPromoteBlock && (
          <span
            className={cn(
              'text-[9px] font-medium',
              isOver ? treePlaceholderClasses.badgeActive : treePlaceholderClasses.badgeIdle
            )}
          >
            {isOver ? 'Release to move' : treeInlineDropLabel}
          </span>
        )}
      </div>
    </div>
  );
}
