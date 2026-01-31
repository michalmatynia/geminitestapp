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

  // Per-section style overrides
  Object.assign(styles, getBlockBorderStyles(settings));
  Object.assign(styles, getBlockShadowStyles(settings));
  Object.assign(styles, getBlockBackgroundStyles(settings));

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

// ---------------------------------------------------------------------------
// Per-block typography styles
// ---------------------------------------------------------------------------

export function getBlockTypographyStyles(settings: Record<string, unknown>): React.CSSProperties {
  const styles: React.CSSProperties = {};
  const fontFamily = settings["fontFamily"] as string | undefined;
  const fontWeight = settings["fontWeight"] as string | undefined;
  const fontSize = settings["fontSize"] as number | undefined;
  const lineHeight = settings["lineHeight"] as number | undefined;
  const letterSpacing = settings["letterSpacing"] as number | undefined;
  const textColor = settings["textColor"] as string | undefined;

  if (fontFamily) styles.fontFamily = fontFamily;
  if (fontWeight) styles.fontWeight = fontWeight;
  if (fontSize && fontSize > 0) styles.fontSize = `${fontSize}px`;
  if (lineHeight && lineHeight > 0) styles.lineHeight = lineHeight;
  if (letterSpacing) styles.letterSpacing = `${letterSpacing}px`;
  if (textColor) styles.color = textColor;

  return styles;
}

// ---------------------------------------------------------------------------
// Per-section border styles
// ---------------------------------------------------------------------------

export function getBlockBorderStyles(settings: Record<string, unknown>): React.CSSProperties {
  const styles: React.CSSProperties = {};
  const border = settings["sectionBorder"] as Record<string, unknown> | undefined;
  if (!border) return styles;

  const width = border.width as number | undefined;
  const borderStyle = border.style as string | undefined;
  const color = border.color as string | undefined;
  const radius = border.radius as number | undefined;

  if (width && width > 0 && borderStyle && borderStyle !== "none") {
    styles.borderWidth = `${width}px`;
    styles.borderStyle = borderStyle;
    if (color) styles.borderColor = color;
  }
  if (radius && radius > 0) styles.borderRadius = `${radius}px`;

  return styles;
}

// ---------------------------------------------------------------------------
// Per-section shadow styles
// ---------------------------------------------------------------------------

export function getBlockShadowStyles(settings: Record<string, unknown>): React.CSSProperties {
  const styles: React.CSSProperties = {};
  const shadow = settings["sectionShadow"] as Record<string, unknown> | undefined;
  if (!shadow) return styles;

  const x = shadow.x as number | undefined;
  const y = shadow.y as number | undefined;
  const blur = shadow.blur as number | undefined;
  const spread = shadow.spread as number | undefined;
  const color = shadow.color as string | undefined;

  if ((x || y || blur || spread) && color) {
    styles.boxShadow = `${x ?? 0}px ${y ?? 0}px ${blur ?? 0}px ${spread ?? 0}px ${color}`;
  }

  return styles;
}

// ---------------------------------------------------------------------------
// Per-section background styles
// ---------------------------------------------------------------------------

export function getBlockBackgroundStyles(settings: Record<string, unknown>): React.CSSProperties {
  const styles: React.CSSProperties = {};
  const bgColor = settings["backgroundColor"] as string | undefined;
  if (bgColor) {
    styles.backgroundColor = bgColor;
  }
  return styles;
}
