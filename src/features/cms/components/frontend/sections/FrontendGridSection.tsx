
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
  colorSchemes?: Record<string, ColorSchemeColors>;
  layout?: { fullWidth?: boolean };
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

export function FrontendGridSection({ settings, blocks, colorSchemes, layout }: FrontendGridSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const rowBlocks = blocks.filter((b: BlockInstance) => b.type === "Row");
  const directColumns = blocks.filter((b: BlockInstance) => b.type === "Column");
  const sectionGap = (settings["gap"] as string) || "medium";
  const sectionGapClass = getGapClass(sectionGap);

  const rowsToRender: BlockInstance[] =
    rowBlocks.length > 0
      ? rowBlocks
      : directColumns.length > 0
      ? [{ id: `row-virtual`, type: "Row", settings: {}, blocks: directColumns }]
      : [];

  if (rowsToRender.length === 0) return null;

  return (
    <section style={sectionStyles}>
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
            return (
              <div
                key={`grid-row-${row.id}-${rowIndex}`}
                className={`grid ${rowGapClass}`}
                style={{ ...rowStyles, ...(rowHeightStyle ?? {}), gridTemplateColumns: `repeat(${rowColumns.length}, 1fr)` }}
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
            );
          })}
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
  colorSchemes?: Record<string, ColorSchemeColors>;
  rowHeightMode?: string;
  rowHeight?: number;
}): React.ReactNode {
  const children = column.blocks ?? [];
  const animConfig = column.settings["gsapAnimation"] as GsapAnimationConfig | undefined;
  const isSingleBlock = children.length === 1;
  const columnHeightMode = (column.settings["heightMode"] as string) || "inherit";
  const columnHeight = (column.settings["height"] as number) || 0;
  const shouldStretch = isSingleBlock && (columnHeightMode === "fixed" || rowHeightMode === "fixed");
  const columnStyle: React.CSSProperties = {};
  if (columnHeightMode === "fixed" && columnHeight > 0) {
    columnStyle.height = `${columnHeight}px`;
  } else if (rowHeightMode === "fixed" && rowHeight && rowHeight > 0) {
    columnStyle.height = "100%";
  }

  return (
    <GsapAnimationWrapper config={animConfig}>
      <div className={`flex flex-col ${shouldStretch ? "h-full" : "gap-4"}`} style={columnStyle}>
        {children.map((block: BlockInstance) => {
          const minHeight = getBlockMinHeight(block.type);
          const wrapperStyle: React.CSSProperties = { minHeight: `${minHeight}px` };
          if (shouldStretch) wrapperStyle.height = "100%";
          if (SECTION_BLOCK_TYPES.has(block.type)) {
            return (
              <div key={block.id} className={shouldStretch ? "flex-1" : ""} style={wrapperStyle}>
                <SectionBlockRenderer block={block} colorSchemes={colorSchemes} stretch={shouldStretch} />
              </div>
            );
          }
          return (
            <div key={block.id} className={shouldStretch ? "flex-1" : ""} style={wrapperStyle}>
              <FrontendBlockRenderer block={block} />
            </div>
          );
        })}
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
  colorSchemes?: Record<string, ColorSchemeColors>;
  stretch?: boolean;
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
    return (
      <GsapAnimationWrapper config={animConfig}>
        <div style={{ ...sectionStyles, ...(stretchStyle ?? {}) }} className={stretchClass}>
          <div className={`flex flex-wrap items-center ${alignmentClass}`} style={{ gap: `${blockGap}px` }}>
            {children.map((child: BlockInstance) => (
              <FrontendBlockRenderer key={child.id} block={child} />
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
