import React from "react";
import type { BlockInstance } from "../../../types/page-builder";
import { getSectionStyles } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";

interface FrontendHeroSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendHeroSection({ settings, blocks }: FrontendHeroSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings);
  const image = settings["image"] as string | undefined;
  const imageHeight = (settings["imageHeight"] as string) || "large";

  const heightClass =
    imageHeight === "small" ? "min-h-[300px]"
    : imageHeight === "large" ? "min-h-[600px]"
    : "min-h-[450px]"; // medium or adapt

  return (
    <section
      className={`relative w-full ${heightClass} flex items-center justify-center overflow-hidden`}
      style={sectionStyles}
    >
      {/* Background image or gradient */}
      {image ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
      )}

      {/* Content overlay */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
        <div className="space-y-4">
          {blocks.map((block: BlockInstance) => (
            <FrontendBlockRenderer key={block.id} block={block} />
          ))}
        </div>
        {blocks.length === 0 && (
          <p className="text-lg text-gray-400">Hero section</p>
        )}
      </div>
    </section>
  );
}
