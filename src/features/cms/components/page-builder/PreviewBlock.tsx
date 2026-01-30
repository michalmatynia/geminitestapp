"use client";

import React from "react";
import { LayoutGrid, Columns, Image as ImageIcon } from "lucide-react";
import type { SectionInstance, BlockInstance } from "../../types/page-builder";

// Section-type block types that get a richer preview
const SECTION_BLOCK_TYPES = ["ImageWithText", "Hero"];

// ---------------------------------------------------------------------------
// Color scheme background tints
// ---------------------------------------------------------------------------

const COLOR_SCHEME_BG: Record<string, string> = {
  "scheme-1": "bg-transparent",
  "scheme-2": "bg-blue-500/5",
  "scheme-3": "bg-purple-500/5",
  "scheme-4": "bg-green-500/5",
  "scheme-5": "bg-amber-500/5",
};

function getColorSchemeBg(scheme: unknown): string {
  if (typeof scheme === "string" && scheme in COLOR_SCHEME_BG) {
    return COLOR_SCHEME_BG[scheme];
  }
  return "";
}

function getSectionPadding(settings: Record<string, unknown>): React.CSSProperties {
  const pt = typeof settings["paddingTop"] === "number" ? settings["paddingTop"] : 36;
  const pb = typeof settings["paddingBottom"] === "number" ? settings["paddingBottom"] : 36;
  return { paddingTop: `${pt}px`, paddingBottom: `${pb}px` };
}

// ---------------------------------------------------------------------------
// Top-level section preview
// ---------------------------------------------------------------------------

interface PreviewSectionProps {
  section: SectionInstance;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

export function PreviewSection({ section, selectedNodeId, onSelect }: PreviewSectionProps): React.ReactNode {
  const isSectionSelected = selectedNodeId === section.id;
  const colorBg = getColorSchemeBg(section.settings["colorScheme"]);
  const paddingStyle = getSectionPadding(section.settings);

  // Grid sections — keep existing grid rendering
  if (section.type === "Grid") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(): void => onSelect(section.id)}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") onSelect(section.id);
        }}
        style={paddingStyle}
        className={`w-full rounded-lg border-2 border-dashed px-4 text-left transition cursor-pointer ${colorBg} ${
          isSectionSelected
            ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
            : "border-border/50 bg-transparent hover:border-border/70"
        }`}
      >
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

  // ImageWithText section — side-by-side image + content
  if (section.type === "ImageWithText") {
    const placement = section.settings["desktopImagePlacement"] as string | undefined;
    const imageFirst = placement !== "image-second";

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(): void => onSelect(section.id)}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") onSelect(section.id);
        }}
        style={paddingStyle}
        className={`w-full rounded-lg border-2 px-4 text-left transition cursor-pointer ${colorBg} ${
          isSectionSelected
            ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
            : "border-border/40 bg-card/40 hover:border-border/60"
        }`}
      >
        <div className={`flex gap-4 ${imageFirst ? "flex-row" : "flex-row-reverse"}`}>
          {/* Image placeholder */}
          <div className="flex w-2/5 shrink-0 items-center justify-center rounded-md bg-gray-700/30 min-h-[100px]">
            <ImageIcon className="size-8 text-gray-500" />
          </div>
          {/* Content area */}
          <div className="flex flex-1 flex-col justify-center gap-2">
            {section.blocks.length === 0 ? (
              <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-border/50 text-sm text-gray-500">
                Add blocks to content area
              </div>
            ) : (
              section.blocks.map((block: BlockInstance) => (
                <PreviewBlockItem
                  key={block.id}
                  block={block}
                  isSelected={selectedNodeId === block.id}
                  onSelect={onSelect}
                  contained
                  selectedNodeId={selectedNodeId}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Hero section — full-width banner with centered content overlay
  if (section.type === "Hero") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(): void => onSelect(section.id)}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") onSelect(section.id);
        }}
        style={paddingStyle}
        className={`w-full rounded-lg border-2 text-left transition cursor-pointer ${colorBg} ${
          isSectionSelected
            ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
            : "border-border/40 bg-card/40 hover:border-border/60"
        }`}
      >
        <div className="relative min-h-[140px] rounded-md bg-gradient-to-br from-gray-700/40 to-gray-800/60 px-6">
          <div className="flex min-h-[140px] flex-col items-center justify-center gap-2">
            {section.blocks.length === 0 ? (
              <span className="text-sm text-gray-500">Add content to hero banner</span>
            ) : (
              section.blocks.map((block: BlockInstance) => (
                <PreviewBlockItem
                  key={block.id}
                  block={block}
                  isSelected={selectedNodeId === block.id}
                  onSelect={onSelect}
                  contained
                  selectedNodeId={selectedNodeId}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // RichText section — simple content wrapper
  if (section.type === "RichText") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={(): void => onSelect(section.id)}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") onSelect(section.id);
        }}
        style={paddingStyle}
        className={`w-full rounded-lg border-2 px-4 text-left transition cursor-pointer ${colorBg} ${
          isSectionSelected
            ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
            : "border-border/40 bg-card/40 hover:border-border/60"
        }`}
      >
        {section.blocks.length === 0 ? (
          <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-border/50 text-sm text-gray-500">
            Add blocks to rich text section
          </div>
        ) : (
          <div className="space-y-2">
            {section.blocks.map((block: BlockInstance) => (
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
  }

  // Fallback for unknown section types
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(): void => onSelect(section.id)}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === "Enter" || e.key === " ") onSelect(section.id);
      }}
      style={paddingStyle}
      className={`w-full rounded-lg border-2 px-4 text-left transition cursor-pointer ${colorBg} ${
        isSectionSelected
          ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
          : "border-border/40 bg-card/40 hover:border-border/60"
      }`}
    >
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
        {section.type}
      </div>
      {section.blocks.length === 0 ? (
        <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-border/50 text-sm text-gray-500">
          No blocks
        </div>
      ) : (
        <div className="space-y-2">
          {section.blocks.map((block: BlockInstance) => (
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
}

// ---------------------------------------------------------------------------
// Grid preview content (columns side by side)
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
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onSelect(column.id);
            }}
            onKeyDown={(e: React.KeyboardEvent): void => {
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
  const isSectionType = SECTION_BLOCK_TYPES.includes(block.type);

  // ---------------------------------------------------------------------------
  // Section-type blocks (ImageWithText, Hero) — layout-aware preview
  // ---------------------------------------------------------------------------
  if (isSectionType) {
    return (
      <button
        type="button"
        onClick={(e: React.MouseEvent): void => {
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
        <div className="p-2.5 overflow-hidden">
          {block.type === "ImageWithText" && (
            <PreviewImageWithTextBlock block={block} selectedNodeId={selectedNodeId} onSelect={onSelect} />
          )}
          {block.type === "Hero" && (
            <PreviewHeroBlock block={block} selectedNodeId={selectedNodeId} onSelect={onSelect} />
          )}
        </div>
      </button>
    );
  }

  // ---------------------------------------------------------------------------
  // Standard element blocks — render actual styled content
  // ---------------------------------------------------------------------------

  // Heading block
  if (block.type === "Heading") {
    const text = (block.settings["headingText"] as string) || "Heading";
    const size = (block.settings["headingSize"] as string) || "medium";
    const sizeClass = size === "small" ? "text-base font-semibold" : size === "large" ? "text-2xl font-bold" : "text-xl font-bold";

    return (
      <button
        type="button"
        onClick={(e: React.MouseEvent): void => {
          e.stopPropagation();
          onSelect(block.id);
        }}
        className={`w-full rounded border p-3 text-left transition overflow-hidden ${
          contained ? "max-w-full" : ""
        } ${
          isSelected
            ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400/30"
            : "border-border/30 bg-gray-800/20 hover:border-border/50"
        }`}
      >
        <div className={`${sizeClass} text-gray-200 truncate`}>{text}</div>
      </button>
    );
  }

  // Text block
  if (block.type === "Text") {
    const text = (block.settings["textContent"] as string) || "";

    return (
      <button
        type="button"
        onClick={(e: React.MouseEvent): void => {
          e.stopPropagation();
          onSelect(block.id);
        }}
        className={`w-full rounded border p-3 text-left transition overflow-hidden ${
          contained ? "max-w-full" : ""
        } ${
          isSelected
            ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400/30"
            : "border-border/30 bg-gray-800/20 hover:border-border/50"
        }`}
      >
        {text ? (
          <p className="text-sm text-gray-300 line-clamp-3">{text}</p>
        ) : (
          <p className="text-sm italic text-gray-500">Add text content...</p>
        )}
      </button>
    );
  }

  // Button block
  if (block.type === "Button") {
    const label = (block.settings["buttonLabel"] as string) || "Button";
    const style = (block.settings["buttonStyle"] as string) || "solid";

    return (
      <button
        type="button"
        onClick={(e: React.MouseEvent): void => {
          e.stopPropagation();
          onSelect(block.id);
        }}
        className={`w-full rounded border p-3 text-left transition overflow-hidden ${
          contained ? "max-w-full" : ""
        } ${
          isSelected
            ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400/30"
            : "border-border/30 bg-gray-800/20 hover:border-border/50"
        }`}
      >
        <div
          className={`inline-block rounded-md px-4 py-1.5 text-sm font-medium ${
            style === "outline"
              ? "border border-gray-400 text-gray-300"
              : "bg-gray-200 text-gray-900"
          }`}
        >
          {label}
        </div>
      </button>
    );
  }

  // RichText block
  if (block.type === "RichText") {
    const colorScheme = block.settings["colorScheme"] as string | undefined;
    const schemeBg = getColorSchemeBg(colorScheme);

    return (
      <button
        type="button"
        onClick={(e: React.MouseEvent): void => {
          e.stopPropagation();
          onSelect(block.id);
        }}
        className={`w-full rounded border p-3 text-left transition overflow-hidden ${schemeBg} ${
          contained ? "max-w-full" : ""
        } ${
          isSelected
            ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400/30"
            : "border-border/30 bg-gray-800/20 hover:border-border/50"
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full rounded bg-gray-600/40" />
          <div className="h-2 w-5/6 rounded bg-gray-600/30" />
          <div className="h-2 w-2/3 rounded bg-gray-600/30" />
        </div>
      </button>
    );
  }

  // Fallback for unknown block types
  return (
    <button
      type="button"
      onClick={(e: React.MouseEvent): void => {
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
      <span className="flex-1 truncate text-gray-300">{block.type}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ImageWithText block preview (inside columns)
// ---------------------------------------------------------------------------

interface PreviewSectionBlockProps {
  block: BlockInstance;
  selectedNodeId?: string | null;
  onSelect: (nodeId: string) => void;
}

function PreviewImageWithTextBlock({ block, selectedNodeId, onSelect }: PreviewSectionBlockProps): React.ReactNode {
  const placement = block.settings["desktopImagePlacement"] as string | undefined;
  const imageFirst = placement !== "image-second";
  const children = block.blocks ?? [];

  return (
    <div className={`flex gap-2 ${imageFirst ? "flex-row" : "flex-row-reverse"}`}>
      <div className="flex w-1/3 shrink-0 items-center justify-center rounded bg-gray-700/40 min-h-[48px]">
        <ImageIcon className="size-5 text-gray-500" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1 overflow-hidden">
        {children.length > 0 ? (
          children.map((child: BlockInstance) => (
            <PreviewBlockItem
              key={child.id}
              block={child}
              isSelected={selectedNodeId === child.id}
              onSelect={onSelect}
              contained
              selectedNodeId={selectedNodeId}
            />
          ))
        ) : (
          <div className="flex min-h-[40px] items-center justify-center rounded border border-dashed border-border/30 text-xs text-gray-600">
            Add content
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero block preview (inside columns)
// ---------------------------------------------------------------------------

function PreviewHeroBlock({ block, selectedNodeId, onSelect }: PreviewSectionBlockProps): React.ReactNode {
  const children = block.blocks ?? [];

  return (
    <div className="relative min-h-[80px] rounded bg-gradient-to-br from-gray-700/30 to-gray-800/50 px-3">
      <div className="flex min-h-[80px] flex-col items-center justify-center gap-1">
        {children.length > 0 ? (
          children.map((child: BlockInstance) => (
            <PreviewBlockItem
              key={child.id}
              block={child}
              isSelected={selectedNodeId === child.id}
              onSelect={onSelect}
              contained
              selectedNodeId={selectedNodeId}
            />
          ))
        ) : (
          <span className="text-xs text-gray-500">Hero banner</span>
        )}
      </div>
    </div>
  );
}
