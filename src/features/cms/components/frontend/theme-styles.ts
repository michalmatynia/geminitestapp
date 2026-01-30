import type React from "react";

// ---------------------------------------------------------------------------
// Color scheme mapping
// ---------------------------------------------------------------------------

const COLOR_SCHEME_STYLES: Record<string, React.CSSProperties> = {
  "scheme-1": {},
  "scheme-2": { backgroundColor: "rgba(59,130,246,0.06)" },
  "scheme-3": { backgroundColor: "rgba(139,92,246,0.06)" },
  "scheme-4": { backgroundColor: "rgba(34,197,94,0.06)" },
  "scheme-5": { backgroundColor: "rgba(245,158,11,0.06)" },
};

export function getColorSchemeStyle(scheme: unknown): React.CSSProperties {
  if (typeof scheme === "string" && scheme in COLOR_SCHEME_STYLES) {
    return COLOR_SCHEME_STYLES[scheme];
  }
  return {};
}

// ---------------------------------------------------------------------------
// Section / block inline styles from settings
// ---------------------------------------------------------------------------

export function getSectionStyles(settings: Record<string, unknown>): React.CSSProperties {
  const styles: React.CSSProperties = {};

  const pt = settings["paddingTop"];
  const pb = settings["paddingBottom"];
  if (typeof pt === "number") styles.paddingTop = `${pt}px`;
  if (typeof pb === "number") styles.paddingBottom = `${pb}px`;

  const mt = settings["marginTop"];
  const mb = settings["marginBottom"];
  if (typeof mt === "number") styles.marginTop = `${mt}px`;
  if (typeof mb === "number") styles.marginBottom = `${mb}px`;

  const colorSchemeStyles = getColorSchemeStyle(settings["colorScheme"]);
  Object.assign(styles, colorSchemeStyles);

  return styles;
}

// ---------------------------------------------------------------------------
// Content alignment
// ---------------------------------------------------------------------------

export function getTextAlign(alignment: unknown): React.CSSProperties {
  if (alignment === "center") return { textAlign: "center" };
  if (alignment === "right") return { textAlign: "right" };
  return { textAlign: "left" };
}

export function getVerticalAlign(position: unknown): string {
  if (position === "top") return "items-start";
  if (position === "bottom") return "items-end";
  return "items-center";
}
