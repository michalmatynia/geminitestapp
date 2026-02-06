"use client";

import React, { useMemo, useState } from "react";
import { Box, Trash2, Lock, GripVertical } from "lucide-react";
import { TreeRow, TreeActionButton, TreeActionSlot, TreeContextMenu, type TreeContextMenuItem } from "@/shared/ui";
import { readBlockDragData, setBlockDragData } from "../../../utils/page-builder-dnd";
import { DRAG_KEYS, hasDragType } from "@/shared/utils/drag-drop";
import { useDragStateExtract } from "../../../hooks/useDragStateExtract";
import { BLOCK_ICONS, resolveBlockLabel } from "./tree-constants";
import type { BlockNodeItemProps } from "./tree-types";

export function BlockNodeItem({
  block,
  index,
  sectionId,
  columnId,
  parentBlockId,
  selectedNodeId,
  onSelect,
  onDropBlock,
  onDropBlockToColumn,
  onDropBlockToSection,
  onRemoveBlock,
  disableDrag = false,
}: BlockNodeItemProps): React.ReactNode {
  // Drag state from context
  const drag = useDragStateExtract();
  const { startBlockDrag, endBlockDrag } = drag.actions;

  const draggedBlockId = drag.block.id;
  const draggedBlockType = drag.block.type;
  const draggedFromSectionId = drag.block.fromSectionId;
  const draggedFromColumnId = drag.block.fromColumnId;
  const draggedFromParentBlockId = drag.block.fromParentBlockId;

  const isSelected = selectedNodeId === block.id;
  const Icon = BLOCK_ICONS[block.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === block.id;
  const blockLabel = resolveBlockLabel(block, block.type);

  // Check if this is an ImageElement in background mode (locked/immovable)
  const isBackgroundMode = block.type === "ImageElement" &&
    (block.settings?.["backgroundTarget"] as string || "none") !== "none";
  const backgroundTarget = (block.settings?.["backgroundTarget"] as string) || "none";
  const canDrag = !disableDrag && !isBackgroundMode;

  const blockMenuItems: TreeContextMenuItem[] = useMemo(
    () => [
      {
        id: "remove-block",
        label: "Remove block",
        icon: <Trash2 className="size-3.5" />,
        tone: "danger",
        disabled: !onRemoveBlock || isBackgroundMode,
        onSelect: (): void => {
          if (onRemoveBlock && !isBackgroundMode) onRemoveBlock(sectionId, block.id, columnId, parentBlockId);
        },
      },
    ],
    [onRemoveBlock, isBackgroundMode, sectionId, block.id, columnId, parentBlockId]
  );

  return (
    <TreeContextMenu items={blockMenuItems}>
      <TreeRow
        tone="none"
        role="button"
        tabIndex={0}
        draggable={canDrag}
        onClick={() => onSelect(block.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(block.id);
          }
        }}
        onDragStart={(e: React.DragEvent) => {
          if (!canDrag) return;
          setBlockDragData(e.dataTransfer, {
            id: block.id,
            type: block.type,
            fromSectionId: sectionId,
            fromColumnId: columnId ?? "",
            fromParentBlockId: parentBlockId ?? "",
          });
          // Defer state updates to prevent re-render from cancelling drag
          setTimeout(() => {
            startBlockDrag({
              id: block.id,
              type: block.type,
              fromSectionId: sectionId,
              fromColumnId: columnId ?? null,
              fromParentBlockId: parentBlockId ?? null,
            });
          }, 0);
        }}
        onDragEnd={() => {
          if (!canDrag) return;
          endBlockDrag();
        }}
        onDragOver={(e: React.DragEvent) => {
          if (disableDrag) return;
          const hasBlockPayload = hasDragType(e.dataTransfer, [DRAG_KEYS.TEXT]);
          const blockDrag = readBlockDragData(e.dataTransfer, {
            id: draggedBlockId,
            ...(draggedBlockType !== undefined ? { type: draggedBlockType } : {}),
          });
          const dragId = blockDrag.id;
          if ((!dragId && !hasBlockPayload) || draggedBlockId === block.id || dragId === block.id) return;
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={(e: React.DragEvent) => {
          if (disableDrag) return;
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragOver(false);
        }}
        onDrop={(e: React.DragEvent) => {
          if (disableDrag) return;
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const blockDrag = readBlockDragData(e.dataTransfer, {
            id: draggedBlockId,
            ...(draggedBlockType !== undefined ? { type: draggedBlockType } : {}),
            fromSectionId: draggedFromSectionId,
            ...(draggedFromColumnId !== undefined ? { fromColumnId: draggedFromColumnId } : {}),
            ...(draggedFromParentBlockId !== undefined ? { fromParentBlockId: draggedFromParentBlockId } : {}),
          });
          const dragId = blockDrag.id;
          if (!dragId || dragId === block.id) return;
          const fromSection = blockDrag.fromSectionId ?? sectionId;
          const fromColumn = blockDrag.fromColumnId;
          const fromParent = blockDrag.fromParentBlockId;
          if (columnId && onDropBlockToColumn) {
            onDropBlockToColumn(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              columnId,
              index,
              fromParent || undefined,
              parentBlockId
            );
            endBlockDrag();
            return;
          }
          if (!fromSection) return;
          if ((fromColumn || fromParent) && onDropBlockToSection) {
            onDropBlockToSection(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              index,
              fromParent || undefined
            );
          } else {
            onDropBlock(dragId, fromSection, sectionId, index);
          }
          endBlockDrag();
        }}
        className={`group flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm transition ${
          isBackgroundMode ? "cursor-not-allowed" : "cursor-pointer"
        } ${
          isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
            : isSelected
            ? "bg-blue-600/80 text-white"
            : isDragging
            ? "opacity-40 text-gray-400"
            : isBackgroundMode
            ? "text-gray-500 hover:bg-muted/20"
            : "text-gray-400 hover:bg-muted/40 hover:text-gray-300"
        }`}
      >
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1 truncate">{blockLabel}</span>
      {isBackgroundMode ? (
        <span title={`Locked as ${backgroundTarget} background`}>
          <Lock className="size-3 shrink-0 text-amber-500" />
        </span>
      ) : canDrag ? (
        <div
          draggable
          onDragStart={(e: React.DragEvent) => {
            if (!canDrag) return;
            e.stopPropagation();
            setBlockDragData(e.dataTransfer, {
              id: block.id,
              type: block.type,
              fromSectionId: sectionId,
              fromColumnId: columnId ?? "",
              fromParentBlockId: parentBlockId ?? "",
            });
            // Defer state updates to prevent re-render from cancelling drag
            setTimeout(() => {
              startBlockDrag({
                id: block.id,
                type: block.type,
                fromSectionId: sectionId,
                fromColumnId: columnId ?? null,
                fromParentBlockId: parentBlockId ?? null,
              });
            }, 0);
          }}
          onDragEnd={() => {
            if (!canDrag) return;
            endBlockDrag();
          }}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          className="flex items-center justify-center opacity-0 group-hover:opacity-100"
          aria-label="Drag element"
        >
          <GripVertical className="size-3 shrink-0 text-gray-600 cursor-grab active:cursor-grabbing" />
        </div>
      ) : (
        <span className="size-3 shrink-0" />
      )}
      {isBackgroundMode && (
        <span className="text-[9px] text-amber-500/70 uppercase">{backgroundTarget} bg</span>
      )}
      {isDragOver && (
        <span className="text-[10px] text-emerald-300">Insert here</span>
      )}
      {/* Delete button - visible on hover when selected or always visible on hover */}
      {onRemoveBlock && !isDragOver && !isBackgroundMode && (
        <TreeActionSlot show="hover" align="end">
          <TreeActionButton
            tone="danger"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onRemoveBlock(sectionId, block.id, columnId, parentBlockId);
            }}
            title="Remove block"
          >
            <Trash2 className="size-3" />
          </TreeActionButton>
        </TreeActionSlot>
      )}
      </TreeRow>
    </TreeContextMenu>
  );
}
