import React from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { getSectionStyles, getTextAlign } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";

interface FrontendAnnouncementBarSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendAnnouncementBarSection({
  settings,
  blocks,
}: FrontendAnnouncementBarSectionProps): React.ReactNode {
  const sectionStyles = {
    ...getSectionStyles(settings),
    ...getTextAlign(settings["contentAlignment"]),
  };
  const alignment = (settings["contentAlignment"] as string) || "center";
  const alignmentClass =
    alignment === "left"
      ? "justify-start"
      : alignment === "right"
        ? "justify-end"
        : "justify-center";

  return (
    <section className="w-full" style={sectionStyles}>
      <div className="container mx-auto max-w-6xl px-4 md:px-6">
        <div className={`flex flex-wrap items-center gap-3 ${alignmentClass}`}>
          {blocks.length === 0 ? (
            <p className="text-sm text-gray-400">Announcement bar</p>
          ) : (
            blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
