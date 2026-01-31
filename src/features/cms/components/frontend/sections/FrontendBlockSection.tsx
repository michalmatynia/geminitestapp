
import type { BlockInstance } from "../../../types/page-builder";
import { getSectionContainerClass, getSectionStyles, getTextAlign, type ColorSchemeColors } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";

interface FrontendBlockSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors>;
  layout?: { fullWidth?: boolean };
}

export function FrontendBlockSection({
  settings,
  blocks,
  colorSchemes,
  layout,
}: FrontendBlockSectionProps): React.ReactNode {
  const sectionStyles = {
    ...getSectionStyles(settings, colorSchemes),
    ...getTextAlign(settings["contentAlignment"]),
  };
  const alignment = (settings["contentAlignment"] as string) || "left";
  const alignmentClass =
    alignment === "center"
      ? "justify-center"
      : alignment === "right"
        ? "justify-end"
        : "justify-start";

  return (
    <section className="w-full" style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-6xl" })}>
        <div className={`flex flex-wrap items-center gap-3 ${alignmentClass}`}>
          {blocks.length === 0 ? (
            <p className="text-sm text-gray-400">Block</p>
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
