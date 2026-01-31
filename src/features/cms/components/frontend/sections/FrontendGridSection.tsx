import React from "react";
import type { BlockInstance } from "../../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import { getSectionStyles } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { FrontendImageWithTextBlock } from "./FrontendImageWithTextBlock";
import { FrontendHeroBlock } from "./FrontendHeroBlock";
import { GsapAnimationWrapper } from "../GsapAnimationWrapper";

// Section-type blocks that need special rendering inside columns
const SECTION_BLOCK_TYPES = new Set(["ImageWithText", "Hero"]);

interface FrontendGridSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendGridSection({ settings, blocks }: FrontendGridSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings);
  const columns = blocks.filter((b: BlockInstance) => b.type === "Column");
  const gap = (settings["gap"] as string) || "medium";

  const gapClass =
    gap === "none" ? "gap-0"
    : gap === "small" ? "gap-4"
    : gap === "large" ? "gap-12"
    : "gap-8"; // medium

  if (columns.length === 0) return null;

  return (
    <section style={sectionStyles}>
      <div className="container mx-auto px-4 md:px-6">
        <div
          className={`grid ${gapClass}`}
          style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
        >
          {columns.map((column: BlockInstance) => (
            <ColumnRenderer key={column.id} column={column} />
          ))}
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
