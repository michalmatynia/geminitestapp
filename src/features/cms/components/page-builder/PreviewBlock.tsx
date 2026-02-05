"use client";

import React, { useEffect, useRef, useState, useId, useCallback, useMemo, memo } from "react";
import NextImage from "next/image";
import { createPortal } from "react-dom";
import { Image as ImageIcon, Eye, EyeOff, Trash2, Megaphone, Link2, ChevronLeft, ChevronRight } from "lucide-react";
import type { SectionInstance, BlockInstance, InspectorSettings, PageZone } from "../../types/page-builder";
import { APP_EMBED_OPTIONS, type AppEmbedId } from "@/features/app-embeds/lib/constants";
import { getSectionContainerClass, getSectionStyles, getTextAlign, getBlockTypographyStyles, getVerticalAlign, type ColorSchemeColors } from "../frontend/theme-styles";
import { EventEffectsWrapper } from "@/features/cms/components/shared/EventEffectsWrapper";
import { GsapAnimationWrapper } from "../frontend/GsapAnimationWrapper";
import { CssAnimationWrapper } from "../frontend/CssAnimationWrapper";
import type { GsapAnimationConfig } from "@/features/gsap";
import type { CssAnimationConfig } from "@/features/cms/types/css-animations";
import { Viewer3D, type EnvironmentPreset, type LightingPreset } from "@/features/viewer3d";
import { buildScopedCustomCss, getCustomCssSelector } from "@/features/cms/utils/custom-css";

type AppEmbedOption = (typeof APP_EMBED_OPTIONS)[number];

export type MediaReplaceTarget = {
  kind: "section" | "block";
  sectionId: string;
  blockId?: string | undefined;
  columnId?: string | undefined;
  parentBlockId?: string | undefined;
  key: string;
};

// Section-type block types that get a richer preview
const SECTION_BLOCK_TYPES = ["ImageWithText", "Hero", "RichText", "Block", "TextAtom", "Carousel", "Slideshow"];

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

const getGapStyle = (gapPx: unknown): React.CSSProperties | undefined => {
  if (typeof gapPx === "number" && Number.isFinite(gapPx) && gapPx > 0) {
    return { gap: `${gapPx}px` };
  }
  return undefined;
};

const resolveJustifyContent = (value: unknown): React.CSSProperties["justifyContent"] | undefined => {
  if (value === "center") return "center";
  if (value === "end") return "flex-end";
  if (value === "space-between") return "space-between";
  if (value === "space-around") return "space-around";
  if (value === "space-evenly") return "space-evenly";
  if (value === "start") return "flex-start";
  return undefined;
};

const resolveAlignItems = (value: unknown): React.CSSProperties["alignItems"] | undefined => {
  if (value === "center") return "center";
  if (value === "end") return "flex-end";
  if (value === "stretch") return "stretch";
  if (value === "start") return "flex-start";
  return undefined;
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
  Model3D: 200,
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

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const shouldShowSectionDivider = (settings: Record<string, unknown>): boolean => {
  const mt = getSpacingValue(settings["marginTop"]);
  const mb = getSpacingValue(settings["marginBottom"]);
  return mt === 0 && mb === 0;
};

const INSPECTOR_TOOLTIP_DELAY_MS = 500;
const INSPECTOR_TOOLTIP_WIDTH = 260;
const INSPECTOR_TOOLTIP_GAP = 10;
const inspectorTooltipOrder: string[] = [];

const registerInspectorTooltip = (id: string): number => {
  const existingIndex = inspectorTooltipOrder.indexOf(id);
  if (existingIndex >= 0) return existingIndex;
  inspectorTooltipOrder.push(id);
  return inspectorTooltipOrder.length - 1;
};

const unregisterInspectorTooltip = (id: string): void => {
  const index = inspectorTooltipOrder.indexOf(id);
  if (index >= 0) inspectorTooltipOrder.splice(index, 1);
};

const getInspectorTooltipIndex = (id: string): number => inspectorTooltipOrder.indexOf(id);
const STYLE_KEY_REGEX = /(color|padding|margin|radius|border|shadow|align|font|size|width|height|spacing|background|opacity)/i;

// Helper to check if an ImageElement is in background mode for a specific target
function isBackgroundModeImage(block: BlockInstance, target: "grid" | "row" | "column"): boolean {
  if (block.type !== "ImageElement") return false;
  const backgroundTarget = (block.settings?.["backgroundTarget"] as string) || "none";
  return backgroundTarget === target;
}

// Collect all ImageElements from a block tree that have a specific background target
function collectBackgroundImages(blocks: BlockInstance[], target: "grid" | "row" | "column"): BlockInstance[] {
  const result: BlockInstance[] = [];
  for (const block of blocks) {
    if (isBackgroundModeImage(block, target)) {
      result.push(block);
    }
    // Also check children for grid backgrounds (they could be nested in rows/columns)
    if (target === "grid" && block.blocks) {
      result.push(...collectBackgroundImages(block.blocks, target));
    }
  }
  return result;
}

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

// Memoized 3D viewer wrapper to prevent re-renders when parent selection state changes
interface MemoizedViewer3DProps {
  modelUrl: string;
  height: number;
  backgroundColor: string;
  autoRotate: boolean;
  autoRotateSpeed: number;
  environment: EnvironmentPreset;
  lighting: LightingPreset;
  lightIntensity: number;
  enableShadows: boolean;
  enableBloom: boolean;
  bloomIntensity: number;
  exposure: number;
  showGround: boolean;
  enableContactShadows: boolean;
  enableVignette: boolean;
  autoFit: boolean;
  presentationMode: boolean;
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
}

const MemoizedViewer3D = memo(function MemoizedViewer3D({
  modelUrl,
  height,
  backgroundColor,
  autoRotate,
  autoRotateSpeed,
  environment,
  lighting,
  lightIntensity,
  enableShadows,
  enableBloom,
  bloomIntensity,
  exposure,
  showGround,
  enableContactShadows,
  enableVignette,
  autoFit,
  presentationMode,
  positionX,
  positionY,
  positionZ,
  rotationX,
  rotationY,
  rotationZ,
  scale,
}: MemoizedViewer3DProps): React.ReactElement {
  const position = useMemo<[number, number, number]>(
    () => [positionX, positionY, positionZ],
    [positionX, positionY, positionZ]
  );
  const rotation = useMemo<[number, number, number]>(
    () => [toRadians(rotationX), toRadians(rotationY), toRadians(rotationZ)],
    [rotationX, rotationY, rotationZ]
  );

  return (
    <div style={{ height: `${Math.max(120, height)}px` }} className="w-full">
      <Viewer3D
        modelUrl={modelUrl}
        backgroundColor={backgroundColor}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        environment={environment}
        lighting={lighting}
        lightIntensity={lightIntensity}
        enableShadows={enableShadows}
        enableBloom={enableBloom}
        bloomIntensity={bloomIntensity}
        exposure={exposure}
        showGround={showGround}
        enableContactShadows={enableContactShadows}
        enableVignette={enableVignette}
        autoFit={autoFit}
        presentationMode={presentationMode}
        allowUserControls={false}
        modelPosition={position}
        modelRotation={rotation}
        modelScale={scale}
        className="h-full w-full"
      />
    </div>
  );
});

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
  onHover?: ((nodeId: string | null) => void) | undefined;
  fallbackNodeId?: string | null;
  content?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.ReactNode => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const reactId = useId();
  const tooltipId = `inspector-${reactId.replace(/:/g, "")}`;
  const isTooltipEnabled = enabled && showTooltip;
  const effectiveOpen = isTooltipEnabled ? open : false;

  const clearTimer = (): void => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateTooltipPosition = useCallback((): void => {
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
    const index = Math.max(0, getInspectorTooltipIndex(tooltipId));
    const offset = index * (INSPECTOR_TOOLTIP_WIDTH + INSPECTOR_TOOLTIP_GAP);
    const minRightEdge = margin + INSPECTOR_TOOLTIP_WIDTH;
    const rightEdge = rect.right - margin - offset;
    setTooltipPos({
      top: rect.bottom - margin,
      left: Math.max(minRightEdge, rightEdge),
    });
  }, [tooltipId]);

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
        registerInspectorTooltip(tooltipId);
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
    unregisterInspectorTooltip(tooltipId);
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
  }, [open, isTooltipEnabled, updateTooltipPosition]);

  useEffect((): (() => void) => {
    return () => {
      unregisterInspectorTooltip(tooltipId);
    };
  }, [tooltipId]);

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
              style={{ left: tooltipPos.left, top: tooltipPos.top, width: INSPECTOR_TOOLTIP_WIDTH }}
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
  layout?: { fullWidth?: boolean };
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
  layout,
  onSelect,
  onHoverNode,
  onOpenMedia,
  onRemoveSection,
  onToggleSectionVisibility,
  onRemoveRow,
}: PreviewSectionProps): React.ReactNode {
  const isSectionSelected = selectedNodeId === section.id;
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const isHidden = Boolean(section.settings["isHidden"]);
  const label = resolveNodeLabel(section.type, section.settings["label"]);
  const animConfig = section.settings["gsapAnimation"] as Partial<GsapAnimationConfig> | undefined;
  const cssAnimConfig = section.settings["cssAnimation"] as CssAnimationConfig | undefined;
  // Inspector should work independently of "editor chrome" (chrome only affects visual overlays / actions).
  const inspectorActive = isInspecting;
  const isSectionHovered = inspectorActive && hoveredNodeId === section.id;
  const inspectorZ = inspectorActive && (isSectionHovered || isSectionSelected) ? "z-30" : "";
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
      <GsapAnimationWrapper config={animConfig}>
        <CssAnimationWrapper config={cssAnimConfig}>
          <EventEffectsWrapper settings={section.settings} disableClick>
            {node}
          </EventEffectsWrapper>
        </CssAnimationWrapper>
      </GsapAnimationWrapper>
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
    if (!showEditorChrome || !isSectionSelected) return null;
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
    const isBlockSection = section.type === "Block";
    const alignment = (section.settings["contentAlignment"] as string) || "center";
    const alignmentClasses =
      alignment === "left"
        ? "justify-start text-left"
        : alignment === "right"
          ? "justify-end text-right"
          : "justify-center text-center";
    const blockGap = getSpacingValue(section.settings["blockGap"]);
    const direction = (section.settings["layoutDirection"] as string) || "row";
    const wrapSetting = (section.settings["wrap"] as string) || "wrap";
    const justifySetting = (section.settings["justifyContent"] as string) || "inherit";
    const justifyContent =
      resolveJustifyContent(justifySetting === "inherit" ? alignment : justifySetting) ??
      (alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start");
    const alignItems = resolveAlignItems(section.settings["alignItems"]) ?? "center";
    const flexDirClass = direction === "column" ? "flex-col" : "flex-row";
    const wrapClass = direction === "column" ? "" : wrapSetting === "nowrap" ? "flex-nowrap" : "flex-wrap";

    const containerStyles: React.CSSProperties = {
      ...getSectionStyles(section.settings, colorSchemes),
      ...getTextAlign(section.settings["contentAlignment"]),
    };
    const containerRingClass = inspectorActive
      ? isSectionSelected
        ? "ring-4 ring-blue-500/65"
        : isSectionHovered
          ? "ring-4 ring-blue-500/45"
          : "hover:ring-1 hover:ring-inset hover:ring-border/40"
      : showEditorChrome
        ? isSectionSelected
          ? isInspecting
            ? "ring-2 ring-inset ring-blue-500/60"
            : "ring-2 ring-inset ring-blue-500/40"
          : "hover:ring-1 hover:ring-inset hover:ring-border/40"
      : "";
    const sectionSelector = isBlockSection ? getCustomCssSelector(section.id) : null;
    const sectionCustomCss = isBlockSection
      ? buildScopedCustomCss(section.settings["customCss"], sectionSelector)
      : null;
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
          className={`relative w-full transition cursor-pointer ${containerRingClass} ${inspectorZ}${
            isBlockSection ? ` cms-node-${section.id}` : ""
          }`}
        >
          {sectionCustomCss ? <style data-cms-custom-css={section.id}>{sectionCustomCss}</style> : null}
          {renderSectionActions()}
          {divider}
          <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-6xl" })}>
            <div
              className={
                section.type === "Block"
                  ? `flex ${flexDirClass} ${wrapClass}`
                  : `flex flex-wrap items-center gap-3 ${alignmentClasses}`
              }
              style={
                section.type === "Block"
                  ? { gap: `${blockGap}px`, justifyContent, alignItems }
                  : undefined
              }
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
  const selectedRingBase = inspectorActive
    ? isSectionSelected
      ? "ring-4 ring-blue-500/65"
      : isSectionHovered
        ? "ring-4 ring-blue-500/45"
        : "hover:ring-1 hover:ring-inset hover:ring-border/40"
    : showEditorChrome
      ? isSectionSelected
        ? isInspecting
          ? "ring-2 ring-inset ring-blue-500/60"
          : "ring-2 ring-inset ring-blue-500/40"
        : "hover:ring-1 hover:ring-inset hover:ring-border/40"
      : "";
  const selectedRing = `${selectedRingBase} ${inspectorZ}`.trim();

  const sectionImage = section.settings["image"] as string | undefined;

  // Helper to render blocks list
  const renderBlocks = (emptyText: string): React.ReactNode =>
    section.blocks.length === 0 ? (
      showEditorChrome ? (
        <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-border/50 text-sm text-gray-500">
          {emptyText}
        </div>
      ) : null
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
    // Legacy: ImageElements directly in grid that don't have background mode set
    const gridImageBlocks = section.blocks.filter((b: BlockInstance) => b.type === "ImageElement" && !isBackgroundModeImage(b, "grid") && !isBackgroundModeImage(b, "row") && !isBackgroundModeImage(b, "column"));
    // New: Collect all ImageElements with backgroundTarget: "grid" from entire block tree
    const gridBackgroundModeImages = collectBackgroundImages(section.blocks, "grid");
    const sectionGap = (section.settings["gap"] as string) || "medium";
    const rowGapSetting = section.settings["rowGap"] as string | undefined;
    const columnGapSetting = section.settings["columnGap"] as string | undefined;
    const rowGapValue = resolveGapValue(rowGapSetting, sectionGap);
    const columnGapValue = resolveGapValue(columnGapSetting, sectionGap);
    const sectionGapClass = getGapClass(rowGapValue);
    const sectionGapStyle = getGapStyle(section.settings["rowGapPx"]);
    const columnGapPx =
      typeof section.settings["columnGapPx"] === "number" && Number.isFinite(section.settings["columnGapPx"])
        ? section.settings["columnGapPx"]
        : 0;
    const gridBackgroundSettings = section.settings["backgroundImage"] as Record<string, unknown> | undefined;
    const hasGridBackgroundSetting = Boolean((gridBackgroundSettings?.["src"] as string) || "");
    const hasGridBackgroundLayers = gridImageBlocks.length > 0 || gridBackgroundModeImages.length > 0;
    const hasGridBackground = hasGridBackgroundSetting || hasGridBackgroundLayers;
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
    const sectionSelector = getCustomCssSelector(section.id);
    const sectionCustomCss = buildScopedCustomCss(section.settings["customCss"], sectionSelector);

    if (rowsToRender.length === 0 && !showEditorChrome) {
      return null;
    }

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
          className={`relative w-full text-left transition cursor-pointer ${selectedRing} cms-node-${section.id}`}
        >
          {sectionCustomCss ? <style data-cms-custom-css={section.id}>{sectionCustomCss}</style> : null}
          {renderSectionActions()}
          {divider}
          <div className={`relative ${hasGridBackground ? "overflow-hidden" : ""}`}>
            {/* Legacy: ImageElements directly in grid without background mode */}
            {gridImageBlocks.map((block: BlockInstance) => (
              <React.Fragment key={`grid-background-${block.id}`}>
                {renderBackgroundImageLayer(block.settings, mediaStyles)}
              </React.Fragment>
            ))}
            {/* New: ImageElements with backgroundTarget: "grid" */}
            {gridBackgroundModeImages.map((block: BlockInstance) => (
              <React.Fragment key={`grid-bg-mode-${block.id}`}>
                {renderBackgroundImageLayer(block.settings, mediaStyles)}
              </React.Fragment>
            ))}
            {hasGridBackgroundSetting && renderBackgroundImageLayer(gridBackgroundSettings, mediaStyles)}
            <div className="relative z-10">
              {rowsToRender.length === 0 ? (
                showEditorChrome ? (
                  <div className="flex min-h-[60px] items-center justify-center text-sm text-gray-500">
                    No rows
                  </div>
                ) : null
              ) : showEditorChrome && isEmptyGrid && hasZeroSpacing && !hasFixedHeights ? (
                <div className="h-px w-full bg-border/40" />
              ) : (
                <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
                  <div className={`flex flex-col ${sectionGapClass}`} style={sectionGapStyle}>
                    {rowsToRender.map(({ row, virtual }: { row: BlockInstance; virtual: boolean }, rowIndex: number) => {
                      const rowColumns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
                      const columnCount = Math.max(1, rowColumns.length);
                      const rowHasContent = rowColumns.some((column: BlockInstance) => (column.blocks ?? []).length > 0);
                      const isRowSelected = showEditorChrome && !virtual && selectedNodeId === row.id;
                      const rowGapValue = resolveGapValue(row.settings?.["gap"], columnGapValue);
                      const rowGapClass = rowHasContent ? getGapClass(rowGapValue) : "gap-0";
                      const rowGapPxRaw = row.settings?.["gapPx"];
                      const rowGapPx =
                        typeof rowGapPxRaw === "number" && Number.isFinite(rowGapPxRaw) && rowGapPxRaw > 0
                          ? rowGapPxRaw
                          : columnGapPx;
                      const rowGapStyle = getGapStyle(rowGapPx);
                      const rowJustify = resolveJustifyContent(row.settings?.["justifyContent"]);
                      const rowAlign = resolveAlignItems(row.settings?.["alignItems"]);
                      const rowStyles = getSectionStyles(row.settings ?? {}, colorSchemes);
                      const rowHeightMode = (row.settings?.["heightMode"] as string) || "inherit";
                      const rowHeight = (row.settings?.["height"] as number) || 0;
                      const rowHeightStyle =
                        rowHeightMode === "fixed" && rowHeight > 0 ? { height: `${rowHeight}px` } : undefined;
                      const rowSelector = getCustomCssSelector(row.id);
                      const rowCustomCss = buildScopedCustomCss(row.settings?.["customCss"], rowSelector);
                      // Row background mode images
                      const rowBackgroundModeImages = collectBackgroundImages(row.blocks ?? [], "row");
                      const rowBackgroundSettings = row.settings?.["backgroundImage"] as Record<string, unknown> | undefined;
                      const hasRowBackgroundSetting = Boolean((rowBackgroundSettings?.["src"] as string) || "");
                      const hasRowBackgroundMode = rowBackgroundModeImages.length > 0;
                      const hasRowBackground = hasRowBackgroundSetting || hasRowBackgroundMode;
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
                          className={`relative cms-node-${row.id} ${hasRowBackground ? "overflow-hidden" : ""} ${
                            isRowSelected ? "ring-1 ring-inset ring-blue-500/40" : ""
                          }`}
                        >
                          {rowCustomCss ? <style data-cms-custom-css={row.id}>{rowCustomCss}</style> : null}
                          {/* Row background mode images */}
                          {rowBackgroundModeImages.map((block: BlockInstance) => (
                            <React.Fragment key={`row-bg-mode-${block.id}`}>
                              {renderBackgroundImageLayer(block.settings, mediaStyles)}
                            </React.Fragment>
                          ))}
                          {hasRowBackgroundSetting && renderBackgroundImageLayer(rowBackgroundSettings, mediaStyles)}
                          {!virtual && isRowSelected && onRemoveRow && showEditorChrome && (
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
                            className={`relative z-10 grid ${rowGapClass}`}
                            style={{
                              gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                              ...(rowHeightMode === "fixed" && rowHeight > 0 ? { height: "100%" } : {}),
                              ...(rowGapStyle ?? {}),
                              ...(rowJustify ? { justifyContent: rowJustify } : {}),
                              ...(rowAlign ? { alignItems: rowAlign } : {}),
                            }}
                          >
                            {rowColumns.map((column: BlockInstance, colIndex: number) => {
                              const isColumnSelected = showEditorChrome && selectedNodeId === column.id;
                              const isColumnHovered = showEditorChrome && isInspecting && hoveredNodeId === column.id;
                              const columnHoverClass =
                                isColumnHovered && !isColumnSelected ? "ring-1 ring-inset ring-blue-500/30" : "";
                              const columnHeightMode = (column.settings?.["heightMode"] as string) || "inherit";
                              const columnHeight = (column.settings?.["height"] as number) || 0;
                              const columnGapValue = resolveGapValue(column.settings?.["gap"], "medium");
                              const columnGapClass = getGapClass(columnGapValue);
                              const columnGapStyle = getGapStyle(column.settings?.["gapPx"]);
                              const columnJustify = resolveJustifyContent(column.settings?.["justifyContent"]);
                              const columnAlign = resolveAlignItems(column.settings?.["alignItems"]);
                              const columnSelector = getCustomCssSelector(column.id);
                              const columnCustomCss = buildScopedCustomCss(column.settings?.["customCss"], columnSelector);
                              const columnStyles = {
                                ...getSectionStyles(column.settings ?? {}, colorSchemes),
                                ...getTextAlign(column.settings?.["textAlign"]),
                              };
                              const columnStyle: React.CSSProperties = {};
                              if (columnHeightMode === "fixed" && columnHeight > 0) {
                                columnStyle.height = `${columnHeight}px`;
                              } else if (rowHeightMode === "fixed" && rowHeight > 0) {
                                columnStyle.height = "100%";
                              }
                              // Column background mode images
                              const columnBlocks = column.blocks ?? [];
                              const columnBackgroundModeImages = columnBlocks.filter((b: BlockInstance) => isBackgroundModeImage(b, "column"));
                              const columnBackgroundSettings = column.settings?.["backgroundImage"] as Record<string, unknown> | undefined;
                              const hasColumnBackgroundSetting = Boolean((columnBackgroundSettings?.["src"] as string) || "");
                              const hasColumnBackgroundMode = columnBackgroundModeImages.length > 0;
                              const hasColumnBackground = hasColumnBackgroundSetting || hasColumnBackgroundMode;
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
                                    style={{ ...columnStyles, ...columnStyle }}
                                    className={`relative h-full text-left transition cursor-pointer cms-node-${column.id} ${
                                      isColumnSelected ? "ring-1 ring-inset ring-blue-500/40" : ""
                                    } ${columnHoverClass} ${hasColumnBackground ? "overflow-hidden" : ""}`}
                                  >
                                    {columnCustomCss ? <style data-cms-custom-css={column.id}>{columnCustomCss}</style> : null}
                                    {/* Column background mode images */}
                                    {columnBackgroundModeImages.map((block: BlockInstance) => (
                                      <React.Fragment key={`col-bg-mode-${block.id}`}>
                                        {renderBackgroundImageLayer(block.settings, mediaStyles)}
                                      </React.Fragment>
                                    ))}
                                    {hasColumnBackgroundSetting && renderBackgroundImageLayer(columnBackgroundSettings, mediaStyles)}
                                    {(column.blocks ?? []).length > 0 && ((): React.ReactNode => {
                                      // Filter out background mode images from regular rendering
                                      const contentBlocks = columnBlocks.filter((b: BlockInstance) => {
                                        if (b.type !== "ImageElement") return true;
                                        const bgTarget = (b.settings?.["backgroundTarget"] as string) || "none";
                                        return bgTarget === "none";
                                      });
                                      const isSingleBlock = contentBlocks.length === 1;
                                      const shouldStretch = isSingleBlock && (rowHeightMode === "fixed" || columnHeightMode === "fixed");
                                      const resolvedGapClass = shouldStretch ? "" : columnGapClass;
                                      const resolvedGapStyle = shouldStretch ? undefined : columnGapStyle;
                                      return (
                                        <div
                                          className={`relative z-10 flex flex-col ${shouldStretch ? "h-full" : resolvedGapClass} ${
                                            isInspecting ? "" : "pointer-events-none"
                                          }`}
                                          style={{
                                            ...(resolvedGapStyle ?? {}),
                                            ...(columnJustify ? { justifyContent: columnJustify } : {}),
                                            ...(columnAlign ? { alignItems: columnAlign } : {}),
                                          }}
                                        >
                                          {contentBlocks.map((block: BlockInstance, blockIndex: number) => (
                                            <div
                                              key={block.id}
                                              className={shouldStretch ? "flex-1" : ""}
                                              style={{
                                                minHeight: `${getBlockMinHeight(block.type)}px`,
                                                ...(shouldStretch ? { height: "100%" } : {}),
                                                position: "relative",
                                                zIndex: contentBlocks.length - blockIndex,
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
                </div>
              )}
            </div>
          </div>
        </div>
      )
    );
  }

  // ImageWithText section — side-by-side image + content
  if (section.type === "ImageWithText") {
    const placement = section.settings["desktopImagePlacement"] as string | undefined;
    const imageFirst = placement !== "image-second";
    const contentPosition = section.settings["desktopContentPosition"] as string | undefined;
    const verticalClass = getVerticalAlign(contentPosition);
    const imageHeight = (section.settings["imageHeight"] as string) || "medium";
    const imgHeightClass =
      imageHeight === "small" ? "min-h-[200px]"
      : imageHeight === "large" ? "min-h-[500px]"
      : "min-h-[350px]";

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
          {showEditorChrome && onOpenMedia && (
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
          <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
            <div className={`flex flex-col gap-8 md:gap-12 ${imageFirst ? "md:flex-row" : "md:flex-row-reverse"} ${verticalClass}`}>
              <div className={`cms-media relative w-full md:w-1/2 ${imgHeightClass}`} style={mediaStyles ?? undefined}>
                {sectionImage ? (
                  <NextImage
                    src={sectionImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized
                  />
                ) : showEditorChrome ? (
                  <div className={`flex ${imgHeightClass} w-full items-center justify-center bg-gray-800`}>
                    <ImageIcon className="size-16 text-gray-600" />
                  </div>
                ) : null}
              </div>
              <div className="flex w-full flex-col justify-center gap-4 md:w-1/2">
                {section.blocks.length > 0 ? (
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
                ) : showEditorChrome ? (
                  <p className="text-gray-500">Add content blocks</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )
    );
  }

  // Hero section — full-width banner with centered content overlay
  if (section.type === "Hero") {
    const imageHeight = (section.settings["imageHeight"] as string) || "large";
    const heightClass =
      imageHeight === "small" ? "min-h-[300px]"
      : imageHeight === "large" ? "min-h-[600px]"
      : "min-h-[450px]";

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
          {showEditorChrome && onOpenMedia && (
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
            className={`cms-media relative w-full ${heightClass} flex items-center justify-center overflow-hidden`}
            style={mediaStyles ?? undefined}
          >
            {sectionImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${sectionImage})` }}
              >
                <div className="absolute inset-0 bg-black/50" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
            )}
            <div
              className={`relative z-10 ${getSectionContainerClass({
                fullWidth: layout?.fullWidth,
                maxWidthClass: "max-w-3xl",
                paddingClass: "px-6",
              })} text-center`}
            >
              <div className="space-y-4">
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
              {section.blocks.length === 0 && (
                <p className="text-lg text-gray-400">Hero section</p>
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
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-3xl" })}>
            <div className="space-y-4">
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
              {showEditorChrome && section.blocks.length === 0 && (
                <p className="text-gray-500">Rich text section</p>
              )}
            </div>
          </div>
        </div>
      )
    );
  }

  // Text element section
  if (section.type === "TextElement") {
    const text = (section.settings["textContent"] as string) || "";
    const typoStyles = getBlockTypographyStyles(section.settings);
    const hasText = text.trim().length > 0;
    const showPlaceholder = !hasText && showEditorChrome;
    if (!hasText && !showEditorChrome) {
      return null;
    }
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
          {hasText ? (
            <p className="m-0 p-0 text-base leading-relaxed text-gray-200" style={typoStyles}>
              {text}
            </p>
          ) : showPlaceholder ? (
            <div className="rounded border border-dashed border-border/40 bg-gray-800/20 px-3 py-2 text-sm text-gray-500">
              Text element
            </div>
          ) : (
            <div className="min-h-[1px]" />
          )}
        </div>
      )
    );
  }

  // Image element section
  if (section.type === "ImageElement") {
    const src = (section.settings["src"] as string) || "";
    const alt = (section.settings["alt"] as string) || "Image";
    const presentation = buildImageElementPresentation(section.settings, mediaStyles);
    const sectionStyles = getSectionStyles(section.settings, colorSchemes);
    if ("width" in section.settings) {
      delete sectionStyles.width;
    }
    const hasSrc = Boolean(src);
    if (!hasSrc && !showEditorChrome) {
      return null;
    }

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
          {hasSrc ? (
            <div className="relative" style={presentation.wrapperStyles}>
              <NextImage
                src={src}
                alt={alt}
                fill
                style={{
                  objectFit: presentation.imageStyles.objectFit,
                  objectPosition: presentation.imageStyles.objectPosition,
                  opacity: presentation.imageStyles.opacity,
                  filter: presentation.imageStyles.filter,
                  transform: presentation.imageStyles.transform,
                  display: "block",
                }}
              />
              {presentation.hasOverlay && (
                <div className="pointer-events-none absolute inset-0" style={presentation.overlayStyles} />
              )}
            </div>
          ) : showEditorChrome ? (
            <div
              className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
              style={presentation.wrapperStyles}
            >
              No image selected
            </div>
          ) : null}
        </div>
      )
    );
  }

  // 3D element section
  if (section.type === "Model3DElement" || section.type === "Model3D") {
    const assetId = (section.settings["assetId"] as string) || "";
    const height = getSpacingValue(section.settings["height"]) || 360;
    const sectionStyles = getSectionStyles(section.settings, colorSchemes);
    if ("width" in sectionStyles) {
      delete sectionStyles.width;
    }
    if ("maxWidth" in sectionStyles) {
      delete sectionStyles.maxWidth;
    }
    const hasAsset = assetId.trim().length > 0;
    if (!hasAsset && !showEditorChrome) {
      return null;
    }

    if (hasAsset) {
      const modelUrl = `/api/assets3d/${assetId}/file`;

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
            <MemoizedViewer3D
              modelUrl={modelUrl}
              height={height}
              backgroundColor={(section.settings["backgroundColor"] as string) || "#111827"}
              autoRotate={toBoolean(section.settings["autoRotate"], true)}
              autoRotateSpeed={toNumber(section.settings["autoRotateSpeed"], 2)}
              environment={(section.settings["environment"] as EnvironmentPreset) || "studio"}
              lighting={(section.settings["lighting"] as LightingPreset) || "studio"}
              lightIntensity={toNumber(section.settings["lightIntensity"], 1)}
              enableShadows={toBoolean(section.settings["enableShadows"], true)}
              enableBloom={toBoolean(section.settings["enableBloom"], false)}
              bloomIntensity={toNumber(section.settings["bloomIntensity"], 0.5)}
              exposure={toNumber(section.settings["exposure"], 1)}
              showGround={toBoolean(section.settings["showGround"], false)}
              enableContactShadows={toBoolean(section.settings["enableContactShadows"], true)}
              enableVignette={toBoolean(section.settings["enableVignette"], false)}
              autoFit={toBoolean(section.settings["autoFit"], true)}
              presentationMode={toBoolean(section.settings["presentationMode"], false)}
              positionX={toNumber(section.settings["positionX"], 0)}
              positionY={toNumber(section.settings["positionY"], 0)}
              positionZ={toNumber(section.settings["positionZ"], 0)}
              rotationX={toNumber(section.settings["rotationX"], 0)}
              rotationY={toNumber(section.settings["rotationY"], 0)}
              rotationZ={toNumber(section.settings["rotationZ"], 0)}
              scale={toNumber(section.settings["scale"], 1)}
            />
          </div>
        )
      );
    }

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
          <div
            className="flex items-center justify-center rounded border border-dashed border-border/40 bg-gray-900/40 text-xs text-gray-400"
            style={{ height: `${Math.max(120, height)}px` }}
          >
            No 3D asset selected
          </div>
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

    if (letters.length === 0 && !showEditorChrome) {
      return null;
    }

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
          {letters.length === 0 ? (
            showEditorChrome ? (
              <div className="rounded border border-dashed border-border/40 bg-gray-800/20 p-2 text-xs text-gray-500">
                Text atoms
              </div>
            ) : null
          ) : showEditorChrome ? (
            <div className="rounded border border-dashed border-border/40 bg-gray-800/20 p-2">
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
            </div>
          ) : (
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
          )}
        </div>
      )
    );
  }

  // Accordion section
  if (section.type === "Accordion") {
    const items: { heading: BlockInstance; text?: BlockInstance }[] = [];
    let i = 0;
    while (i < section.blocks.length) {
      const current = section.blocks[i];
      if (!current) {
        i += 1;
        continue;
      }
      if (current.type === "Heading") {
        const next = section.blocks[i + 1];
        if (next && next.type === "Text") {
          items.push({ heading: current, text: next });
          i += 2;
        } else {
          items.push({ heading: current });
          i += 1;
        }
      } else {
        i += 1;
      }
    }

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
          {items.length === 0 ? (
            showEditorChrome ? (
              <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
                <p className="text-gray-500 text-center py-8">Add Heading and Text blocks to create accordion items</p>
              </div>
            ) : null
          ) : (
            <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-3xl" })}>
              <div className="divide-y divide-gray-700/50">
                {items.map((item: { heading: BlockInstance; text?: BlockInstance }, index: number) => (
                  <div key={item.heading.id} className="py-4">
                    <div className="flex w-full items-center justify-between text-left">
                      <PreviewBlockItem
                        block={item.heading}
                        isSelected={selectedNodeId === item.heading.id}
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
                      <span className="ml-4 shrink-0 text-gray-400 text-xl">{index === 0 ? "−" : "+"}</span>
                    </div>
                    {index === 0 && item.text && (
                      <div className="mt-3">
                        <PreviewBlockItem
                          block={item.text}
                          isSelected={selectedNodeId === item.text.id}
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          {section.blocks.length === 0 ? (
            showEditorChrome ? (
              <div className="container mx-auto px-4 md:px-6">
                <p className="text-gray-500 text-center py-8">Add blocks to create testimonial cards</p>
              </div>
            ) : null
          ) : (
            <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
              <div
                className="grid gap-6"
                style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
              >
                {section.blocks.map((block: BlockInstance) => (
                  <div key={block.id} className="cms-hover-card rounded-xl border border-gray-700/50 bg-gray-800/30 p-6">
                    <svg
                      className="mb-4 size-6 text-gray-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
                    </svg>
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
                      onOpenMedia={onOpenMedia}
                      mediaStyles={mediaStyles}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    );
  }

  // Video section
  if (section.type === "Video") {
    const videoUrl = (section.settings["videoUrl"] as string) || "";
    const ratio = (section.settings["aspectRatio"] as string) || "16:9";
    const autoplay = (section.settings["autoplay"] as string) === "yes";

    const getEmbedUrl = (url: string): string | null => {
      if (!url) return null;
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      if (url.includes("embed") || url.includes("player")) return url;
      return null;
    };

    const getAspectPadding = (aspect: string): string => {
      switch (aspect) {
        case "4:3":
          return "75%";
        case "1:1":
          return "100%";
        default:
          return "56.25%";
      }
    };

    const embedUrl = getEmbedUrl(videoUrl);

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
          <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-4xl" })}>
            {embedUrl ? (
              <div
                className="cms-media relative w-full"
                style={{ paddingBottom: getAspectPadding(ratio), ...(mediaStyles ?? {}) }}
              >
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={`${embedUrl}${autoplay ? "?autoplay=1&mute=1" : ""}`}
                  title="Embedded video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : showEditorChrome ? (
              <div
                className="cms-media flex items-center justify-center bg-gray-800/50"
                style={{ paddingBottom: getAspectPadding(ratio), position: "relative", ...(mediaStyles ?? {}) }}
              >
                <p className="absolute inset-0 flex items-center justify-center text-gray-500">
                  Enter a video URL in section settings
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )
    );
  }

  // Slideshow section
  if (section.type === "Slideshow") {
    const transition = (section.settings["transition"] as string) || "fade";
    const showArrows = (section.settings["showArrows"] as string) !== "no";
    const showDots = (section.settings["showDots"] as string) !== "no";
    const heightMode = (section.settings["heightMode"] as string) || "auto";
    const height = (section.settings["height"] as number) || 360;
    const frameBlocks = section.blocks.filter((block: BlockInstance) => block.type === "SlideshowFrame");
    const legacyBlocks = section.blocks.filter((block: BlockInstance) => block.type !== "SlideshowFrame");
    const frames =
      frameBlocks.length > 0
        ? [
            ...frameBlocks,
            ...legacyBlocks.map((block: BlockInstance) => ({
              id: block.id,
              type: "SlideshowFrame",
              settings: {},
              blocks: [block],
            })),
          ]
        : legacyBlocks.map((block: BlockInstance) => ({
            id: block.id,
            type: "SlideshowFrame",
            settings: {},
            blocks: [block],
          }));
    const slideCount = frames.length;
    const firstFrame = frames[0];
    const frameChildren = firstFrame?.blocks ?? [];
    const frameSettings = (firstFrame?.settings ?? {}) as Record<string, unknown>;
    const backgroundColor = (frameSettings["backgroundColor"] as string) || "";
    const contentAlignment = (frameSettings["contentAlignment"] as string) || "center";
    const verticalAlignment = (frameSettings["verticalAlignment"] as string) || "center";
    const paddingTop = (frameSettings["paddingTop"] as number) || 0;
    const paddingBottom = (frameSettings["paddingBottom"] as number) || 0;
    const paddingLeft = (frameSettings["paddingLeft"] as number) || 0;
    const paddingRight = (frameSettings["paddingRight"] as number) || 0;
    const frameStyle: React.CSSProperties = {
      backgroundColor: backgroundColor || undefined,
      padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
      alignItems:
        contentAlignment === "center"
          ? "center"
          : contentAlignment === "right"
            ? "flex-end"
            : "flex-start",
      justifyContent:
        verticalAlignment === "center"
          ? "center"
          : verticalAlignment === "bottom"
            ? "flex-end"
            : "flex-start",
    };
    const slideHeightStyle: React.CSSProperties | undefined =
      heightMode === "fixed" && height > 0 ? { height: `${height}px` } : undefined;

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
          {slideCount === 0 ? (
            showEditorChrome ? (
              <div className="container mx-auto px-4 md:px-6">
                <p className="text-gray-500 text-center py-12">Add blocks to create slideshow slides</p>
              </div>
            ) : null
          ) : (
            <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
              <div className="relative overflow-hidden rounded-lg min-h-[300px]" style={slideHeightStyle}>
                {firstFrame && (
                  <div
                    className={`${transition === "fade" ? "absolute inset-0" : "absolute inset-0"} flex items-center justify-center`}
                    style={{ opacity: 1 }}
                  >
                    <div className="flex h-full w-full flex-col" style={frameStyle}>
                      {frameChildren.length > 0 ? (
                        frameChildren.map((child: BlockInstance) => (
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
                            sectionId={section.id}
                            sectionType={section.type}
                            sectionZone={section.zone}
                            parentBlockId={firstFrame?.id}
                            onOpenMedia={onOpenMedia}
                            mediaStyles={mediaStyles}
                          />
                        ))
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                          Empty slide
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {slideCount > 1 && (showArrows || showDots) && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  {showArrows && (
                    <button
                      type="button"
                      className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                  )}
                  {showDots && (
                    <div className="flex gap-2">
                      {frames.map((_: BlockInstance, idx: number) => (
                        <div
                          key={idx}
                          className={`size-2 rounded-full transition ${idx === 0 ? "bg-white" : "bg-gray-600"}`}
                        />
                      ))}
                    </div>
                  )}
                  {showArrows && (
                    <button
                      type="button"
                      className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}
                </div>
              )}
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
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <div className={`${getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-2xl" })} text-center`}>
            {section.blocks.length > 0 && (
              <div className="mb-6 space-y-4">
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
            <form
              onSubmit={(e: React.FormEvent) => e.preventDefault()}
              className="flex flex-col gap-3 sm:flex-row sm:gap-0"
            >
              <input
                type="email"
                placeholder={placeholder}
                className="flex-1 rounded-md border border-gray-600 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:rounded-r-none"
                readOnly
              />
              <button
                type="submit"
                className="cms-hover-button rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 sm:rounded-l-none"
              >
                {buttonText}
              </button>
            </form>
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
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-xl" })}>
            <form onSubmit={(e: React.FormEvent) => e.preventDefault()} className="space-y-4">
              {fields.map((field: string) => {
                const isTextarea = field.toLowerCase() === "message";
                const label = field.charAt(0).toUpperCase() + field.slice(1);

                return (
                  <div key={field}>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      {label}
                    </label>
                    {isTextarea ? (
                      <textarea
                        rows={4}
                        placeholder={label}
                        className="w-full rounded-md border border-gray-600 bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        readOnly
                      />
                    ) : (
                      <input
                        type={field.toLowerCase() === "email" ? "email" : "text"}
                        placeholder={label}
                        className="w-full rounded-md border border-gray-600 bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        readOnly
                      />
                    )}
                  </div>
                );
              })}
              <button
                type="submit"
                className="cms-hover-button w-full rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-200"
              >
                {submitText}
              </button>
            </form>
          </div>
        </div>
      )
    );
  }

  // Fallback for unknown section types
  if (!showEditorChrome) {
    return null;
  }
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
  isInspecting?: boolean | undefined;
  inspectorSettings: InspectorSettings;
  hoveredNodeId?: string | null | undefined;
  onSelect: (nodeId: string) => void;
  sectionId: string;
  sectionType?: string | undefined;
  sectionZone?: PageZone | undefined;
  columnId?: string | undefined;
  parentBlockId?: string | undefined;
  contained?: boolean | undefined;
  selectedNodeId?: string | null | undefined;
  onHoverNode?: ((nodeId: string | null) => void) | undefined;
  onOpenMedia?: ((target: MediaReplaceTarget) => void) | undefined;
  mediaStyles?: React.CSSProperties | null | undefined;
  stretch?: boolean | undefined;
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
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const animConfig = block.settings["gsapAnimation"] as Partial<GsapAnimationConfig> | undefined;
  const cssAnimConfig = block.settings["cssAnimation"] as CssAnimationConfig | undefined;
  const allowInlineCustomCss = !["Block", "Row", "Column"].includes(block.type);
  const inlineCustomCss = allowInlineCustomCss ? block.settings["customCss"] : undefined;
  const inlineCustomNodeId = allowInlineCustomCss ? block.id : undefined;
  const selectedBorderClass = isInspecting
    ? "ring-2 ring-inset ring-blue-500/40"
    : "ring-1 ring-inset ring-blue-400/30";
  const selectedSoftBg = isInspecting ? "bg-blue-500/15" : "bg-blue-500/10";
  // Inspector should work independently of "editor chrome" (chrome only affects visual overlays / actions).
  const inspectorActive = isInspecting;
  const isHovered = inspectorActive && hoveredNodeId === block.id;
  const inspectorZ = inspectorActive && (isHovered || isSelected) ? "z-30" : "";
  const hoverFrameClass = isHovered && !isSelected
    ? "ring-4 ring-inset ring-blue-500/45"
    : "";
  const isFaithful = !showEditorChrome;
  const canvasSelectedClass = isSelected
    ? isInspecting
      ? "ring-4 ring-blue-500/45"
      : "ring-2 ring-blue-500/35"
    : "";
  const canvasHoverClass = isHovered && !isSelected ? "ring-4 ring-blue-500/45" : "";
  const canvasFrameClass = `${canvasSelectedClass} ${canvasHoverClass}`.trim();
  const stretchClass = stretch ? "h-full" : "";
  const buildContainerClass = (base: string, editor: string): string =>
    `${base} ${stretchClass} ${inspectorZ} ${isFaithful ? canvasFrameClass : `${editor} ${hoverFrameClass}`}`.trim();
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
      <GsapAnimationWrapper config={animConfig}>
                    <CssAnimationWrapper config={cssAnimConfig}>
                      <EventEffectsWrapper
                        settings={block.settings}
                        disableClick
                        nodeId={inlineCustomNodeId ?? ""}
                        customCss={inlineCustomCss}
                      >
                        {node}          </EventEffectsWrapper>
        </CssAnimationWrapper>
      </GsapAnimationWrapper>
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
    const canReplaceImage = showEditorChrome && Boolean(onOpenMedia);
    const sectionBase = `w-full text-left text-sm transition ${contained ? "max-w-full" : ""} ${showEditorChrome ? "overflow-hidden" : ""}`.trim();
    return (
      wrapBlock(
        <div className="relative group">
          <div
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            className={buildContainerClass(
              sectionBase,
              `rounded ${
                isSelected
                  ? `${selectedBorderClass} ${selectedSoftBg}`
                  : "ring-1 ring-inset ring-border/30 bg-gray-800/30 hover:ring-border/50"
              }`
            )}
          >
            <div className={showEditorChrome ? "overflow-hidden" : ""}>
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
              {block.type === "Carousel" && (
                <PreviewCarouselBlock
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
              {block.type === "Slideshow" && (
                <PreviewSlideshowBlock
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
    const typoStyles = getBlockTypographyStyles(block.settings);
    const baseClasses = `w-full text-left transition ${contained ? "max-w-full" : ""}`;

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(baseClasses, "")}
        >
          {size === "small" ? (
            <h3 className="text-xl font-bold leading-tight tracking-tight md:text-2xl text-gray-200" style={typoStyles}>
              {text}
            </h3>
          ) : size === "large" ? (
            <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl text-gray-200" style={typoStyles}>
              {text}
            </h2>
          ) : (
            <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl text-gray-200" style={typoStyles}>
              {text}
            </h2>
          )}
        </div>
      )
    );
  }

  if (block.type === "Announcement") {
    const rawText = (block.settings["text"] as string) || "";
    const link = (block.settings["link"] as string) || "";
    const hasText = rawText.trim().length > 0;
    const text = hasText ? rawText : "Announcement";
    const typoStyles = getBlockTypographyStyles(block.settings);

    if (!hasText && !showEditorChrome) {
      return null;
    }

    const content = link ? (
      <a
        href={link}
        className="text-sm font-medium text-blue-200 underline decoration-blue-400/50 hover:text-blue-100"
        style={typoStyles}
      >
        {text}
      </a>
    ) : (
      <span className="text-sm text-gray-200" style={typoStyles}>
        {text}
      </span>
    );

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            "inline-flex items-center gap-2 text-sm transition",
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg} text-blue-200`
                : "ring-1 ring-inset ring-border/30 text-gray-300 hover:ring-border/50"
            }`
          )}
        >
          {showEditorChrome ? <Megaphone className="size-3.5 text-gray-400" /> : null}
          {content}
          {showEditorChrome && link ? <Link2 className="size-3 text-blue-300/80" /> : null}
        </div>
      )
    );
  }

  // Text block
  if (block.type === "Text") {
    const text = (block.settings["textContent"] as string) || "";
    const typoStyles = getBlockTypographyStyles(block.settings);
    const hasText = text.trim().length > 0;
    const baseClasses = `w-full text-left transition ${contained ? "max-w-full" : ""}`;

    if (!hasText && !showEditorChrome) {
      return null;
    }

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            baseClasses,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
        >
          {hasText ? (
            <p className="text-base leading-relaxed text-gray-300 md:text-lg" style={typoStyles}>{text}</p>
          ) : showEditorChrome ? (
            <p className="text-sm italic text-gray-500">Add text content...</p>
          ) : null}
        </div>
      )
    );
  }

  // Text element block
  if (block.type === "TextElement") {
    const text = (block.settings["textContent"] as string) || "";
    const typoStyles = getBlockTypographyStyles(block.settings);
    const hasText = text.trim().length > 0;
    const baseClasses = `w-full text-left transition ${contained ? "max-w-full" : ""}`;

    if (!hasText && !showEditorChrome) {
      return null;
    }

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            baseClasses,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
        >
          {hasText ? (
            <p className="m-0 p-0 text-base leading-relaxed text-gray-200" style={typoStyles}>
              {text}
            </p>
          ) : showEditorChrome ? (
            <p className="m-0 p-0 text-sm italic text-gray-500">Text element</p>
          ) : null}
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
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-transparent hover:ring-border/40"
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
    const hasSrc = Boolean(src);
    if (!hasSrc && !showEditorChrome) {
      return null;
    }
    const baseClasses = `w-full text-left transition ${contained ? "max-w-full" : ""}`;
    const wrapperStyles = stretch
      ? { ...presentation.wrapperStyles, height: "100%" }
      : presentation.wrapperStyles;
    const useFill = stretch ? true : presentation.useFill;

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            baseClasses,
            `rounded ${
              isSelected
                ? `ring-2 ring-blue-500 ${selectedSoftBg}`
                : "ring-1 ring-border/30 hover:ring-border/50"
            }`
          )}
        >
          {hasSrc ? (
            <div className="relative" style={wrapperStyles}>
              <NextImage
                src={src}
                alt={alt}
                fill
                style={{
                  ...presentation.imageStyles,
                  display: "block",
                  height: useFill ? "100%" : "auto",
                  maxHeight: "100%",
                }}
              />
              {presentation.hasOverlay && (
                <div className="pointer-events-none absolute inset-0" style={presentation.overlayStyles} />
              )}
            </div>
          ) : showEditorChrome ? (
            <div
              className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
              style={presentation.wrapperStyles}
            >
              No image selected
            </div>
          ) : null}
        </div>
      )
    );
  }

  // 3D model block
  if (block.type === "Model3D" || block.type === "Model3DElement") {
    const assetId = (block.settings["assetId"] as string) || "";
    const height = getSpacingValue(block.settings["height"]) || 360;
    const hasAsset = assetId.trim().length > 0;
    if (hasAsset) {
      const backgroundColor = (block.settings["backgroundColor"] as string) || "#111827";
      const autoRotate = toBoolean(block.settings["autoRotate"], true);
      const autoRotateSpeed = toNumber(block.settings["autoRotateSpeed"], 2);
      const environment = (block.settings["environment"] as EnvironmentPreset) || "studio";
      const lighting = (block.settings["lighting"] as LightingPreset) || "studio";
      const lightIntensity = toNumber(block.settings["lightIntensity"], 1);
      const enableShadows = toBoolean(block.settings["enableShadows"], true);
      const enableBloom = toBoolean(block.settings["enableBloom"], false);
      const bloomIntensity = toNumber(block.settings["bloomIntensity"], 0.5);
      const exposure = toNumber(block.settings["exposure"], 1);
      const showGround = toBoolean(block.settings["showGround"], false);
      const enableContactShadows = toBoolean(block.settings["enableContactShadows"], true);
      const enableVignette = toBoolean(block.settings["enableVignette"], false);
      const autoFit = toBoolean(block.settings["autoFit"], true);
      const presentationMode = toBoolean(block.settings["presentationMode"], false);
      const position = [
        toNumber(block.settings["positionX"], 0),
        toNumber(block.settings["positionY"], 0),
        toNumber(block.settings["positionZ"], 0),
      ] as [number, number, number];
      const rotation = [
        toRadians(toNumber(block.settings["rotationX"], 0)),
        toRadians(toNumber(block.settings["rotationY"], 0)),
        toRadians(toNumber(block.settings["rotationZ"], 0)),
      ] as [number, number, number];
      const scale = toNumber(block.settings["scale"], 1);
      const modelUrl = `/api/assets3d/${assetId}/file`;

      return (
        wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full ${contained ? "max-w-full" : ""}`,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
          style={{ height: `${Math.max(120, height)}px` }}
        >
            <Viewer3D
              modelUrl={modelUrl}
              backgroundColor={backgroundColor}
              autoRotate={autoRotate}
              autoRotateSpeed={autoRotateSpeed}
              environment={environment}
              lighting={lighting}
              lightIntensity={lightIntensity}
              enableShadows={enableShadows}
              enableBloom={enableBloom}
              bloomIntensity={bloomIntensity}
              exposure={exposure}
              showGround={showGround}
              enableContactShadows={enableContactShadows}
              enableVignette={enableVignette}
              autoFit={autoFit}
              presentationMode={presentationMode}
              allowUserControls={false}
              modelPosition={position}
              modelRotation={rotation}
              modelScale={scale}
              className="h-full w-full"
            />
          </div>
        )
      );
    }

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full ${contained ? "max-w-full" : ""}`,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
          style={{ height: `${Math.max(120, height)}px` }}
        >
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
            No 3D asset selected
          </div>
        </div>
      )
    );
  }

  // Button block
  if (block.type === "Button") {
    const label = (block.settings["buttonLabel"] as string) || "Button";
    const link = (block.settings["buttonLink"] as string) || "#";
    const style = (block.settings["buttonStyle"] as string) || "solid";

    const baseButtonClasses = "cms-hover-button inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    const customStyles: React.CSSProperties = {};
    const fontFamily = block.settings["fontFamily"] as string | undefined;
    const fontSize = block.settings["fontSize"] as number | undefined;
    const fontWeight = block.settings["fontWeight"] as string | undefined;
    const textColor = block.settings["textColor"] as string | undefined;
    const bgColor = block.settings["bgColor"] as string | undefined;
    const borderColor = block.settings["borderColor"] as string | undefined;
    const borderRadius = block.settings["borderRadius"] as number | undefined;
    const borderWidth = block.settings["borderWidth"] as number | undefined;

    if (fontFamily) customStyles.fontFamily = fontFamily;
    if (fontSize && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
    if (fontWeight) customStyles.fontWeight = fontWeight;
    if (textColor) customStyles.color = textColor;
    if (bgColor) customStyles.backgroundColor = bgColor;
    if (borderColor) customStyles.borderColor = borderColor;
    if (borderRadius && borderRadius > 0) customStyles.borderRadius = `${borderRadius}px`;
    if (borderWidth && borderWidth > 0) customStyles.borderWidth = `${borderWidth}px`;

    const button =
      style === "outline" ? (
        <a
          href={link}
          className={`${baseButtonClasses} border-2 border-white text-white hover:bg-white hover:text-gray-900 focus:ring-white`}
          style={customStyles}
        >
          {label}
        </a>
      ) : (
        <a
          href={link}
          className={`${baseButtonClasses} bg-white text-gray-900 hover:bg-gray-200 focus:ring-white`}
          style={customStyles}
        >
          {label}
        </a>
      );

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `inline-block ${contained ? "max-w-full" : ""}`,
            `cms-hover-button rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
        >
          {button}
        </div>
      )
    );
  }

  // RichText block
  if (block.type === "RichText") {
    const colorScheme = block.settings["colorScheme"] as string | undefined;
    if (!showEditorChrome) {
      return null;
    }

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
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
    const clipOverflow = ((block.settings["clipOverflow"] as string) || "").toLowerCase() === "true";
    if (!src && !showEditorChrome) {
      return null;
    }
    const baseClasses = `w-full text-left transition ${contained ? "max-w-full" : ""}`;
    const resolvedStyles: React.CSSProperties = {
      ...(mediaStyles ?? {}),
      ...(borderRadius > 0 ? { borderRadius: `${borderRadius}px` } : {}),
    };
    const wrapperStyles: React.CSSProperties = stretch
      ? { width: `${width}%`, height: "100%", ...resolvedStyles }
      : { width: `${width}%`, ...resolvedStyles };
    if (clipOverflow) {
      wrapperStyles.overflow = "hidden";
    }
    const imageClassName = stretch
      ? "block h-full w-full object-cover"
      : "block h-auto w-full max-h-full object-cover";

    return (
      wrapBlock(
        <div className="relative group">
          <div
            role="button"
            tabIndex={0}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            className={buildContainerClass(
              baseClasses,
              `rounded ${
                isSelected
                  ? `${selectedBorderClass} ${selectedSoftBg}`
                  : "ring-1 ring-inset ring-transparent hover:ring-border/30"
              }`
            )}
          >
            {src ? (
              <div className="cms-media relative" style={wrapperStyles}>
                      <NextImage
                        src={src}
                        alt={alt}
                        fill
                        className={imageClassName}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized
                      />              </div>
            ) : showEditorChrome ? (
              <div
                className="cms-media flex items-center justify-center bg-gray-700/30 min-h-[60px]"
                style={wrapperStyles}
              >
                <div className="flex flex-col items-center gap-1">
                  <ImageIcon className="size-6 text-gray-500" />
                  <span className="text-xs text-gray-500 truncate max-w-[120px]">{alt}</span>
                </div>
              </div>
            ) : null}
          </div>
          {showEditorChrome && onOpenMedia && (
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
    const url = (block.settings["url"] as string) || "";
    const ratio = (block.settings["aspectRatio"] as string) || "16:9";
    const autoplay = (block.settings["autoplay"] as string) === "yes";

    let embedUrl: string | null = null;
    if (url) {
      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      else {
        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        else if (url.includes("embed") || url.includes("player")) embedUrl = url;
      }
    }

    if (!embedUrl && !showEditorChrome) {
      return null;
    }

    const paddingBottom = ratio === "4:3" ? "75%" : ratio === "1:1" ? "100%" : "56.25%";
    const resolvedStyles: React.CSSProperties = {
      ...(mediaStyles ?? {}),
      paddingBottom,
    };

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
        >
          {embedUrl ? (
            <div className="cms-media relative w-full" style={resolvedStyles}>
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`${embedUrl}${autoplay ? "?autoplay=1&mute=1" : ""}`}
                title="Embedded video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : showEditorChrome ? (
            <div
              className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
              style={resolvedStyles}
            >
              Enter a video URL
            </div>
          ) : null}
        </div>
      )
    );
  }

  // AppEmbed block
  if (block.type === "AppEmbed") {
    const appId = (block.settings["appId"] as AppEmbedId) || "chatbot";
    const title = (block.settings["title"] as string) || "";
    const embedUrl = (block.settings["embedUrl"] as string) || "";
    const height = (block.settings["height"] as number) || 420;
    const appLabel = APP_EMBED_OPTIONS.find((option: AppEmbedOption) => option.id === appId)?.label ?? "App";
    if (!embedUrl && !showEditorChrome) {
      return null;
    }

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full text-left transition overflow-hidden ${contained ? "max-w-full" : ""}`,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
        >
          <div className="cms-hover-card w-full rounded-lg border border-border/40 bg-gray-900/40 p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold text-white">{title || appLabel}</div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">App embed</div>
            </div>
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={title || appLabel}
                className="w-full rounded-md border border-border/40 bg-black"
                style={{ height }}
              />
            ) : showEditorChrome ? (
              <div
                className="flex items-center justify-center rounded-md border border-dashed border-border/40 bg-gray-800/40 text-xs text-gray-400"
                style={{ height }}
              >
                Provide an embed URL to render the {appLabel} app here.
              </div>
            ) : null}
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
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
        >
          <hr
            className="my-2 border-0"
            style={{ borderTopStyle: style as "solid" | "dashed" | "dotted", borderTopWidth: `${thickness}px`, borderTopColor: color }}
          />
        </div>
      )
    );
  }

  // SocialLinks block
  if (block.type === "SocialLinks") {
    const platforms = (block.settings["platforms"] as string) || "";
    const links = platforms.split(",").map((l: string) => l.trim()).filter(Boolean);
    if (links.length === 0 && !showEditorChrome) {
      return null;
    }

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `text-left transition ${contained ? "max-w-full" : ""}`,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
        >
          {links.length === 0 ? (
            showEditorChrome ? (
              <p className="text-sm text-gray-500">Add social media URLs in settings</p>
            ) : null
          ) : (
            <div className="flex items-center gap-4">
              {links.map((link: string, idx: number) => {
                let label = "Link";
                try {
                  label = new URL(link).hostname.replace("www.", "").split(".")[0] ?? "Link";
                } catch {
                  // keep default
                }
                return (
                  <a
                    key={`${link}-${idx}`}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-gray-600 p-2 text-gray-400 transition hover:text-white hover:border-white"
                  >
                    <span className="text-xs font-medium uppercase">{label.slice(0, 2)}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )
    );
  }

  // Icon block
  if (block.type === "Icon") {
    const iconName = (block.settings["iconName"] as string) || "Star";
    const iconSize = (block.settings["iconSize"] as number) || 24;
    const iconColor = (block.settings["iconColor"] as string) || "#ffffff";

    return (
      wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `text-left transition ${contained ? "max-w-full" : ""}`,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
            }`
          )}
        >
          <div className="flex items-center justify-center">
            <span style={{ fontSize: `${iconSize}px`, color: iconColor }} role="img" aria-label={iconName}>
              {iconName === "Star" ? "★" : iconName === "Heart" ? "♥" : iconName === "Check" ? "✓" : iconName === "Arrow" ? "→" : "●"}
            </span>
          </div>
        </div>
      )
    );
  }

  // Fallback for unknown block types
  if (!showEditorChrome) {
    return null;
  }

  return (
    wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `flex w-full items-center gap-2 text-left text-sm transition overflow-hidden ${contained ? "max-w-full" : ""}`,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : "ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50"
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
  selectedNodeId?: string | null | undefined;
  isInspecting?: boolean | undefined;
  inspectorSettings: InspectorSettings;
  hoveredNodeId?: string | null | undefined;
  onSelect: (nodeId: string) => void;
  sectionId: string;
  sectionType?: string | undefined;
  sectionZone?: PageZone | undefined;
  columnId?: string | undefined;
  stretch?: boolean | undefined;
  onHoverNode?: ((nodeId: string | null) => void) | undefined;
  onOpenMedia?: ((target: MediaReplaceTarget) => void) | undefined;
  mediaStyles?: React.CSSProperties | null | undefined;
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
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;

  const stretchClass = stretch ? "h-full" : "";
  const stretchStyle = stretch ? { height: "100%" } : undefined;

  return (
    <div
      className={`flex flex-col gap-4 ${imageFirst ? "md:flex-row" : "md:flex-row-reverse"} ${stretchClass}`}
      style={stretchStyle}
    >
      <div className="cms-media relative w-full md:w-2/5" style={mediaStyles ?? undefined}>
        {blockImage ? (
          <NextImage
            src={blockImage}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
            unoptimized
          />
        ) : showEditorChrome ? (
          <div className="flex min-h-[120px] w-full items-center justify-center bg-gray-800">
            <ImageIcon className="size-10 text-gray-600" />
          </div>
        ) : null}
      </div>
      <div className="flex w-full flex-col justify-center gap-3 md:w-3/5">
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
        ) : showEditorChrome ? (
          <p className="text-gray-500">Add content blocks</p>
        ) : null}
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

  const stretchStyle = stretch ? { height: "100%" } : undefined;

  return (
    <div
      className="cms-media relative min-h-[200px] overflow-hidden"
      style={{ ...(mediaStyles ?? {}), ...(stretchStyle ?? {}) }}
    >
      {blockImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${blockImage})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800" />
      )}
      <div className="relative z-10 flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
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
          <p className="text-gray-400">Hero banner</p>
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
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;

  if (children.length === 0 && !showEditorChrome) {
    return null;
  }

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
      ) : showEditorChrome ? (
        <p className="text-gray-500">Rich text section</p>
      ) : null}
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
  const blockGap = getSpacingValue(block.settings["blockGap"]);
  const direction = (block.settings["layoutDirection"] as string) || "row";
  const wrapSetting = (block.settings["wrap"] as string) || "wrap";
  const justifySetting = (block.settings["justifyContent"] as string) || "inherit";
  const justifyContent =
    resolveJustifyContent(justifySetting === "inherit" ? alignment : justifySetting) ??
    (alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start");
  const alignItems = resolveAlignItems(block.settings["alignItems"]) ?? "center";
  const flexDirClass = direction === "column" ? "flex-col" : "flex-row";
  const wrapClass = direction === "column" ? "" : wrapSetting === "nowrap" ? "flex-nowrap" : "flex-wrap";
  const shouldStretchChildren = stretch && children.length === 1;
  const blockSelector = getCustomCssSelector(block.id);
  const blockCustomCss = buildScopedCustomCss(block.settings["customCss"], blockSelector);

  return (
    <div
      style={{ ...blockStyles, ...(stretchStyle ?? {}) }}
      className={`${stretch ? "h-full" : ""} cms-node-${block.id}`.trim()}
    >
      {blockCustomCss ? <style data-cms-custom-css={block.id}>{blockCustomCss}</style> : null}
      <div
        className={`flex ${flexDirClass} ${wrapClass}`}
        style={{ gap: `${blockGap}px`, justifyContent, alignItems }}
      >
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
            stretch={shouldStretchChildren}
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
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
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

  if (letters.length === 0 && !showEditorChrome) {
    return null;
  }

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
      ) : showEditorChrome ? (
        <div className="text-xs text-gray-600">Text atoms</div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Carousel preview (inside columns)
// ---------------------------------------------------------------------------

// Helper to parse boolean settings that may be boolean or string "true"/"false"
const parseCarouselBoolSetting = (value: unknown, defaultValue: boolean = true): boolean => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
};

function PreviewCarouselBlock({
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
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const frames = (block.blocks ?? []).filter((b: BlockInstance) => b.type === "CarouselFrame");
  const [currentIndex, setCurrentIndex] = useState(0);

  const transitionType = (block.settings["transitionType"] as string) || "slide";
  const transitionDuration = (block.settings["transitionDuration"] as number) || 500;
  const heightMode = (block.settings["heightMode"] as string) || "auto";
  const fixedHeight = (block.settings["height"] as number) || 400;
  const showNavigation = parseCarouselBoolSetting(block.settings["showNavigation"], true);
  const showIndicators = parseCarouselBoolSetting(block.settings["showIndicators"], true);
  const loop = parseCarouselBoolSetting(block.settings["loop"], true);

  const frameCount = frames.length;

  const goToNext = useCallback((): void => {
    if (frameCount === 0) return;
    if (!loop && currentIndex >= frameCount - 1) return;
    setCurrentIndex((prev: number) => (prev + 1) % frameCount);
  }, [frameCount, loop, currentIndex]);

  const goToPrev = useCallback((): void => {
    if (frameCount === 0) return;
    if (!loop && currentIndex <= 0) return;
    setCurrentIndex((prev: number) => (prev - 1 + frameCount) % frameCount);
  }, [frameCount, loop, currentIndex]);

  const goToIndex = useCallback((index: number): void => {
    if (index === currentIndex) return;
    setCurrentIndex(index);
  }, [currentIndex]);

  const stretchStyle = stretch ? { height: "100%" } : undefined;
  const containerStyle: React.CSSProperties = {
    ...(stretchStyle ?? {}),
    ...(heightMode === "fixed" ? { height: `${fixedHeight}px` } : {}),
  };

  if (frameCount === 0) {
    if (!showEditorChrome) return null;
    return (
      <div
        className="flex items-center justify-center p-8 text-gray-400 border border-dashed border-gray-600 rounded"
        style={containerStyle}
      >
        No carousel frames
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={containerStyle}>
      {/* Frames container */}
      <div
        className="relative w-full h-full"
        style={{
          ...(transitionType === "slide"
            ? {
                display: "flex",
                transform: `translateX(-${currentIndex * 100}%)`,
                transition: `transform ${transitionDuration}ms ease-in-out`,
              }
            : {}),
        }}
      >
        {frames.map((frame: BlockInstance, index: number) => {
          const isActive = index === currentIndex;
          const frameSettings = frame.settings ?? {};
          const backgroundColor = (frameSettings["backgroundColor"] as string) || "";
          const contentAlignment = (frameSettings["contentAlignment"] as string) || "center";
          const verticalAlignment = (frameSettings["verticalAlignment"] as string) || "center";
          const paddingTop = (frameSettings["paddingTop"] as number) || 0;
          const paddingBottom = (frameSettings["paddingBottom"] as number) || 0;
          const paddingLeft = (frameSettings["paddingLeft"] as number) || 0;
          const paddingRight = (frameSettings["paddingRight"] as number) || 0;

          const frameStyle: React.CSSProperties = {
            backgroundColor: backgroundColor || undefined,
            padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
            ...(transitionType === "slide"
              ? { minWidth: "100%", flexShrink: 0 }
              : {
                  position: index === 0 ? "relative" : "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: transitionType === "fade" ? (isActive ? 1 : 0) : isActive ? 1 : 0,
                  visibility: isActive ? "visible" : "hidden",
                  transition: transitionType === "fade" ? `opacity ${transitionDuration}ms ease-in-out` : undefined,
                }),
          };

          const alignmentClass =
            contentAlignment === "center"
              ? "items-center justify-center"
              : contentAlignment === "right"
                ? "items-end justify-end"
                : "items-start justify-start";

          const verticalAlignmentClass =
            verticalAlignment === "center"
              ? "justify-center"
              : verticalAlignment === "bottom"
                ? "justify-end"
                : "justify-start";

          const frameChildren = frame.blocks ?? [];

          return (
            <div
              key={frame.id}
              className={`flex flex-col ${alignmentClass} ${verticalAlignmentClass}`}
              style={frameStyle}
            >
              {frameChildren.map((child: BlockInstance) => (
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
                  parentBlockId={frame.id}
                  onOpenMedia={onOpenMedia}
                  mediaStyles={mediaStyles}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      {showNavigation && frameCount > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrev}
            disabled={!loop && currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={goToNext}
            disabled={!loop && currentIndex === frameCount - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next slide"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && frameCount > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {frames.map((_: BlockInstance, index: number) => (
            <button
              key={index}
              type="button"
              onClick={(): void => goToIndex(index)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slideshow preview (inside columns)
// ---------------------------------------------------------------------------

function PreviewSlideshowBlock({
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
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const transition = (block.settings["transition"] as string) || "fade";
  const showArrows = (block.settings["showArrows"] as string) !== "no";
  const showDots = (block.settings["showDots"] as string) !== "no";
  const heightMode = (block.settings["heightMode"] as string) || "auto";
  const height = (block.settings["height"] as number) || 360;
  const frameBlocks = (block.blocks ?? []).filter((b: BlockInstance) => b.type === "SlideshowFrame");
  const legacyBlocks = (block.blocks ?? []).filter((b: BlockInstance) => b.type !== "SlideshowFrame");
  const frames =
    frameBlocks.length > 0
      ? [
          ...frameBlocks,
          ...legacyBlocks.map((b: BlockInstance) => ({
            id: b.id,
            type: "SlideshowFrame",
            settings: {},
            blocks: [b],
          })),
        ]
      : legacyBlocks.map((b: BlockInstance) => ({
          id: b.id,
          type: "SlideshowFrame",
          settings: {},
          blocks: [b],
        }));
  const firstFrame = frames[0];
  const frameChildren = firstFrame?.blocks ?? [];
  const frameSettings = (firstFrame?.settings ?? {}) as Record<string, unknown>;
  const backgroundColor = (frameSettings["backgroundColor"] as string) || "";
  const contentAlignment = (frameSettings["contentAlignment"] as string) || "center";
  const verticalAlignment = (frameSettings["verticalAlignment"] as string) || "center";
  const paddingTop = (frameSettings["paddingTop"] as number) || 0;
  const paddingBottom = (frameSettings["paddingBottom"] as number) || 0;
  const paddingLeft = (frameSettings["paddingLeft"] as number) || 0;
  const paddingRight = (frameSettings["paddingRight"] as number) || 0;
  const frameStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || undefined,
    padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
    alignItems:
      contentAlignment === "center"
        ? "center"
        : contentAlignment === "right"
          ? "flex-end"
          : "flex-start",
    justifyContent:
      verticalAlignment === "center"
        ? "center"
        : verticalAlignment === "bottom"
          ? "flex-end"
          : "flex-start",
  };
  const slideHeightStyle: React.CSSProperties | undefined =
    heightMode === "fixed" && height > 0 ? { height: `${height}px` } : undefined;

  if (frames.length === 0 && !showEditorChrome) {
    return null;
  }

  return (
    <div className={`relative w-full ${stretch ? "h-full" : ""}`}>
      {frames.length === 0 ? (
        showEditorChrome ? (
          <div className="flex min-h-[120px] items-center justify-center text-sm text-gray-500">
            Add blocks to create slideshow slides
          </div>
        ) : null
      ) : (
        <>
          <div className="relative overflow-hidden rounded-lg min-h-[200px]" style={slideHeightStyle}>
            {firstFrame && (
              <div
                className={`${transition === "fade" ? "absolute inset-0" : "absolute inset-0"} flex items-center justify-center`}
                style={{ opacity: 1 }}
              >
                <div className="flex h-full w-full flex-col" style={frameStyle}>
                  {frameChildren.length > 0 ? (
                    frameChildren.map((child: BlockInstance) => (
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
                        parentBlockId={firstFrame?.id}
                        onOpenMedia={onOpenMedia}
                        mediaStyles={mediaStyles}
                      />
                    ))
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                      Empty slide
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {frames.length > 1 && (showArrows || showDots) && (
            <div className="mt-4 flex items-center justify-center gap-4">
              {showArrows && (
                <button
                  type="button"
                  className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              {showDots && (
                <div className="flex gap-2">
                  {frames.map((_: BlockInstance, idx: number) => (
                    <div
                      key={idx}
                      className={`size-2 rounded-full transition ${idx === 0 ? "bg-white" : "bg-gray-600"}`}
                    />
                  ))}
                </div>
              )}
              {showArrows && (
                <button
                  type="button"
                  className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>
          )}
        </>
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
  const objectFit = (settings["objectFit"] as React.CSSProperties["objectFit"]) || "cover";
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
  const clipOverflow = ((): boolean => {
    const raw = settings["clipOverflow"];
    if (raw === true) return true;
    if (typeof raw === "string") return raw.toLowerCase() === "true";
    return false;
  })();

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
  if (clipOverflow) {
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

function renderBackgroundImageLayer(
  settings?: Record<string, unknown>,
  mediaStyles?: React.CSSProperties | null
): React.ReactNode {
  if (!settings) return null;
  const src = (settings["src"] as string) || "";
  if (!src) return null;
  const alt = (settings["alt"] as string) || "";
  const presentation = buildImageElementPresentation(settings, mediaStyles);
  const wrapperStyles: React.CSSProperties = {
    ...presentation.wrapperStyles,
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  };
  delete (wrapperStyles as { aspectRatio?: string }).aspectRatio;
  const imageStyles: React.CSSProperties = {
    ...presentation.imageStyles,
    display: "block",
    height: "100%",
  };

  return (
    <div className="absolute inset-0 z-0" style={wrapperStyles}>
      <NextImage src={src} alt={alt} fill style={imageStyles} />
      {presentation.hasOverlay && (
        <div className="pointer-events-none absolute inset-0" style={presentation.overlayStyles} />
      )}
    </div>
  );
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
