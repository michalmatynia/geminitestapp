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
  Lock,
  Frame,
  type LucideIcon,
} from "lucide-react";
import type { SectionInstance, BlockInstance, PageZone } from "../../types/page-builder";
import { BlockPicker } from "./BlockPicker";
import { ColumnBlockPicker } from "./ColumnBlockPicker";
import { getBlockDefinition, getSectionDefinition } from "./section-registry";

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
  Model3DElement: Box,
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
  Block: Box,
  ImageWithText: Layers,
  RichText: FileText,
  Hero: LayoutTemplate,
  Image: ImageIcon,
  VideoEmbed: Video,
  Divider: Minus,
  SocialLinks: Share2,
  Icon: Smile,
  AppEmbed: AppWindow,
  Carousel: GalleryHorizontal,
  CarouselFrame: Frame,
  SlideshowFrame: Frame,
  Model3D: Box,
  Model3DElement: Box,
  Slideshow: GalleryHorizontal,
};

const SECTION_BLOCK_TYPES = ["ImageWithText", "Hero", "RichText", "Block", "TextAtom", "Carousel", "Slideshow"];
const CONVERTIBLE_SECTION_TYPES = ["ImageWithText", "Hero", "RichText", "Block", "TextElement", "ImageElement", "TextAtom", "ButtonElement", "Model3DElement", "Slideshow"];

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
  onAddElementToSectionBlock: (sectionId: string, parentBlockId: string, elementType: string) => void;
  onDropSection: (sectionId: string, toIndex: number) => void;
  onToggleSectionVisibility: (sectionId: string, isHidden: boolean) => void;
  onRemoveSection: (sectionId: string) => void;
  onConvertSectionToBlock: (sectionId: string, toSectionId: string, toIndex: number) => void;
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
  onRemoveBlock?: ((sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void) | undefined;
}

export function SectionNodeItem({
  section,
  sectionIndex,
  selectedNodeId,
  onSelect,
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
  onDropSection,
  onToggleSectionVisibility,
  onRemoveSection,
  onConvertSectionToBlock,
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
  onRemoveBlock,
}: SectionNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === section.id;
  const isFileSection =
    section.type === "TextElement" ||
    section.type === "TextAtom" ||
    section.type === "ImageElement" ||
    section.type === "ButtonElement";
  const isSlideshowSection = section.type === "Slideshow";
  const hasChildren = section.blocks.length > 0;
  const hasAllowedBlocks = (getSectionDefinition(section.type)?.allowedBlockTypes?.length ?? 0) > 0;
  const canToggle = !isFileSection && (section.type === "Grid" || hasChildren || hasAllowedBlocks);
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
  const [isContentDragOver, setIsContentDragOver] = useState(false);
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
    <div className="group/section">
      <div
        draggable="true"
        onClick={() => onSelect(section.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(section.id);
          }
        }}
        onDragStart={(e: React.DragEvent) => {
          e.stopPropagation();

          // Set drag data FIRST - this must happen synchronously
          e.dataTransfer.setData("text/plain", section.id);
          e.dataTransfer.setData("sectionId", section.id);
          e.dataTransfer.setData("sectionType", section.type);
          e.dataTransfer.setData("sectionZone", section.zone);
          e.dataTransfer.setData("sectionIndex", sectionIndex.toString());
          e.dataTransfer.effectAllowed = "move";

          // IMPORTANT: Defer React state updates to prevent re-render from cancelling drag
          setTimeout(() => {
            setDraggedSectionId(section.id);
            setDraggedSectionType(section.type);
            setDraggedSectionIndex(sectionIndex);
            setDraggedSectionZone(section.zone);
          }, 0);
        }}
        onDragEnd={() => {
          setDraggedSectionId(null);
          setDraggedSectionType(null);
          setDraggedSectionIndex(null);
          setDraggedSectionZone(null);
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
              onDropBlock(draggedBlockId, fromSection, section.id, section.blocks.length);
            }
            setDraggedBlockId(null);
            setDraggedFromSectionId(null);
            setDraggedFromColumnId(null);
            setDraggedFromParentBlockId(null);
          }
        }}
        className={`relative flex w-full cursor-grab items-center gap-2 rounded px-2 py-2 text-sm font-medium select-none active:cursor-grabbing ${
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
        <GripVertical className="size-3 shrink-0 text-gray-600 opacity-0 group-hover/section:opacity-100 pointer-events-none" />
        {canToggle ? (
          <div
            role="button"
            tabIndex={-1}
            className="shrink-0"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleExpand(section.id);
            }}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
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
          <span className="block size-3.5 shrink-0 pointer-events-none" />
        )}
        <Icon className="size-4 shrink-0 pointer-events-none" />
        <span className="flex-1 truncate text-left pointer-events-none">
          {resolveNodeLabel(section.type, section.settings["label"])}
        </span>
        {isSectionDragOver && (
          <span className="text-[10px] text-purple-300 pointer-events-none">Move here</span>
        )}
        {isDragOver && (
          <span className="text-[10px] text-emerald-300 pointer-events-none">Drop here</span>
        )}
        <div className={`flex items-center gap-0.5 transition pointer-events-none ${isSelected ? "opacity-100" : "opacity-0 group-hover/section:opacity-100"}`}>
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleSectionVisibility(section.id, !isHidden);
            }}
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            className="rounded p-0.5 text-gray-300 hover:text-white hover:bg-foreground/10 pointer-events-auto"
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
            onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
            className="rounded p-0.5 text-gray-300 hover:text-red-200 hover:bg-red-500/20 pointer-events-auto"
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
                onDropBlockToRow={onDropBlockToRow}
                onAddElementToNestedBlock={onAddElementToNestedBlock}
                onRemoveBlock={onRemoveBlock}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                draggedBlockId={draggedBlockId}
                setDraggedBlockId={setDraggedBlockId}
                draggedBlockType={draggedBlockType}
                setDraggedBlockType={setDraggedBlockType}
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
                onRemoveBlock={onRemoveBlock}
                rowColumnCount={gridColumns.length}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                draggedBlockId={draggedBlockId}
                setDraggedBlockId={setDraggedBlockId}
                draggedBlockType={draggedBlockType}
                setDraggedBlockType={setDraggedBlockType}
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
                  onRemoveBlock={onRemoveBlock}
                  draggedBlockId={draggedBlockId}
                  setDraggedBlockId={setDraggedBlockId}
                  draggedBlockType={draggedBlockType}
                  setDraggedBlockType={setDraggedBlockType}
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

      {isExpanded && section.type !== "Grid" && !isFileSection && (
        <div
          className={`ml-4 border-l pl-1 ${isContentDragOver ? "border-emerald-500 bg-emerald-600/10" : "border-border/30"}`}
          onDragOver={(e: React.DragEvent) => {
            const hasBlockPayload = Array.from(e.dataTransfer.types ?? []).includes("text/plain");
            const dragId = draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
            if (!dragId && !hasBlockPayload) return;
            e.preventDefault();
            e.stopPropagation();
            setIsContentDragOver(true);
          }}
          onDragLeave={(e: React.DragEvent) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsContentDragOver(false);
          }}
          onDrop={(e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsContentDragOver(false);
            const dragId = draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
            if (!dragId) return;
            const fromSection = draggedFromSectionId || e.dataTransfer.getData("fromSectionId") || "";
            if (!fromSection) return;
            const fromColumn = (draggedFromColumnId ?? e.dataTransfer.getData("fromColumnId")) || null;
            const fromParent = (draggedFromParentBlockId ?? e.dataTransfer.getData("fromParentBlockId")) || null;
            if (fromColumn || fromParent) {
              onDropBlockToSection(dragId, fromSection, fromColumn || undefined, section.id, section.blocks.length, fromParent || undefined);
            } else {
              onDropBlock(dragId, fromSection, section.id, section.blocks.length);
            }
            setDraggedBlockId(null);
            setDraggedFromSectionId(null);
            setDraggedFromColumnId(null);
            setDraggedFromParentBlockId(null);
          }}
        >
          {hasBlocks ? (
            section.blocks.map((block: BlockInstance, index: number) => (
              isSlideshowSection && block.type === "SlideshowFrame" ? (
                <SlideshowFrameNodeItem
                  key={block.id}
                  frame={block}
                  index={index}
                  sectionId={section.id}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onAddElementToSectionBlock={onAddElementToSectionBlock}
                  onDropBlock={onDropBlock}
                  onRemoveBlock={onRemoveBlock}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  draggedBlockId={draggedBlockId}
                  setDraggedBlockId={setDraggedBlockId}
                  draggedBlockType={draggedBlockType}
                  setDraggedBlockType={setDraggedBlockType}
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
                  sectionId={section.id}
                  selectedNodeId={selectedNodeId}
                  onSelect={onSelect}
                  onDropBlock={onDropBlock}
                  onDropBlockToSection={onDropBlockToSection}
                  onRemoveBlock={onRemoveBlock}
                  draggedBlockId={draggedBlockId}
                  setDraggedBlockId={setDraggedBlockId}
                  draggedBlockType={draggedBlockType}
                  setDraggedBlockType={setDraggedBlockType}
                  draggedFromSectionId={draggedFromSectionId}
                  setDraggedFromSectionId={setDraggedFromSectionId}
                  draggedFromColumnId={draggedFromColumnId}
                  setDraggedFromColumnId={setDraggedFromColumnId}
                  draggedFromParentBlockId={draggedFromParentBlockId}
                  setDraggedFromParentBlockId={setDraggedFromParentBlockId}
                />
              )
            ))
          ) : (
            <div className="py-2 text-xs text-gray-500">No blocks yet. Drag blocks here or use the + button below.</div>
          )}
          <div className="mt-1">
            <BlockPicker
              sectionType={section.type}
              onSelect={(blockType: string) => onAddBlock(section.id, blockType)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slideshow frame node (nested blocks inside Slideshow sections)
// ---------------------------------------------------------------------------

interface SlideshowFrameNodeItemProps {
  frame: BlockInstance;
  index: number;
  sectionId: string;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onAddElementToSectionBlock: (sectionId: string, parentBlockId: string, elementType: string) => void;
  onDropBlock: (blockId: string, fromSectionId: string, toSectionId: string, toIndex: number) => void;
  onRemoveBlock?: ((sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void) | undefined;
  expandedIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  draggedBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
  draggedBlockType: string | null;
  setDraggedBlockType: (type: string | null) => void;
  draggedFromSectionId: string | null;
  setDraggedFromSectionId: (id: string | null) => void;
  draggedFromColumnId: string | null;
  setDraggedFromColumnId: (id: string | null) => void;
  draggedFromParentBlockId: string | null;
  setDraggedFromParentBlockId: (id: string | null) => void;
}

function SlideshowFrameNodeItem({
  frame,
  index,
  sectionId,
  selectedNodeId,
  onSelect,
  onAddElementToSectionBlock,
  onDropBlock,
  onRemoveBlock,
  expandedIds,
  onToggleExpand,
  draggedBlockId,
  setDraggedBlockId,
  draggedBlockType,
  setDraggedBlockType,
  draggedFromSectionId,
  setDraggedFromSectionId,
  draggedFromColumnId,
  setDraggedFromColumnId,
  draggedFromParentBlockId,
  setDraggedFromParentBlockId,
}: SlideshowFrameNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === frame.id;
  const isExpanded = expandedIds.has(frame.id);
  const hasChildren = (frame.blocks ?? []).length > 0;
  const Icon: LucideIcon = BLOCK_ICONS[frame.type] ?? Frame;
  const [isDragOver, setIsDragOver] = useState(false);
  const isDragging = draggedBlockId === frame.id;
  const blockLabel = resolveBlockLabel(frame, "Frame");
  const frameAllowedTypes = getBlockDefinition("SlideshowFrame")?.allowedBlockTypes ?? [];

  return (
    <div className="group/frame">
      <div
        role="button"
        tabIndex={0}
        draggable
        onClick={() => onSelect(frame.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(frame.id);
          }
        }}
        onDragStart={(e: React.DragEvent) => {
          e.stopPropagation();
          e.dataTransfer.setData("blockId", frame.id);
          e.dataTransfer.setData("text/plain", frame.id);
          e.dataTransfer.setData("blockType", frame.type);
          e.dataTransfer.setData("fromSectionId", sectionId);
          e.dataTransfer.setData("fromColumnId", "");
          e.dataTransfer.setData("fromParentBlockId", "");
          e.dataTransfer.effectAllowed = "move";
          setTimeout(() => {
            setDraggedBlockId(frame.id);
            if (setDraggedBlockType) setDraggedBlockType(frame.type);
            setDraggedFromSectionId(sectionId);
            if (setDraggedFromColumnId) setDraggedFromColumnId(null);
            if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(null);
          }, 0);
        }}
        onDragEnd={() => {
          setDraggedBlockId(null);
          if (setDraggedBlockType) setDraggedBlockType(null);
          setDraggedFromSectionId(null);
          if (setDraggedFromColumnId) setDraggedFromColumnId(null);
          if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(null);
        }}
        onDragOver={(e: React.DragEvent) => {
          const dragType = draggedBlockType || e.dataTransfer.getData("blockType") || "";
          const hasBlockPayload = Array.from(e.dataTransfer.types ?? []).includes("text/plain");
          const isFrameDrag = dragType === "SlideshowFrame";
          const isBlockDrop = isFrameDrag && ((draggedBlockId && draggedBlockId !== frame.id) || hasBlockPayload);
          if (!isBlockDrop) return;
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
          const dragType = draggedBlockType || e.dataTransfer.getData("blockType") || "";
          if (dragType !== "SlideshowFrame") return;
          const dragId =
            draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
          const fromSection =
            draggedFromSectionId || e.dataTransfer.getData("fromSectionId") || sectionId;
          if (!dragId || dragId === frame.id) return;
          onDropBlock(dragId, fromSection, sectionId, index);
          setDraggedBlockId(null);
          setDraggedFromSectionId(null);
          if (setDraggedFromColumnId) setDraggedFromColumnId(null);
          if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(null);
        }}
        className={`flex w-full cursor-grab items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition active:cursor-grabbing ${
          isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
            : isSelected
            ? "bg-blue-600/80 text-white"
            : isDragging
            ? "opacity-40 text-gray-400"
            : "text-gray-300 hover:bg-muted/40"
        }`}
      >
        <GripVertical className="size-3 shrink-0 text-gray-600 opacity-0 group-hover/frame:opacity-100" />
        <div
          role="button"
          tabIndex={-1}
          draggable={false}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleExpand(frame.id);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              onToggleExpand(frame.id);
            }
          }}
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
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
        <div draggable={false} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}>
          <ColumnBlockPicker
            onSelect={(elemType: string) => onAddElementToSectionBlock(sectionId, frame.id, elemType)}
            allowedBlockTypes={frameAllowedTypes}
          />
        </div>
        {onRemoveBlock && !isDragOver && (
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onRemoveBlock(sectionId, frame.id);
            }}
            className="p-0.5 rounded opacity-0 group-hover/frame:opacity-100 hover:bg-red-500/20 hover:text-red-300 text-gray-500 transition-opacity"
            title="Remove frame"
          >
            <Trash2 className="size-3" />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="ml-5 border-l border-border/30 pl-1">
          {hasChildren ? (
            (frame.blocks ?? []).map((child: BlockInstance, childIndex: number) => (
              <BlockNodeItem
                key={child.id}
                block={child}
                index={childIndex}
                sectionId={sectionId}
                parentBlockId={frame.id}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
                onDropBlock={() => {}}
                onRemoveBlock={onRemoveBlock}
                draggedBlockId={draggedBlockId}
                setDraggedBlockId={setDraggedBlockId}
                draggedBlockType={draggedBlockType}
                setDraggedBlockType={setDraggedBlockType}
                draggedFromSectionId={draggedFromSectionId}
                setDraggedFromSectionId={setDraggedFromSectionId}
                draggedFromColumnId={draggedFromColumnId}
                setDraggedFromColumnId={setDraggedFromColumnId}
                draggedFromParentBlockId={draggedFromParentBlockId}
                setDraggedFromParentBlockId={setDraggedFromParentBlockId}
                disableDrag
              />
            ))
          ) : (
            <div className="mt-1 rounded border border-dashed border-border/40 px-2 py-1 text-[11px] text-gray-500">
              Add elements to this frame
            </div>
          )}
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
  onDropBlockToRow: (blockId: string, fromSectionId: string, fromColumnId: string | undefined, toSectionId: string, toRowId: string, toIndex: number, fromParentBlockId?: string) => void;
  onAddElementToNestedBlock: (sectionId: string, columnId: string, parentBlockId: string, elementType: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (nodeId: string) => void;
  draggedBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
  draggedBlockType: string | null;
  setDraggedBlockType: (type: string | null) => void;
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
  onRemoveBlock?: ((sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void) | undefined;
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
  onDropBlockToRow,
  onAddElementToNestedBlock,
  expandedIds,
  onToggleExpand,
  draggedBlockId,
  setDraggedBlockId,
  draggedBlockType,
  setDraggedBlockType,
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
  onRemoveBlock,
}: RowNodeItemProps): React.ReactNode {
  const isSelected = selectedNodeId === row.id;
  const isExpanded = expandedIds.has(row.id);
  const columns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
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
          const draggedSectionIdFromTransfer = e.dataTransfer.getData("sectionId");
          const draggedSectionTypeFromTransfer = e.dataTransfer.getData("sectionType");
          const isSectionDrag = Boolean(draggedSectionIdFromTransfer) || Boolean(draggedSectionId);

          if (isSectionDrag) {
            const sectionIdToDrop = draggedSectionId || draggedSectionIdFromTransfer;
            const sectionTypeToDrop = draggedSectionType || draggedSectionTypeFromTransfer;
            if (sectionIdToDrop && sectionIdToDrop !== sectionId && CONVERTIBLE_SECTION_TYPES.includes(sectionTypeToDrop ?? "")) {
              // Route to first column if available
              if (firstColumn) {
                onDropSectionToColumn(sectionIdToDrop, sectionId, firstColumn.id, (firstColumn.blocks ?? []).length);
              }
              setDraggedSectionId(null);
            }
            return;
          }

          // Otherwise it's a block drop
          const dragId =
            draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
          if (!dragId) return;

          const fromSection =
            draggedFromSectionId || e.dataTransfer.getData("fromSectionId") || sectionId;
          const fromColumn =
            (draggedFromColumnId ?? e.dataTransfer.getData("fromColumnId")) || null;
          const fromParent =
            (draggedFromParentBlockId ?? e.dataTransfer.getData("fromParentBlockId")) || null;
          if (!fromSection) return;

          // Get the block type being dragged
          const blockType = draggedBlockType || e.dataTransfer.getData("blockType") || "";

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

          setDraggedBlockId(null);
          setDraggedBlockType(null);
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
                  draggedBlockId={draggedBlockId}
                  setDraggedBlockId={setDraggedBlockId}
                  draggedBlockType={draggedBlockType}
                  setDraggedBlockType={setDraggedBlockType}
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
                draggedBlockId={draggedBlockId}
                setDraggedBlockId={setDraggedBlockId}
                draggedBlockType={draggedBlockType}
                setDraggedBlockType={setDraggedBlockType}
                draggedFromSectionId={draggedFromSectionId}
                setDraggedFromSectionId={setDraggedFromSectionId}
                draggedFromColumnId={draggedFromColumnId}
                setDraggedFromColumnId={setDraggedFromColumnId}
                draggedFromParentBlockId={draggedFromParentBlockId}
                setDraggedFromParentBlockId={setDraggedFromParentBlockId}
              />
            );
          })}
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
  draggedBlockType: string | null;
  setDraggedBlockType: (type: string | null) => void;
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
  onRemoveBlock?: ((sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void) | undefined;
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
  draggedBlockType,
  setDraggedBlockType,
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
  onRemoveBlock,
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

    // Check if this is a section drop (section drag sets "sectionId" in dataTransfer)
    const draggedSectionIdFromTransfer = e.dataTransfer.getData("sectionId");
    const draggedSectionTypeFromTransfer = e.dataTransfer.getData("sectionType");
    const isSectionDrag = Boolean(draggedSectionIdFromTransfer) || Boolean(draggedSectionId);

    if (isSectionDrag) {
      const sectionIdToDrop = draggedSectionId || draggedSectionIdFromTransfer;
      const sectionTypeToDrop = draggedSectionType || draggedSectionTypeFromTransfer;
      if (sectionIdToDrop && sectionIdToDrop !== sectionId && CONVERTIBLE_SECTION_TYPES.includes(sectionTypeToDrop ?? "")) {
        onDropSectionToColumn(sectionIdToDrop, sectionId, column.id, (column.blocks ?? []).length);
        setDraggedSectionId(null);
      }
      return;
    }

    // Otherwise it's a block drop
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
                  onRemoveBlock={onRemoveBlock}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  draggedBlockId={draggedBlockId}
                  setDraggedBlockId={setDraggedBlockId}
                  draggedBlockType={draggedBlockType}
                  setDraggedBlockType={setDraggedBlockType}
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
                  onRemoveBlock={onRemoveBlock}
                  draggedBlockId={draggedBlockId}
                  setDraggedBlockId={setDraggedBlockId}
                  draggedBlockType={draggedBlockType}
                  setDraggedBlockType={setDraggedBlockType}
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
  draggedBlockType: string | null;
  setDraggedBlockType: (type: string | null) => void;
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
  onRemoveBlock?: ((sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void) | undefined;
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
  draggedBlockType,
  setDraggedBlockType,
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
  onRemoveBlock,
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
    <div className="group/sblock">
      <div
        role="button"
        tabIndex={0}
        draggable
        onClick={() => onSelect(block.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(block.id);
          }
        }}
        onDragStart={(e: React.DragEvent) => {
          e.stopPropagation();
          e.dataTransfer.setData("blockId", block.id);
          e.dataTransfer.setData("text/plain", block.id);
          e.dataTransfer.setData("blockType", block.type);
          e.dataTransfer.setData("fromSectionId", sectionId);
          e.dataTransfer.setData("fromColumnId", columnId ?? "");
          e.dataTransfer.setData("fromParentBlockId", "");
          e.dataTransfer.effectAllowed = "move";
          // Defer state updates to prevent re-render from cancelling drag
          setTimeout(() => {
            setDraggedBlockId(block.id);
            if (setDraggedBlockType) setDraggedBlockType(block.type);
            setDraggedFromSectionId(sectionId);
            setDraggedFromColumnId(columnId);
            setDraggedFromParentBlockId(null);
          }, 0);
        }}
        onDragEnd={() => {
          setDraggedBlockId(null);
          if (setDraggedBlockType) setDraggedBlockType(null);
          setDraggedFromSectionId(null);
          setDraggedFromColumnId(null);
          setDraggedFromParentBlockId(null);
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
            const draggedType = e.dataTransfer.getData("blockType") || "";
            const shouldNest = draggedType === "TextAtomLetter";
            onDropBlockToColumn(
              dragId,
              fromSection,
              fromColumn || undefined,
              sectionId,
              columnId,
              shouldNest ? (block.blocks ?? []).length : index,
              fromParent || undefined,
              shouldNest ? block.id : undefined
            );
            setDraggedBlockId(null);
            setDraggedFromSectionId(null);
            setDraggedFromColumnId(null);
            setDraggedFromParentBlockId(null);
            return;
          }
          if (dragId && dragId !== block.id) {
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
        className={`flex w-full cursor-grab items-center gap-1.5 rounded px-2 py-1.5 text-sm font-medium transition active:cursor-grabbing ${
          isDragOver
            ? "bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50"
            : isSelected
            ? "bg-blue-600/80 text-white"
            : isDragging
            ? "opacity-40 text-gray-400"
            : "text-gray-300 hover:bg-muted/40"
        }`}
      >
        <GripVertical className="size-3 shrink-0 text-gray-600 opacity-0 group-hover/sblock:opacity-100" />
        <div
          role="button"
          tabIndex={-1}
          draggable={false}
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
          onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}
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
          <div draggable={false} onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}>
            <ColumnBlockPicker
              onSelect={(elemType: string) => onAddElementToNestedBlock(sectionId, columnId, block.id, elemType)}
            />
          </div>
        )}
        {/* Delete button for section-type blocks */}
        {onRemoveBlock && !isDragOver && (
          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onRemoveBlock(sectionId, block.id, columnId);
            }}
            className="p-0.5 rounded opacity-0 group-hover/sblock:opacity-100 hover:bg-red-500/20 hover:text-red-300 text-gray-500 transition-opacity"
            title="Remove block"
          >
            <Trash2 className="size-3" />
          </button>
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
              onRemoveBlock={onRemoveBlock}
              draggedBlockId={draggedBlockId}
              setDraggedBlockId={setDraggedBlockId}
              draggedBlockType={draggedBlockType}
              setDraggedBlockType={setDraggedBlockType}
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
  onRemoveBlock?: ((sectionId: string, blockId: string, columnId?: string, parentBlockId?: string) => void) | undefined;
  disableDrag?: boolean | undefined;
  draggedBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
  draggedBlockType?: string | null;
  setDraggedBlockType?: (type: string | null) => void;
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
  onRemoveBlock,
  disableDrag = false,
  draggedBlockId,
  setDraggedBlockId,
  draggedBlockType: _draggedBlockType,
  setDraggedBlockType,
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

  // Check if this is an ImageElement in background mode (locked/immovable)
  const isBackgroundMode = block.type === "ImageElement" &&
    (block.settings?.["backgroundTarget"] as string || "none") !== "none";
  const backgroundTarget = (block.settings?.["backgroundTarget"] as string) || "none";
  const canDrag = !disableDrag && !isBackgroundMode;

  return (
    <div
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
        e.stopPropagation();
        e.dataTransfer.setData("blockId", block.id);
        e.dataTransfer.setData("text/plain", block.id);
        e.dataTransfer.setData("blockType", block.type);
        e.dataTransfer.setData("fromSectionId", sectionId);
        e.dataTransfer.setData("fromColumnId", columnId ?? "");
        e.dataTransfer.setData("fromParentBlockId", parentBlockId ?? "");
        e.dataTransfer.effectAllowed = "move";
        // Defer state updates to prevent re-render from cancelling drag
        setTimeout(() => {
          setDraggedBlockId(block.id);
          if (setDraggedBlockType) setDraggedBlockType(block.type);
          setDraggedFromSectionId(sectionId);
          if (setDraggedFromColumnId) setDraggedFromColumnId(columnId ?? null);
          if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(parentBlockId ?? null);
        }, 0);
      }}
      onDragEnd={() => {
        if (!canDrag) return;
        setDraggedBlockId(null);
        if (setDraggedBlockType) setDraggedBlockType(null);
        setDraggedFromSectionId(null);
        if (setDraggedFromColumnId) setDraggedFromColumnId(null);
        if (setDraggedFromParentBlockId) setDraggedFromParentBlockId(null);
      }}
      onDragOver={(e: React.DragEvent) => {
        if (disableDrag) return;
        const hasBlockPayload = Array.from(e.dataTransfer.types ?? []).includes("text/plain");
        const dragId =
          draggedBlockId || e.dataTransfer.getData("blockId") || e.dataTransfer.getData("text/plain");
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
      className={`group flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-sm transition ${
        isBackgroundMode ? "cursor-not-allowed" : canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"
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
      {isBackgroundMode ? (
        <span title={`Locked as ${backgroundTarget} background`}>
          <Lock className="size-3 shrink-0 text-amber-500" />
        </span>
      ) : canDrag ? (
        <GripVertical className="size-3 shrink-0 text-gray-600 opacity-0 group-hover:opacity-100" />
      ) : (
        <span className="size-3 shrink-0" />
      )}
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{blockLabel}</span>
      {isBackgroundMode && (
        <span className="ml-auto text-[9px] text-amber-500/70 uppercase">{backgroundTarget} bg</span>
      )}
      {isDragOver && (
        <span className="ml-auto text-[10px] text-emerald-300">Insert here</span>
      )}
      {/* Delete button - visible on hover when selected or always visible on hover */}
      {onRemoveBlock && !isDragOver && !isBackgroundMode && (
        <button
          type="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onRemoveBlock(sectionId, block.id, columnId, parentBlockId);
          }}
          className="ml-auto p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-300 text-gray-500 transition-opacity"
          title="Remove block"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  );
}
