import React from "react";
import type { BlockInstance } from "../../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import { getSectionContainerClass, getSectionStyles, type ColorSchemeColors } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { FrontendImageWithTextBlock } from "./FrontendImageWithTextBlock";
import { FrontendHeroBlock } from "./FrontendHeroBlock";
import { GsapAnimationWrapper } from "../GsapAnimationWrapper";

// Section-type blocks that need special rendering inside columns
const SECTION_BLOCK_TYPES = new Set(["ImageWithText", "Hero"]);

interface FrontendGridSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors>;
  layout?: { fullWidth?: boolean };
}

export function FrontendGridSection({ settings, blocks, colorSchemes, layout }: FrontendGridSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const columns = blocks.filter((b: BlockInstance) => b.type === "Column");
  const columnsPerRow = Math.max(1, (settings["columns"] as number) ?? 1);
  const rows = Math.max(1, (settings["rows"] as number) ?? 1);
  const gap = (settings["gap"] as string) || "medium";

  const gapClass =
    gap === "none" ? "gap-0"
    : gap === "small" ? "gap-4"
    : gap === "large" ? "gap-12"
    : "gap-8"; // medium

  if (columns.length === 0) return null;

  return (
    <section style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
        <div className={`flex flex-col ${gapClass}`}>
          {Array.from({ length: rows }, (_, rowIndex: number) => {
            const start = rowIndex * columnsPerRow;
            const rowColumns = columns.slice(start, start + columnsPerRow);
            if (rowColumns.length === 0) return null;
            return (
              <div
                key={`grid-row-${rowIndex}`}
                className={`grid ${gapClass}`}
                style={{ gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)` }}
              >
                {rowColumns.map((column: BlockInstance) => (
                  <ColumnRenderer key={column.id} column={column} />
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

function ColumnRenderer({ column }: { column: BlockInstance }): React.ReactNode {
  const children = column.blocks ?? [];
  const animConfig = column.settings["gsapAnimation"] as GsapAnimationConfig | undefined;

  return (
    <GsapAnimationWrapper config={animConfig}>
      <div className="space-y-4">
        {children.map((block: BlockInstance) => {
          if (SECTION_BLOCK_TYPES.has(block.type)) {
            return <SectionBlockRenderer key={block.id} block={block} />;
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

function SectionBlockRenderer({ block }: { block: BlockInstance }): React.ReactNode {
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

  return null;
}
