import React from "react";
import type { BlockInstance } from "../../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import { getSectionContainerClass, getSectionStyles, getTextAlign, type ColorSchemeColors } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { FrontendImageWithTextBlock } from "./FrontendImageWithTextBlock";
import { FrontendHeroBlock } from "./FrontendHeroBlock";
import { GsapAnimationWrapper } from "../GsapAnimationWrapper";

// Section-type blocks that need special rendering inside columns
const SECTION_BLOCK_TYPES = new Set(["ImageWithText", "Hero", "RichText", "Block"]);

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
            return (
              <div
                key={`grid-row-${row.id}-${rowIndex}`}
                className={`grid ${rowGapClass}`}
                style={{ ...rowStyles, gridTemplateColumns: `repeat(${rowColumns.length}, 1fr)` }}
              >
                {rowColumns.map((column: BlockInstance) => (
                  <ColumnRenderer key={column.id} column={column} colorSchemes={colorSchemes} />
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
}: {
  column: BlockInstance;
  colorSchemes?: Record<string, ColorSchemeColors>;
}): React.ReactNode {
  const children = column.blocks ?? [];
  const animConfig = column.settings["gsapAnimation"] as GsapAnimationConfig | undefined;

  return (
    <GsapAnimationWrapper config={animConfig}>
      <div className="space-y-4">
        {children.map((block: BlockInstance) => {
          if (SECTION_BLOCK_TYPES.has(block.type)) {
            return <SectionBlockRenderer key={block.id} block={block} colorSchemes={colorSchemes} />;
          }
          return <FrontendBlockRenderer key={block.id} block={block} />;
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
}: {
  block: BlockInstance;
  colorSchemes?: Record<string, ColorSchemeColors>;
}): React.ReactNode {
  const children = block.blocks ?? [];
  const animConfig = block.settings["gsapAnimation"] as GsapAnimationConfig | undefined;

  if (block.type === "ImageWithText") {
    return (
      <GsapAnimationWrapper config={animConfig}>
        <FrontendImageWithTextBlock settings={block.settings} blocks={children} />
      </GsapAnimationWrapper>
    );
  }
  if (block.type === "Hero") {
    return (
      <GsapAnimationWrapper config={animConfig}>
        <FrontendHeroBlock settings={block.settings} blocks={children} />
      </GsapAnimationWrapper>
    );
  }
  if (block.type === "RichText") {
    const sectionStyles = getSectionStyles(block.settings, colorSchemes);
    return (
      <GsapAnimationWrapper config={animConfig}>
        <div style={sectionStyles}>
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
    const alignmentClass =
      alignment === "center"
        ? "justify-center"
        : alignment === "right"
          ? "justify-end"
          : "justify-start";
    return (
      <GsapAnimationWrapper config={animConfig}>
        <div style={sectionStyles}>
          <div className={`flex flex-wrap items-center gap-3 ${alignmentClass}`}>
            {children.length > 0 ? (
              children.map((child: BlockInstance) => (
                <FrontendBlockRenderer key={child.id} block={child} />
              ))
            ) : (
              <p className="text-sm text-gray-400">Block</p>
            )}
          </div>
        </div>
      </GsapAnimationWrapper>
    );
  }

  return null;
}
