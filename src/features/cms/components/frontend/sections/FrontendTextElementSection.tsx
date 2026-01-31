import React from "react";
import { getBlockTypographyStyles } from "../theme-styles";

interface FrontendTextElementSectionProps {
  settings: Record<string, unknown>;
}

export function FrontendTextElementSection({ settings }: FrontendTextElementSectionProps): React.ReactNode {
  const text = (settings["textContent"] as string) || "";
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);
  return (
    <section className="w-full">
      <p className="text-base leading-relaxed text-gray-200" style={typoStyles}>
        {text}
      </p>
    </section>
  );
}
