
import type { BlockInstance } from "../../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import { getSectionContainerClass, getSectionStyles, getTextAlign, type ColorSchemeColors } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { FrontendImageWithTextBlock } from "./FrontendImageWithTextBlock";
import { FrontendHeroBlock } from "./FrontendHeroBlock";
import { GsapAnimationWrapper } from "../GsapAnimationWrapper";

// Section-type blocks that need special rendering inside columns
const SECTION_BLOCK_TYPES = new Set(["ImageWithText", "Hero", "RichText", "Block", "TextAtom"]);

interface FrontendGridSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean | undefined } | undefined;
}

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

function buildImageElementPresentation(
  settings: Record<string, unknown>
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

  const wrapperStyles: React.CSSProperties = {
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

function renderBackgroundImageLayer(settings?: Record<string, unknown>): React.ReactNode {
  if (!settings) return null;
  const src = (settings["src"] as string) || "";
  if (!src) return null;
  const alt = (settings["alt"] as string) || "";
  const presentation = buildImageElementPresentation(settings);
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={imageStyles} />
      {presentation.hasOverlay && (
        <div className="pointer-events-none absolute inset-0" style={presentation.overlayStyles} />
      )}
    </div>
  );
}

export function FrontendGridSection({ settings, blocks, colorSchemes, layout }: FrontendGridSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const rowBlocks = blocks.filter((b: BlockInstance) => b.type === "Row");
  const directColumns = blocks.filter((b: BlockInstance) => b.type === "Column");
  const sectionGap = (settings["gap"] as string) || "medium";
  const sectionGapClass = getGapClass(sectionGap);
  const gridBackgroundSettings = settings["backgroundImage"] as Record<string, unknown> | undefined;
  const hasGridBackground = Boolean((gridBackgroundSettings?.["src"] as string) || "");

  const rowsToRender: BlockInstance[] =
    rowBlocks.length > 0
      ? rowBlocks
      : directColumns.length > 0
      ? [{ id: `row-virtual`, type: "Row", settings: {}, blocks: directColumns }]
      : [];

  if (rowsToRender.length === 0) return null;

  return (
    <section style={sectionStyles} className={`relative ${hasGridBackground ? "overflow-hidden" : ""}`}>
      {hasGridBackground && renderBackgroundImageLayer(gridBackgroundSettings)}
      <div className="relative z-10">
        <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
          <div className={`flex flex-col ${sectionGapClass}`}>
            {rowsToRender.map((row: BlockInstance, rowIndex: number) => {
              const rowColumns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === "Column");
              if (rowColumns.length === 0) return null;
              const rowGapValue = resolveGapValue(row.settings?.["gap"], sectionGap);
              const rowGapClass = getGapClass(rowGapValue);
              const rowStyles = getSectionStyles(row.settings ?? {}, colorSchemes);
              const rowHeightMode = (row.settings?.["heightMode"] as string) || "inherit";
              const rowHeight = (row.settings?.["height"] as number) || 0;
              const rowHeightStyle =
                rowHeightMode === "fixed" && rowHeight > 0 ? { height: `${rowHeight}px` } : undefined;
              const rowBackgroundSettings = row.settings?.["backgroundImage"] as Record<string, unknown> | undefined;
              const hasRowBackground = Boolean((rowBackgroundSettings?.["src"] as string) || "");
              return (
                <div
                  key={`grid-row-${row.id}-${rowIndex}`}
                  className={`relative ${hasRowBackground ? "overflow-hidden" : ""}`}
                  style={{ ...rowStyles, ...(rowHeightStyle ?? {}) }}
                >
                  {hasRowBackground && renderBackgroundImageLayer(rowBackgroundSettings)}
                  <div
                    className={`relative z-10 grid ${rowGapClass}`}
                    style={{
                      gridTemplateColumns: `repeat(${rowColumns.length}, 1fr)`,
                      ...(rowHeightMode === "fixed" && rowHeight > 0 ? { height: "100%" } : {}),
                    }}
                  >
                    {rowColumns.map((column: BlockInstance) => (
                      <ColumnRenderer
                        key={column.id}
                        column={column}
                        colorSchemes={colorSchemes}
                        rowHeightMode={rowHeightMode}
                        rowHeight={rowHeight}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Column renderer
// ---------------------------------------------------------------------------

function ColumnRenderer({
  column,
  colorSchemes,
  rowHeightMode,
  rowHeight,
}: {
  column: BlockInstance;
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  rowHeightMode?: string | undefined;
  rowHeight?: number | undefined;
}): React.ReactNode {
  const children = column.blocks ?? [];
  const animConfig = column.settings["gsapAnimation"] as GsapAnimationConfig | undefined;
  const isSingleBlock = children.length === 1;
  const columnHeightMode = (column.settings["heightMode"] as string) || "inherit";
  const columnHeight = (column.settings["height"] as number) || 0;
  const shouldStretch = isSingleBlock && (columnHeightMode === "fixed" || rowHeightMode === "fixed");
  const columnBackgroundSettings = column.settings["backgroundImage"] as Record<string, unknown> | undefined;
  const hasColumnBackground = Boolean((columnBackgroundSettings?.["src"] as string) || "");
  const columnStyle: React.CSSProperties = {};
  if (columnHeightMode === "fixed" && columnHeight > 0) {
    columnStyle.height = `${columnHeight}px`;
  } else if (rowHeightMode === "fixed" && rowHeight && rowHeight > 0) {
    columnStyle.height = "100%";
  }

  return (
    <GsapAnimationWrapper config={animConfig}>
      <div className={`relative ${hasColumnBackground ? "overflow-hidden" : ""}`} style={columnStyle}>
        {hasColumnBackground && renderBackgroundImageLayer(columnBackgroundSettings)}
        <div className={`relative z-10 flex flex-col ${shouldStretch ? "h-full" : "gap-4"}`}>
          {children.map((block: BlockInstance, blockIndex: number) => {
            const minHeight = getBlockMinHeight(block.type);
            const wrapperStyle: React.CSSProperties = {
              ...(shouldStretch ? { height: "100%" } : { minHeight: `${minHeight}px` }),
              position: "relative",
              zIndex: children.length - blockIndex,
            };
            if (SECTION_BLOCK_TYPES.has(block.type)) {
              return (
                <div key={block.id} className={shouldStretch ? "flex-1" : ""} style={wrapperStyle}>
                  <SectionBlockRenderer block={block} colorSchemes={colorSchemes} stretch={shouldStretch} />
                </div>
              );
            }
            return (
              <div key={block.id} className={shouldStretch ? "flex-1" : ""} style={wrapperStyle}>
                <FrontendBlockRenderer block={block} stretch={shouldStretch} />
              </div>
            );
          })}
        </div>
      </div>
    </GsapAnimationWrapper>
  );
}

// ---------------------------------------------------------------------------
// Section-type block renderer (ImageWithText, Hero inside columns)
// ---------------------------------------------------------------------------

function SectionBlockRenderer({
  block,
  colorSchemes,
  stretch = false,
}: {
  block: BlockInstance;
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  stretch?: boolean | undefined;
}): React.ReactNode {
  const children = block.blocks ?? [];
  const animConfig = block.settings["gsapAnimation"] as GsapAnimationConfig | undefined;
  const stretchClass = stretch ? "h-full" : "";
  const stretchStyle = stretch ? { height: "100%" } : undefined;

  if (block.type === "ImageWithText") {
    return (
      <GsapAnimationWrapper config={animConfig}>
        <div className={stretchClass} style={stretchStyle}>
          <FrontendImageWithTextBlock settings={block.settings} blocks={children} />
        </div>
      </GsapAnimationWrapper>
    );
  }
  if (block.type === "Hero") {
    return (
      <GsapAnimationWrapper config={animConfig}>
        <div className={stretchClass} style={stretchStyle}>
          <FrontendHeroBlock settings={block.settings} blocks={children} />
        </div>
      </GsapAnimationWrapper>
    );
  }
  if (block.type === "RichText") {
    const sectionStyles = getSectionStyles(block.settings, colorSchemes);
    return (
      <GsapAnimationWrapper config={animConfig}>
        <div style={{ ...sectionStyles, ...(stretchStyle ?? {}) }} className={stretchClass}>
          <div className="space-y-4">
            {children.length > 0 ? (
              children.map((child: BlockInstance) => (
                <FrontendBlockRenderer key={child.id} block={child} />
              ))
            ) : (
              <p className="text-gray-500">Rich text section</p>
            )}
          </div>
        </div>
      </GsapAnimationWrapper>
    );
  }
  if (block.type === "Block") {
    const sectionStyles = {
      ...getSectionStyles(block.settings, colorSchemes),
      ...getTextAlign(block.settings["contentAlignment"]),
    };
    const alignment = (block.settings["contentAlignment"] as string) || "left";
    const blockGap = typeof block.settings["blockGap"] === "number" ? block.settings["blockGap"] : 0;
    const alignmentClass =
      alignment === "center"
        ? "justify-center"
        : alignment === "right"
          ? "justify-end"
          : "justify-start";
    const shouldStretchChildren = stretch && children.length === 1;
    return (
      <GsapAnimationWrapper config={animConfig}>
        <div style={{ ...sectionStyles, ...(stretchStyle ?? {}) }} className={stretchClass}>
          <div className={`flex flex-wrap items-center ${alignmentClass}`} style={{ gap: `${blockGap}px` }}>
            {children.map((child: BlockInstance) => (
              <FrontendBlockRenderer key={child.id} block={child} stretch={shouldStretchChildren} />
            ))}
          </div>
        </div>
      </GsapAnimationWrapper>
    );
  }
  if (block.type === "TextAtom") {
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
      <GsapAnimationWrapper config={animConfig}>
        <div style={{ ...containerStyle, ...(stretchStyle ?? {}) }} className={stretchClass}>
          {letters.length > 0 ? (
            letters.map((letter: BlockInstance) => (
              <FrontendBlockRenderer key={letter.id} block={letter} />
            ))
          ) : (
            <span className="text-sm text-gray-400">Text atoms</span>
          )}
        </div>
      </GsapAnimationWrapper>
    );
  }

  return null;
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
    WebkitMaskImage: gradient,
    maskImage: gradient,
  };
}
