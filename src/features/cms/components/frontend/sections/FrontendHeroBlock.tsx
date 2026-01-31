"use client";


import type { BlockInstance } from "../../../types/page-builder";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";
import { useMediaStyles } from "../media-styles-context";

interface FrontendHeroBlockProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendHeroBlock({ settings, blocks }: FrontendHeroBlockProps): React.ReactNode {
  const image = settings["image"] as string | undefined;
  const mediaStyles = useMediaStyles();

  return (
    <div className="cms-media relative min-h-[200px] overflow-hidden" style={mediaStyles ?? undefined}>
      {image ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-800" />
      )}

      <div className="relative z-10 flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
        {blocks.map((block: BlockInstance) => (
          <FrontendBlockRenderer key={block.id} block={block} />
        ))}
        {blocks.length === 0 && (
          <p className="text-gray-400">Hero banner</p>
        )}
      </div>
    </div>
  );
}
