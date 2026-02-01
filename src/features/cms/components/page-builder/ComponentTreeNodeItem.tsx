"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Heading,
  AlignLeft,
  MousePointerClick,
  Box,
  Layers,
  GripVertical,
  LayoutGrid,
  Columns,
  FileText,
  LayoutTemplate,
  ListCollapse,
  Quote,
  Video,
  GalleryHorizontal,
  Mail,
  Send,
  ImageIcon,
  Minus,
  Share2,
  Smile,
  Megaphone,
  Eye,
  EyeOff,
  Trash2,
  AppWindow,
  Plus,
  Folder,
  type LucideIcon,
} from "lucide-react";
import type { SectionInstance, BlockInstance, PageZone } from "../../types/page-builder";
import { ColumnBlockPicker } from "./ColumnBlockPicker";
import { getSectionDefinition } from "./section-registry";

const SECTION_ICONS: Record<string, LucideIcon> = {
  AnnouncementBar: Megaphone,
  Block: Box,
  TextElement: FileText,
  TextAtom: Folder,
  ImageElement: ImageIcon,
  ButtonElement: MousePointerClick,
  ImageWithText: Layers,
  RichText: AlignLeft,
  Hero: Layers,
  Grid: LayoutGrid,
  Accordion: ListCollapse,
  Testimonials: Quote,
  Video: Video,
  Slideshow: GalleryHorizontal,
  Newsletter: Mail,
  ContactForm: Send,
};

const BLOCK_ICONS: Record<string, LucideIcon> = {
  Row: GripVertical,
  Announcement: Megaphone,
  Heading: Heading,
  Text: AlignLeft,
  TextElement: FileText,
  TextAtom: Folder,
  TextAtomLetter: FileText,
  ImageElement: ImageIcon,
  Button: MousePointerClick,
  Column: Columns,
  ImageWithText: Layers,
  RichText: FileText,
  Hero: LayoutTemplate,
  Image: ImageIcon,
  VideoEmbed: Video,
  Divider: Minus,
  SocialLinks: Share2,
  Icon: Smile,
  AppEmbed: AppWindow,
};

const SECTION_BLOCK_TYPES = ["ImageWithText", "Hero", "RichText", "Block", "TextAtom"];
const CONVERTIBLE_SECTION_TYPES = ["ImageWithText", "Hero", "RichText", "Block", "TextElement", "ImageElement", "TextAtom", "ButtonElement"];

const resolveNodeLabel = (fallback: string, value: unknown): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
};

const resolveBlockLabel = (block: BlockInstance, fallback: string): string => {
  if (block.type === "TextAtomLetter") {
    const raw = block.settings?.["textContent"];
    if (typeof raw === "string") {
      return raw.trim().length === 0 ? "space" : raw;
    }
  }
  return resolveNodeLabel(fallback, block.settings?.["label"]);
};

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
  onDropBlockToSection: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toIndex: number, fromParentBlockId?: string) => void;
  onAddBlockToColumn: (sectionId: string, columnId: string, blockType: string) => void;
  onDropBlockToColumn: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
  onAddGridRow: (sectionId: string) => void;
  onRemoveGridRow: (sectionId: string, rowId: string) => void;
  onAddColumnToRow: (sectionId: string, rowId: string) => void;
  onRemoveColumnFromRow: (sectionId: string, columnId: string, rowId?: string) => void;
  onAddElementToNestedBlock: (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
  onDropSection: (sectionId: string, toIndex: number) => void;
  onToggleSectionVisibility: (sectionId: string, isHidden: boolean) => void;
  onRemoveSection: (sectionId: string) => void;
  onConvertSectionToBlock: (sectionId: string, toSectionId: string, toIndex: number) => void;
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
  draggedSectionIndex: number | null;
  setDraggedSectionIndex: (index: number | null) => void;
  draggedSectionZone: PageZone | null;
  setDraggedSectionZone: (zone: PageZone | null) => void;
  onDropSectionToColumn: (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => void;
}

export function SectionNodeItem({
  section,
  sectionIndex,
  selectedNodeId,
  onSelect,
  onAddBlock: _onAddBlock,
  onDropBlock,
  onDropBlockToSection,
  onAddBlockToColumn,
  onDropBlockToColumn,
  onAddGridRow,
  onRemoveGridRow,
  onAddColumnToRow,
  onRemoveColumnFromRow,
  onAddElementToNestedBlock,
  onDropSection,
  onToggleSectionVisibility,
  onRemoveSection,
  onConvertSectionToBlock,
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
  draggedSectionIndex,
  setDraggedSectionIndex,
  draggedSectionZone,
  setDraggedSectionZone,
  onDropSectionToColumn,
}: SectionNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === section.id;
  const isFileSection =
    section.type === "TextElement" ||
    section.type === "TextAtom" ||
    section.type === "ImageElement" ||
    section.type === "ButtonElement";
  const hasChildren = section.blocks.length > 0;
  const canToggle = !isFileSection && (section.type === "Grid" || hasChildren);
  const isExpanded = canToggle && expandedIds.has(section.id);
  const targetAllowsTextElement =
    getSectionDefinition(section.type)?.allowedBlockTypes?.includes("TextElement") ?? false;
  const targetAllowsTextAtom =
    getSectionDefinition(section.type)?.allowedBlockTypes?.includes("TextAtom") ?? false;
  const targetAllowsImageElement =
    getSectionDefinition(section.type)?.allowedBlockTypes?.includes("ImageElement") ?? false;
  const targetAllowsButton =
    getSectionDefinition(section.type)?.allowedBlockTypes?.includes("Button") ?? false;
  const hasBlocks = section.blocks.length > 0;
  const Icon: LucideIcon = SECTION_ICONS[section.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSectionDragOver, setIsSectionDragOver] = useState(false);
  const [sectionDropPosition, setSectionDropPosition] = useState<"above" | "below" | null>(null);
  const isDraggingSection = draggedSectionId === section.id;
  const isHidden = Boolean(section.settings["isHidden"]);
  const gridRows = section.blocks.filter((b: BlockInstance) => b.type === "Row");
  const gridColumns = section.blocks.filter((b: BlockInstance) => b.type === "Column");
  const gridLayerEntries = section.blocks.flatMap((block: BlockInstance, index: number) =>
    block.type !== "Row" && block.type !== "Column" ? [{ block, index }] : []
  );
  const resolveSectionDropPosition = (clientY: number, rect: DOMRect): "above" | "below" | null => {
    const threshold = Math.max(8, rect.height * 0.3);
    if (clientY - rect.top <= threshold) return "above";
    if (rect.bottom - clientY <= threshold) return "below";
    return null;
  };

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData("sectionId", section.id);
        e.dataTransfer.setData("sectionType", section.type);
        e.dataTransfer.setData("sectionZone", section.zone);
        e.dataTransfer.setData("sectionIndex", sectionIndex.toString());
        e.dataTransfer.effectAllowed = "move";
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "0.4";
        setDraggedSectionId(section.id);
        setDraggedSectionType(section.type);
        setDraggedSectionIndex(sectionIndex);
        setDraggedSectionZone(section.zone);
      }}
      onDragEnd={(e: React.DragEvent) => {
        const target = e.currentTarget as HTMLElement;
        target.style.opacity = "1";
        setDraggedSectionId(null);
        setDraggedSectionType(null);
        setDraggedSectionIndex(null);
        setDraggedSectionZone(null);
      }}
      className="group/section"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(section.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(section.id);
          }
        }}
        onDragOver={(e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const dragSectionId = draggedSectionId || e.dataTransfer.getData("sectionId");
          if (dragSectionId && dragSectionId !== section.id) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const nextDrop = resolveSectionDropPosition(e.clientY, rect);
            const dragZone =
              draggedSectionZone || (e.dataTransfer.getData("sectionZone") as PageZone) || null;
            const dragIndexRaw = e.dataTransfer.getData("sectionIndex");
            const parsedIndex = dragIndexRaw ? Number.parseInt(dragIndexRaw, 10) : NaN;
            const dragIndex =
              draggedSectionIndex ?? (Number.isNaN(parsedIndex) ? null : parsedIndex);
            if (
              nextDrop &&
              dragZone === section.zone &&
              dragIndex !== null
            ) {
              const targetIndex =
                nextDrop === "below" ? sectionIndex + 1 : sectionIndex;
              if (targetIndex === dragIndex) {
                setSectionDropPosition(null);
                setIsSectionDragOver(true);
                setIsDragOver(false);
                return;
              }
            }
            setSectionDropPosition(nextDrop);
            setIsSectionDragOver(true);
            setIsDragOver(false);
          } else if (draggedBlockId && !isFileSection) {
            setIsDragOver(true);
            setSectionDropPosition(null);
          }
        }}
        onDragLeave={(e: React.DragEvent) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setIsDragOver(false);
          setIsSectionDragOver(false);
          setSectionDropPosition(null);
        }}
        onDrop={(e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          setIsSectionDragOver(false);
          const dropPosition = sectionDropPosition;
          setSectionDropPosition(null);
          const dragSectionId = draggedSectionId || e.dataTransfer.getData("sectionId");
          const dragSectionType =
            draggedSectionType || e.dataTransfer.getData("sectionType") || null;
          if (dragSectionId && dragSectionId !== section.id) {
            if (dragSectionType === "TextElement" && targetAllowsTextElement) {
              onConvertSectionToBlock(dragSectionId, section.id, section.blocks.length);
            } else if (dragSectionType === "TextAtom" && targetAllowsTextAtom) {
              onConvertSectionToBlock(dragSectionId, section.id, section.blocks.length);
            } else if (dragSectionType === "ImageElement" && targetAllowsImageElement) {
              onConvertSectionToBlock(dragSectionId, section.id, section.blocks.length);
            } else if (dragSectionType === "ButtonElement" && targetAllowsButton) {
              onConvertSectionToBlock(dragSectionId, section.id, section.blocks.length);
            } else if (section.type === "Grid") {
              if (CONVERTIBLE_SECTION_TYPES.includes(dragSectionType ?? "") && !dropPosition) {
                // Section dropped on a Grid — route to first column
                const firstColumn =
                  gridRows.flatMap((row: BlockInstance) => row.blocks ?? []).find((b: BlockInstance) => b.type === "Column") ??
                  gridColumns.find((b: BlockInstance) => b.type === "Column");
                if (firstColumn) {
                  onDropSectionToColumn(dragSectionId, section.id, firstColumn.id, (firstColumn.blocks ?? []).length);
                }
              } else {
                const targetIndex = dropPosition === "below" ? sectionIndex + 1 : sectionIndex;
                onDropSection(dragSectionId, targetIndex);
              }
            } else {
              // Section drop — insert at this section's position
              const targetIndex = dropPosition === "below" ? sectionIndex + 1 : sectionIndex;
              onDropSection(dragSectionId, targetIndex);
            }
            setDraggedSectionId(null);
            setDraggedSectionType(null);
            setDraggedSectionIndex(null);
            setDraggedSectionZone(null);
          } else if (draggedBlockId && !isFileSection) {
            const fromSection =
              draggedFromSectionId || e.dataTransfer.getData("fromSectionId") || "";
            if (!fromSection) return;
            const fromColumn =
              (draggedFromColumnId ?? e.dataTransfer.getData("fromColumnId")) || null;
            const fromParent =
              (draggedFromParentBlockId ?? e.dataTransfer.getData("fromParentBlockId")) || null;
            const blockType = e.dataTransfer.getData("blockType") || "";
            const isImageElement = blockType === "ImageElement";
            if (section.type === "Grid") {
              if (isImageElement) {
                onDropBlockToSection(
                  draggedBlockId,
                  fromSection,
                  fromColumn || undefined,
                  section.id,
                  section.blocks.length,
                  fromParent || undefined
                );
              } else {
                // Block dropped on a Grid — route to first column
                const firstColumn =
                  gridRows.flatMap((row: BlockInstance) => row.blocks ?? []).find((b: BlockInstance) => b.type === "Column") ??
                  gridColumns.find((b: BlockInstance) => b.type === "Column");
                if (firstColumn) {
                  onDropBlockToColumn(
                    draggedBlockId,
                    fromSection,
                    fromColumn || undefined,
                    section.id,
                    firstColumn.id,
                    (firstColumn.blocks ?? []).length,
                    fromParent || undefined
                  );
                }
              }
            } else if (fromColumn || fromParent) {
              onDropBlockToSection(
                draggedBlockId,
                fromSection,
                fromColumn || undefined,
                section.id,
                section.blocks.length,
                fromParent || undefined
              );
            } else {
              // Block drop
              onDropBlock(draggedBlockId, fromSection, section.id, section.blocks.length);
            }
            setDraggedBlockId(null);
            setDraggedFromSectionId(null);
            setDraggedFromColumnId(null);
            setDraggedFromParentBlockId(null);
          }
        }}
        className={`relative flex w-full items-center gap-2 rounded px-2 py-2 text-sm font-medium transition ${
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
        <div className="shrink-0">
          {canToggle ? (
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
            >
              {isExpanded ? (
                <ChevronDown className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
            </div>
          ) : (
            <span className="block size-3.5" />
          )}
        </div>
        <Icon className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">
          {resolveNodeLabel(section.type, section.settings["label"])}
        </span>
        {isSectionDragOver && (
          <span className="text-[10px] text-purple-300">Move here</span>
        )}
        {isDragOver && (
          <span className="text-[10px] text-emerald-300">Drop here</span>
        )}
        <div className={`flex items-center gap-0.5 transition ${isSelected ? "opacity-100" : "opacity-0 group-hover/section:opacity-100"}`}>
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleSectionVisibility(section.id, !isHidden);
            }}
            className="rounded p-0.5 text-gray-300 hover:text-white hover:bg-foreground/10"
            title={isHidden ? "Show section" : "Hide section"}
          >
            {isHidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
          </button>
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onRemoveSection(section.id);
            }}
            className="rounded p-0.5 text-gray-300 hover:text-red-200 hover:bg-red-500/20"
            title="Delete section"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>


      {isExpanded && section.type === "Grid" && (
        <div className="ml-4 border-l border-border/30 pl-1">
          {gridRows.length > 0 ? (
            gridRows.map((row: BlockInstance, rowIndex: number) => (
              <RowNodeItem
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                sectionId={section.id}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
                rowCount={gridRows.length}
                onRemoveGridRow={onRemoveGridRow}
                onAddColumnToRow={onAddColumnToRow}
                onRemoveColumnFromRow={onRemoveColumnFromRow}
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
                draggedSectionId={draggedSectionId}
                setDraggedSectionId={setDraggedSectionId}
                draggedSectionType={draggedSectionType}
                onDropSectionToColumn={onDropSectionToColumn}
              />
            ))
          ) : gridColumns.length > 0 ? (
            gridColumns.map((column: BlockInstance, colIndex: number) => (
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
                onRemoveColumnFromRow={onRemoveColumnFromRow}
                rowColumnCount={gridColumns.length}
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
                onDropSectionToColumn={onDropSectionToColumn}
              />
            ))
          ) : (
            <div className="py-2 text-xs text-gray-500">No rows yet.</div>
          )}
          {gridLayerEntries.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="px-2 text-[10px] uppercase tracking-wide text-gray-500">
                Grid backgrounds
              </div>
              {gridLayerEntries.map(({ block, index }: { block: BlockInstance; index: number }) => (
                <BlockNodeItem
                  key={block.id}
                  block={block}
                  index={index}
                  sectionId={section.id}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onDropBlock={onDropBlock}
                  onDropBlockToSection={onDropBlockToSection}
                  onDropBlockToColumn={onDropBlockToColumn}
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
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onAddGridRow(section.id);
            }}
            className="mt-1 flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:bg-muted/40 hover:text-gray-200"
          >
            <Plus className="size-3" />
            Add row
          </button>
        </div>
      )}

      {isExpanded && hasBlocks && section.type !== "Grid" && !isFileSection && (
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
              onDropBlockToSection={onDropBlockToSection}
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
// Row node (non-draggable, inside Grid sections)
// ---------------------------------------------------------------------------

interface RowNodeItemProps {
  row: BlockInstance;
  rowIndex: number;
  rowCount: number;
  sectionId: string;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onAddColumnToRow: (sectionId: string, rowId: string) => void;
  onRemoveGridRow: (sectionId: string, rowId: string) => void;
  onRemoveColumnFromRow: (sectionId: string, columnId: string, rowId?: string) => void;
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
  draggedSectionId: string | null;
  setDraggedSectionId: (id: string | null) => void;
  draggedSectionType: string | null;
  onDropSectionToColumn: (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => void;
}

function RowNodeItem({
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
  draggedSectionId,
  setDraggedSectionId,
  draggedSectionType,
  onDropSectionToColumn,
}: RowNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === row.id;
  const isExpanded = expandedIds.has(row.id);
  const columns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
  const hasColumns = columns.length > 0;
  const canRemoveRow = rowCount > 1;
  const [isDragOver, setIsDragOver] = useState(false);
  const firstColumn = columns[0] ?? null;
  const rowLabel = resolveNodeLabel(`Row ${rowIndex + 1}`, row.settings["label"]);

  return (
    <div>
      <div
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
          const hasBlockPayload = Array.from(e.dataTransfer.types ?? []).includes("text/plain");
          const dragId =
            draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
          if ((!dragId && !hasBlockPayload) || !firstColumn) return;
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
          const dragId =
            draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
          if (!dragId || !firstColumn) return;
          const fromSection =
            draggedFromSectionId || e.dataTransfer.getData("fromSectionId") || sectionId;
          const fromColumn =
            (draggedFromColumnId ?? e.dataTransfer.getData("fromColumnId")) || null;
          const fromParent =
            (draggedFromParentBlockId ?? e.dataTransfer.getData("fromParentBlockId")) || null;
          if (!fromSection) return;
          onDropBlockToColumn(
            dragId,
            fromSection,
            fromColumn || undefined,
            sectionId,
            firstColumn.id,
            (firstColumn.blocks ?? []).length,
            fromParent || undefined
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
            : "text-gray-300 hover:bg-muted/40"
        }`}
      >
        <div
          role="button"
          tabIndex={-1}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleExpand(row.id);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleExpand(row.id);
            }
          }}
          className="shrink-0"
        >
          {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        </div>
        <GripVertical className="size-3.5 shrink-0" />
        <span className="flex-1 truncate text-left">{rowLabel}</span>
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onAddColumnToRow(sectionId, row.id);
          }}
          className="rounded p-0.5 text-gray-300 hover:text-white hover:bg-foreground/10"
          title="Add column"
        >
          <Plus className="size-3" />
        </button>
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            if (!canRemoveRow) return;
            onRemoveGridRow(sectionId, row.id);
          }}
          disabled={!canRemoveRow}
          className="rounded p-0.5 text-gray-300 hover:text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          title={canRemoveRow ? "Remove row" : "At least one row is required"}
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      {isExpanded && hasColumns && (
        <div className="ml-4 border-l border-border/30 pl-1">
          {columns.map((column: BlockInstance, colIndex: number) => (
            <ColumnNodeItem
              key={column.id}
              column={column}
              columnIndex={colIndex}
              sectionId={sectionId}
              selectedNodeId={selectedNodeId}
              onSelect={onSelect}
              onAddBlockToColumn={onAddBlockToColumn}
              onDropBlockToColumn={onDropBlockToColumn}
              onAddElementToNestedBlock={onAddElementToNestedBlock}
              onRemoveColumnFromRow={onRemoveColumnFromRow}
              rowId={row.id}
              rowColumnCount={columns.length}
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
              onDropSectionToColumn={onDropSectionToColumn}
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
  onRemoveColumnFromRow: (sectionId: string, columnId: string, rowId?: string) => void;
  rowId?: string;
  rowColumnCount?: number;
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
  onDropSectionToColumn: (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => void;
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
  onRemoveColumnFromRow,
  rowId,
  rowColumnCount,
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
  onDropSectionToColumn,
}: ColumnNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === column.id;
  const isExpanded = expandedIds.has(column.id);
  const hasBlocks = (column.blocks ?? []).length > 0;
  const [isDragOver, setIsDragOver] = useState(false);
  const canRemove = rowColumnCount === undefined ? true : rowColumnCount > 1;
  const columnLabel = resolveNodeLabel(`Column ${columnIndex + 1}`, column.settings["label"]);

  const handleColumnDragOver = (e: React.DragEvent): void => {
    const hasBlockPayload = Array.from(e.dataTransfer.types ?? []).includes("text/plain");
    const dragId =
      draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
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
    const dragId =
      draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
          const fromSection =
            draggedFromSectionId || e.dataTransfer.getData("fromSectionId") || sectionId;
          const fromColumn =
            (draggedFromColumnId ?? e.dataTransfer.getData("fromColumnId")) || null;
          const fromParent =
            (draggedFromParentBlockId ?? e.dataTransfer.getData("fromParentBlockId")) || null;
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
      setDraggedBlockId(null);
      setDraggedFromSectionId(null);
      setDraggedFromColumnId(null);
      setDraggedFromParentBlockId(null);
      return;
    }
    if (draggedSectionId && draggedSectionId !== sectionId) {
      onDropSectionToColumn(draggedSectionId, sectionId, column.id, (column.blocks ?? []).length);
      setDraggedSectionId(null);
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
      <div
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
        <span className="flex-1 truncate text-left">{columnLabel}</span>
        {isDragOver && (
          <span className="text-[10px] text-emerald-300">Drop here</span>
        )}
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            if (!canRemove) return;
            onRemoveColumnFromRow(sectionId, column.id, rowId);
          }}
          disabled={!canRemove}
          className="rounded p-0.5 text-gray-300 hover:text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          title={canRemove ? "Remove column" : "At least one column is required"}
        >
          <Minus className="size-3" />
        </button>
        <ColumnBlockPicker
          onSelect={(blockType: string) => onAddBlockToColumn(sectionId, column.id, blockType)}
        />
      </div>

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
                  draggedBlockId={draggedBlockId}
                  setDraggedBlockId={setDraggedBlockId}
                  draggedFromSectionId={draggedFromSectionId}
                  setDraggedFromSectionId={setDraggedFromSectionId}
                  draggedFromColumnId={draggedFromColumnId}
                  setDraggedFromColumnId={setDraggedFromColumnId}
                  draggedFromParentBlockId={draggedFromParentBlockId}
                  setDraggedFromParentBlockId={setDraggedFromParentBlockId}
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
  draggedSectionId: string | null;
  setDraggedSectionId: (id: string | null) => void;
  draggedSectionType: string | null;
  onDropSectionToColumn: (sectionId: string, toSectionId: string, toColumnId: string, toIndex: number, toParentBlockId?: string) => void;
}

function SectionBlockNodeItem({
  block,
  index,
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
  draggedSectionId,
  setDraggedSectionId,
  draggedSectionType,
  onDropSectionToColumn,
}: SectionBlockNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === block.id;
  const isExpanded = expandedIds.has(block.id);
  const hasChildren = (block.blocks ?? []).length > 0;
  const Icon: LucideIcon = BLOCK_ICONS[block.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === block.id;
  const isTextAtom = block.type === "TextAtom";
  const blockLabel = resolveBlockLabel(block, block.type);

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData("blockId", block.id);
        e.dataTransfer.setData("text/plain", block.id);
        e.dataTransfer.setData("blockType", block.type);
        e.dataTransfer.setData("fromSectionId", sectionId);
        e.dataTransfer.setData("fromColumnId", columnId ?? "");
        e.dataTransfer.setData("fromParentBlockId", "");
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
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(block.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(block.id);
          }
        }}
        onDragOver={(e: React.DragEvent) => {
          const isSectionDrop = draggedSectionId && draggedSectionId !== sectionId && CONVERTIBLE_SECTION_TYPES.includes(draggedSectionType ?? "");
          const hasBlockPayload = Array.from(e.dataTransfer.types ?? []).includes("text/plain");
          const isBlockDrop = (draggedBlockId && draggedBlockId !== block.id) || hasBlockPayload;
          if (isTextAtom) {
            if (!isBlockDrop) return;
          } else if (!isBlockDrop && !isSectionDrop) {
            return;
          }
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
          const dragId =
            draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
          const fromSection =
            draggedFromSectionId || e.dataTransfer.getData("fromSectionId") || sectionId;
          const fromColumn =
            (draggedFromColumnId ?? e.dataTransfer.getData("fromColumnId")) || null;
          const fromParent =
            (draggedFromParentBlockId ?? e.dataTransfer.getData("fromParentBlockId")) || null;
          if (isTextAtom) {
            if (!dragId || dragId === block.id) return;
            onDropBlockToColumn(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              columnId,
              index,
              fromParent || undefined
            );
            setDraggedBlockId(null);
            setDraggedFromSectionId(null);
            setDraggedFromColumnId(null);
            setDraggedFromParentBlockId(null);
            return;
          }
          if (dragId && dragId !== block.id) {
            // Drop element into this section-type block
            onDropBlockToColumn(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              columnId,
              (block.blocks ?? []).length,
              fromParent || undefined,
              block.id
            );
            setDraggedBlockId(null);
            setDraggedFromSectionId(null);
            setDraggedFromColumnId(null);
            setDraggedFromParentBlockId(null);
          } else if (draggedSectionId && draggedSectionId !== sectionId) {
            onDropSectionToColumn(draggedSectionId, sectionId, columnId, (block.blocks ?? []).length, block.id);
            setDraggedSectionId(null);
          }
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
        <span className="flex-1 truncate text-left">{blockLabel}</span>
        {isDragOver && (
          <span className="text-[10px] text-emerald-300">Drop here</span>
        )}
        {!isTextAtom && (
          <ColumnBlockPicker
            onSelect={(elemType: string) => onAddElementToNestedBlock(sectionId, columnId, block.id, elemType)}
          />
        )}
      </div>

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
              onDropBlockToColumn={onDropBlockToColumn}
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
  onDropBlockToColumn?: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toColumnId: string, toIndex: number, fromParentBlockId?: string, toParentBlockId?: string) => void;
  onDropBlockToSection?: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toIndex: number, fromParentBlockId?: string) => void;
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
  onDropBlockToColumn,
  onDropBlockToSection,
  draggedBlockId,
  setDraggedBlockId,
  draggedFromSectionId,
  setDraggedFromSectionId,
  draggedFromColumnId,
  setDraggedFromColumnId,
  draggedFromParentBlockId,
  setDraggedFromParentBlockId,
}: BlockNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === block.id;
  const Icon = BLOCK_ICONS[block.type] ?? Box;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === block.id;
  const blockLabel = resolveBlockLabel(block, block.type);

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.stopPropagation();
        e.dataTransfer.setData("blockId", block.id);
        e.dataTransfer.setData("text/plain", block.id);
        e.dataTransfer.setData("blockType", block.type);
        e.dataTransfer.setData("fromSectionId", sectionId);
        e.dataTransfer.setData("fromColumnId", columnId ?? "");
        e.dataTransfer.setData("fromParentBlockId", "");
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
        const hasBlockPayload = Array.from(e.dataTransfer.types ?? []).includes("text/plain");
        const dragId =
          draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
        if ((!dragId && !hasBlockPayload) || draggedBlockId === block.id || dragId === block.id) return;
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
        const dragId =
          draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
        if (!dragId || dragId === block.id) return;
        const fromSection =
          draggedFromSectionId || e.dataTransfer.getData("fromSectionId") || sectionId;
        const fromColumn =
          (draggedFromColumnId ?? e.dataTransfer.getData("fromColumnId")) || null;
        const fromParent =
          (draggedFromParentBlockId ?? e.dataTransfer.getData("fromParentBlockId")) || null;
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
          setDraggedBlockId(null);
          setDraggedFromSectionId(null);
          if (setDraggedFromColumnId) setDraggedFromColumnId(null);
          if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(null);
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
        setDraggedBlockId(null);
        setDraggedFromSectionId(null);
        if (setDraggedFromColumnId) setDraggedFromColumnId(null);
        if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(null);
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
        <span className="truncate">{blockLabel}</span>
        {isDragOver && (
          <span className="ml-auto text-[10px] text-emerald-300">Insert here</span>
        )}
      </button>
    </div>
  );
}
