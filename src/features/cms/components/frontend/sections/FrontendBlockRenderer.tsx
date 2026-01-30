import React from "react";
import type { BlockInstance } from "../../../types/page-builder";

// ---------------------------------------------------------------------------
// Render a single element block to real HTML
// ---------------------------------------------------------------------------

interface FrontendBlockRendererProps {
  block: BlockInstance;
}

export function FrontendBlockRenderer({ block }: FrontendBlockRendererProps): React.ReactNode {
  switch (block.type) {
    case "Heading":
      return <HeadingBlock settings={block.settings} />;
    case "Text":
      return <TextBlock settings={block.settings} />;
    case "Button":
      return <ButtonBlock settings={block.settings} />;
    case "RichText":
      return <RichTextBlock settings={block.settings} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Individual block components
// ---------------------------------------------------------------------------

function HeadingBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const text = (settings["headingText"] as string) || "Heading";
  const size = (settings["headingSize"] as string) || "medium";

  if (size === "small") {
    return <h3 className="text-xl font-bold leading-tight tracking-tight md:text-2xl">{text}</h3>;
  }
  if (size === "large") {
    return <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">{text}</h2>;
  }
  // medium
  return <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">{text}</h2>;
}

function TextBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const text = (settings["textContent"] as string) || "";
  if (!text) return null;
  return <p className="text-base leading-relaxed text-gray-300 md:text-lg">{text}</p>;
}

function ButtonBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const label = (settings["buttonLabel"] as string) || "Button";
  const link = (settings["buttonLink"] as string) || "#";
  const style = (settings["buttonStyle"] as string) || "solid";

  const baseClasses = "inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  if (style === "outline") {
    return (
      <a
        href={link}
        className={`${baseClasses} border-2 border-white text-white hover:bg-white hover:text-gray-900 focus:ring-white`}
      >
        {label}
      </a>
    );
  }

  return (
    <a
      href={link}
      className={`${baseClasses} bg-white text-gray-900 hover:bg-gray-200 focus:ring-white`}
    >
      {label}
    </a>
  );
}

function RichTextBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  // RichText currently stores no editable text content, just renders as a placeholder area
  const colorScheme = (settings["colorScheme"] as string) || "scheme-1";
  return (
    <div
      className="rounded-lg p-4 text-gray-400"
      data-color-scheme={colorScheme}
    >
      <p className="text-sm italic">Rich text content area</p>
    </div>
  );
}
