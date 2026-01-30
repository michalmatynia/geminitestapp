import React from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { getSectionStyles } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";

interface FrontendRichTextSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendRichTextSection({ settings, blocks }: FrontendRichTextSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings);

  return (
    <section style={sectionStyles}>
      <div className="container mx-auto max-w-3xl px-4 md:px-6">
        <div className="space-y-4">
          {blocks.map((block: BlockInstance) => (
            <FrontendBlockRenderer key={block.id} block={block} />
          ))}
          {blocks.length === 0 && (
            <p className="text-gray-500">Rich text section</p>
          )}
        </div>
      </div>
    </section>
  );
}
