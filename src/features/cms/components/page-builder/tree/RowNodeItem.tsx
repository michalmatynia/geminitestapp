"use client";

import React, { useMemo, useState } from "react";
import { Columns, Trash2, Plus, GripVertical } from "lucide-react";
import { TreeRow, TreeCaret, TreeActionButton, TreeActionSlot, TreeContextMenu, type TreeContextMenuItem } from "@/shared/ui";
import { readBlockDragData, readSectionDragData } from "../../../utils/page-builder-dnd";
import { DRAG_KEYS, hasDragType } from "@/shared/utils/drag-drop";
import type { BlockInstance } from "../../../types/page-builder";
import { useDragStateExtract } from "../../../hooks/useDragStateExtract";
import { CONVERTIBLE_SECTION_TYPES, resolveNodeLabel } from "./tree-constants";
import { BlockNodeItem } from "./BlockNodeItem";
import { ColumnNodeItem } from "./ColumnNodeItem";
import type { RowNodeItemProps } from "./tree-types";

export function RowNodeItem({
  row,
  rowIndex,
  rowCount,
  sectionId,
  selectedNodeId,
  onSelect,
  onAddColumnToRow,
  onRemoveGridRow,
  onRemoveColumnFromRow,
  onAddBlockToColumn,
  onDropBlockToColumn,
  onDropBlockToRow,
  onAddElementToNestedBlock,
  expandedIds,
  onToggleExpand,
  onDropSectionToColumn,
  onRemoveBlock,
}: RowNodeItemProps): React.ReactNode {
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

  const isSelected = selectedNodeId === row.id;
  const isExpanded = expandedIds.has(row.id);
  const columns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
  const canRemoveRow = rowCount > 1;
  const [isDragOver, setIsDragOver] = useState(false);
  const firstColumn = columns[0] ?? null;
  const rowLabel = resolveNodeLabel(`Row ${rowIndex + 1}`, row.settings["label"]);
  const rowMenuItems: TreeContextMenuItem[] = useMemo(
    () => [
      {
        id: "add-column",
        label: "Add column",
        icon: <Columns className="size-3.5" />,
        onSelect: () => onAddColumnToRow(sectionId, row.id),
      },
      { id: "separator-1", separator: true },
      {
        id: "remove-row",
        label: "Remove row",
        icon: <Trash2 className="size-3.5" />,
        tone: "danger",
        disabled: !canRemoveRow,
        onSelect: (): void => {
          if (canRemoveRow) onRemoveGridRow(sectionId, row.id);
        },
      },
    ],
    [canRemoveRow, onAddColumnToRow, onRemoveGridRow, row.id, sectionId]
  );

  return (
    <div>
      <TreeContextMenu items={rowMenuItems}>
        <TreeRow
        tone="none"
        role="button"
        tabIndex={0}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onSelect(row.id);
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            onSelect(row.id);
          }
        }}
        onDragOver={(e: React.DragEvent) => {
          const blockDrag = readBlockDragData(e.dataTransfer, {
            id: draggedBlockId,
            type: draggedBlockType,
          });
          const hasBlockPayload = hasDragType(e.dataTransfer, [DRAG_KEYS.TEXT]);
          const dragId = blockDrag.id;
          // Allow section drops (for convertible sections like ImageElement, TextElement, etc.)
          const isSectionDrop = draggedSectionId && draggedSectionId !== sectionId && CONVERTIBLE_SECTION_TYPES.includes(draggedSectionType ?? "");
          // Allow drops if we have a block or convertible section being dragged
          if (!dragId && !hasBlockPayload && !isSectionDrop) return;
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={(e: React.DragEvent) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragOver(false);
        }}
        onDrop={(e: React.DragEvent) => {
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
              // Route to first column if available
              if (firstColumn) {
                onDropSectionToColumn(sectionIdToDrop, sectionId, firstColumn.id, (firstColumn.blocks ?? []).length);
              }
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
          if (!dragId) return;

          const fromSection = blockDrag.fromSectionId ?? sectionId;
          const fromColumn = blockDrag.fromColumnId;
          const fromParent = blockDrag.fromParentBlockId;
          if (!fromSection) return;

          // Get the block type being dragged
          const blockType = blockDrag.type ?? "";

          // If it's a Column type, route to first column (existing behavior)
          if (blockType === "Column" && firstColumn) {
            onDropBlockToColumn(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              firstColumn.id,
              (firstColumn.blocks ?? []).length,
              fromParent || undefined
            );
          } else {
            // For all other block types, drop directly into the Row
            const rowChildren = row.blocks ?? [];
            onDropBlockToRow(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              row.id,
              rowChildren.length,
              fromParent || undefined
            );
          }

          endBlockDrag();
        }}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition ${
          isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
            : isSelected
            ? "bg-blue-600/80 text-white"
            : "text-gray-300 hover:bg-muted/40"
        }`}
      >
        <GripVertical className="size-3.5 shrink-0" />
        <TreeCaret
          isOpen={isExpanded}
          hasChildren={true}
          ariaLabel={isExpanded ? "Collapse row" : "Expand row"}
          onToggle={(): void => onToggleExpand(row.id)}
          iconClassName="size-3"
          placeholderClassName="block size-3 shrink-0"
        />
        <span className="flex-1 truncate text-left">{rowLabel}</span>
        <TreeActionSlot show="always" align="inline">
          <TreeActionButton
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onAddColumnToRow(sectionId, row.id);
            }}
            title="Add column"
          >
            <Plus className="size-3" />
          </TreeActionButton>
          <TreeActionButton
            tone="danger"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              if (!canRemoveRow) return;
              onRemoveGridRow(sectionId, row.id);
            }}
            disabled={!canRemoveRow}
            className="disabled:cursor-not-allowed disabled:opacity-40"
            title={canRemoveRow ? "Remove row" : "At least one row is required"}
          >
            <Trash2 className="size-3" />
          </TreeActionButton>
        </TreeActionSlot>
        </TreeRow>
      </TreeContextMenu>

      {isExpanded && (row.blocks ?? []).length > 0 && (
        <div className="ml-4 border-l border-border/30 pl-1">
          {/* Render all row children - both Columns and direct elements */}
          {(row.blocks ?? []).map((child: BlockInstance, childIndex: number) => {
            if (child.type === "Column") {
              return (
                <ColumnNodeItem
                  key={child.id}
                  column={child}
                  columnIndex={childIndex}
                  sectionId={sectionId}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onAddBlockToColumn={onAddBlockToColumn}
                  onDropBlockToColumn={onDropBlockToColumn}
                  onAddElementToNestedBlock={onAddElementToNestedBlock}
                  onRemoveColumnFromRow={onRemoveColumnFromRow}
                  onRemoveBlock={onRemoveBlock}
                  rowId={row.id}
                  rowColumnCount={columns.length}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  onDropSectionToColumn={onDropSectionToColumn}
                />
              );
            }
            // Render direct element children (non-Column blocks in the Row)
            return (
              <BlockNodeItem
                key={child.id}
                block={child}
                index={childIndex}
                sectionId={sectionId}
                parentBlockId={row.id}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
                onDropBlock={() => {}}
                onDropBlockToColumn={onDropBlockToColumn}
                onRemoveBlock={onRemoveBlock}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
