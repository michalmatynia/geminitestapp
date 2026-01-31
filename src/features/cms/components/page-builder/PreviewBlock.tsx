"use client";

import React from "react";
import { LayoutGrid, Columns, Image as ImageIcon, Play, Share2, Star, ListCollapse, Quote, GalleryHorizontal, Mail, Send, Eye, EyeOff, Trash2, Megaphone, Link2 } from "lucide-react";
import type { SectionInstance, BlockInstance } from "../../types/page-builder";
import { getSectionStyles, getTextAlign } from "../frontend/theme-styles";

export type MediaReplaceTarget = {
  kind: "section" | "block";
  sectionId: string;
  blockId?: string;
  columnId?: string;
  parentBlockId?: string;
  key: string;
};

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

// ---------------------------------------------------------------------------
// Top-level section preview
// ---------------------------------------------------------------------------

interface PreviewSectionProps {
  section: SectionInstance;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
  onOpenMedia?: (target: MediaReplaceTarget) => void;
  onRemoveSection?: (sectionId: string) => void;
  onToggleSectionVisibility?: (sectionId: string, isHidden: boolean) => void;
}

export function PreviewSection({
  section,
  selectedNodeId,
  onSelect,
  onOpenMedia,
  onRemoveSection,
  onToggleSectionVisibility,
}: PreviewSectionProps): React.ReactNode {
  const isSectionSelected = selectedNodeId === section.id;
  const isHidden = Boolean(section.settings["isHidden"]);
  const label = (section.settings["label"] as string | undefined) ?? section.type;

  // Toggle: clicking an already-selected section deselects it
  const handleSelect = (): void => {
    if (isSectionSelected) {
      onSelect("");
    } else {
      onSelect(section.id);
    }
  };

  const renderSectionActions = (): React.ReactNode => {
    if (!isSectionSelected) return null;
    return (
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-border/40 bg-gray-900/80 px-1.5 py-1 text-xs text-gray-200 shadow-sm">
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onToggleSectionVisibility?.(section.id, !isHidden);
          }}
          className="rounded p-1 text-gray-300 hover:text-white hover:bg-white/10"
          title={isHidden ? "Show section" : "Hide section"}
        >
          {isHidden ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onRemoveSection?.(section.id);
          }}
          className="rounded p-1 text-gray-300 hover:text-red-200 hover:bg-red-500/20"
          title="Delete section"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    );
  };

  if (isHidden) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        className={`relative w-full rounded-lg border border-dashed px-4 py-6 text-left transition cursor-pointer ${
          isSectionSelected
            ? "border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20"
            : "border-border/50 bg-transparent hover:border-border/70"
        }`}
      >
        {renderSectionActions()}
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
          <EyeOff className="size-3.5" />
          <span>Hidden section</span>
        </div>
        <div className="mt-2 text-sm text-gray-400">{label}</div>
      </div>
    );
  }

  if (section.type === "AnnouncementBar") {
    const alignment = (section.settings["contentAlignment"] as string) || "center";
    const alignmentClasses =
      alignment === "left"
        ? "justify-start text-left"
        : alignment === "right"
          ? "justify-end text-right"
          : "justify-center text-center";

    const announcementStyles: React.CSSProperties = {
      ...getSectionStyles(section.settings),
      ...getTextAlign(section.settings["contentAlignment"]),
    };

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={announcementStyles}
        className={`relative w-full px-4 text-left transition cursor-pointer ${
          isSectionSelected
            ? "ring-2 ring-blue-500/40"
            : "hover:ring-1 hover:ring-border/40"
        }`}
      >
        {renderSectionActions()}
        <div className={`flex flex-wrap items-center gap-3 ${alignmentClasses}`}>
          {section.blocks.length === 0 ? (
            <p className="text-sm text-gray-400">Announcement bar</p>
          ) : (
            section.blocks.map((block: BlockInstance) => (
              <PreviewBlockItem
                key={block.id}
                block={block}
                isSelected={selectedNodeId === block.id}
                onSelect={onSelect}
                contained
                selectedNodeId={selectedNodeId}
                sectionId={section.id}
                onOpenMedia={onOpenMedia}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Shared section wrapper — uses getSectionStyles for real inline styles
  // ---------------------------------------------------------------------------
  const sectionStyles = getSectionStyles(section.settings);
  const selectedRing = isSectionSelected
    ? "ring-2 ring-blue-500/40"
    : "hover:ring-1 hover:ring-border/40";

  const sectionImage = section.settings["image"] as string | undefined;

  // Helper to render blocks list
  const renderBlocks = (emptyText: string): React.ReactNode =>
    section.blocks.length === 0 ? (
      <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-border/50 text-sm text-gray-500">
        {emptyText}
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
            sectionId={section.id}
            onOpenMedia={onOpenMedia}
          />
        ))}
      </div>
    );

  // Grid sections
  if (section.type === "Grid") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <LayoutGrid className="size-3.5" />
          <span>Grid</span>
        </div>
        <PreviewGridContent
          section={section}
          selectedNodeId={selectedNodeId}
          onSelect={onSelect}
          onOpenMedia={onOpenMedia}
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
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer group ${selectedRing}`}
      >
        {renderSectionActions()}
        {onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia({ kind: "section", sectionId: section.id, key: "image" });
            }}
            className="absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
        <div className={`flex gap-4 ${imageFirst ? "flex-row" : "flex-row-reverse"}`}>
          <div className="flex w-2/5 shrink-0 items-center justify-center rounded-md bg-gray-700/30 min-h-[100px] overflow-hidden">
            {sectionImage ? (
              <img src={sectionImage} alt="" className="size-full object-cover" />
            ) : (
              <ImageIcon className="size-8 text-gray-500" />
            )}
          </div>
          <div className="flex flex-1 flex-col justify-center gap-2">
            {renderBlocks("Add blocks to content area")}
          </div>
        </div>
      </div>
    );
  }

  // Hero section — full-width banner with centered content overlay
  if (section.type === "Hero") {
    const heroBgStyle: React.CSSProperties = sectionImage
      ? { backgroundImage: `url(${sectionImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg text-left transition cursor-pointer group ${selectedRing}`}
      >
        {renderSectionActions()}
        {onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia({ kind: "section", sectionId: section.id, key: "image" });
            }}
            className="absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
        <div
          className={`relative min-h-[140px] rounded-md px-6 ${sectionImage ? "" : "bg-gradient-to-br from-gray-700/40 to-gray-800/60"}`}
          style={heroBgStyle}
        >
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
                  sectionId={section.id}
                  onOpenMedia={onOpenMedia}
                />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // RichText section
  if (section.type === "RichText") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {renderBlocks("Add blocks to rich text section")}
      </div>
    );
  }

  // Accordion section
  if (section.type === "Accordion") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <ListCollapse className="size-3.5" />
          <span>Accordion</span>
        </div>
        {section.blocks.length === 0 ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((n: number) => (
              <div key={n} className="flex items-center gap-2 rounded border border-dashed border-border/40 p-2">
                <div className="h-2 w-2/3 rounded bg-gray-600/30" />
                <span className="ml-auto text-xs text-gray-600">+</span>
              </div>
            ))}
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
                sectionId={section.id}
                onOpenMedia={onOpenMedia}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Testimonials section
  if (section.type === "Testimonials") {
    const columns = (section.settings["columns"] as number) || 3;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <Quote className="size-3.5" />
          <span>Testimonials</span>
        </div>
        {section.blocks.length === 0 ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(columns, 3)}, 1fr)` }}>
            {Array.from({ length: Math.min(columns, 3) }).map((_val: unknown, idx: number) => (
              <div key={idx} className="rounded border border-dashed border-border/40 p-3">
                <Quote className="size-3 text-gray-600 mb-1" />
                <div className="h-2 w-full rounded bg-gray-600/30 mb-1" />
                <div className="h-2 w-2/3 rounded bg-gray-600/20" />
              </div>
            ))}
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
                sectionId={section.id}
                onOpenMedia={onOpenMedia}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Video section
  if (section.type === "Video") {
    const ratio = (section.settings["aspectRatio"] as string) || "16:9";

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        <div className="flex items-center justify-center rounded bg-gray-700/30 min-h-[100px]">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-gray-600/50">
              <Play className="size-5 text-gray-300" />
            </div>
            <span className="text-xs text-gray-500">{ratio}</span>
          </div>
        </div>
      </div>
    );
  }

  // Slideshow section
  if (section.type === "Slideshow") {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <GalleryHorizontal className="size-3.5" />
          <span>Slideshow</span>
        </div>
        {section.blocks.length === 0 ? (
          <div className="flex items-center justify-center rounded bg-gray-700/30 min-h-[80px]">
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="size-6 text-gray-500" />
              <div className="flex gap-1">
                {[0, 1, 2].map((dotIdx: number) => (
                  <div key={dotIdx} className={`size-1.5 rounded-full ${dotIdx === 0 ? "bg-gray-400" : "bg-gray-600"}`} />
                ))}
              </div>
            </div>
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
                sectionId={section.id}
                onOpenMedia={onOpenMedia}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Newsletter section
  if (section.type === "Newsletter") {
    const buttonText = (section.settings["buttonText"] as string) || "Subscribe";
    const placeholder = (section.settings["placeholder"] as string) || "Enter your email";

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <Mail className="size-3.5" />
          <span>Newsletter</span>
        </div>
        {section.blocks.length > 0 && (
          <div className="space-y-2 mb-3">
            {section.blocks.map((block: BlockInstance) => (
              <PreviewBlockItem
                key={block.id}
                block={block}
                isSelected={selectedNodeId === block.id}
                onSelect={onSelect}
                contained
                selectedNodeId={selectedNodeId}
                sectionId={section.id}
                onOpenMedia={onOpenMedia}
              />
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 rounded border border-border/40 bg-gray-800/30 px-3 py-1.5 text-xs text-gray-500">
            {placeholder}
          </div>
          <div className="rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-900">
            {buttonText}
          </div>
        </div>
      </div>
    );
  }

  // ContactForm section
  if (section.type === "ContactForm") {
    const fields = ((section.settings["fields"] as string) || "name,email,message").split(",").map((f: string) => f.trim());
    const submitText = (section.settings["submitText"] as string) || "Send message";

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
          <Send className="size-3.5" />
          <span>Contact Form</span>
        </div>
        <div className="space-y-2">
          {fields.map((field: string) => (
            <div key={field} className="rounded border border-border/40 bg-gray-800/30 px-3 py-1.5 text-xs text-gray-500 capitalize">
              {field}
            </div>
          ))}
          <div className="rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-900 text-center">
            {submitText}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for unknown section types
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === "Enter" || e.key === " ") handleSelect();
      }}
      style={sectionStyles}
      className={`relative w-full rounded-lg px-4 text-left transition cursor-pointer ${selectedRing}`}
    >
      {renderSectionActions()}
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
        {section.type}
      </div>
      {renderBlocks("No blocks")}
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
  onOpenMedia?: (target: MediaReplaceTarget) => void;
}

function PreviewGridContent({ section, selectedNodeId, onSelect, onOpenMedia }: PreviewGridContentProps): React.ReactNode {
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
                    sectionId={section.id}
                    columnId={column.id}
                    onOpenMedia={onOpenMedia}
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
  sectionId: string;
  columnId?: string;
  parentBlockId?: string;
  contained?: boolean;
  selectedNodeId?: string | null;
  onOpenMedia?: (target: MediaReplaceTarget) => void;
}

function PreviewBlockItem({ block, isSelected, onSelect, contained, selectedNodeId, sectionId, columnId, parentBlockId, onOpenMedia }: PreviewBlockItemProps): React.ReactNode {
  const isSectionType = SECTION_BLOCK_TYPES.includes(block.type);

  // ---------------------------------------------------------------------------
  // Section-type blocks (ImageWithText, Hero) — layout-aware preview
  // ---------------------------------------------------------------------------
  if (isSectionType) {
    const canReplaceImage = Boolean(onOpenMedia);
    return (
      <div className="relative group">
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
              <PreviewImageWithTextBlock
                block={block}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
                sectionId={sectionId}
                columnId={columnId}
                onOpenMedia={onOpenMedia}
              />
            )}
            {block.type === "Hero" && (
              <PreviewHeroBlock
                block={block}
                selectedNodeId={selectedNodeId}
                onSelect={onSelect}
                sectionId={sectionId}
                columnId={columnId}
                onOpenMedia={onOpenMedia}
              />
            )}
          </div>
        </button>
        {canReplaceImage && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia?.({
                kind: "block",
                sectionId,
                blockId: block.id,
                columnId,
                parentBlockId,
                key: "image",
              });
            }}
            className="absolute right-2 top-2 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
      </div>
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

  if (block.type === "Announcement") {
    const text = (block.settings["text"] as string) || "Announcement";
    const link = (block.settings["link"] as string) || "";
    return (
      <div
        className={`flex items-center gap-2 rounded px-2 py-1 text-sm transition ${
          isSelected ? "bg-blue-500/10 text-blue-200" : "text-gray-300"
        }`}
      >
        <Megaphone className="size-3.5 text-gray-400" />
        <span className={link ? "text-blue-300 underline decoration-blue-400/50" : ""}>
          {text}
        </span>
        {link ? <Link2 className="size-3 text-blue-300/80" /> : null}
      </div>
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

  // Image block
  if (block.type === "Image") {
    const src = (block.settings["src"] as string) || "";
    const alt = (block.settings["alt"] as string) || "Image";
    const width = (block.settings["width"] as number) || 100;
    const borderRadius = (block.settings["borderRadius"] as number) || 0;

    return (
      <div className="relative group">
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onSelect(block.id);
          }}
          className={`w-full rounded border p-1 text-left transition overflow-hidden ${
            contained ? "max-w-full" : ""
          } ${
            isSelected
              ? "border-blue-400 bg-blue-500/10 ring-1 ring-blue-400/30"
              : "border-transparent hover:border-border/30"
          }`}
        >
          {src ? (
            <img
              src={src}
              alt={alt}
              className="block max-w-full object-cover"
              style={{ width: `${width}%`, borderRadius: borderRadius > 0 ? `${borderRadius}px` : undefined }}
            />
          ) : (
            <div className="flex items-center justify-center rounded bg-gray-700/30 min-h-[60px]" style={{ width: `${width}%` }}>
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className="size-6 text-gray-500" />
                <span className="text-xs text-gray-500 truncate max-w-[120px]">{alt}</span>
              </div>
            </div>
          )}
        </button>
        {onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia?.({
                kind: "block",
                sectionId,
                blockId: block.id,
                columnId,
                parentBlockId,
                key: "src",
              });
            }}
            className="absolute right-2 top-2 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
      </div>
    );
  }

  // VideoEmbed block
  if (block.type === "VideoEmbed") {
    const ratio = (block.settings["aspectRatio"] as string) || "16:9";

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
        <div className="flex items-center justify-center rounded bg-gray-700/30 min-h-[60px]">
          <div className="flex items-center gap-2">
            <Play className="size-5 text-gray-500" />
            <span className="text-xs text-gray-500">{ratio}</span>
          </div>
        </div>
      </button>
    );
  }

  // Divider block
  if (block.type === "Divider") {
    const style = (block.settings["dividerStyle"] as string) || "solid";
    const thickness = (block.settings["thickness"] as number) || 1;
    const color = (block.settings["dividerColor"] as string) || "#4b5563";

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
        <hr style={{ borderStyle: style, borderTopWidth: `${thickness}px`, borderColor: color }} />
      </button>
    );
  }

  // SocialLinks block
  if (block.type === "SocialLinks") {
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
        <div className="flex items-center justify-center gap-3">
          <Share2 className="size-4 text-gray-500" />
          <span className="text-xs text-gray-500">Social Links</span>
        </div>
      </button>
    );
  }

  // Icon block
  if (block.type === "Icon") {
    const iconName = (block.settings["iconName"] as string) || "Star";
    const iconColor = (block.settings["iconColor"] as string) || "#ffffff";

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
        <div className="flex items-center justify-center gap-2">
          <Star className="size-5" style={{ color: iconColor }} />
          <span className="text-xs text-gray-500">{iconName}</span>
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
  sectionId: string;
  columnId?: string;
  onOpenMedia?: (target: MediaReplaceTarget) => void;
}

function PreviewImageWithTextBlock({ block, selectedNodeId, onSelect, sectionId, columnId, onOpenMedia }: PreviewSectionBlockProps): React.ReactNode {
  const placement = block.settings["desktopImagePlacement"] as string | undefined;
  const imageFirst = placement !== "image-second";
  const children = block.blocks ?? [];
  const blockImage = block.settings["image"] as string | undefined;

  return (
    <div className={`flex gap-2 ${imageFirst ? "flex-row" : "flex-row-reverse"}`}>
      <div className="flex w-1/3 shrink-0 items-center justify-center rounded bg-gray-700/40 min-h-[48px] overflow-hidden">
        {blockImage ? (
          <img src={blockImage} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-5 text-gray-500" />
        )}
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
              sectionId={sectionId}
              columnId={columnId}
              parentBlockId={block.id}
              onOpenMedia={onOpenMedia}
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

function PreviewHeroBlock({ block, selectedNodeId, onSelect, sectionId, columnId, onOpenMedia }: PreviewSectionBlockProps): React.ReactNode {
  const children = block.blocks ?? [];
  const blockImage = block.settings["image"] as string | undefined;
  const heroBgStyle: React.CSSProperties = blockImage
    ? { backgroundImage: `url(${blockImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <div
      className={`relative min-h-[80px] rounded px-3 ${blockImage ? "" : "bg-gradient-to-br from-gray-700/30 to-gray-800/50"}`}
      style={heroBgStyle}
    >
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
              sectionId={sectionId}
              columnId={columnId}
              parentBlockId={block.id}
              onOpenMedia={onOpenMedia}
            />
          ))
        ) : (
          <span className="text-xs text-gray-500">Hero banner</span>
        )}
      </div>
    </div>
  );
}
