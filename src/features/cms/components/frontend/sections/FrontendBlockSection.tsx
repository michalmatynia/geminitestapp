
import type { BlockInstance } from "../../../types/page-builder";
import { getSectionContainerClass, getSectionStyles, getTextAlign, type ColorSchemeColors } from "../theme-styles";
import { FrontendBlockRenderer } from "./FrontendBlockRenderer";

const resolveJustifyContent = (value: unknown): React.CSSProperties["justifyContent"] | undefined => {
  if (value === "center") return "center";
  if (value === "end") return "flex-end";
  if (value === "space-between") return "space-between";
  if (value === "space-around") return "space-around";
  if (value === "space-evenly") return "space-evenly";
  if (value === "start") return "flex-start";
  return undefined;
};

const resolveAlignItems = (value: unknown): React.CSSProperties["alignItems"] | undefined => {
  if (value === "center") return "center";
  if (value === "end") return "flex-end";
  if (value === "stretch") return "stretch";
  if (value === "start") return "flex-start";
  return undefined;
};

const resolveAlignmentToJustify = (alignment: string): React.CSSProperties["justifyContent"] =>
  alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start";

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
  const direction = (settings["layoutDirection"] as string) || "row";
  const wrap = (settings["wrap"] as string) || "wrap";
  const justifySetting = (settings["justifyContent"] as string) || "inherit";
  const justifyContent =
    resolveJustifyContent(justifySetting === "inherit" ? alignment : justifySetting) ??
    resolveAlignmentToJustify(alignment);
  const alignItems = resolveAlignItems(settings["alignItems"]) ?? "center";
  const flexDirClass = direction === "column" ? "flex-col" : "flex-row";
  const wrapClass = direction === "column" ? "" : wrap === "nowrap" ? "flex-nowrap" : "flex-wrap";
  const linkUrl = (settings["linkUrl"] as string) || "";
  const linkTarget = (settings["linkTarget"] as string) || "_self";
  const linkRel = linkTarget === "_blank" ? "noopener noreferrer" : undefined;

  const content = (
    <div
      className={`flex ${flexDirClass} ${wrapClass}`}
      style={{ gap: `${blockGap}px`, justifyContent, alignItems }}
    >
      {blocks.map((block: BlockInstance) => (
        <FrontendBlockRenderer key={block.id} block={block} />
      ))}
    </div>
  );

  return (
    <section className="w-full" style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: "max-w-6xl" })}>
        {linkUrl ? (
          <a href={linkUrl} target={linkTarget} rel={linkRel} className="block w-full">
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </section>
  );
}
