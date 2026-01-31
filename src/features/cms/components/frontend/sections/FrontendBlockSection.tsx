
import type { BlockInstance } from "../../../types/page-builder";
import { getSectionContainerClass, getSectionStyles, getTextAlign, type ColorSchemeColors } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";

interface FrontendBlockSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean | undefined } | undefined;
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
  const blockGap = typeof settings["blockGap"] === "number" ? settings["blockGap"] : 0;
  const alignmentClass =
    alignment === "center"
      ? "justify-center"
      : alignment === "right"
        ? "justify-end"
        : "justify-start";

  return (
    <section className="w-full" style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-6xl" })}>
        <div className={`flex flex-wrap items-center ${alignmentClass}`} style={{ gap: `${blockGap}px` }}>
          {blocks.map((block: BlockInstance) => (
            <FrontendBlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </section>
  );
}
