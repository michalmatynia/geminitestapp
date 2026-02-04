"use client";

import React, { useCallback, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { SectionInstance } from "../../types/page-builder";
import type { PageZone } from "../../types/page-builder";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { SectionNodeItem } from "./ComponentTreeNodeItem";
import { SectionPicker } from "./SectionPicker";
import { useSettingsMap } from "@/shared/hooks/use-settings";
import { PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY, PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY } from "./settings/PageBuilderSettingsPage";
import { FolderTreePanel, TreeHeader } from "@/shared/ui";
import { readSectionDragData } from "../../utils/page-builder-dnd";

const ZONE_LABELS: Record<PageZone, string> = {
  header: "Header",
  template: "Template",
  footer: "Footer",
};

const ZONE_ORDER: PageZone[] = ["header", "template", "footer"];

export function ComponentTreePanel(): React.ReactNode {
  const { state, dispatch } = usePageBuilder();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedZones, setCollapsedZones] = useState<Set<PageZone>>(new Set());

  // Get the settings for showing placeholders
  const { data: settingsMap } = useSettingsMap();
  const extractPlaceholderValue = settingsMap?.get(PAGE_BUILDER_SHOW_EXTRACT_PLACEHOLDER_KEY);
  const sectionDropPlaceholderValue = settingsMap?.get(PAGE_BUILDER_SHOW_SECTION_DROP_PLACEHOLDER_KEY);
  // Show extract placeholder only when explicitly set to "true"
  const showExtractPlaceholder = extractPlaceholderValue === "true";
  // Show section drop placeholder by default (true unless explicitly set to "false")
  const showSectionDropPlaceholder = sectionDropPlaceholderValue !== "false";

  // Drag-and-drop state for blocks
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedBlockType, setDraggedBlockType] = useState<string | null>(null);
  const [draggedFromSectionId, setDraggedFromSectionId] = useState<string | null>(null);
  const [draggedFromColumnId, setDraggedFromColumnId] = useState<string | null>(null);
  const [draggedFromParentBlockId, setDraggedFromParentBlockId] = useState<string | null>(null);

  const handleSelectNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: "SELECT_NODE", nodeId });
    },
    [dispatch]
  );

  const handleAddSection = useCallback(
    (sectionType: string, zone: PageZone) => {
      dispatch({ type: "ADD_SECTION", sectionType, zone });
    },
    [dispatch]
  );

  const handleAddBlock = useCallback(
    (sectionId: string, blockType: string) => {
      dispatch({ type: "ADD_BLOCK", sectionId, blockType });
      // Auto-expand the section when a block is added
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(sectionId);
        return next;
      });
    },
    [dispatch]
  );

  const handleDropBlock = useCallback(
    (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => {
      dispatch({
        type: "MOVE_BLOCK",
        blockId,
        fromSectionId,
        toSectionId,
        toIndex,
      });
      // Auto-expand the target section
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(toSectionId);
        return next;
      });
    },
    [dispatch]
  );

  const handleAddBlockToColumn = useCallback(
    (sectionId: string, columnId: string, blockType: string) => {
      dispatch({ type: "ADD_BLOCK_TO_COLUMN", sectionId, columnId, blockType });
      // Auto-expand section and column
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(sectionId);
        next.add(columnId);
        return next;
      });
    },
    [dispatch]
  );

  const handleDropBlockToColumn = useCallback(
    (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => {
      dispatch({
        type: "MOVE_BLOCK_TO_COLUMN",
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        toColumnId,
        ...(toParentBlockId && { toParentBlockId }),
        toIndex,
      });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(toSectionId);
        next.add(toColumnId);
        if (toParentBlockId) next.add(toParentBlockId);
        return next;
      });
    },
    [dispatch]
  );

  const handleDropBlockToSection = useCallback(
    (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toIndex: number, fromParentBlockId?: string) => {
      dispatch({
        type: "MOVE_BLOCK_TO_SECTION",
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        toIndex,
      });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(toSectionId);
        return next;
      });
    },
    [dispatch]
  );

  const handleDropBlockToRow = useCallback(
    (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toRowId: string, toIndex: number, fromParentBlockId?: string) => {
      dispatch({
        type: "MOVE_BLOCK_TO_ROW",
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toSectionId,
        toRowId,
        toIndex,
      });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(toSectionId);
        next.add(toRowId);
        return next;
      });
    },
    [dispatch]
  );

  const handleAddGridRow = useCallback(
    (sectionId: string) => {
      dispatch({ type: "ADD_GRID_ROW", sectionId });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(sectionId);
        return next;
      });
    },
    [dispatch]
  );

  const handleRemoveGridRow = useCallback(
    (sectionId: string, rowId: string) => {
      dispatch({ type: "REMOVE_GRID_ROW", sectionId, rowId });
    },
    [dispatch]
  );

  const handleAddColumnToRow = useCallback(
    (sectionId: string, rowId: string) => {
      dispatch({ type: "ADD_COLUMN_TO_ROW", sectionId, rowId });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(sectionId);
        next.add(rowId);
        return next;
      });
    },
    [dispatch]
  );

  const handleRemoveColumnFromRow = useCallback(
    (sectionId: string, columnId: string, rowId?: string) => {
      dispatch({ 
        type: "REMOVE_COLUMN_FROM_ROW", 
        sectionId, 
        columnId, 
        ...(rowId && { rowId })
      });
    },
    [dispatch]
  );

  const handleAddElementToNestedBlock = useCallback(
    (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => {
      dispatch({ type: "ADD_ELEMENT_TO_NESTED_BLOCK", sectionId, columnId, parentBlockId, elementType });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(sectionId);
        next.add(columnId);
        next.add(parentBlockId);
        return next;
      });
    },
    [dispatch]
  );

  const handleAddElementToSectionBlock = useCallback(
    (sectionId: string, parentBlockId: string, elementType: string) => {
      dispatch({ type: "ADD_ELEMENT_TO_SECTION_BLOCK", sectionId, parentBlockId, elementType });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(sectionId);
        next.add(parentBlockId);
        return next;
      });
    },
    [dispatch]
  );

  const handleRemoveBlock = useCallback(
    (sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => {
      if (parentBlockId && columnId) {
        // Block inside a nested parent block
        dispatch({
          type: "REMOVE_ELEMENT_FROM_NESTED_BLOCK",
          sectionId,
          columnId,
          parentBlockId,
          elementId: blockId,
        });
      } else if (parentBlockId) {
        // Block inside a nested parent block within a section
        dispatch({
          type: "REMOVE_ELEMENT_FROM_SECTION_BLOCK",
          sectionId,
          parentBlockId,
          elementId: blockId,
        });
      } else if (columnId) {
        // Block inside a column
        dispatch({
          type: "REMOVE_BLOCK_FROM_COLUMN",
          sectionId,
          columnId,
          blockId,
        });
      } else {
        // Direct block in section
        dispatch({
          type: "REMOVE_BLOCK",
          sectionId,
          blockId,
        });
      }
    },
    [dispatch]
  );

  const handleDropSectionToColumn = useCallback(
    (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => {
      dispatch({
        type: "MOVE_SECTION_TO_COLUMN",
        sectionId,
        toSectionId,
        toColumnId,
        ...(toParentBlockId && { toParentBlockId }),
        toIndex,
      });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(toSectionId);
        next.add(toColumnId);
        if (toParentBlockId) next.add(toParentBlockId);
        return next;
      });
    },
    [dispatch]
  );

  const handleConvertSectionToBlock = useCallback(
    (sectionId: string, toSectionId: string, toIndex: number) => {
      dispatch({ type: "CONVERT_SECTION_TO_BLOCK", sectionId, toSectionId, toIndex });
      setExpandedIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(toSectionId);
        return next;
      });
    },
    [dispatch]
  );

  const handlePromoteBlockToSection = useCallback(
    (
      blockId: string,
      fromSectionId: string,
      fromColumnId: string | undefined,
      fromParentBlockId: string | undefined,
      toZone: PageZone,
      toIndex: number
    ) => {
      dispatch({
        type: "CONVERT_BLOCK_TO_SECTION",
        blockId,
        fromSectionId,
        ...(fromColumnId && { fromColumnId }),
        ...(fromParentBlockId && { fromParentBlockId }),
        toZone,
        toIndex,
      });
    },
    [dispatch]
  );

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleToggleZone = useCallback((zone: PageZone) => {
    setCollapsedZones((prev: Set<PageZone>) => {
      const next = new Set(prev);
      if (next.has(zone)) {
        next.delete(zone);
      } else {
        next.add(zone);
      }
      return next;
    });
  }, []);

  const handlePasteSection = useCallback(
    (zone: PageZone) => {
      dispatch({ type: "PASTE_SECTION", zone });
    },
    [dispatch]
  );

  const handleToggleSectionVisibility = useCallback(
    (sectionId: string, isHidden: boolean) => {
      dispatch({ type: "UPDATE_SECTION_SETTINGS", sectionId, settings: { isHidden } });
    },
    [dispatch]
  );

  const handleRemoveSection = useCallback(
    (sectionId: string) => {
      dispatch({ type: "REMOVE_SECTION", sectionId });
    },
    [dispatch]
  );


  // Section drag-and-drop state
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [draggedSectionType, setDraggedSectionType] = useState<string | null>(null);
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [draggedSectionZone, setDraggedSectionZone] = useState<PageZone | null>(null);

  const handleDropSectionInZone = useCallback(
    (droppedSectionId: string, zone: PageZone, toIndex: number) => {
      const section = state.sections.find((s: SectionInstance) => s.id === droppedSectionId);
      if (!section) return;
      if (section.zone === zone) {
        // Reorder within same zone
        const zoneSections = state.sections.filter((s: SectionInstance) => s.zone === zone);
        const fromIndex = zoneSections.findIndex((s: SectionInstance) => s.id === droppedSectionId);
        if (fromIndex === -1 || fromIndex === toIndex) return;
        dispatch({ type: "REORDER_SECTIONS", zone, fromIndex, toIndex });
      } else {
        // Move to a different zone
        dispatch({ type: "MOVE_SECTION_TO_ZONE", sectionId: droppedSectionId, toZone: zone, toIndex });
      }
    },
    [state.sections, dispatch]
  );

  // Group sections by zone
  const sectionsByZone = ZONE_ORDER.reduce<Record<PageZone, SectionInstance[]>>(
    (acc: Record<PageZone, SectionInstance[]>, zone: PageZone) => {
      acc[zone] = state.sections.filter((s: SectionInstance) => s.zone === zone);
      return acc;
    },
    { header: [], template: [], footer: [] }
  );

  const sectionCount = state.sections.length;

  return (
    <FolderTreePanel
      className="flex-1 min-h-0"
      bodyClassName="flex-1 min-h-0 overflow-y-auto"
      header={(
        <TreeHeader
          title="Structure"
          subtitle={state.currentPage ? `${sectionCount} sections` : "No page loaded"}
        />
      )}
    >
      {!state.currentPage ? (
        <div className="p-4" />
      ) : (
        ZONE_ORDER.map((zone: PageZone) => {
          const isCollapsed = collapsedZones.has(zone);
          const zoneSections = sectionsByZone[zone];

          return (
            <ZoneGroup
              key={zone}
              zone={zone}
              label={ZONE_LABELS[zone]}
              isCollapsed={isCollapsed}
              onToggleZone={handleToggleZone}
              zoneSections={zoneSections}
              selectedNodeId={state.selectedNodeId}
              currentPage={state.currentPage}
              clipboard={state.clipboard}
              onSelectNode={handleSelectNode}
              onAddSection={handleAddSection}
              onAddBlock={handleAddBlock}
              onDropBlock={handleDropBlock}
              onDropBlockToSection={handleDropBlockToSection}
              onAddBlockToColumn={handleAddBlockToColumn}
              onDropBlockToColumn={handleDropBlockToColumn}
              onAddGridRow={handleAddGridRow}
              onRemoveGridRow={handleRemoveGridRow}
              onAddColumnToRow={handleAddColumnToRow}
              onRemoveColumnFromRow={handleRemoveColumnFromRow}
              onAddElementToNestedBlock={handleAddElementToNestedBlock}
              onAddElementToSectionBlock={handleAddElementToSectionBlock}
              onDropSectionInZone={handleDropSectionInZone}
              onPasteSection={handlePasteSection}
              onToggleSectionVisibility={handleToggleSectionVisibility}
              onRemoveSection={handleRemoveSection}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              draggedBlockId={draggedBlockId}
              setDraggedBlockId={setDraggedBlockId}
              draggedBlockType={draggedBlockType}
              setDraggedBlockType={setDraggedBlockType}
              onDropBlockToRow={handleDropBlockToRow}
              draggedFromSectionId={draggedFromSectionId}
              setDraggedFromSectionId={setDraggedFromSectionId}
              draggedFromColumnId={draggedFromColumnId}
              setDraggedFromColumnId={setDraggedFromColumnId}
              draggedFromParentBlockId={draggedFromParentBlockId}
              setDraggedFromParentBlockId={setDraggedFromParentBlockId}
              draggedSectionId={draggedSectionId}
              setDraggedSectionId={setDraggedSectionId}
              draggedSectionType={draggedSectionType}
              setDraggedSectionType={setDraggedSectionType}
              draggedSectionIndex={draggedSectionIndex}
              setDraggedSectionIndex={setDraggedSectionIndex}
              draggedSectionZone={draggedSectionZone}
              setDraggedSectionZone={setDraggedSectionZone}
              onDropSectionToColumn={handleDropSectionToColumn}
              onConvertSectionToBlock={handleConvertSectionToBlock}
              onPromoteBlockToSection={handlePromoteBlockToSection}
              showExtractPlaceholder={showExtractPlaceholder}
              showSectionDropPlaceholder={showSectionDropPlaceholder}
              onRemoveBlock={handleRemoveBlock}
            />
          );
        })
      )}
    </FolderTreePanel>
  );
}

// ---------------------------------------------------------------------------
// Zone group (collapsible zone with section list + drop target)
// ---------------------------------------------------------------------------

interface ZoneGroupProps {
  zone: PageZone;
  label: string;
  isCollapsed: boolean;
  onToggleZone: (zone: PageZone) => void;
  zoneSections: SectionInstance[];
  selectedNodeId: string | null;
  currentPage: unknown;
  clipboard: { type: "section" | "block"; data: unknown } | null;
  onSelectNode: (nodeId: string) => void;
  onAddSection: (sectionType: string, zone: PageZone) => void;
  onAddBlock: (sectionId: string, blockType: string) => void;
  onDropBlock: (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => void;
  onDropBlockToSection: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toIndex: number, fromParentBlockId?: string) => void;
  onAddBlockToColumn: (sectionId: string, columnId: string, blockType: string) => void;
  onDropBlockToColumn: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
  onAddGridRow: (sectionId: string) => void;
  onRemoveGridRow: (sectionId: string, rowId: string) => void;
  onAddColumnToRow: (sectionId: string, rowId: string) => void;
  onRemoveColumnFromRow: (sectionId: string, columnId: string, rowId?: string) => void;
  onAddElementToNestedBlock: (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
  onAddElementToSectionBlock: (sectionId: string, parentBlockId: string, elementType: string) => void;
  onDropSectionInZone: (sectionId: string, zone: PageZone, toIndex: number) => void;
  onPasteSection: (zone: PageZone) => void;
  onToggleSectionVisibility: (sectionId: string, isHidden: boolean) => void;
  onRemoveSection: (sectionId: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  draggedBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
  draggedBlockType: string | null;
  setDraggedBlockType: (type: string | null) => void;
  onDropBlockToRow: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toRowId: string, toIndex: number, fromParentBlockId?: string) => void;
  draggedFromSectionId: string | null;
  setDraggedFromSectionId: (id: string | null) => void;
  draggedFromColumnId: string | null;
  setDraggedFromColumnId: (id: string | null) => void;
  draggedFromParentBlockId: string | null;
  setDraggedFromParentBlockId: (id: string | null) => void;
  draggedSectionId: string | null;
  setDraggedSectionId: (id: string | null) => void;
  draggedSectionType: string | null;
  setDraggedSectionType: (type: string | null) => void;
  draggedSectionIndex: number | null;
  setDraggedSectionIndex: (index: number | null) => void;
  draggedSectionZone: PageZone | null;
  setDraggedSectionZone: (zone: PageZone | null) => void;
  onDropSectionToColumn: (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => void;
  onConvertSectionToBlock: (sectionId: string, toSectionId: string, toIndex: number) => void;
  onPromoteBlockToSection: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, fromParentBlockId: string | undefined, toZone: PageZone, toIndex: number) => void;
  showExtractPlaceholder: boolean;
  showSectionDropPlaceholder: boolean;
  onRemoveBlock?: ((sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void) | undefined;
}

function ZoneGroup({
  zone,
  label,
  isCollapsed,
  onToggleZone,
  zoneSections,
  selectedNodeId,
  currentPage,
  clipboard,
  onSelectNode,
  onAddSection,
  onAddBlock,
  onDropBlock,
  onDropBlockToSection,
  onAddBlockToColumn,
  onDropBlockToColumn,
  onAddGridRow,
  onRemoveGridRow,
  onAddColumnToRow,
  onRemoveColumnFromRow,
  onAddElementToNestedBlock,
  onAddElementToSectionBlock,
  onDropSectionInZone,
  onPasteSection,
  onToggleSectionVisibility,
  onRemoveSection,
  expandedIds,
  onToggleExpand,
  draggedBlockId,
  setDraggedBlockId,
  draggedBlockType,
  setDraggedBlockType,
  onDropBlockToRow,
  draggedFromSectionId,
  setDraggedFromSectionId,
  draggedFromColumnId,
  setDraggedFromColumnId,
  draggedFromParentBlockId,
  setDraggedFromParentBlockId,
  draggedSectionId,
  setDraggedSectionId,
  draggedSectionType,
  setDraggedSectionType,
  draggedSectionIndex,
  setDraggedSectionIndex,
  draggedSectionZone,
  setDraggedSectionZone,
  onDropSectionToColumn,
  onConvertSectionToBlock,
  onPromoteBlockToSection,
  showExtractPlaceholder,
  showSectionDropPlaceholder,
  onRemoveBlock,
}: ZoneGroupProps): React.ReactNode {
  const [isZoneDragOver, setIsZoneDragOver] = useState(false);

  return (
    <div className="border-b border-border/50">
      {/* Zone header */}
      <div className="px-4 py-2.5">
        <button
          type="button"
          onClick={() => onToggleZone(zone)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-300 transition"
        >
          {isCollapsed ? (
            <ChevronRight className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          <span>{label}</span>
          {zoneSections.length > 0 && (
            <span className="ml-1 text-[10px] text-gray-500">
              ({zoneSections.length})
            </span>
          )}
        </button>
      </div>

      {/* Zone sections */}
      {!isCollapsed && (
        <div className="px-2 pb-2">
          {zoneSections.length === 0 ? (
            <div
              onDragOver={(e: React.DragEvent) => {
                if (!draggedSectionId) return;
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
                onDropSectionInZone(draggedSectionId, zone, 0);
                setDraggedSectionId(null);
              }}
              className={`rounded border border-dashed px-3 py-3 text-center text-xs transition ${
                isZoneDragOver
                  ? "border-purple-500/50 bg-purple-600/20 text-purple-300"
                  : "border-border/30 text-gray-600"
              }`}
            >
              {isZoneDragOver ? "Drop section here" : "No sections"}
            </div>
          ) : (
            <div className="space-y-0.5">
              {zoneSections.map((section: SectionInstance, index: number) => (
                <React.Fragment key={section.id}>
                  <SectionDropTarget
                    zone={zone}
                    toIndex={index}
                    draggedSectionId={draggedSectionId}
                    draggedSectionZone={draggedSectionZone}
                    draggedSectionIndex={draggedSectionIndex}
                    setDraggedSectionId={setDraggedSectionId}
                    onDropSectionInZone={onDropSectionInZone}
                    draggedBlockId={draggedBlockId}
                    draggedBlockType={draggedBlockType}
                    draggedFromSectionId={draggedFromSectionId}
                    draggedFromColumnId={draggedFromColumnId}
                    draggedFromParentBlockId={draggedFromParentBlockId}
                    setDraggedBlockId={setDraggedBlockId}
                    setDraggedBlockType={setDraggedBlockType}
                    setDraggedFromSectionId={setDraggedFromSectionId}
                    setDraggedFromColumnId={setDraggedFromColumnId}
                    setDraggedFromParentBlockId={setDraggedFromParentBlockId}
                    onPromoteBlockToSection={onPromoteBlockToSection}
                    showExtractPlaceholder={showExtractPlaceholder}
                    showSectionDropPlaceholder={showSectionDropPlaceholder}
                  />
                  <SectionNodeItem
                    section={section}
                    sectionIndex={index}
                    selectedNodeId={selectedNodeId}
                    onSelect={onSelectNode}
                    onAddBlock={onAddBlock}
                    onDropBlock={onDropBlock}
                    onDropBlockToSection={onDropBlockToSection}
                    onAddBlockToColumn={onAddBlockToColumn}
                    onDropBlockToColumn={onDropBlockToColumn}
                    onAddGridRow={onAddGridRow}
                    onRemoveGridRow={onRemoveGridRow}
                    onAddColumnToRow={onAddColumnToRow}
                    onRemoveColumnFromRow={onRemoveColumnFromRow}
                    onAddElementToNestedBlock={onAddElementToNestedBlock}
                    onAddElementToSectionBlock={onAddElementToSectionBlock}
                    onDropSection={(sectionId: string, toIndex: number) => onDropSectionInZone(sectionId, zone, toIndex)}
                    onToggleSectionVisibility={onToggleSectionVisibility}
                    onRemoveSection={onRemoveSection}
                    expandedIds={expandedIds}
                    onToggleExpand={onToggleExpand}
                    draggedBlockId={draggedBlockId}
                    setDraggedBlockId={setDraggedBlockId}
                    draggedBlockType={draggedBlockType}
                    setDraggedBlockType={setDraggedBlockType}
                    onDropBlockToRow={onDropBlockToRow}
                    draggedFromSectionId={draggedFromSectionId}
                    setDraggedFromSectionId={setDraggedFromSectionId}
                    draggedFromColumnId={draggedFromColumnId}
                    setDraggedFromColumnId={setDraggedFromColumnId}
                    draggedFromParentBlockId={draggedFromParentBlockId}
                    setDraggedFromParentBlockId={setDraggedFromParentBlockId}
                    draggedSectionId={draggedSectionId}
                    setDraggedSectionId={setDraggedSectionId}
                    draggedSectionType={draggedSectionType}
                    setDraggedSectionType={setDraggedSectionType}
                    draggedSectionIndex={draggedSectionIndex}
                    setDraggedSectionIndex={setDraggedSectionIndex}
                    draggedSectionZone={draggedSectionZone}
                    setDraggedSectionZone={setDraggedSectionZone}
                    onDropSectionToColumn={onDropSectionToColumn}
                    onConvertSectionToBlock={onConvertSectionToBlock}
                    onRemoveBlock={onRemoveBlock}
                  />
                </React.Fragment>
              ))}
              <SectionDropTarget
                zone={zone}
                toIndex={zoneSections.length}
                draggedSectionId={draggedSectionId}
                draggedSectionZone={draggedSectionZone}
                draggedSectionIndex={draggedSectionIndex}
                setDraggedSectionId={setDraggedSectionId}
                onDropSectionInZone={onDropSectionInZone}
                draggedBlockId={draggedBlockId}
                draggedBlockType={draggedBlockType}
                draggedFromSectionId={draggedFromSectionId}
                draggedFromColumnId={draggedFromColumnId}
                draggedFromParentBlockId={draggedFromParentBlockId}
                setDraggedBlockId={setDraggedBlockId}
                setDraggedBlockType={setDraggedBlockType}
                setDraggedFromSectionId={setDraggedFromSectionId}
                setDraggedFromColumnId={setDraggedFromColumnId}
                setDraggedFromParentBlockId={setDraggedFromParentBlockId}
                onPromoteBlockToSection={onPromoteBlockToSection}
                showExtractPlaceholder={showExtractPlaceholder}
                showSectionDropPlaceholder={showSectionDropPlaceholder}
              />
            </div>
          )}
          {/* Add section + paste always at the bottom of the zone */}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {clipboard?.type === "section" && (
              <button
                type="button"
                onClick={() => onPasteSection(zone)}
                className="rounded px-1.5 py-0.5 text-[10px] text-gray-400 hover:bg-foreground/10 hover:text-gray-200 transition"
                title="Paste section"
              >
                Paste
              </button>
            )}
            <SectionPicker
              disabled={!currentPage}
              zone={zone}
              onSelect={(sectionType: string) => onAddSection(sectionType, zone)}
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

// Block types that can be promoted to standalone sections
const PROMOTABLE_BLOCK_TYPES = ["ImageElement", "TextElement", "ButtonElement", "Block", "TextAtom", "Model3DElement", "Slideshow"];

interface SectionDropTargetProps {
  zone: PageZone;
  toIndex: number;
  draggedSectionId: string | null;
  draggedSectionZone: PageZone | null;
  draggedSectionIndex: number | null;
  setDraggedSectionId: (id: string | null) => void;
  onDropSectionInZone: (sectionId: string, zone: PageZone, toIndex: number) => void;
  // Block drag state
  draggedBlockId: string | null;
  draggedBlockType: string | null;
  draggedFromSectionId: string | null;
  draggedFromColumnId: string | null;
  draggedFromParentBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
  setDraggedBlockType: (type: string | null) => void;
  setDraggedFromSectionId: (id: string | null) => void;
  setDraggedFromColumnId: (id: string | null) => void;
  setDraggedFromParentBlockId: (id: string | null) => void;
  onPromoteBlockToSection: (
    blockId: string,
    fromSectionId: string,
    fromColumnId: string | undefined,
    fromParentBlockId: string | undefined,
    toZone: PageZone,
    toIndex: number
  ) => void;
  showExtractPlaceholder: boolean;
  showSectionDropPlaceholder: boolean;
}

function SectionDropTarget({
  zone,
  toIndex,
  draggedSectionId,
  draggedSectionZone,
  draggedSectionIndex,
  setDraggedSectionId,
  onDropSectionInZone,
  draggedBlockId,
  draggedBlockType,
  draggedFromSectionId,
  draggedFromColumnId,
  draggedFromParentBlockId,
  setDraggedBlockId,
  setDraggedBlockType,
  setDraggedFromSectionId,
  setDraggedFromColumnId,
  setDraggedFromParentBlockId,
  onPromoteBlockToSection,
  showExtractPlaceholder,
  showSectionDropPlaceholder,
}: SectionDropTargetProps): React.ReactNode {
  const [isOver, setIsOver] = useState(false);
  const isDraggingBlock = Boolean(draggedBlockId);
  // Only show section drop placeholder if the setting is enabled
  const isDraggingSection = showSectionDropPlaceholder && Boolean(draggedSectionId);
  // Only show promotable block extract option if the setting is enabled
  const canPromoteBlock = showExtractPlaceholder && isDraggingBlock && PROMOTABLE_BLOCK_TYPES.includes(draggedBlockType ?? "");
  const isDragging = isDraggingSection || canPromoteBlock;

  if (!isDragging) return null;

  return (
    <div
      onDragOver={(e: React.DragEvent) => {
        // Handle section drag
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
        // Handle block drag (for promotable blocks)
        if (canPromoteBlock) {
          // Accept the drag
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

        // Handle section drop
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
          onDropSectionInZone(dragSectionId, zone, toIndex);
          setDraggedSectionId(null);
          return;
        }

        // Handle block drop (promote to section)
        if (canPromoteBlock && draggedBlockId && draggedFromSectionId) {
          onPromoteBlockToSection(
            draggedBlockId,
            draggedFromSectionId,
            draggedFromColumnId ?? undefined,
            draggedFromParentBlockId ?? undefined,
            zone,
            toIndex
          );
          setDraggedBlockId(null);
          setDraggedBlockType(null);
          setDraggedFromSectionId(null);
          setDraggedFromColumnId(null);
          setDraggedFromParentBlockId(null);
        }
      }}
      className={`relative z-10 overflow-hidden transition-[height] ${
        isDragging ? "h-8" : "h-0"
      }`}
    >
      <div
        className={`absolute inset-x-1 top-1/2 -translate-y-1/2 rounded border-2 border-dashed transition flex items-center justify-center ${
          isOver
            ? canPromoteBlock
              ? "border-emerald-500 bg-emerald-600/40 h-6"
              : "border-purple-500 bg-purple-600/40 h-6"
            : canPromoteBlock
              ? "border-emerald-500/50 bg-emerald-600/20 h-5"
              : "border-purple-500/50 bg-purple-600/20 h-5"
        }`}
      >
        {canPromoteBlock && (
          <span className={`text-[9px] font-medium ${isOver ? "text-emerald-200" : "text-emerald-400"}`}>
            {isOver ? "Release to extract" : "Drop here to extract"}
          </span>
        )}
        {isDraggingSection && !canPromoteBlock && (
          <span className={`text-[9px] font-medium ${isOver ? "text-purple-200" : "text-purple-400"}`}>
            {isOver ? "Release to move" : "Drop here"}
          </span>
        )}
      </div>
    </div>
  );
}
