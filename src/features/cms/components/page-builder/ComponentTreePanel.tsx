"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Layers, ChevronRight, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import type { SectionInstance } from "../../types/page-builder";
import type { PageZone } from "../../types/page-builder";
import type { PageSummary } from "../../types";
import { useCmsPages, useCmsPage } from "../../hooks/useCmsQueries";
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
  const pagesQuery = useCmsPages();
  const [selectedPageId, setSelectedPageId] = useState<string>("");
  const pageQuery = useCmsPage(selectedPageId || undefined);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedZones, setCollapsedZones] = useState<Set<PageZone>>(new Set());

  // Drag-and-drop state for blocks
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [draggedFromSectionId, setDraggedFromSectionId] = useState<string | null>(null);
  const [draggedFromColumnId, setDraggedFromColumnId] = useState<string | null>(null);
  const [draggedFromParentBlockId, setDraggedFromParentBlockId] = useState<string | null>(null);

  useEffect(() => {
    if (pagesQuery.data) {
      dispatch({ type: "SET_PAGES", pages: pagesQuery.data });
    }
  }, [pagesQuery.data, dispatch]);

  useEffect(() => {
    if (pageQuery.data) {
      dispatch({ type: "SET_CURRENT_PAGE", page: pageQuery.data });
    }
  }, [pageQuery.data, dispatch]);

  const handlePageChange = useCallback((value: string) => {
    setSelectedPageId(value);
  }, []);

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

  // Section drag-and-drop state
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);

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
    <aside className="flex w-72 flex-col border-r border-border bg-gray-900">
      {/* Page selector */}
      <div className="border-b border-border p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <Layers className="size-3.5" />
          <span>Page</span>
        </div>
        <Select value={selectedPageId} onValueChange={handlePageChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a page..." />
          </SelectTrigger>
          <SelectContent>
            {state.pages.map((page: PageSummary) => (
              <SelectItem key={page.id} value={page.id}>
                {page.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Zone groups */}
      <div className="flex-1 overflow-y-auto">
        {!state.currentPage ? (
          <div className="p-4 text-center text-sm text-gray-500">
            Select a page to start editing
          </div>
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
                onSelectNode={handleSelectNode}
                onAddSection={handleAddSection}
                onAddBlock={handleAddBlock}
                onDropBlock={handleDropBlock}
                onAddBlockToColumn={handleAddBlockToColumn}
                onDropBlockToColumn={handleDropBlockToColumn}
                onAddElementToNestedBlock={handleAddElementToNestedBlock}
                onDropSectionInZone={handleDropSectionInZone}
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
              />
            );
          })
        )}
      </div>
    </aside>
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
  onSelectNode: (nodeId: string) => void;
  onAddSection: (sectionType: string, zone: PageZone) => void;
  onAddBlock: (sectionId: string, blockType: string) => void;
  onDropBlock: (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => void;
  onAddBlockToColumn: (sectionId: string, columnId: string, blockType: string) => void;
  onDropBlockToColumn: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
  onAddElementToNestedBlock: (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
  onDropSectionInZone: (sectionId: string, zone: PageZone, toIndex: number) => void;
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
}

function ZoneGroup({
  zone,
  label,
  isCollapsed,
  onToggleZone,
  zoneSections,
  selectedNodeId,
  currentPage,
  onSelectNode,
  onAddSection,
  onAddBlock,
  onDropBlock,
  onAddBlockToColumn,
  onDropBlockToColumn,
  onAddElementToNestedBlock,
  onDropSectionInZone,
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
}: ZoneGroupProps): React.ReactNode {
  const [isZoneDragOver, setIsZoneDragOver] = useState(false);

  return (
    <div className="border-b border-border/50">
      {/* Zone header */}
      <div className="flex items-center justify-between px-4 py-2.5">
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
        <SectionPicker
          disabled={!currentPage}
          onSelect={(sectionType: string) => onAddSection(sectionType, zone)}
        />
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
                  onAddElementToNestedBlock={onAddElementToNestedBlock}
                  onDropSection={(sectionId: string, toIndex: number) => onDropSectionInZone(sectionId, zone, toIndex)}
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
