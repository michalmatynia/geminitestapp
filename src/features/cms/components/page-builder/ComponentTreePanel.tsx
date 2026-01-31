"use client";

import React, { useCallback, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { SectionInstance } from "../../types/page-builder";
import type { PageZone } from "../../types/page-builder";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";
import { SectionNodeItem } from "./ComponentTreeNodeItem";
import { SectionPicker } from "./SectionPicker";

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

  // Drag-and-drop state for blocks
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
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
        fromColumnId,
        fromParentBlockId,
        toSectionId,
        toColumnId,
        toParentBlockId,
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
      dispatch({ type: "REMOVE_COLUMN_FROM_ROW", sectionId, columnId, rowId });
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

  const handleDropSectionToColumn = useCallback(
    (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => {
      dispatch({
        type: "MOVE_SECTION_TO_COLUMN",
        sectionId,
        toSectionId,
        toColumnId,
        toParentBlockId,
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Zone groups */}
      <div className="flex-1 overflow-y-auto">
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
                onAddBlockToColumn={handleAddBlockToColumn}
                onDropBlockToColumn={handleDropBlockToColumn}
                onAddGridRow={handleAddGridRow}
                onAddColumnToRow={handleAddColumnToRow}
                onRemoveColumnFromRow={handleRemoveColumnFromRow}
                onAddElementToNestedBlock={handleAddElementToNestedBlock}
                onDropSectionInZone={handleDropSectionInZone}
                onPasteSection={handlePasteSection}
                onToggleSectionVisibility={handleToggleSectionVisibility}
                onRemoveSection={handleRemoveSection}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
                draggedBlockId={draggedBlockId}
                setDraggedBlockId={setDraggedBlockId}
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
                onDropSectionToColumn={handleDropSectionToColumn}
              />
            );
          })
        )}
      </div>
    </div>
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
  onAddBlockToColumn: (sectionId: string, columnId: string, blockType: string) => void;
  onDropBlockToColumn: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
  onAddGridRow: (sectionId: string) => void;
  onAddColumnToRow: (sectionId: string, rowId: string) => void;
  onRemoveColumnFromRow: (sectionId: string, columnId: string, rowId?: string) => void;
  onAddElementToNestedBlock: (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
  onDropSectionInZone: (sectionId: string, zone: PageZone, toIndex: number) => void;
  onPasteSection: (zone: PageZone) => void;
  onToggleSectionVisibility: (sectionId: string, isHidden: boolean) => void;
  onRemoveSection: (sectionId: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  draggedBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
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
  onDropSectionToColumn: (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => void;
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
  onAddBlockToColumn,
  onDropBlockToColumn,
  onAddGridRow,
  onAddColumnToRow,
  onRemoveColumnFromRow,
  onAddElementToNestedBlock,
  onDropSectionInZone,
  onPasteSection,
  onToggleSectionVisibility,
  onRemoveSection,
  expandedIds,
  onToggleExpand,
  draggedBlockId,
  setDraggedBlockId,
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
  onDropSectionToColumn,
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
                <SectionNodeItem
                  key={section.id}
                  section={section}
                  sectionIndex={index}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelectNode}
                  onAddBlock={onAddBlock}
                  onDropBlock={onDropBlock}
                  onAddBlockToColumn={onAddBlockToColumn}
                  onDropBlockToColumn={onDropBlockToColumn}
                  onAddGridRow={onAddGridRow}
                  onAddColumnToRow={onAddColumnToRow}
                  onRemoveColumnFromRow={onRemoveColumnFromRow}
                  onAddElementToNestedBlock={onAddElementToNestedBlock}
                  onDropSection={(sectionId: string, toIndex: number) => onDropSectionInZone(sectionId, zone, toIndex)}
                  onToggleSectionVisibility={onToggleSectionVisibility}
                  onRemoveSection={onRemoveSection}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  draggedBlockId={draggedBlockId}
                  setDraggedBlockId={setDraggedBlockId}
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
                  onDropSectionToColumn={onDropSectionToColumn}
                />
              ))}
              {/* Drop target at end of zone */}
              <ZoneDropTarget
                zone={zone}
                toIndex={zoneSections.length}
                draggedSectionId={draggedSectionId}
                setDraggedSectionId={setDraggedSectionId}
                onDropSectionInZone={onDropSectionInZone}
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
// Drop target at the bottom of a zone (thin line when hovering)
// ---------------------------------------------------------------------------

interface ZoneDropTargetProps {
  zone: PageZone;
  toIndex: number;
  draggedSectionId: string | null;
  setDraggedSectionId: (id: string | null) => void;
  onDropSectionInZone: (sectionId: string, zone: PageZone, toIndex: number) => void;
}

function ZoneDropTarget({ zone, toIndex, draggedSectionId, setDraggedSectionId, onDropSectionInZone }: ZoneDropTargetProps): React.ReactNode {
  const [isOver, setIsOver] = useState(false);

  if (!draggedSectionId) return null;

  return (
    <div
      onDragOver={(e: React.DragEvent) => {
        if (!draggedSectionId) return;
        e.preventDefault();
        e.stopPropagation();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOver(false);
        if (!draggedSectionId) return;
        onDropSectionInZone(draggedSectionId, zone, toIndex);
        setDraggedSectionId(null);
      }}
      className={`h-6 rounded transition ${
        isOver
          ? "bg-purple-600/20 border border-dashed border-purple-500/50"
          : "border border-dashed border-transparent"
      }`}
    />
  );
}
