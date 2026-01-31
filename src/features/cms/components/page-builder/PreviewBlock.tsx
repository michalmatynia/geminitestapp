"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Play, Share2, Star, Quote, Eye, EyeOff, Trash2, Megaphone, Link2, AppWindow } from "lucide-react";
import type { SectionInstance, BlockInstance, InspectorSettings, PageZone } from "../../types/page-builder";
import { APP_EMBED_OPTIONS, type AppEmbedId } from "@/features/app-embeds/lib/constants";
import { getSectionStyles, getTextAlign, getBlockTypographyStyles, type ColorSchemeColors } from "../frontend/theme-styles";

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
  if (Array.isArray(value)) return value.map((item) => formatSettingValue(item)).join(", ");
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

type InspectorEntry = { label: string; value: string };
type InspectorSection = { title: string; entries: InspectorEntry[] };

const buildStyleEntries = (settings: Record<string, unknown>): InspectorEntry[] => {
  return Object.entries(settings)
    .filter(([key, value]) => STYLE_KEY_REGEX.test(key) && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => ({
      label: key,
      value: formatSettingValue(value),
    }))
    .filter((entry) => entry.value.length > 0)
    .slice(0, 12);
};

const renderInspectorEntries = (entries: InspectorEntry[]): React.ReactNode => (
  <div className="space-y-1">
    {entries.map((entry) => (
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
  const visibleSections = sections.filter((section) => section.entries.length > 0);
  return (
    <div className="space-y-2 text-xs">
      <div className="text-[10px] uppercase tracking-wider text-blue-200">{title}</div>
      {visibleSections.length === 0 ? (
        <div className="text-[11px] text-gray-400">No inspector details</div>
      ) : (
        visibleSections.map((section) => (
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
  const [open, setOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = (): void => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!enabled || !showTooltip) {
      clearTimer();
      setOpen(false);
    }
    return () => {
      clearTimer();
    };
  }, [enabled, showTooltip]);

  const handleEnter = (): void => {
    if (!enabled) return;
    onHover?.(nodeId);
    clearTimer();
    if (showTooltip) {
      timerRef.current = window.setTimeout(() => setOpen(true), INSPECTOR_TOOLTIP_DELAY_MS);
    }
  };

  const handleLeave = (): void => {
    if (!enabled) return;
    onHover?.(fallbackNodeId ?? null);
    clearTimer();
    setOpen(false);
  };

  return (
    <div className={`relative ${className ?? ""}`} onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {enabled && showTooltip && open && content && (
        <div className="absolute z-[9999] left-1/2 -translate-x-1/2 -top-2 -translate-y-full rounded-md border border-gray-700 bg-gray-900/95 px-3 py-2 text-xs text-gray-200 shadow-lg pointer-events-none">
          {content}
        </div>
      )}
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
}: PreviewSectionProps): React.ReactNode {
  const isSectionSelected = selectedNodeId === section.id;
  const isHidden = Boolean(section.settings["isHidden"]);
  const label = (section.settings["label"] as string | undefined) ?? section.type;
  const inspectorActive = isInspecting && (!isHidden || inspectorSettings.detectHiddenElements);
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
    const columnsPerRow = (section.settings["columns"] as number) ?? 1;
    const rows = (section.settings["rows"] as number) ?? 1;
    const columns = section.blocks.filter((b: BlockInstance) => b.type === "Column").length;
    structureEntries.push({ label: "Rows", value: String(rows) });
    structureEntries.push({ label: "Columns / row", value: String(columnsPerRow) });
    structureEntries.push({ label: "Cells", value: String(columns) });
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
    const hiddenSelectedClass = isInspecting
      ? "border-blue-500 bg-blue-500/10 ring-2 ring-inset ring-blue-500/40"
      : "border-blue-500 bg-blue-500/5 ring-2 ring-inset ring-blue-500/20";
    const hiddenHoverClass =
      isSectionHovered && !isSectionSelected
        ? "border-blue-500/70 ring-2 ring-inset ring-blue-500/30"
        : "";
    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          className={`relative w-full border border-dashed px-4 py-6 text-left transition cursor-pointer ${
            isSectionSelected
              ? hiddenSelectedClass
              : "border-border/50 bg-transparent hover:border-border/70"
          } ${hiddenHoverClass}`}
        >
          {renderSectionActions()}
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            <EyeOff className="size-3.5" />
            <span>Hidden section</span>
          </div>
          <div className="mt-2 text-sm text-gray-400">{label}</div>
        </div>
      )
    );
  }

  if (section.type === "AnnouncementBar" || section.type === "Block") {
    const alignment = (section.settings["contentAlignment"] as string) || "center";
    const alignmentClasses =
      alignment === "left"
        ? "justify-start text-left"
        : alignment === "right"
          ? "justify-end text-right"
          : "justify-center text-center";

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
    const emptyLabel = section.type === "Block" ? "Block" : "Announcement bar";

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
            <div className={`flex flex-wrap items-center gap-3 ${alignmentClasses}`}>
              {section.blocks.length === 0 ? (
                <p className="text-sm text-gray-400">{emptyLabel}</p>
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
    const gridColumns = section.blocks.filter((b: BlockInstance) => b.type === "Column");
    const columnsPerRow = Math.max(1, (section.settings["columns"] as number) ?? 1);
    const rows = Math.max(1, (section.settings["rows"] as number) ?? 1);
    const totalCells = rows * columnsPerRow;
    const colCount = columnsPerRow;
    const normalizedColumns =
      gridColumns.length === totalCells
        ? gridColumns
        : [
            ...gridColumns,
            ...Array.from({ length: Math.max(0, totalCells - gridColumns.length) }, (_, idx: number): BlockInstance => ({
              id: `placeholder-${section.id}-${idx}`,
              type: "Column",
              settings: {},
              blocks: [],
            })),
          ].slice(0, totalCells);

    return (
      wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === "Enter" || e.key === " ") handleSelect();
          }}
          style={{
            ...sectionStyles,
            padding: 0,
            margin: 0,
          }}
          className={`relative w-full min-h-[80px] border border-dashed border-border/50 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          {gridColumns.length === 0 ? (
            <div className="flex min-h-[60px] items-center justify-center text-sm text-gray-500">
              No columns
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from({ length: rows }, (_, rowIndex: number) => {
                const start = rowIndex * columnsPerRow;
                const rowColumns = normalizedColumns.slice(start, start + columnsPerRow);
                return (
                  <div
                    key={`grid-row-${rowIndex}`}
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
                  >
                    {rowColumns.map((column: BlockInstance, colIndex: number) => {
                      const isPlaceholder = column.id.startsWith("placeholder-");
                      const isColumnSelected = !isPlaceholder && selectedNodeId === column.id;
                      const isColumnHovered = !isPlaceholder && isInspecting && hoveredNodeId === column.id;
                      const isLast = colIndex === rowColumns.length - 1;
                      const columnHoverClass =
                        isColumnHovered && !isColumnSelected
                          ? "ring-1 ring-inset ring-blue-500/30 bg-blue-500/5"
                          : "";
                      if (isPlaceholder) {
                        return (
                          <div
                            key={column.id}
                            className="min-h-[48px] rounded border border-dashed border-border/40 bg-gray-900/20"
                          />
                        );
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
                                    entries: (() => {
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
                                    entries: buildStyleEntries((column.settings as Record<string, unknown>) ?? {}),
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
                            className={`p-2 text-left transition cursor-pointer ${
                              !isLast ? "border-r border-dashed border-border/40" : ""
                            } ${
                              isColumnSelected
                                ? isInspecting
                                  ? "bg-blue-500/10"
                                  : "bg-blue-500/5"
                                : "hover:bg-gray-800/30"
                            } ${columnHoverClass}`}
                          >
                            {(column.blocks ?? []).length > 0 && (
                              <div className={`space-y-1.5 ${isInspecting ? "" : "pointer-events-none"}`}>
                                {(column.blocks ?? []).map((block: BlockInstance) => (
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
                                    columnId={column.id}
                                    onOpenMedia={onOpenMedia}
                                    mediaStyles={mediaStyles}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </InspectorHover>
                      );
                    })}
                  </div>
                );
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
          className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <div className="rounded border border-dashed border-border/40 bg-gray-800/20 px-3 py-2">
            <p className="text-sm text-gray-200 line-clamp-4" style={typoStyles}>
              {text}
            </p>
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
    >
      {node}
    </InspectorHover>
  );

  // ---------------------------------------------------------------------------
  // Section-type blocks (ImageWithText, Hero) — layout-aware preview
  // ---------------------------------------------------------------------------
  if (isSectionType) {
    const canReplaceImage = Boolean(onOpenMedia);
    return (
      wrapBlock(
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
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-border/30 bg-gray-800/30 hover:border-border/50"
            } ${hoverFrameClass}`}
          >
            <div className="p-2.5 overflow-hidden">
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
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
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
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onSelect(block.id);
          }}
          className={`cms-hover-card w-full rounded border p-3 text-left transition overflow-hidden ${
            contained ? "max-w-full" : ""
          } ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
        >
          <div className={`${sizeClass} text-gray-200 truncate`}>{text}</div>
        </button>
      )
    );
  }

  if (block.type === "Announcement") {
    const text = (block.settings["text"] as string) || "Announcement";
    const link = (block.settings["link"] as string) || "";
    return (
      wrapBlock(
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onSelect(block.id);
          }}
          className={`flex w-full items-center gap-2 rounded border px-2 py-1 text-sm transition ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg} text-blue-200`
              : "border-transparent text-gray-300 hover:border-border/30"
          } ${hoverFrameClass}`}
        >
          <Megaphone className="size-3.5 text-gray-400" />
          <span className={link ? "text-blue-300 underline decoration-blue-400/50" : ""}>
            {text}
          </span>
          {link ? <Link2 className="size-3 text-blue-300/80" /> : null}
        </button>
      )
    );
  }

  // Text block
  if (block.type === "Text") {
    const text = (block.settings["textContent"] as string) || "";

    return (
      wrapBlock(
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
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
        >
          {text ? (
            <p className="text-sm text-gray-300 line-clamp-3">{text}</p>
          ) : (
            <p className="text-sm italic text-gray-500">Add text content...</p>
          )}
        </button>
      )
    );
  }

  // Text element block
  if (block.type === "TextElement") {
    const text = (block.settings["textContent"] as string) || "Text element";
    const typoStyles = getBlockTypographyStyles(block.settings);

    return (
      wrapBlock(
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
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
        >
          <p className="text-sm text-gray-200 line-clamp-4" style={typoStyles}>
            {text}
          </p>
        </button>
      )
    );
  }

  // Button block
  if (block.type === "Button") {
    const label = (block.settings["buttonLabel"] as string) || "Button";
    const style = (block.settings["buttonStyle"] as string) || "solid";

    return (
      wrapBlock(
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onSelect(block.id);
          }}
          className={`cms-hover-button w-full rounded border p-3 text-left transition overflow-hidden ${
            contained ? "max-w-full" : ""
          } ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
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
      )
    );
  }

  // RichText block
  if (block.type === "RichText") {
    const colorScheme = block.settings["colorScheme"] as string | undefined;
    const schemeBg = getColorSchemeBg(colorScheme);

    return (
      wrapBlock(
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
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
        >
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-full rounded bg-gray-600/40" />
            <div className="h-2 w-5/6 rounded bg-gray-600/30" />
            <div className="h-2 w-2/3 rounded bg-gray-600/30" />
          </div>
        </button>
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
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "border-transparent hover:border-border/30"
            } ${hoverFrameClass}`}
          >
            {src ? (
              <div className="cms-media" style={{ width: `${width}%`, ...resolvedStyles }}>
                <img
                  src={src}
                  alt={alt}
                  className="block h-auto w-full object-cover"
                />
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
      )
    );
  }

  // VideoEmbed block
  if (block.type === "VideoEmbed") {
    const ratio = (block.settings["aspectRatio"] as string) || "16:9";

    return (
      wrapBlock(
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
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
        >
          <div className="cms-media flex items-center justify-center bg-gray-700/30 min-h-[60px]" style={mediaStyles ?? undefined}>
            <div className="flex items-center gap-2">
              <Play className="size-5 text-gray-500" />
              <span className="text-xs text-gray-500">{ratio}</span>
            </div>
          </div>
        </button>
      )
    );
  }

  // AppEmbed block
  if (block.type === "AppEmbed") {
    const appId = (block.settings["appId"] as AppEmbedId) || "chatbot";
    const title = (block.settings["title"] as string) || "";
    const appLabel = APP_EMBED_OPTIONS.find((option) => option.id === appId)?.label ?? "App";

    return (
      wrapBlock(
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
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
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
        </button>
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
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
        >
          <hr style={{ borderStyle: style, borderTopWidth: `${thickness}px`, borderColor: color }} />
        </button>
      )
    );
  }

  // SocialLinks block
  if (block.type === "SocialLinks") {
    return (
      wrapBlock(
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
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
        >
          <div className="flex items-center justify-center gap-3">
            <Share2 className="size-4 text-gray-500" />
            <span className="text-xs text-gray-500">Social Links</span>
          </div>
        </button>
      )
    );
  }

  // Icon block
  if (block.type === "Icon") {
    const iconName = (block.settings["iconName"] as string) || "Star";
    const iconColor = (block.settings["iconColor"] as string) || "#ffffff";

    return (
      wrapBlock(
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
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "border-border/30 bg-gray-800/20 hover:border-border/50"
          } ${hoverFrameClass}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Star className="size-5" style={{ color: iconColor }} />
            <span className="text-xs text-gray-500">{iconName}</span>
          </div>
        </button>
      )
    );
  }

  // Fallback for unknown block types
  return (
    wrapBlock(
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
            ? `${selectedBorderClass} ${selectedSoftBg}`
            : "border-border/30 bg-gray-800/20 hover:border-border/50"
        } ${hoverFrameClass}`}
      >
        <span className="flex-1 truncate text-gray-300">{block.type}</span>
      </button>
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
  onHoverNode,
  onOpenMedia,
  mediaStyles,
}: PreviewSectionBlockProps): React.ReactNode {
  const placement = block.settings["desktopImagePlacement"] as string | undefined;
  const imageFirst = placement !== "image-second";
  const children = block.blocks ?? [];
  const blockImage = block.settings["image"] as string | undefined;

  return (
    <div className={`flex gap-2 ${imageFirst ? "flex-row" : "flex-row-reverse"}`}>
      <div className="cms-media flex w-1/3 shrink-0 items-center justify-center bg-gray-700/40 min-h-[48px]" style={mediaStyles ?? undefined}>
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
  onHoverNode,
  onOpenMedia,
  mediaStyles,
}: PreviewSectionBlockProps): React.ReactNode {
  const children = block.blocks ?? [];
  const blockImage = block.settings["image"] as string | undefined;
  const heroBgStyle: React.CSSProperties = blockImage
    ? { backgroundImage: `url(${blockImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  return (
    <div
      className={`cms-media relative min-h-[80px] px-3 ${blockImage ? "" : "bg-gradient-to-br from-gray-700/30 to-gray-800/50"}`}
      style={{ ...heroBgStyle, ...(mediaStyles ?? {}) }}
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
