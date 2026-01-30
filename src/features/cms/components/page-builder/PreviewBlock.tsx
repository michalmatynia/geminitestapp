"use client";

import React from "react";
import { Layers, Heading, AlignLeft, MousePointerClick, Box, LayoutGrid, Columns, FileText, LayoutTemplate } from "lucide-react";
import type { SectionInstance, BlockInstance } from "../../types/page-builder";

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
  ImageWithText: Layers,
  RichText: FileText,
  Hero: LayoutTemplate,
};

// Section-type block types that get a richer preview
const SECTION_BLOCK_TYPES = ["ImageWithText", "Hero"];

interface PreviewSectionProps {
  section: SectionInstance;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

export function PreviewSection({ section, selectedNodeId, onSelect }: PreviewSectionProps): React.ReactNode {
  const isSectionSelected = selectedNodeId === section.id;
  const SectionIcon = SECTION_ICONS[section.type] ?? Box;

  // Grid sections use dashed border, full-width
  if (section.type === "Grid") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(section.id)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") onSelect(section.id);
        }}
        className={`w-full rounded-lg border-2 border-dashed p-4 text-left transition cursor-pointer ${
          isSectionSelected
            ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
            : "border-border/50 bg-transparent hover:border-border/70"
        }`}
      >
        {/* Grid header */}
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <LayoutGrid className="size-3.5" />
          <span>Grid</span>
        </div>

        <PreviewGridContent
          section={section}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
        />
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(section.id)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") onSelect(section.id);
      }}
      className={`w-full rounded-lg border-2 p-4 text-left transition cursor-pointer ${
        isSectionSelected
          ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
          : "border-border/40 bg-card/40 hover:border-border/60"
      }`}
    >
      {/* Section header */}
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        <SectionIcon className="size-3.5" />
        <span>{section.type}</span>
      </div>

      {/* Section content area */}
      {section.blocks.length === 0 ? (
        <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-border/50 bg-gray-800/30 text-sm text-gray-500">
          No blocks - click + in the tree to add
        </div>
      ) : (
        <div className="space-y-2">
          {section.blocks.map((block: BlockInstance) => (
            <PreviewBlockItem
              key={block.id}
              block={block}
              isSelected={selectedNodeId === block.id}
              onSelect={onSelect}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid preview content (columns side by side, dashed borders)
// ---------------------------------------------------------------------------

interface PreviewGridContentProps {
  section: SectionInstance;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

function PreviewGridContent({ section, selectedNodeId, onSelect }: PreviewGridContentProps): React.ReactNode {
  const columns = section.blocks.filter((b: BlockInstance) => b.type === "Column");
  const gap = section.settings["gap"] as string | undefined;
  const gapClass = gap === "none" ? "gap-0" : gap === "small" ? "gap-2" : gap === "large" ? "gap-6" : "gap-4";

  if (columns.length === 0) {
    return (
      <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-border/50 bg-gray-800/30 text-sm text-gray-500">
        No columns
      </div>
    );
  }

  return (
    <div className={`grid ${gapClass}`} style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
      {columns.map((column: BlockInstance, colIndex: number) => {
        const isColumnSelected = selectedNodeId === column.id;
        return (
          <div
            key={column.id}
            role="button"
            tabIndex={0}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelect(column.id);
            }}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onSelect(column.id);
              }
            }}
            className={`rounded border-2 border-dashed p-2 text-left transition overflow-hidden cursor-pointer ${
              isColumnSelected
                ? "border-blue-400 bg-blue-500/5 ring-1 ring-blue-400/30"
                : "border-border/40 bg-gray-900/20 hover:border-border/60"
            }`}
          >
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-gray-500">
              <Columns className="size-3" />
              <span>Col {colIndex + 1}</span>
            </div>
            {(column.blocks ?? []).length === 0 ? (
              <div className="flex min-h-[40px] items-center justify-center rounded border border-dashed border-border/30 text-xs text-gray-600">
                Empty
              </div>
            ) : (
              <div className="space-y-1.5 overflow-hidden">
                {(column.blocks ?? []).map((block: BlockInstance) => (
                  <PreviewBlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedNodeId === block.id}
                    onSelect={onSelect}
                    contained
                    selectedNodeId={selectedNodeId}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block preview item (nested inside section or column preview)
// ---------------------------------------------------------------------------

interface PreviewBlockItemProps {
  block: BlockInstance;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  contained?: boolean;
  selectedNodeId?: string | null;
}

function PreviewBlockItem({ block, isSelected, onSelect, contained, selectedNodeId }: PreviewBlockItemProps): React.ReactNode {
  const BlockIcon = BLOCK_ICONS[block.type] ?? Box;
  const isSectionType = SECTION_BLOCK_TYPES.includes(block.type);

  // Section-type blocks get a richer, contained preview
  if (isSectionType) {
    return (
      <button
        type="button"
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onSelect(block.id);
        }}
        className={`w-full rounded border-2 text-left text-sm transition overflow-hidden ${
          contained ? "max-w-full" : ""
        } ${
          isSelected
            ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400/30"
            : "border-border/30 bg-gray-800/30 hover:border-border/50"
        }`}
      >
        {/* Section-type header bar */}
        <div className="flex items-center gap-1.5 border-b border-border/20 bg-gray-800/40 px-2.5 py-1.5">
          <BlockIcon className="size-3 shrink-0 text-gray-400" />
          <span className="text-xs font-medium text-gray-400">{block.type}</span>
        </div>
        {/* Section-type content: show child elements if any, otherwise placeholder */}
        <div className="p-2.5 overflow-hidden">
          {(block.blocks ?? []).length > 0 ? (
            <div className="space-y-1.5 overflow-hidden">
              {(block.blocks ?? []).map((child: BlockInstance) => (
                <PreviewBlockItem
                  key={child.id}
                  block={child}
                  isSelected={selectedNodeId === child.id}
                  onSelect={onSelect}
                  contained
                  selectedNodeId={selectedNodeId}
                />
              ))}
            </div>
          ) : (
            <>
              {block.type === "ImageWithText" && (
                <div className="flex gap-2">
                  <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded bg-gray-700/40 text-[10px] text-gray-500">
                    IMG
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
                    <div className="h-2 w-3/4 rounded bg-gray-700/40" />
                    <div className="h-2 w-full rounded bg-gray-700/30" />
                    <div className="h-2 w-1/2 rounded bg-gray-700/30" />
                  </div>
                </div>
              )}
              {block.type === "RichText" && (
                <div className="flex flex-col gap-1 overflow-hidden">
                  <div className="h-2 w-full rounded bg-gray-700/40" />
                  <div className="h-2 w-5/6 rounded bg-gray-700/30" />
                  <div className="h-2 w-2/3 rounded bg-gray-700/30" />
                </div>
              )}
              {block.type === "Hero" && (
                <div className="relative overflow-hidden rounded bg-gray-700/30">
                  <div className="flex h-14 items-center justify-center text-[10px] text-gray-500">
                    Hero Banner
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </button>
    );
  }

  // Standard element block types (Heading, Text, Button, RichText, etc.)
  return (
    <button
      type="button"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(block.id);
      }}
      className={`flex w-full items-center gap-2 rounded border p-3 text-left text-sm transition overflow-hidden ${
        contained ? "max-w-full" : ""
      } ${
        isSelected
          ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400/30"
          : "border-border/30 bg-gray-800/20 hover:border-border/50"
      }`}
    >
      <BlockIcon className="size-3.5 shrink-0 text-gray-400" />
      <span className="flex-1 truncate text-gray-300">
        {block.type === "Heading" && (block.settings["headingText"] as string || "Heading")}
        {block.type === "Text" && (block.settings["textContent"] as string || "Text block")}
        {block.type === "Button" && (block.settings["buttonLabel"] as string || "Button")}
        {block.type === "RichText" && "Rich text"}
        {!["Heading", "Text", "Button", "RichText"].includes(block.type) && block.type}
      </span>
    </button>
  );
}
