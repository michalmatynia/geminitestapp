"use client";

import React, { useMemo, useState } from "react";
import { Columns, Minus } from "lucide-react";
import { TreeRow, TreeCaret, TreeActionButton, TreeActionSlot, TreeContextMenu, type TreeContextMenuItem } from "@/shared/ui";
import { readBlockDragData, readSectionDragData } from "../../../utils/page-builder-dnd";
import { DRAG_KEYS, hasDragType } from "@/shared/utils/drag-drop";
import type { BlockInstance } from "../../../types/page-builder";
import { useDragStateExtract } from "../../../hooks/useDragStateExtract";
import { ColumnBlockPicker } from "../ColumnBlockPicker";
import { SECTION_BLOCK_TYPES, CONVERTIBLE_SECTION_TYPES, resolveNodeLabel } from "./tree-constants";
import { BlockNodeItem } from "./BlockNodeItem";
import { SectionBlockNodeItem } from "./SectionBlockNodeItem";
import type { ColumnNodeItemProps } from "./tree-types";

export function ColumnNodeItem({
  column,
  columnIndex,
  sectionId,
  selectedNodeId,
  onSelect,
  onAddBlockToColumn,
  onDropBlockToColumn,
  onAddElementToNestedBlock,
  onRemoveColumnFromRow,
  rowId,
  rowColumnCount,
  expandedIds,
  onToggleExpand,
  onDropSectionToColumn,
  onRemoveBlock,
}: ColumnNodeItemProps): React.ReactNode {
  // Drag state from context
  const drag = useDragStateExtract();
  const { endBlockDrag, endSectionDrag } = drag.actions;

  const draggedBlockId = drag.block.id;
  const draggedBlockType = drag.block.type;
  const draggedFromSectionId = drag.block.fromSectionId;
  const draggedFromColumnId = drag.block.fromColumnId;
  const draggedFromParentBlockId = drag.block.fromParentBlockId;
  const draggedSectionId = drag.section.id;
  const draggedSectionType = drag.section.type;

  const isSelected = selectedNodeId === column.id;
  const isExpanded = expandedIds.has(column.id);
  const hasBlocks = (column.blocks ?? []).length > 0;
  const [isDragOver, setIsDragOver] = useState(false);
  const canRemove = rowColumnCount === undefined ? true : rowColumnCount > 1;
  const columnLabel = resolveNodeLabel(`Column ${columnIndex + 1}`, column.settings["label"]);
  const columnMenuItems: TreeContextMenuItem[] = useMemo(
    () => [
      {
        id: "remove-column",
        label: "Remove column",
        icon: <Minus className="size-3.5" />,
        tone: "danger",
        disabled: !canRemove,
        onSelect: (): void => {
          if (canRemove) onRemoveColumnFromRow(sectionId, column.id, rowId);
        },
      },
    ],
    [canRemove, onRemoveColumnFromRow, sectionId, column.id, rowId]
  );

  const handleColumnDragOver = (e: React.DragEvent): void => {
    const hasBlockPayload = hasDragType(e.dataTransfer, [DRAG_KEYS.TEXT]);
    const blockDrag = readBlockDragData(e.dataTransfer, {
      id: draggedBlockId,
      type: draggedBlockType,
    });
    const dragId = blockDrag.id;
    const isSectionDrop = draggedSectionId && draggedSectionId !== sectionId && CONVERTIBLE_SECTION_TYPES.includes(draggedSectionType ?? "");
    if (!dragId && !hasBlockPayload && !isSectionDrop) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleColumnDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Check if this is a section drop (section drag sets "sectionId" in dataTransfer)
    const sectionDrag = readSectionDragData(e.dataTransfer, {
      id: draggedSectionId,
      type: draggedSectionType,
    });
    const draggedSectionIdFromTransfer = sectionDrag.id;
    const draggedSectionTypeFromTransfer = sectionDrag.type;
    const isSectionDrag = Boolean(draggedSectionIdFromTransfer) || Boolean(draggedSectionId);

    if (isSectionDrag) {
      const sectionIdToDrop = draggedSectionId || draggedSectionIdFromTransfer;
      const sectionTypeToDrop = draggedSectionType || draggedSectionTypeFromTransfer;
      if (sectionIdToDrop && sectionIdToDrop !== sectionId && CONVERTIBLE_SECTION_TYPES.includes(sectionTypeToDrop ?? "")) {
        onDropSectionToColumn(sectionIdToDrop, sectionId, column.id, (column.blocks ?? []).length);
        endSectionDrag();
      }
      return;
    }

    // Otherwise it's a block drop
    const blockDrag = readBlockDragData(e.dataTransfer, {
      id: draggedBlockId,
      type: draggedBlockType,
      fromSectionId: draggedFromSectionId,
      fromColumnId: draggedFromColumnId,
      fromParentBlockId: draggedFromParentBlockId,
    });
    const dragId = blockDrag.id;
    const fromSection = blockDrag.fromSectionId ?? sectionId;
    const fromColumn = blockDrag.fromColumnId;
    const fromParent = blockDrag.fromParentBlockId;
    if (dragId) {
      onDropBlockToColumn(
        dragId,
        fromSection,
        fromColumn || undefined,
        sectionId,
        column.id,
        (column.blocks ?? []).length,
        fromParent || undefined
      );
      endBlockDrag();
    }
  };

  return (
    <div
      draggable={false}
      onDragStart={(e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragOver={handleColumnDragOver}
      onDragLeave={(e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsDragOver(false);
      }}
      onDrop={handleColumnDrop}
      className={`${isDragOver ? "rounded ring-1 ring-emerald-500/30" : ""}`}
    >
      <TreeContextMenu items={columnMenuItems}>
        <TreeRow
        tone="none"
        role="button"
        tabIndex={0}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onSelect(column.id);
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onSelect(column.id);
          }
        }}
        onDragOver={handleColumnDragOver}
        onDragLeave={(e: React.DragEvent) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragOver(false);
        }}
        onDrop={handleColumnDrop}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition ${
          isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
          : isSelected
            ? "bg-blue-600/80 text-white"
            : "text-gray-300 hover:bg-muted/40"
        }`}
      >
        <TreeCaret
          isOpen={isExpanded}
          hasChildren={true}
          ariaLabel={isExpanded ? "Collapse column" : "Expand column"}
          onToggle={(): void => onToggleExpand(column.id)}
          iconClassName="size-3"
          placeholderClassName="block size-3 shrink-0"
        />
        <Columns className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">{columnLabel}</span>
        {isDragOver && (
          <span className="text-[10px] text-emerald-300">Drop here</span>
        )}
        <TreeActionSlot show="always" align="inline">
          <TreeActionButton
            tone="danger"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (!canRemove) return;
              onRemoveColumnFromRow(sectionId, column.id, rowId);
            }}
            disabled={!canRemove}
            className="disabled:cursor-not-allowed disabled:opacity-40"
            title={canRemove ? "Remove column" : "At least one column is required"}
          >
            <Minus className="size-3" />
          </TreeActionButton>
          <ColumnBlockPicker
            onSelect={(blockType: string) => onAddBlockToColumn(sectionId, column.id, blockType)}
          />
        </TreeActionSlot>
        </TreeRow>
      </TreeContextMenu>

      {isExpanded && (
        <div
          className="ml-4 border-l border-border/30 pl-1"
          onDragOver={handleColumnDragOver}
          onDragLeave={(e: React.DragEvent) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDragOver(false);
          }}
          onDrop={handleColumnDrop}
        >
          {hasBlocks ? (
            (column.blocks ?? []).map((block: BlockInstance, index: number) =>
              SECTION_BLOCK_TYPES.includes(block.type) ? (
                <SectionBlockNodeItem
                  key={block.id}
                  block={block}
                  index={index}
                  sectionId={sectionId}
                  columnId={column.id}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onAddElementToNestedBlock={onAddElementToNestedBlock}
                  onDropBlockToColumn={onDropBlockToColumn}
                  onRemoveBlock={onRemoveBlock}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  onDropSectionToColumn={onDropSectionToColumn}
                />
              ) : (
                <BlockNodeItem
                  key={block.id}
                  block={block}
                  index={index}
                  sectionId={sectionId}
                  columnId={column.id}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onDropBlock={() => {}}
                  onDropBlockToColumn={onDropBlockToColumn}
                  onRemoveBlock={onRemoveBlock}
                />
              )
            )
          ) : (
            <div
              onDragOver={handleColumnDragOver}
              onDragLeave={(e: React.DragEvent) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDragOver(false);
              }}
              onDrop={handleColumnDrop}
              className={`mt-1 flex min-h-[36px] items-center gap-2 rounded border border-dashed px-2 py-1 text-[11px] transition ${
                isDragOver
                  ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-200"
                  : "border-border/30 text-gray-500"
              }`}
            >
              Drop blocks here
            </div>
          )}
        </div>
      )}
    </div>
  );
}
