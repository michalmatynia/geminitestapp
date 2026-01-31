"use client";

import React, { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import { createPortal } from "react-dom";
import { Image as ImageIcon, Play, Share2, Star, Quote, Eye, EyeOff, Trash2, Megaphone, Link2, AppWindow } from "lucide-react";
import type { SectionInstance, BlockInstance, InspectorSettings, PageZone } from "../../types/page-builder";
import { APP_EMBED_OPTIONS, type AppEmbedId } from "@/features/app-embeds/lib/constants";
import { getSectionStyles, getTextAlign, getBlockTypographyStyles, type ColorSchemeColors } from "../frontend/theme-styles";

type AppEmbedOption = (typeof APP_EMBED_OPTIONS)[number];

export type MediaReplaceTarget = {
  kind: "section" | "block";
  sectionId: string;
  blockId?: string;
  columnId?: string;
  parentBlockId?: string;
  key: string;
};

// Section-type block types that get a richer preview
const SECTION_BLOCK_TYPES = ["ImageWithText", "Hero", "RichText", "Block", "TextAtom"];

const getGapClass = (gap?: string): string => {
  if (gap === "none") return "gap-0";
  if (gap === "small") return "gap-4";
  if (gap === "large") return "gap-12";
  return "gap-8";
};

const resolveGapValue = (gap: unknown, fallback: string): string => {
  if (typeof gap === "string" && gap !== "inherit") return gap;
  return fallback;
};

const DEFAULT_BLOCK_MIN_HEIGHT: Record<string, number> = {
  Heading: 48,
  Text: 64,
  TextElement: 32,
  TextAtom: 48,
  TextAtomLetter: 20,
  Announcement: 32,
  Button: 44,
  ImageElement: 140,
  Image: 140,
  VideoEmbed: 160,
  Divider: 12,
  SocialLinks: 40,
  Icon: 40,
  AppEmbed: 180,
  RichText: 140,
  ImageWithText: 200,
  Hero: 240,
  Block: 0,
};

const getBlockMinHeight = (type: string): number => DEFAULT_BLOCK_MIN_HEIGHT[type] ?? 40;

const getSpacingValue = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const shouldShowSectionDivider = (settings: Record<string, unknown>): boolean => {
  const mt = getSpacingValue(settings["marginTop"]);
  const mb = getSpacingValue(settings["marginBottom"]);
  return mt === 0 && mb === 0;
};

const INSPECTOR_TOOLTIP_DELAY_MS = 500;
const STYLE_KEY_REGEX = /(color|padding|margin|radius|border|shadow|align|font|size|width|height|spacing|background|opacity)/i;

const formatSettingValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return (value as unknown[]).map((item: unknown) => formatSettingValue(item)).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return "Object";
  }
};

type InspectorEntry = { label: string; value: string };
type InspectorSection = { title: string; entries: InspectorEntry[] };

const resolveNodeLabel = (fallback: string, value: unknown): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
};

const buildStyleEntries = (settings: Record<string, unknown>): InspectorEntry[] => {
  return Object.entries(settings)
    .filter(([key, value]: [string, unknown]) => STYLE_KEY_REGEX.test(key) && value !== undefined && value !== null && value !== "")
    .map(([key, value]: [string, unknown]) => ({
      label: key,
      value: formatSettingValue(value),
    }))
    .filter((entry: InspectorEntry) => entry.value.length > 0)
    .slice(0, 12);
};

const renderInspectorEntries = (entries: InspectorEntry[]): React.ReactNode => (
  <div className="space-y-1">
    {entries.map((entry: InspectorEntry) => (
      <div key={`${entry.label}-${entry.value}`} className="flex items-start gap-2">
        <span className="min-w-[110px] text-[10px] uppercase tracking-wider text-gray-400">{entry.label}</span>
        <span className="text-[11px] text-gray-200 break-all">
          {entry.value.length > 80 ? `${entry.value.slice(0, 80)}…` : entry.value}
        </span>
      </div>
    ))}
  </div>
);

const InspectorTooltip = ({
  title,
  sections,
}: {
  title: string;
  sections: InspectorSection[];
}): React.ReactNode => {
  const visibleSections = sections.filter((section: InspectorSection) => section.entries.length > 0);
  return (
    <div className="space-y-2 text-xs">
      <div className="text-[10px] uppercase tracking-wider text-blue-200">{title}</div>
      {visibleSections.length === 0 ? (
        <div className="text-[11px] text-gray-400">No inspector details</div>
      ) : (
        visibleSections.map((section: InspectorSection) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">{section.title}</div>
            {renderInspectorEntries(section.entries)}
          </div>
        ))
      )}
    </div>
  );
};

const InspectorHover = ({
  enabled,
  showTooltip = true,
  nodeId,
  onHover,
  fallbackNodeId,
  content,
  children,
  className,
}: {
  enabled: boolean;
  showTooltip?: boolean;
  nodeId: string;
  onHover?: (nodeId: string | null) => void;
  fallbackNodeId?: string | null;
  content?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.ReactNode => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const isTooltipEnabled = enabled && showTooltip;
  const effectiveOpen = isTooltipEnabled ? open : false;

  const clearTimer = (): void => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateTooltipPosition = (): void => {
    const viewport = typeof document !== "undefined"
      ? document.querySelector("[data-cms-canvas-viewport='true']")
      : null;
    const canvas = typeof document !== "undefined"
      ? document.querySelector("[data-cms-canvas='true']")
      : null;
    const el = viewport ?? canvas ?? wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    setTooltipPos({
      top: rect.bottom - margin,
      left: rect.right - margin,
    });
  };

  useEffect((): void | (() => void) => {
    if (!isTooltipEnabled) {
      clearTimer();
      return undefined;
    }
    return (): void => {
      clearTimer();
    };
  }, [isTooltipEnabled]);

  const handleEnter = (): void => {
    if (!enabled) return;
    onHover?.(nodeId);
    clearTimer();
    if (showTooltip) {
      timerRef.current = window.setTimeout(() => {
        updateTooltipPosition();
        setOpen(true);
      }, INSPECTOR_TOOLTIP_DELAY_MS);
    }
  };

  const handleLeave = (): void => {
    if (!enabled) return;
    onHover?.(fallbackNodeId ?? null);
    clearTimer();
    setOpen(false);
  };

  useEffect((): void | (() => void) => {
    if (!open || !isTooltipEnabled) return undefined;
    const handleScroll = (): void => updateTooltipPosition();
    const handleResize = (): void => updateTooltipPosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, isTooltipEnabled]);

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className ?? ""}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {enabled && showTooltip && effectiveOpen && content && tooltipPos && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[99999] -translate-x-full -translate-y-full rounded-md border border-gray-700 bg-gray-900/95 px-3 py-2 text-xs text-gray-200 shadow-lg pointer-events-none"
              style={{ left: tooltipPos.left, top: tooltipPos.top }}
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Top-level section preview
// ---------------------------------------------------------------------------

interface PreviewSectionProps {
  section: SectionInstance;
  selectedNodeId: string | null;
  isInspecting?: boolean;
  inspectorSettings: InspectorSettings;
  hoveredNodeId?: string | null;
  colorSchemes?: Record<string, ColorSchemeColors>;
  mediaStyles?: React.CSSProperties | null;
  onSelect: (nodeId: string) => void;
  onHoverNode?: (nodeId: string | null) => void;
  onOpenMedia?: (target: MediaReplaceTarget) => void;
  onRemoveSection?: (sectionId: string) => void;
  onToggleSectionVisibility?: (sectionId: string, isHidden: boolean) => void;
  onRemoveRow?: (sectionId: string, rowId: string) => void;
}

export function PreviewSection({
  section,
  selectedNodeId,
  isInspecting = false,
  inspectorSettings,
  hoveredNodeId,
  colorSchemes,
  mediaStyles,
  onSelect,
  onHoverNode,
  onOpenMedia,
  onRemoveSection,
  onToggleSectionVisibility,
  onRemoveRow,
}: PreviewSectionProps): React.ReactNode {
  const isSectionSelected = selectedNodeId === section.id;
  const isHidden = Boolean(section.settings["isHidden"]);
  const label = resolveNodeLabel(section.type, section.settings["label"]);
  const inspectorActive = isInspecting;
  const isSectionHovered = inspectorActive && hoveredNodeId === section.id;
  const showDivider = shouldShowSectionDivider(section.settings);
  const divider = showDivider ? (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5" />
  ) : null;
  const metaEntries: InspectorEntry[] = [
    { label: "Type", value: section.type },
    { label: "Label", value: label },
  ];
  if (inspectorSettings.showIdentifiers) {
    metaEntries.push({ label: "ID", value: section.id });
  }
  const structureEntries: InspectorEntry[] = [
    { label: "Zone", value: section.zone },
    { label: "Blocks", value: String(section.blocks.length) },
  ];
  if (section.type === "Grid") {
    const rowBlocks = section.blocks.filter((b: BlockInstance) => b.type === "Row");
    const directColumns = section.blocks.filter((b: BlockInstance) => b.type === "Column");
    const columnsInRows = rowBlocks.flatMap((row: BlockInstance) => row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
    const rowsCount = rowBlocks.length || (directColumns.length > 0 ? 1 : 0);
    const columnsPerRow =
      rowBlocks.length > 0
        ? Math.max(1, ...rowBlocks.map((row: BlockInstance) => (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column").length))
        : directColumns.length;
    const cellCount = rowBlocks.length > 0 ? columnsInRows.length : directColumns.length;
    structureEntries.push({ label: "Rows", value: String(rowsCount) });
    structureEntries.push({ label: "Columns / row", value: String(columnsPerRow) });
    structureEntries.push({ label: "Cells", value: String(cellCount) });
  }
  const visibilityEntries: InspectorEntry[] = [
    { label: "Hidden", value: isHidden ? "Yes" : "No" },
  ];
  const connectionEntries: InspectorEntry[] = [];
  const connection = section.settings["connection"] as { enabled?: boolean; source?: string; path?: string; fallback?: string } | undefined;
  if (connection) {
    connectionEntries.push({ label: "Enabled", value: connection.enabled ? "Yes" : "No" });
    if (connection.source) connectionEntries.push({ label: "Source", value: connection.source });
    if (connection.path) connectionEntries.push({ label: "Path", value: connection.path });
    if (connection.fallback) connectionEntries.push({ label: "Fallback", value: connection.fallback });
  }
  const styleEntries = inspectorSettings.showStyleSettings ? buildStyleEntries(section.settings) : [];
  const inspectorSections: InspectorSection[] = [{ title: "Meta", entries: metaEntries }];
  if (inspectorSettings.showStructureInfo) {
    inspectorSections.push({ title: "Structure", entries: structureEntries });
  }
  if (inspectorSettings.showVisibilityInfo) {
    inspectorSections.push({ title: "Visibility", entries: visibilityEntries });
  }
  if (inspectorSettings.showConnectionInfo) {
    inspectorSections.push({ title: "Connection", entries: connectionEntries });
  }
  if (inspectorSettings.showStyleSettings) {
    inspectorSections.push({ title: "Styles", entries: styleEntries });
  }
  const inspectorContent = (
    <InspectorTooltip title={`Section: ${label}`} sections={inspectorSections} />
  );
  const wrapInspector = (node: React.ReactNode): React.ReactNode => (
    <InspectorHover
      enabled={inspectorActive}
      showTooltip={inspectorSettings.showTooltip}
      nodeId={section.id}
      onHover={onHoverNode}
      fallbackNodeId={null}
      content={inspectorContent}
      className="w-full"
    >
      {node}
    </InspectorHover>
  );

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
    return null;
  }

  if (section.type === "AnnouncementBar" || section.type === "Block") {
    const alignment = (section.settings["contentAlignment"] as string) || "center";
    const alignmentClasses =
      alignment === "left"
        ? "justify-start text-left"
        : alignment === "right"
          ? "justify-end text-right"
          : "justify-center text-center";
    const blockGap = getSpacingValue(section.settings["blockGap"]);

    const containerStyles: React.CSSProperties = {
      ...getSectionStyles(section.settings, colorSchemes),
      ...getTextAlign(section.settings["contentAlignment"]),
    };
    const containerRingClass = isSectionSelected
      ? isInspecting
        ? "ring-2 ring-inset ring-blue-500/60"
        : "ring-2 ring-inset ring-blue-500/40"
      : isSectionHovered
        ? "ring-2 ring-inset ring-blue-500/30"
        : "hover:ring-1 hover:ring-inset hover:ring-border/40";
    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={containerStyles}
          className={`relative w-full transition cursor-pointer ${containerRingClass}`}
        >
          {renderSectionActions()}
          {divider}
          <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
            <div
              className={`flex flex-wrap items-center ${section.type === "Block" ? "" : "gap-3"} ${alignmentClasses}`}
              style={section.type === "Block" ? { gap: `${blockGap}px` } : undefined}
            >
              {section.blocks.length === 0 && section.type !== "Block" ? (
                <p className="text-sm text-gray-400">Announcement bar</p>
              ) : (
                section.blocks.map((block: BlockInstance) => (
                  <PreviewBlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedNodeId === block.id}
                    isInspecting={isInspecting}
                    inspectorSettings={inspectorSettings}
                    hoveredNodeId={hoveredNodeId}
                    onHoverNode={onHoverNode}
                    onSelect={onSelect}
                    contained
                    selectedNodeId={selectedNodeId}
                    sectionId={section.id}
                    sectionType={section.type}
                    sectionZone={section.zone}
                    onOpenMedia={onOpenMedia}
                    mediaStyles={mediaStyles}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )
    );
  }

  // ---------------------------------------------------------------------------
  // Shared section wrapper — uses getSectionStyles for real inline styles
  // ---------------------------------------------------------------------------
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);
  const selectedRing = isSectionSelected
    ? isInspecting
      ? "ring-2 ring-inset ring-blue-500/60"
      : "ring-2 ring-inset ring-blue-500/40"
    : isSectionHovered
      ? "ring-2 ring-inset ring-blue-500/30"
      : "hover:ring-1 hover:ring-inset hover:ring-border/40";

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
            isInspecting={isInspecting}
            inspectorSettings={inspectorSettings}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={onHoverNode}
            onSelect={onSelect}
            contained
            selectedNodeId={selectedNodeId}
            sectionId={section.id}
            sectionType={section.type}
            sectionZone={section.zone}
            onOpenMedia={onOpenMedia}
            mediaStyles={mediaStyles}
          />
        ))}
      </div>
    );

  // Grid sections
  if (section.type === "Grid") {
    const rowBlocks = section.blocks.filter((b: BlockInstance) => b.type === "Row");
    const directColumns = section.blocks.filter((b: BlockInstance) => b.type === "Column");
    const sectionGap = (section.settings["gap"] as string) || "medium";
    const sectionGapClass = getGapClass(sectionGap);
    const rowCount = rowBlocks.length > 0 ? rowBlocks.length : directColumns.length > 0 ? 1 : 0;
    const canRemoveRow = rowCount > 1;
    const rowsToRender: Array<{ row: BlockInstance; virtual: boolean }> =
      rowBlocks.length > 0
        ? rowBlocks.map((row: BlockInstance) => ({ row, virtual: false }))
        : directColumns.length > 0
        ? [{ row: { id: `row-virtual-${section.id}`, type: "Row", settings: {}, blocks: directColumns }, virtual: true }]
        : [];
    const hasZeroSpacing = ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "marginTop", "marginBottom", "marginLeft", "marginRight"].every((key: string) => {
      const value = section.settings[key] as number | undefined;
      return !value || value === 0;
    });
    const isEmptyGrid = rowsToRender.length > 0 && rowsToRender.every(({ row }: { row: BlockInstance }) => {
      const columns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
      return columns.length > 0 && columns.every((column: BlockInstance) => (column.blocks ?? []).length === 0);
    });
    const hasFixedHeights = rowsToRender.some(({ row }: { row: BlockInstance }) => {
      const rowHeightMode = (row.settings?.["heightMode"] as string) || "inherit";
      const rowHeight = (row.settings?.["height"] as number) || 0;
      if (rowHeightMode === "fixed" && rowHeight > 0) return true;
      const columns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
      return columns.some((column: BlockInstance) => {
        const columnHeightMode = (column.settings?.["heightMode"] as string) || "inherit";
        const columnHeight = (column.settings?.["height"] as number) || 0;
        return columnHeightMode === "fixed" && columnHeight > 0;
      });
    });

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          {rowsToRender.length === 0 ? (
            <div className="flex min-h-[60px] items-center justify-center text-sm text-gray-500">
              No rows
            </div>
          ) : isEmptyGrid && hasZeroSpacing && !hasFixedHeights ? (
            <div className="h-px w-full bg-border/40" />
          ) : (
            <div className={`flex flex-col ${sectionGapClass}`}>
              {rowsToRender.map(({ row, virtual }: { row: BlockInstance; virtual: boolean }, rowIndex: number) => {
                const rowColumns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
                const columnCount = Math.max(1, rowColumns.length);
                const rowHasContent = rowColumns.some((column: BlockInstance) => (column.blocks ?? []).length > 0);
                const isRowSelected = !virtual && selectedNodeId === row.id;
                const rowGapValue = resolveGapValue(row.settings?.["gap"], sectionGap);
                const rowGapClass = rowHasContent ? getGapClass(rowGapValue) : "gap-0";
                const rowStyles = getSectionStyles(row.settings ?? {}, colorSchemes);
                const rowHeightMode = (row.settings?.["heightMode"] as string) || "inherit";
                const rowHeight = (row.settings?.["height"] as number) || 0;
                const rowHeightStyle =
                  rowHeightMode === "fixed" && rowHeight > 0 ? { height: `${rowHeight}px` } : undefined;
                const rowContainer = (
                  <div
                    role={!virtual ? "button" : undefined}
                    tabIndex={!virtual ? 0 : undefined}
                    onClick={(e: React.MouseEvent): void => {
                      if (virtual) return;
                      e.stopPropagation();
                      onSelect(row.id);
                    }}
                    onKeyDown={(e: React.KeyboardEvent): void => {
                      if (virtual) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        onSelect(row.id);
                      }
                    }}
                    style={{ ...rowStyles, ...(rowHeightStyle ?? {}) }}
                    className={`relative ${isRowSelected ? "ring-1 ring-inset ring-blue-500/40" : ""}`}
                  >
                    {!virtual && isRowSelected && onRemoveRow && (
                      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border border-border/40 bg-gray-900/80 px-1.5 py-1 text-xs text-gray-200 shadow-sm">
                        <button
                          type="button"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (!canRemoveRow) return;
                            onRemoveRow(section.id, row.id);
                          }}
                          disabled={!canRemoveRow}
                          className="rounded p-1 text-gray-300 hover:text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          title={canRemoveRow ? "Remove row" : "At least one row is required"}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )}
                    <div
                      className={`grid ${rowGapClass} items-stretch`}
                      style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
                    >
                      {rowColumns.map((column: BlockInstance, colIndex: number) => {
                        const isColumnSelected = selectedNodeId === column.id;
                        const isColumnHovered = isInspecting && hoveredNodeId === column.id;
                        const columnHoverClass =
                          isColumnHovered && !isColumnSelected ? "ring-1 ring-inset ring-blue-500/30" : "";
                        const columnHeightMode = (column.settings?.["heightMode"] as string) || "inherit";
                        const columnHeight = (column.settings?.["height"] as number) || 0;
                        const columnStyle: React.CSSProperties = {};
                        if (columnHeightMode === "fixed" && columnHeight > 0) {
                          columnStyle.height = `${columnHeight}px`;
                        } else if (rowHeightMode === "fixed" && rowHeight > 0) {
                          columnStyle.height = "100%";
                        }
                        const columnTooltip = (
                          <InspectorTooltip
                            title="Column"
                            sections={[
                              {
                                title: "Meta",
                                entries: inspectorSettings.showIdentifiers
                                  ? [
                                      { label: "Type", value: "Column" },
                                      { label: "ID", value: column.id },
                                    ]
                                  : [{ label: "Type", value: "Column" }],
                              },
                              ...(inspectorSettings.showStructureInfo
                                ? [
                                    {
                                      title: "Structure",
                                      entries: [
                                        { label: "Section", value: section.type },
                                        { label: "Zone", value: section.zone },
                                        { label: "Row", value: String(rowIndex + 1) },
                                        { label: "Column", value: String(colIndex + 1) },
                                      ],
                                    },
                                  ]
                                : []),
                              ...(inspectorSettings.showConnectionInfo
                                ? [
                                    {
                                      title: "Connection",
                                      entries: ((): InspectorEntry[] => {
                                        const connection = column.settings["connection"] as
                                          | { enabled?: boolean; source?: string; path?: string; fallback?: string }
                                          | undefined;
                                        if (!connection) return [];
                                        const entries: InspectorEntry[] = [
                                          { label: "Enabled", value: connection.enabled ? "Yes" : "No" },
                                        ];
                                        if (connection.source) entries.push({ label: "Source", value: connection.source });
                                        if (connection.path) entries.push({ label: "Path", value: connection.path });
                                        if (connection.fallback) entries.push({ label: "Fallback", value: connection.fallback });
                                        return entries;
                                      })(),
                                    },
                                  ]
                                : []),
                              ...(inspectorSettings.showStyleSettings
                                ? [
                                    {
                                      title: "Styles",
                                      entries: buildStyleEntries(column.settings ?? {}),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        );
                        return (
                          <InspectorHover
                            key={column.id}
                            enabled={inspectorActive}
                            showTooltip={inspectorSettings.showTooltip}
                            nodeId={column.id}
                            onHover={onHoverNode}
                            fallbackNodeId={section.id}
                            content={columnTooltip}
                            className="w-full"
                          >
                            <div
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
                              style={columnStyle}
                              className={`h-full text-left transition cursor-pointer ${
                                isColumnSelected ? "ring-1 ring-inset ring-blue-500/40" : ""
                              } ${columnHoverClass}`}
                            >
                              {(column.blocks ?? []).length > 0 && ((): React.ReactNode => {
                                const columnBlocks = column.blocks ?? [];
                                const isSingleBlock = columnBlocks.length === 1;
                                const shouldStretch = isSingleBlock && (rowHeightMode === "fixed" || columnHeightMode === "fixed");
                                return (
                                  <div className={`flex flex-col ${shouldStretch ? "h-full" : "gap-4"} ${isInspecting ? "" : "pointer-events-none"}`}>
                                    {columnBlocks.map((block: BlockInstance) => (
                                      <div
                                        key={block.id}
                                        className={shouldStretch ? "flex-1" : ""}
                                        style={{
                                          minHeight: `${getBlockMinHeight(block.type)}px`,
                                          ...(shouldStretch ? { height: "100%" } : {}),
                                        }}
                                      >
                                        <PreviewBlockItem
                                          block={block}
                                          isSelected={selectedNodeId === block.id}
                                          isInspecting={isInspecting}
                                          inspectorSettings={inspectorSettings}
                                          hoveredNodeId={hoveredNodeId}
                                          onHoverNode={onHoverNode}
                                          onSelect={onSelect}
                                          contained
                                          selectedNodeId={selectedNodeId}
                                          sectionId={section.id}
                                          sectionType={section.type}
                                          sectionZone={section.zone}
                                          columnId={column.id}
                                          onOpenMedia={onOpenMedia}
                                          mediaStyles={mediaStyles}
                                          stretch={shouldStretch}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </InspectorHover>
                        );
                      })}
                    </div>
                  </div>
                );
                return <div key={row.id}>{rowContainer}</div>;
              })}
            </div>
          )}
        </div>
      )
    );
  }

  // ImageWithText section — side-by-side image + content
  if (section.type === "ImageWithText") {
    const placement = section.settings["desktopImagePlacement"] as string | undefined;
    const imageFirst = placement !== "image-second";

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full px-4 text-left transition cursor-pointer group ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
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
            <div className="cms-media flex w-2/5 shrink-0 items-center justify-center bg-gray-700/30 min-h-[100px]" style={mediaStyles ?? undefined}>
              {sectionImage ? (
                <NextImage src={sectionImage} alt="" className="size-full object-cover" fill unoptimized />
              ) : (
                <ImageIcon className="size-8 text-gray-500" />
              )}
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2">
              {renderBlocks("Add blocks to content area")}
            </div>
          </div>
        </div>
      )
    );
  }

  // Hero section — full-width banner with centered content overlay
  if (section.type === "Hero") {
    const heroBgStyle: React.CSSProperties = sectionImage
      ? { backgroundImage: `url(${sectionImage})`, backgroundSize: "cover", backgroundPosition: "center" }
      : {};

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full text-left transition cursor-pointer group ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
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
            className={`cms-media relative min-h-[140px] px-6 ${sectionImage ? "" : "bg-gradient-to-br from-gray-700/40 to-gray-800/60"}`}
            style={{ ...heroBgStyle, ...(mediaStyles ?? {}) }}
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
                    isInspecting={isInspecting}
                    inspectorSettings={inspectorSettings}
                    hoveredNodeId={hoveredNodeId}
                    onHoverNode={onHoverNode}
                    onSelect={onSelect}
                    contained
                    selectedNodeId={selectedNodeId}
                    sectionId={section.id}
                    sectionType={section.type}
                    sectionZone={section.zone}
                    onOpenMedia={onOpenMedia}
                    mediaStyles={mediaStyles}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )
    );
  }

  // RichText section
  if (section.type === "RichText") {
    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          {renderBlocks("Add blocks to rich text section")}
        </div>
      )
    );
  }

  // Text element section
  if (section.type === "TextElement") {
    const text = (section.settings["textContent"] as string) || "Text element";
    const typoStyles = getBlockTypographyStyles(section.settings);
    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={getSectionStyles(section.settings, colorSchemes)}
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <div className="rounded border border-dashed border-border/40 bg-gray-800/20">
            <p className="m-0 p-0 text-sm text-gray-200 line-clamp-4" style={typoStyles}>
              {text}
            </p>
          </div>
        </div>
      )
    );
  }

  // Image element section
  if (section.type === "ImageElement") {
    const src = (section.settings["src"] as string) || "";
    const alt = (section.settings["alt"] as string) || "Image";
    const presentation = buildImageElementPresentation(section.settings, mediaStyles);

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={getSectionStyles(section.settings, colorSchemes)}
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          {src ? (
            <div className="relative" style={presentation.wrapperStyles}>
              {presentation.useFill ? (
                <NextImage src={src} alt={alt} style={presentation.imageStyles} fill unoptimized />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={alt}
                  style={{
                    ...presentation.imageStyles,
                    display: "block",
                    height: "auto",
                  }}
                />
              )}
              {presentation.hasOverlay && (
                <div className="pointer-events-none absolute inset-0" style={presentation.overlayStyles} />
              )}
            </div>
          ) : (
            <div
              className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
              style={presentation.wrapperStyles}
            >
              No image selected
            </div>
          )}
        </div>
      )
    );
  }

  // Button element section
  if (section.type === "ButtonElement") {
    const label = (section.settings["buttonLabel"] as string) || "Button";
    const style = (section.settings["buttonStyle"] as string) || "solid";
    const customStyles: React.CSSProperties = {};
    const fontFamily = section.settings["fontFamily"] as string | undefined;
    const fontSize = section.settings["fontSize"] as number | undefined;
    const fontWeight = section.settings["fontWeight"] as string | undefined;
    const textColor = section.settings["textColor"] as string | undefined;
    const bgColor = section.settings["bgColor"] as string | undefined;
    const borderColor = section.settings["borderColor"] as string | undefined;
    const borderRadius = section.settings["borderRadius"] as number | undefined;
    const borderWidth = section.settings["borderWidth"] as number | undefined;

    if (fontFamily) customStyles.fontFamily = fontFamily;
    if (fontSize && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
    if (fontWeight) customStyles.fontWeight = fontWeight;
    if (textColor) customStyles.color = textColor;
    if (bgColor) customStyles.backgroundColor = bgColor;
    if (borderColor) customStyles.borderColor = borderColor;
    if (borderRadius && borderRadius > 0) customStyles.borderRadius = `${borderRadius}px`;
    if (borderWidth && borderWidth > 0) customStyles.borderWidth = `${borderWidth}px`;

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={getSectionStyles(section.settings, colorSchemes)}
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <div
            className={`inline-block rounded-md px-4 py-1.5 text-sm font-medium ${
              style === "outline"
                ? "border border-gray-400 text-gray-300"
                : "bg-gray-200 text-gray-900"
            }`}
            style={customStyles}
          >
            {label}
          </div>
        </div>
      )
    );
  }

  // Text atom section
  if (section.type === "TextAtom") {
    const text = (section.settings["text"] as string) || "";
    const alignment = (section.settings["alignment"] as string) || "left";
    const letterGap = (section.settings["letterGap"] as number) || 0;
    const lineGap = (section.settings["lineGap"] as number) || 0;
    const wrap = (section.settings["wrap"] as string) || "wrap";
    const letters = (section.blocks ?? []).length
      ? (section.blocks ?? [])
      : Array.from(text).map((char: string, index: number): BlockInstance => ({
          id: `text-atom-${section.id}-${index}`,
          type: "TextAtomLetter",
          settings: { textContent: char },
        }));

    const justifyContent =
      alignment === "center"
        ? "center"
        : alignment === "right"
          ? "flex-end"
          : "flex-start";
    const containerStyle: React.CSSProperties = {
      display: "flex",
      flexWrap: wrap === "nowrap" ? "nowrap" : "wrap",
      justifyContent,
      alignItems: "baseline",
      columnGap: letterGap,
      rowGap: lineGap,
      whiteSpace: wrap === "nowrap" ? "pre" : "pre-wrap",
    };

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={getSectionStyles(section.settings, colorSchemes)}
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <div className="rounded border border-dashed border-border/40 bg-gray-800/20 p-2">
            {letters.length > 0 ? (
              <div style={containerStyle}>
                {letters.map((letter: BlockInstance) => (
                  <PreviewBlockItem
                    key={letter.id}
                    block={letter}
                    isSelected={selectedNodeId === letter.id}
                    isInspecting={isInspecting}
                    inspectorSettings={inspectorSettings}
                    hoveredNodeId={hoveredNodeId}
                    onHoverNode={onHoverNode}
                    onSelect={onSelect}
                    contained
                    selectedNodeId={selectedNodeId}
                    sectionId={section.id}
                    sectionType={section.type}
                    sectionZone={section.zone}
                    onOpenMedia={onOpenMedia}
                    mediaStyles={mediaStyles}
                  />
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">Text atoms</div>
            )}
          </div>
        </div>
      )
    );
  }

  // Accordion section
  if (section.type === "Accordion") {
    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
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
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  contained
                  selectedNodeId={selectedNodeId}
                  sectionId={section.id}
                  sectionType={section.type}
                  sectionZone={section.zone}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              ))}
            </div>
          )}
        </div>
      )
    );
  }

  // Testimonials section
  if (section.type === "Testimonials") {
    const columns = (section.settings["columns"] as number) || 3;

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          {section.blocks.length === 0 ? (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(columns, 3)}, 1fr)` }}>
              {Array.from({ length: Math.min(columns, 3) }).map((_val: unknown, idx: number) => (
                <div key={idx} className="cms-hover-card rounded border border-dashed border-border/40 p-3">
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
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  contained
                  selectedNodeId={selectedNodeId}
                  sectionId={section.id}
                  sectionType={section.type}
                  sectionZone={section.zone}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              ))}
            </div>
          )}
        </div>
      )
    );
  }

  // Video section
  if (section.type === "Video") {
    const ratio = (section.settings["aspectRatio"] as string) || "16:9";

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <div className="cms-media flex items-center justify-center bg-gray-700/30 min-h-[100px]" style={mediaStyles ?? undefined}>
            <div className="flex flex-col items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-full bg-gray-600/50">
                <Play className="size-5 text-gray-300" />
              </div>
              <span className="text-xs text-gray-500">{ratio}</span>
            </div>
          </div>
        </div>
      )
    );
  }

  // Slideshow section
  if (section.type === "Slideshow") {
    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
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
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  contained
                  selectedNodeId={selectedNodeId}
                  sectionId={section.id}
                  sectionType={section.type}
                  sectionZone={section.zone}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              ))}
            </div>
          )}
        </div>
      )
    );
  }

  // Newsletter section
  if (section.type === "Newsletter") {
    const buttonText = (section.settings["buttonText"] as string) || "Subscribe";
    const placeholder = (section.settings["placeholder"] as string) || "Enter your email";

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          {section.blocks.length > 0 && (
            <div className="space-y-2 mb-3">
              {section.blocks.map((block: BlockInstance) => (
                <PreviewBlockItem
                  key={block.id}
                  block={block}
                  isSelected={selectedNodeId === block.id}
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  contained
                  selectedNodeId={selectedNodeId}
                  sectionId={section.id}
                  sectionType={section.type}
                  sectionZone={section.zone}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
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
      )
    );
  }

  // ContactForm section
  if (section.type === "ContactForm") {
    const fields = ((section.settings["fields"] as string) || "name,email,message").split(",").map((f: string) => f.trim());
    const submitText = (section.settings["submitText"] as string) || "Send message";

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
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
      )
    );
  }

  // Fallback for unknown section types
  return (
    wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === "Enter" || e.key === " ") handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        {renderBlocks("No blocks")}
      </div>
    )
  );
}


// ---------------------------------------------------------------------------
// Block preview item (nested inside section or column preview)
// ---------------------------------------------------------------------------

interface PreviewBlockItemProps {
  block: BlockInstance;
  isSelected: boolean;
  isInspecting?: boolean;
  inspectorSettings: InspectorSettings;
  hoveredNodeId?: string | null;
  onSelect: (nodeId: string) => void;
  sectionId: string;
  sectionType?: string;
  sectionZone?: PageZone;
  columnId?: string;
  parentBlockId?: string;
  contained?: boolean;
  selectedNodeId?: string | null;
  onHoverNode?: (nodeId: string | null) => void;
  onOpenMedia?: (target: MediaReplaceTarget) => void;
  mediaStyles?: React.CSSProperties | null;
  stretch?: boolean;
}

function PreviewBlockItem({
  block,
  isSelected,
  isInspecting = false,
  inspectorSettings,
  hoveredNodeId,
  onSelect,
  contained,
  selectedNodeId,
  sectionId,
  sectionType,
  sectionZone,
  columnId,
  parentBlockId,
  onHoverNode,
  onOpenMedia,
  mediaStyles,
  stretch = false,
}: PreviewBlockItemProps): React.ReactNode {
  const isSectionType = SECTION_BLOCK_TYPES.includes(block.type);
  const selectedBorderClass = isInspecting
    ? "border-blue-500 ring-2 ring-inset ring-blue-500/40"
    : "border-blue-400 ring-1 ring-inset ring-blue-400/30";
  const selectedSoftBg = isInspecting ? "bg-blue-500/15" : "bg-blue-500/10";
  const inspectorActive = isInspecting;
  const isHovered = inspectorActive && hoveredNodeId === block.id;
  const hoverFrameClass = isHovered && !isSelected
    ? "border-blue-400/70 ring-1 ring-inset ring-blue-500/30 bg-blue-500/5"
    : "";
  const isFaithful = true;
  const canvasSelectedClass = isSelected
    ? isInspecting
      ? "ring-2 ring-inset ring-blue-500/40"
      : "ring-1 ring-inset ring-blue-500/30"
    : "";
  const canvasHoverClass = isHovered && !isSelected ? "ring-1 ring-inset ring-blue-500/30" : "";
  const canvasFrameClass = `${canvasSelectedClass} ${canvasHoverClass}`.trim();
  const stretchClass = stretch ? "h-full" : "";
  const buildContainerClass = (base: string, editor: string): string =>
    `${base} ${stretchClass} ${isFaithful ? canvasFrameClass : `${editor} ${hoverFrameClass}`}`.trim();
  const metaEntries: InspectorEntry[] = [{ label: "Type", value: block.type }];
  if (inspectorSettings.showIdentifiers) {
    metaEntries.push({ label: "ID", value: block.id });
  }
  const structureEntries: InspectorEntry[] = [];
  if (sectionType) {
    structureEntries.push({ label: "Section", value: sectionType });
  }
  if (sectionZone) {
    structureEntries.push({ label: "Zone", value: sectionZone });
  }
  if (columnId) {
    structureEntries.push({ label: "Column", value: inspectorSettings.showIdentifiers ? columnId : "Column" });
  }
  const visibilityEntries: InspectorEntry[] = [];
  const blockHidden = block.settings["isHidden"];
  if (typeof blockHidden === "boolean") {
    visibilityEntries.push({ label: "Hidden", value: blockHidden ? "Yes" : "No" });
  }
  const connectionEntries: InspectorEntry[] = [];
  const connection = block.settings["connection"] as { enabled?: boolean; source?: string; path?: string; fallback?: string } | undefined;
  if (connection) {
    connectionEntries.push({ label: "Enabled", value: connection.enabled ? "Yes" : "No" });
    if (connection.source) connectionEntries.push({ label: "Source", value: connection.source });
    if (connection.path) connectionEntries.push({ label: "Path", value: connection.path });
    if (connection.fallback) connectionEntries.push({ label: "Fallback", value: connection.fallback });
  }
  const styleEntries = inspectorSettings.showStyleSettings ? buildStyleEntries(block.settings) : [];
  const inspectorSections: InspectorSection[] = [{ title: "Meta", entries: metaEntries }];
  if (inspectorSettings.showStructureInfo) {
    inspectorSections.push({ title: "Structure", entries: structureEntries });
  }
  if (inspectorSettings.showVisibilityInfo && visibilityEntries.length > 0) {
    inspectorSections.push({ title: "Visibility", entries: visibilityEntries });
  }
  if (inspectorSettings.showConnectionInfo) {
    inspectorSections.push({ title: "Connection", entries: connectionEntries });
  }
  if (inspectorSettings.showStyleSettings) {
    inspectorSections.push({ title: "Styles", entries: styleEntries });
  }
  const inspectorContent = <InspectorTooltip title={block.type} sections={inspectorSections} />;
  const fallbackNodeId = parentBlockId ?? columnId ?? sectionId;
  const wrapBlock = (node: React.ReactNode): React.ReactNode => (
    <InspectorHover
      enabled={inspectorActive}
      showTooltip={inspectorSettings.showTooltip}
      nodeId={block.id}
      onHover={onHoverNode}
      fallbackNodeId={fallbackNodeId}
      content={inspectorContent}
      className={stretchClass}
    >
      {node}
    </InspectorHover>
  );
  const handleSelect = (event: React.SyntheticEvent): void => {
    event.stopPropagation();
    onSelect(block.id);
  };
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleSelect(event);
    }
  };

  // ---------------------------------------------------------------------------
  // Section-type blocks (ImageWithText, Hero) — layout-aware preview
  // ---------------------------------------------------------------------------
  if (isSectionType) {
    const canReplaceImage = Boolean(onOpenMedia);
    return (
      wrapBlock(
        <div className="relative group">
          <div
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            className={buildContainerClass(
              `w-full text-left text-sm transition overflow-hidden ${contained ? "max-w-full" : ""}`,
              `rounded border-2 ${
                isSelected
                  ? `${selectedBorderClass} ${selectedSoftBg}`
                  : "border-border/30 bg-gray-800/30 hover:border-border/50"
              }`
            )}
          >
            <div className={isFaithful ? "overflow-hidden" : "p-2.5 overflow-hidden"}>
              {block.type === "ImageWithText" && (
                <PreviewImageWithTextBlock
                  block={block}
                  selectedNodeId={selectedNodeId}
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  sectionId={sectionId}
                  sectionType={sectionType}
                  sectionZone={sectionZone}
                  columnId={columnId}
                  stretch={stretch}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              )}
              {block.type === "Hero" && (
                <PreviewHeroBlock
                  block={block}
                  selectedNodeId={selectedNodeId}
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  sectionId={sectionId}
                  sectionType={sectionType}
                  sectionZone={sectionZone}
                  columnId={columnId}
                  stretch={stretch}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              )}
              {block.type === "RichText" && (
                <PreviewRichTextBlock
                  block={block}
                  selectedNodeId={selectedNodeId}
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  sectionId={sectionId}
                  sectionType={sectionType}
                  sectionZone={sectionZone}
                  columnId={columnId}
                  stretch={stretch}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              )}
              {block.type === "Block" && (
                <PreviewBlockSectionBlock
                  block={block}
                  selectedNodeId={selectedNodeId}
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  sectionId={sectionId}
                  sectionType={sectionType}
                  sectionZone={sectionZone}
                  columnId={columnId}
                  stretch={stretch}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              )}
              {block.type === "TextAtom" && (
                <PreviewTextAtomBlock
                  block={block}
                  selectedNodeId={selectedNodeId}
                  isInspecting={isInspecting}
                  inspectorSettings={inspectorSettings}
                  hoveredNodeId={hoveredNodeId}
                  onHoverNode={onHoverNode}
                  onSelect={onSelect}
                  sectionId={sectionId}
                  sectionType={sectionType}
                  sectionZone={sectionZone}
                  columnId={columnId}
                  stretch={stretch}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              )}
            </div>
          </div>
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
      )
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
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `cms-hover-card rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          <div className={`${sizeClass} text-gray-200 truncate`}>{text}</div>
        </div>
      )
    );
  }

  if (block.type === "Announcement") {
    const text = (block.settings["text"] as string) || "Announcement";
    const link = (block.settings["link"] as string) || "";
    const textClass = link
      ? "text-blue-300 underline decoration-blue-400/50"
      : "text-gray-200";
    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            "flex w-full items-center gap-2 text-sm transition",
            `${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg} text-blue-200`
                : "border-transparent text-gray-300 hover:border-border/30"
            } rounded border px-2 py-1`
          )}
        >
          <Megaphone className="size-3.5 text-gray-400" />
          <span className={textClass}>{text}</span>
          {link ? <Link2 className="size-3 text-blue-300/80" /> : null}
        </div>
      )
    );
  }

  // Text block
  if (block.type === "Text") {
    const text = (block.settings["textContent"] as string) || "";

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          {text ? (
            <p className="text-sm text-gray-300 line-clamp-3">{text}</p>
          ) : (
            <p className="text-sm italic text-gray-500">Add text content...</p>
          )}
        </div>
      )
    );
  }

  // Text element block
  if (block.type === "TextElement") {
    const text = (block.settings["textContent"] as string) || "Text element";
    const typoStyles = getBlockTypographyStyles(block.settings);

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded border p-0 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          <p className="m-0 p-0 text-sm text-gray-200 line-clamp-4" style={typoStyles}>
            {text}
          </p>
        </div>
      )
    );
  }

  // Text atom letter block
  if (block.type === "TextAtomLetter") {
    const text = (block.settings["textContent"] as string) ?? "";
    const typoStyles = getBlockTypographyStyles(block.settings);
    const displayText = text === "" ? " " : text;

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            "inline-flex items-center justify-center transition",
            `rounded border px-1 py-0.5 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-transparent hover:border-border/40"
            }`
          )}
        >
          <span className="inline-block text-sm text-gray-200" style={{ ...typoStyles, whiteSpace: "pre" }}>
            {displayText}
          </span>
        </div>
      )
    );
  }

  // Image element block
  if (block.type === "ImageElement") {
    const src = (block.settings["src"] as string) || "";
    const alt = (block.settings["alt"] as string) || "Image";
    const presentation = buildImageElementPresentation(block.settings, mediaStyles);

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition ${contained ? "max-w-full" : ""}`,
            `rounded border p-1 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          {src ? (
            <div className="relative" style={presentation.wrapperStyles}>
              {presentation.useFill ? (
                <NextImage src={src} alt={alt} style={presentation.imageStyles} fill unoptimized />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={alt}
                  style={{
                    ...presentation.imageStyles,
                    display: "block",
                    height: "auto",
                  }}
                />
              )}
              {presentation.hasOverlay && (
                <div className="pointer-events-none absolute inset-0" style={presentation.overlayStyles} />
              )}
            </div>
          ) : (
            <div
              className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
              style={presentation.wrapperStyles}
            >
              No image selected
            </div>
          )}
        </div>
      )
    );
  }

  // Button block
  if (block.type === "Button") {
    const label = (block.settings["buttonLabel"] as string) || "Button";
    const style = (block.settings["buttonStyle"] as string) || "solid";

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `cms-hover-button rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
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
        </div>
      )
    );
  }

  // RichText block
  if (block.type === "RichText") {
    const colorScheme = block.settings["colorScheme"] as string | undefined;

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          <div className="rounded-lg p-4 text-gray-400" data-color-scheme={colorScheme}>
            <p className="text-sm italic">Rich text content area</p>
          </div>
        </div>
      )
    );
  }

  // Image block
  if (block.type === "Image") {
    const src = (block.settings["src"] as string) || "";
    const alt = (block.settings["alt"] as string) || "Image";
    const width = (block.settings["width"] as number) || 100;
    const borderRadius = (block.settings["borderRadius"] as number) || 0;
    const resolvedStyles: React.CSSProperties = {
      ...(mediaStyles ?? {}),
      ...(borderRadius > 0 ? { borderRadius: `${borderRadius}px` } : {}),
    };

    return (
      wrapBlock(
        <div className="relative group">
          <div
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            className={buildContainerClass(
              `w-full text-left transition ${contained ? "max-w-full" : ""}`,
              `rounded border p-1 ${
                isSelected
                  ? `${selectedBorderClass} ${selectedSoftBg}`
                  : "border-transparent hover:border-border/30"
              }`
            )}
          >
            {src ? (
              <div className="cms-media relative" style={{ width: `${width}%`, ...resolvedStyles }}>
                <NextImage src={src} alt={alt} width={800} height={600} className="h-auto w-full" unoptimized />
              </div>
            ) : (
              <div
                className="cms-media flex items-center justify-center bg-gray-700/30 min-h-[60px]"
                style={{ width: `${width}%`, ...resolvedStyles }}
              >
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="size-6 text-gray-500" />
                  <span className="text-xs text-gray-500 truncate max-w-[120px]">{alt}</span>
                </div>
              </div>
            )}
          </div>
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
      )
    );
  }

  // VideoEmbed block
  if (block.type === "VideoEmbed") {
    const ratio = (block.settings["aspectRatio"] as string) || "16:9";

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          <div className="cms-media flex items-center justify-center bg-gray-700/30 min-h-[60px]" style={mediaStyles ?? undefined}>
            <div className="flex items-center gap-2">
              <Play className="size-5 text-gray-500" />
              <span className="text-xs text-gray-500">{ratio}</span>
            </div>
          </div>
        </div>
      )
    );
  }

  // AppEmbed block
  if (block.type === "AppEmbed") {
    const appId = (block.settings["appId"] as AppEmbedId) || "chatbot";
    const title = (block.settings["title"] as string) || "";
    const appLabel = APP_EMBED_OPTIONS.find((option: AppEmbedOption) => option.id === appId)?.label ?? "App";

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-200">{title || appLabel}</div>
              <div className="text-[10px] text-gray-500">App embed</div>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <AppWindow className="size-5" />
              <span className="text-[10px] uppercase">{appLabel}</span>
            </div>
          </div>
        </div>
      )
    );
  }

  // Divider block
  if (block.type === "Divider") {
    const style = (block.settings["dividerStyle"] as string) || "solid";
    const thickness = (block.settings["thickness"] as number) || 1;
    const color = (block.settings["dividerColor"] as string) || "#4b5563";

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          <hr style={{ borderStyle: style, borderTopWidth: `${thickness}px`, borderColor: color }} />
        </div>
      )
    );
  }

  // SocialLinks block
  if (block.type === "SocialLinks") {
    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          <div className="flex items-center justify-center gap-3">
            <Share2 className="size-4 text-gray-500" />
            <span className="text-xs text-gray-500">Social Links</span>
          </div>
        </div>
      )
    );
  }

  // Icon block
  if (block.type === "Icon") {
    const iconName = (block.settings["iconName"] as string) || "Star";
    const iconColor = (block.settings["iconColor"] as string) || "#ffffff";

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded border p-3 ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/20 hover:border-border/50"
            }`
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Star className="size-5" style={{ color: iconColor }} />
            <span className="text-xs text-gray-500">{iconName}</span>
          </div>
        </div>
      )
    );
  }

  // Fallback for unknown block types
  return (
    wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `flex w-full items-center gap-2 text-left text-sm transition overflow-hidden ${contained ? "max-w-full" : ""}`,
          `rounded border p-3 ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          }`
        )}
      >
        <span className="flex-1 truncate text-gray-300">{block.type}</span>
      </div>
    )
  );
}

// ---------------------------------------------------------------------------
// ImageWithText block preview (inside columns)
// ---------------------------------------------------------------------------

interface PreviewSectionBlockProps {
  block: BlockInstance;
  selectedNodeId?: string | null;
  isInspecting?: boolean;
  inspectorSettings: InspectorSettings;
  hoveredNodeId?: string | null;
  onSelect: (nodeId: string) => void;
  sectionId: string;
  sectionType?: string;
  sectionZone?: PageZone;
  columnId?: string;
  stretch?: boolean;
  onHoverNode?: (nodeId: string | null) => void;
  onOpenMedia?: (target: MediaReplaceTarget) => void;
  mediaStyles?: React.CSSProperties | null;
}

function PreviewImageWithTextBlock({
  block,
  selectedNodeId,
  isInspecting = false,
  inspectorSettings,
  hoveredNodeId,
  onSelect,
  sectionId,
  sectionType,
  sectionZone,
  columnId,
  stretch = false,
  onHoverNode,
  onOpenMedia,
  mediaStyles,
}: PreviewSectionBlockProps): React.ReactNode {
  const placement = block.settings["desktopImagePlacement"] as string | undefined;
  const imageFirst = placement !== "image-second";
  const children = block.blocks ?? [];
  const blockImage = block.settings["image"] as string | undefined;

  const stretchClass = stretch ? "h-full" : "";
  const stretchStyle = stretch ? { height: "100%" } : undefined;

  return (
    <div
      className={`flex gap-2 ${imageFirst ? "flex-row" : "flex-row-reverse"} ${stretchClass}`}
      style={stretchStyle}
    >
            <div className="cms-media relative flex w-2/5 shrink-0 items-center justify-center bg-gray-700/30 min-h-[80px]" style={mediaStyles ?? undefined}>
              {blockImage ? (
                <NextImage src={blockImage} alt="" className="size-full object-cover" fill unoptimized />
              ) : (
                <ImageIcon className="size-6 text-gray-500" />
              )}
            </div>
      <div className="flex flex-1 flex-col justify-center gap-1 overflow-hidden">
        {children.length > 0 ? (
          children.map((child: BlockInstance) => (
            <PreviewBlockItem
              key={child.id}
              block={child}
              isSelected={selectedNodeId === child.id}
              isInspecting={isInspecting}
              inspectorSettings={inspectorSettings}
              hoveredNodeId={hoveredNodeId}
              onHoverNode={onHoverNode}
              onSelect={onSelect}
              contained
              selectedNodeId={selectedNodeId}
              sectionId={sectionId}
              sectionType={sectionType}
              sectionZone={sectionZone}
              columnId={columnId}
              parentBlockId={block.id}
              onOpenMedia={onOpenMedia}
              mediaStyles={mediaStyles}
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

function PreviewHeroBlock({
  block,
  selectedNodeId,
  isInspecting = false,
  inspectorSettings,
  hoveredNodeId,
  onSelect,
  sectionId,
  sectionType,
  sectionZone,
  columnId,
  stretch = false,
  onHoverNode,
  onOpenMedia,
  mediaStyles,
}: PreviewSectionBlockProps): React.ReactNode {
  const children = block.blocks ?? [];
  const blockImage = block.settings["image"] as string | undefined;
  const heroBgStyle: React.CSSProperties = blockImage
    ? { backgroundImage: `url(${blockImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  const stretchStyle = stretch ? { height: "100%" } : undefined;

  return (
    <div
      className={`cms-media relative min-h-[80px] px-3 ${blockImage ? "" : "bg-gradient-to-br from-gray-700/30 to-gray-800/50"}`}
      style={{ ...heroBgStyle, ...(mediaStyles ?? {}), ...(stretchStyle ?? {}) }}
    >
      <div className="flex min-h-[80px] flex-col items-center justify-center gap-1">
        {children.length > 0 ? (
          children.map((child: BlockInstance) => (
            <PreviewBlockItem
              key={child.id}
              block={child}
              isSelected={selectedNodeId === child.id}
              isInspecting={isInspecting}
              inspectorSettings={inspectorSettings}
              hoveredNodeId={hoveredNodeId}
              onHoverNode={onHoverNode}
              onSelect={onSelect}
              contained
              selectedNodeId={selectedNodeId}
              sectionId={sectionId}
              sectionType={sectionType}
              sectionZone={sectionZone}
              columnId={columnId}
              parentBlockId={block.id}
              onOpenMedia={onOpenMedia}
              mediaStyles={mediaStyles}
            />
          ))
        ) : (
          <span className="text-xs text-gray-500">Hero banner</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RichText block preview (inside columns)
// ---------------------------------------------------------------------------

function PreviewRichTextBlock({
  block,
  selectedNodeId,
  isInspecting = false,
  inspectorSettings,
  hoveredNodeId,
  onSelect,
  sectionId,
  sectionType,
  sectionZone,
  columnId,
  stretch = false,
  onHoverNode,
  onOpenMedia,
  mediaStyles,
}: PreviewSectionBlockProps): React.ReactNode {
  const children = block.blocks ?? [];
  const blockStyles = getSectionStyles(block.settings);
  const stretchStyle = stretch ? { height: "100%" } : undefined;

  return (
    <div style={{ ...blockStyles, ...(stretchStyle ?? {}) }} className={`space-y-4 ${stretch ? "h-full" : ""}`}>
      {children.length > 0 ? (
        children.map((child: BlockInstance) => (
          <PreviewBlockItem
            key={child.id}
            block={child}
            isSelected={selectedNodeId === child.id}
            isInspecting={isInspecting}
            inspectorSettings={inspectorSettings}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={onHoverNode}
            onSelect={onSelect}
            contained
            selectedNodeId={selectedNodeId}
            sectionId={sectionId}
            sectionType={sectionType}
            sectionZone={sectionZone}
            columnId={columnId}
            parentBlockId={block.id}
            onOpenMedia={onOpenMedia}
            mediaStyles={mediaStyles}
          />
        ))
      ) : (
        <div className="text-xs text-gray-600">
          Rich text section
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block section preview (inside columns)
// ---------------------------------------------------------------------------

function PreviewBlockSectionBlock({
  block,
  selectedNodeId,
  isInspecting = false,
  inspectorSettings,
  hoveredNodeId,
  onSelect,
  sectionId,
  sectionType,
  sectionZone,
  columnId,
  stretch = false,
  onHoverNode,
  onOpenMedia,
  mediaStyles,
}: PreviewSectionBlockProps): React.ReactNode {
  const children = block.blocks ?? [];
  const blockStyles = {
    ...getSectionStyles(block.settings),
    ...getTextAlign(block.settings["contentAlignment"]),
  };
  const stretchStyle = stretch ? { height: "100%" } : undefined;
  const alignment = (block.settings["contentAlignment"] as string) || "left";
  const alignmentClass =
    alignment === "center"
      ? "justify-center"
      : alignment === "right"
        ? "justify-end"
        : "justify-start";
  const blockGap = getSpacingValue(block.settings["blockGap"]);

  return (
    <div style={{ ...blockStyles, ...(stretchStyle ?? {}) }} className={stretch ? "h-full" : ""}>
      <div className={`flex flex-wrap items-center ${alignmentClass}`} style={{ gap: `${blockGap}px` }}>
        {children.map((child: BlockInstance) => (
          <PreviewBlockItem
            key={child.id}
            block={child}
            isSelected={selectedNodeId === child.id}
            isInspecting={isInspecting}
            inspectorSettings={inspectorSettings}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={onHoverNode}
            onSelect={onSelect}
            contained
            selectedNodeId={selectedNodeId}
            sectionId={sectionId}
            sectionType={sectionType}
            sectionZone={sectionZone}
            columnId={columnId}
            parentBlockId={block.id}
            onOpenMedia={onOpenMedia}
            mediaStyles={mediaStyles}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text atom preview (inside columns)
// ---------------------------------------------------------------------------

function PreviewTextAtomBlock({
  block,
  selectedNodeId,
  isInspecting = false,
  inspectorSettings,
  hoveredNodeId,
  onSelect,
  sectionId,
  sectionType,
  sectionZone,
  columnId,
  stretch = false,
  onHoverNode,
  onOpenMedia,
  mediaStyles,
}: PreviewSectionBlockProps): React.ReactNode {
  const text = (block.settings["text"] as string) || "";
  const alignment = (block.settings["alignment"] as string) || "left";
  const letterGap = (block.settings["letterGap"] as number) || 0;
  const lineGap = (block.settings["lineGap"] as number) || 0;
  const wrap = (block.settings["wrap"] as string) || "wrap";
  const letters = (block.blocks ?? []).length
    ? (block.blocks ?? [])
    : Array.from(text).map((char: string, index: number): BlockInstance => ({
        id: `text-atom-${block.id}-${index}`,
        type: "TextAtomLetter",
        settings: { textContent: char },
      }));

  const justifyContent =
    alignment === "center"
      ? "center"
      : alignment === "right"
        ? "flex-end"
        : "flex-start";
  const stretchStyle = stretch ? { height: "100%" } : undefined;
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: wrap === "nowrap" ? "nowrap" : "wrap",
    justifyContent,
    alignItems: "baseline",
    columnGap: letterGap,
    rowGap: lineGap,
    whiteSpace: wrap === "nowrap" ? "pre" : "pre-wrap",
  };

  return (
    <div style={{ ...containerStyle, ...(stretchStyle ?? {}) }} className={stretch ? "h-full" : ""}>
      {letters.length > 0 ? (
        letters.map((child: BlockInstance) => (
          <PreviewBlockItem
            key={child.id}
            block={child}
            isSelected={selectedNodeId === child.id}
            isInspecting={isInspecting}
            inspectorSettings={inspectorSettings}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={onHoverNode}
            onSelect={onSelect}
            contained
            selectedNodeId={selectedNodeId}
            sectionId={sectionId}
            sectionType={sectionType}
            sectionZone={sectionZone}
            columnId={columnId}
            parentBlockId={block.id}
            onOpenMedia={onOpenMedia}
            mediaStyles={mediaStyles}
          />
        ))
      ) : (
        <div className="text-xs text-gray-600">Text atoms</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image element helpers
// ---------------------------------------------------------------------------

function buildImageElementPresentation(
  settings: Record<string, unknown>,
  mediaStyles?: React.CSSProperties | null
): {
  wrapperStyles: React.CSSProperties;
  imageStyles: React.CSSProperties;
  overlayStyles: React.CSSProperties;
  hasOverlay: boolean;
  useFill: boolean;
} {
  const width = (settings["width"] as number) || 100;
  const height = (settings["height"] as number) || 0;
  const aspectRatio = (settings["aspectRatio"] as string) || "auto";
  const objectFit = (settings["objectFit"] as string) || "cover";
  const objectPosition = resolveObjectPosition((settings["objectPosition"] as string) || "center");
  const opacity = clampNumber(settings["opacity"], 0, 100, 100);
  const blur = clampNumber(settings["blur"], 0, 20, 0);
  const grayscale = clampNumber(settings["grayscale"], 0, 100, 0);
  const brightness = clampNumber(settings["brightness"], 0, 200, 100);
  const contrast = clampNumber(settings["contrast"], 0, 200, 100);
  const scale = clampNumber(settings["scale"], 50, 200, 100);
  const rotate = clampNumber(settings["rotate"], -180, 180, 0);
  const shape = (settings["shape"] as string) || "none";
  const borderRadius = (settings["borderRadius"] as number) || 0;
  const borderWidth = (settings["borderWidth"] as number) || 0;
  const borderStyle = (settings["borderStyle"] as string) || "solid";
  const borderColor = (settings["borderColor"] as string) || "#ffffff";
  const overlayType = (settings["overlayType"] as string) || "none";
  const overlayColor = (settings["overlayColor"] as string) || "#000000";
  const overlayOpacity = clampNumber(settings["overlayOpacity"], 0, 100, 0) / 100;
  const overlayGradientFrom = (settings["overlayGradientFrom"] as string) || "#000000";
  const overlayGradientTo = (settings["overlayGradientTo"] as string) || "#ffffff";
  const overlayGradientDirection = (settings["overlayGradientDirection"] as string) || "to-bottom";
  const transparencyMode = (settings["transparencyMode"] as string) || "none";
  const transparencyDirection = (settings["transparencyDirection"] as string) || "bottom";
  const transparencyStrength = clampNumber(settings["transparencyStrength"], 0, 100, 0);

  const wrapperStyles: React.CSSProperties = {
    ...(mediaStyles ?? {}),
    width: `${width}%`,
  };
  if (height > 0) wrapperStyles.height = `${height}px`;
  if (aspectRatio !== "auto") wrapperStyles.aspectRatio = aspectRatio;
  if (borderWidth > 0 && borderStyle !== "none") {
    wrapperStyles.borderWidth = `${borderWidth}px`;
    wrapperStyles.borderStyle = borderStyle;
    wrapperStyles.borderColor = borderColor;
  }
  if (shape === "circle") {
    wrapperStyles.borderRadius = "9999px";
    wrapperStyles.overflow = "hidden";
  } else if (shape === "rounded" && borderRadius > 0) {
    wrapperStyles.borderRadius = `${borderRadius}px`;
    wrapperStyles.overflow = "hidden";
  }

  const shadow = settings["imageShadow"] as Record<string, unknown> | undefined;
  if (shadow) {
    const x = (shadow.x as number) ?? 0;
    const y = (shadow.y as number) ?? 0;
    const blurShadow = (shadow.blur as number) ?? 0;
    const spread = (shadow.spread as number) ?? 0;
    const color = shadow.color as string | undefined;
    if ((x || y || blurShadow || spread) && color) {
      wrapperStyles.boxShadow = `${x}px ${y}px ${blurShadow}px ${spread}px ${color}`;
    }
  }

  Object.assign(wrapperStyles, buildTransparencyMaskStyles(transparencyMode, transparencyDirection, transparencyStrength));

  const filters: string[] = [];
  if (blur > 0) filters.push(`blur(${blur}px)`);
  if (grayscale > 0) filters.push(`grayscale(${grayscale / 100})`);
  if (brightness !== 100) filters.push(`brightness(${brightness / 100})`);
  if (contrast !== 100) filters.push(`contrast(${contrast / 100})`);

  const transforms: string[] = [];
  if (scale !== 100) transforms.push(`scale(${scale / 100})`);
  if (rotate !== 0) transforms.push(`rotate(${rotate}deg)`);

  const imageStyles: React.CSSProperties = {
    width: "100%",
    objectFit,
    objectPosition,
    opacity: opacity / 100,
    filter: filters.length ? filters.join(" ") : undefined,
    transform: transforms.length ? transforms.join(" ") : undefined,
  };

  const overlayStyles: React.CSSProperties = {};
  if (overlayType === "solid") {
    overlayStyles.backgroundColor = overlayColor;
    overlayStyles.opacity = overlayOpacity;
  } else if (overlayType === "gradient") {
    overlayStyles.backgroundImage = `linear-gradient(${resolveGradientDirection(overlayGradientDirection)}, ${overlayGradientFrom}, ${overlayGradientTo})`;
    overlayStyles.opacity = overlayOpacity;
  }
  if (wrapperStyles.borderRadius) {
    overlayStyles.borderRadius = wrapperStyles.borderRadius as string;
  }

  return {
    wrapperStyles,
    imageStyles,
    overlayStyles,
    hasOverlay: overlayType !== "none",
    useFill: height > 0 || aspectRatio !== "auto",
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function resolveObjectPosition(value: string): string {
  const map: Record<string, string> = {
    center: "center",
    top: "top",
    bottom: "bottom",
    left: "left",
    right: "right",
    "top-left": "left top",
    "top-right": "right top",
    "bottom-left": "left bottom",
    "bottom-right": "right bottom",
  };
  return map[value] ?? "center";
}

function resolveGradientDirection(value: string): string {
  const map: Record<string, string> = {
    "to-top": "to top",
    "to-bottom": "to bottom",
    "to-left": "to left",
    "to-right": "to right",
    "to-top-left": "to top left",
    "to-top-right": "to top right",
    "to-bottom-left": "to bottom left",
    "to-bottom-right": "to bottom right",
  };
  return map[value] ?? "to bottom";
}

function buildTransparencyMaskStyles(
  mode: string,
  direction: string,
  strength: number
): React.CSSProperties {
  if (mode !== "gradient" || strength <= 0) return {};
  const dirMap: Record<string, string> = {
    top: "to bottom",
    bottom: "to top",
    left: "to right",
    right: "to left",
    "top-left": "to bottom right",
    "top-right": "to bottom left",
    "bottom-left": "to top right",
    "bottom-right": "to top left",
  };
  const dir = dirMap[direction] ?? "to bottom";
  const stop = Math.min(100, Math.max(0, strength));
  const gradient = `linear-gradient(${dir}, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${stop}%, rgba(0,0,0,1) 100%)`;
  return {
    maskImage: gradient,
    WebkitMaskImage: gradient,
  };
}
