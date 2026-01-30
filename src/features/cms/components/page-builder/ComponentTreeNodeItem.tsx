"use client";

import React, { useState } from "react";
import { ChevronRight, ChevronDown, Heading, AlignLeft, MousePointerClick, Box, Layers, GripVertical, LayoutGrid, Columns, FileText, LayoutTemplate } from "lucide-react";
import type { SectionInstance, BlockInstance } from "../../types/page-builder";
import { BlockPicker } from "./BlockPicker";
import { ColumnBlockPicker } from "./ColumnBlockPicker";

const SECTION_ICONS: Record<string, React.ElementType> = {
  ImageWithText: Layers,
  RichText: AlignLeft,
  Hero: Layers,
  Grid: LayoutGrid,
};

const BLOCK_ICONS: Record<string, React.ElementType> = {
  Heading: Heading,
  Text: AlignLeft,
  Button: MousePointerClick,
  Column: Columns,
  ImageWithText: Layers,
  RichText: FileText,
  Hero: LayoutTemplate,
};

const SECTION_BLOCK_TYPES = ["ImageWithText", "Hero"];

// ---------------------------------------------------------------------------
// Section node
// ---------------------------------------------------------------------------

interface SectionNodeItemProps {
  section: SectionInstance;
  sectionIndex: number;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onAddBlock: (sectionId: string, blockType: string) => void;
  onDropBlock: (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => void;
  onAddBlockToColumn: (sectionId: string, columnId: string, blockType: string) => void;
  onDropBlockToColumn: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
  onAddElementToNestedBlock: (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
  onDropSection: (sectionId: string, toIndex: number) => void;
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

export function SectionNodeItem({
  section,
  sectionIndex,
  selectedNodeId,
  onSelect,
  onAddBlock,
  onDropBlock,
  onAddBlockToColumn,
  onDropBlockToColumn,
  onAddElementToNestedBlock,
  onDropSection,
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
}: SectionNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === section.id;
  const isExpanded = expandedIds.has(section.id);
  const hasBlocks = section.blocks.length > 0;
  const Icon = SECTION_ICONS[section.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSectionDragOver, setIsSectionDragOver] = useState(false);
  const isDraggingSection = draggedSectionId === section.id;

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData("sectionId", section.id);
        e.dataTransfer.effectAllowed = "move";
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "0.4";
        setDraggedSectionId(section.id);
      }}
      onDragEnd={(e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "1";
        setDraggedSectionId(null);
      }}
      className="group/section"
    >
      <button
        type="button"
        onClick={() => onSelect(section.id)}
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedSectionId && draggedSectionId !== section.id) {
            setIsSectionDragOver(true);
          } else if (draggedBlockId) {
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => {
          setIsDragOver(false);
          setIsSectionDragOver(false);
        }}
        onDrop={(e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          setIsSectionDragOver(false);
          if (draggedSectionId && draggedSectionId !== section.id) {
            // Section drop — insert at this section's position
            onDropSection(draggedSectionId, sectionIndex);
            setDraggedSectionId(null);
          } else if (draggedBlockId && draggedFromSectionId) {
            // Block drop
            onDropBlock(draggedBlockId, draggedFromSectionId, section.id, section.blocks.length);
            setDraggedBlockId(null);
            setDraggedFromSectionId(null);
          }
        }}
        className={`flex w-full items-center gap-2 rounded px-2 py-2 text-sm font-medium transition ${
          isSectionDragOver
            ? "bg-purple-600/30 text-purple-200 ring-1 ring-purple-500/50"
            : isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
            : isDraggingSection
            ? "opacity-40 text-gray-400"
            : isSelected
            ? "bg-blue-600 text-white"
            : "text-gray-200 hover:bg-muted/50"
        }`}
      >
        <GripVertical className="size-3 shrink-0 cursor-grab text-gray-600 opacity-0 group-hover/section:opacity-100 active:cursor-grabbing" />
        <div
          role="button"
          tabIndex={-1}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleExpand(section.id);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleExpand(section.id);
            }
          }}
          className="shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </div>
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">
          {(section.settings["label"] as string | undefined) ?? section.type}
        </span>
        {isSectionDragOver && (
          <span className="text-[10px] text-purple-300">Move here</span>
        )}
        {isDragOver && (
          <span className="text-[10px] text-emerald-300">Drop here</span>
        )}
        {section.type !== "Grid" && (
          <BlockPicker
            sectionType={section.type}
            onSelect={(blockType: string) => onAddBlock(section.id, blockType)}
          />
        )}
      </button>

      {isExpanded && hasBlocks && section.type === "Grid" && (
        <div className="ml-4 border-l border-border/30 pl-1">
          {section.blocks
            .filter((b: BlockInstance) => b.type === "Column")
            .map((column: BlockInstance, colIndex: number) => (
              <ColumnNodeItem
                key={column.id}
                column={column}
                columnIndex={colIndex}
                sectionId={section.id}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
                onAddBlockToColumn={onAddBlockToColumn}
                onDropBlockToColumn={onDropBlockToColumn}
                onAddElementToNestedBlock={onAddElementToNestedBlock}
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
              />
            ))}
        </div>
      )}

      {isExpanded && hasBlocks && section.type !== "Grid" && (
        <div className="ml-4 border-l border-border/30 pl-1">
          {section.blocks.map((block: BlockInstance, index: number) => (
            <BlockNodeItem
              key={block.id}
              block={block}
              index={index}
              sectionId={section.id}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onDropBlock={onDropBlock}
              draggedBlockId={draggedBlockId}
              setDraggedBlockId={setDraggedBlockId}
              draggedFromSectionId={draggedFromSectionId}
              setDraggedFromSectionId={setDraggedFromSectionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column node (non-draggable, inside Grid sections)
// ---------------------------------------------------------------------------

interface ColumnNodeItemProps {
  column: BlockInstance;
  columnIndex: number;
  sectionId: string;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onAddBlockToColumn: (sectionId: string, columnId: string, blockType: string) => void;
  onDropBlockToColumn: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
  onAddElementToNestedBlock: (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
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
}

function ColumnNodeItem({
  column,
  columnIndex,
  sectionId,
  selectedNodeId,
  onSelect,
  onAddBlockToColumn,
  onDropBlockToColumn,
  onAddElementToNestedBlock,
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
}: ColumnNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === column.id;
  const isExpanded = expandedIds.has(column.id);
  const hasBlocks = (column.blocks ?? []).length > 0;
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(column.id)}
        onDragOver={(e: React.DragEvent) => {
          if (!draggedBlockId) return;
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          if (!draggedBlockId || !draggedFromSectionId) return;
          onDropBlockToColumn(draggedBlockId, draggedFromSectionId, draggedFromColumnId ?? undefined, sectionId, column.id, (column.blocks ?? []).length, draggedFromParentBlockId ?? undefined);
          setDraggedBlockId(null);
          setDraggedFromSectionId(null);
          setDraggedFromColumnId(null);
          setDraggedFromParentBlockId(null);
        }}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition ${
          isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
            : isSelected
            ? "bg-blue-600/80 text-white"
            : "text-gray-300 hover:bg-muted/40"
        }`}
      >
        <div
          role="button"
          tabIndex={-1}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleExpand(column.id);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleExpand(column.id);
            }
          }}
          className="shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
        </div>
        <Columns className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">Column {columnIndex + 1}</span>
        {isDragOver && (
          <span className="text-[10px] text-emerald-300">Drop here</span>
        )}
        <ColumnBlockPicker
          onSelect={(blockType: string) => onAddBlockToColumn(sectionId, column.id, blockType)}
        />
      </button>

      {isExpanded && hasBlocks && (
        <div className="ml-4 border-l border-border/30 pl-1">
          {(column.blocks ?? []).map((block: BlockInstance, index: number) =>
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
                draggedBlockId={draggedBlockId}
                setDraggedBlockId={setDraggedBlockId}
                draggedFromSectionId={draggedFromSectionId}
                setDraggedFromSectionId={setDraggedFromSectionId}
                draggedFromColumnId={draggedFromColumnId}
                setDraggedFromColumnId={setDraggedFromColumnId}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section-type block node (draggable + expandable container inside columns)
// ---------------------------------------------------------------------------

interface SectionBlockNodeItemProps {
  block: BlockInstance;
  index: number;
  sectionId: string;
  columnId: string;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onAddElementToNestedBlock: (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
  onDropBlockToColumn: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
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
}

function SectionBlockNodeItem({
  block,
  sectionId,
  columnId,
  selectedNodeId,
  onSelect,
  onAddElementToNestedBlock,
  onDropBlockToColumn,
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
}: SectionBlockNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === block.id;
  const isExpanded = expandedIds.has(block.id);
  const hasChildren = (block.blocks ?? []).length > 0;
  const Icon = BLOCK_ICONS[block.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === block.id;

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData("blockId", block.id);
        e.dataTransfer.effectAllowed = "move";
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "0.4";
        setDraggedBlockId(block.id);
        setDraggedFromSectionId(sectionId);
        setDraggedFromColumnId(columnId);
        setDraggedFromParentBlockId(null);
      }}
      onDragEnd={(e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "1";
        setDraggedBlockId(null);
        setDraggedFromSectionId(null);
        setDraggedFromColumnId(null);
        setDraggedFromParentBlockId(null);
      }}
      className="group/sblock"
    >
      <button
        type="button"
        onClick={() => onSelect(block.id)}
        onDragOver={(e: React.DragEvent) => {
          if (!draggedBlockId || draggedBlockId === block.id) return;
          // Only accept element-type drops (not section blocks)
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          if (!draggedBlockId || !draggedFromSectionId || draggedBlockId === block.id) return;
          // Drop element into this section-type block
          onDropBlockToColumn(
            draggedBlockId,
            draggedFromSectionId,
            draggedFromColumnId ?? undefined,
            sectionId,
            columnId,
            (block.blocks ?? []).length,
            draggedFromParentBlockId ?? undefined,
            block.id
          );
          setDraggedBlockId(null);
          setDraggedFromSectionId(null);
          setDraggedFromColumnId(null);
          setDraggedFromParentBlockId(null);
        }}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition ${
          isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
            : isSelected
            ? "bg-blue-600/80 text-white"
            : isDragging
            ? "opacity-40 text-gray-400"
            : "text-gray-300 hover:bg-muted/40"
        }`}
      >
        <GripVertical className="size-3 shrink-0 cursor-grab text-gray-600 opacity-0 group-hover/sblock:opacity-100 active:cursor-grabbing" />
        <div
          role="button"
          tabIndex={-1}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleExpand(block.id);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleExpand(block.id);
            }
          }}
          className="shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="size-3" />
          ) : (
            <ChevronRight className="size-3" />
          )}
        </div>
        <Icon className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">{block.type}</span>
        {isDragOver && (
          <span className="text-[10px] text-emerald-300">Drop here</span>
        )}
        <ColumnBlockPicker
          onSelect={(elemType: string) => onAddElementToNestedBlock(sectionId, columnId, block.id, elemType)}
        />
      </button>

      {isExpanded && hasChildren && (
        <div className="ml-5 border-l border-border/30 pl-1">
          {(block.blocks ?? []).map((child: BlockInstance, childIndex: number) => (
            <BlockNodeItem
              key={child.id}
              block={child}
              index={childIndex}
              sectionId={sectionId}
              columnId={columnId}
              parentBlockId={block.id}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onDropBlock={() => {}}
              draggedBlockId={draggedBlockId}
              setDraggedBlockId={setDraggedBlockId}
              draggedFromSectionId={draggedFromSectionId}
              setDraggedFromSectionId={setDraggedFromSectionId}
              draggedFromColumnId={draggedFromColumnId}
              setDraggedFromColumnId={setDraggedFromColumnId}
              draggedFromParentBlockId={draggedFromParentBlockId}
              setDraggedFromParentBlockId={setDraggedFromParentBlockId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block node (draggable)
// ---------------------------------------------------------------------------

interface BlockNodeItemProps {
  block: BlockInstance;
  index: number;
  sectionId: string;
  columnId?: string;
  parentBlockId?: string;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onDropBlock: (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => void;
  draggedBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
  draggedFromSectionId: string | null;
  setDraggedFromSectionId: (id: string | null) => void;
  draggedFromColumnId?: string | null;
  setDraggedFromColumnId?: (id: string | null) => void;
  draggedFromParentBlockId?: string | null;
  setDraggedFromParentBlockId?: (id: string | null) => void;
}

function BlockNodeItem({
  block,
  index,
  sectionId,
  columnId,
  parentBlockId,
  selectedNodeId,
  onSelect,
  onDropBlock,
  draggedBlockId,
  setDraggedBlockId,
  draggedFromSectionId,
  setDraggedFromSectionId,
  setDraggedFromColumnId,
  setDraggedFromParentBlockId,
}: BlockNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === block.id;
  const Icon = BLOCK_ICONS[block.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === block.id;

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData("blockId", block.id);
        e.dataTransfer.effectAllowed = "move";
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "0.4";
        setDraggedBlockId(block.id);
        setDraggedFromSectionId(sectionId);
        if (setDraggedFromColumnId) setDraggedFromColumnId(columnId ?? null);
        if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(parentBlockId ?? null);
      }}
      onDragEnd={(e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "1";
        setDraggedBlockId(null);
        setDraggedFromSectionId(null);
        if (setDraggedFromColumnId) setDraggedFromColumnId(null);
        if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(null);
      }}
      onDragOver={(e: React.DragEvent) => {
        if (!draggedBlockId || draggedBlockId === block.id) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (!draggedBlockId || !draggedFromSectionId || draggedBlockId === block.id) return;
        onDropBlock(draggedBlockId, draggedFromSectionId, sectionId, index);
        setDraggedBlockId(null);
        setDraggedFromSectionId(null);
      }}
      className="group"
    >
      <button
        type="button"
        onClick={() => onSelect(block.id)}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm transition ${
          isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
            : isSelected
            ? "bg-blue-600/80 text-white"
            : isDragging
            ? "opacity-40 text-gray-400"
            : "text-gray-400 hover:bg-muted/40 hover:text-gray-300"
        }`}
      >
        <GripVertical className="size-3 shrink-0 cursor-grab text-gray-600 opacity-0 group-hover:opacity-100 active:cursor-grabbing" />
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{block.type}</span>
        {isDragOver && (
          <span className="ml-auto text-[10px] text-emerald-300">Insert here</span>
        )}
      </button>
    </div>
  );
}
