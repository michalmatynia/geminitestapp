import type React from "react";
import type { ColorSchemeColors, ThemeSettings } from "@/features/cms/types/theme-settings";

export type { ColorSchemeColors };

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

function buildSchemeStyle(colors: ColorSchemeColors): React.CSSProperties {
  return {
    backgroundColor: colors.background,
    color: colors.text,
    borderColor: colors.border,
    ["--scheme-background" as keyof React.CSSProperties]: colors.background,
    ["--scheme-surface" as keyof React.CSSProperties]: colors.surface,
    ["--scheme-text" as keyof React.CSSProperties]: colors.text,
    ["--scheme-accent" as keyof React.CSSProperties]: colors.accent,
    ["--scheme-border" as keyof React.CSSProperties]: colors.border,
  };
}

export function getColorSchemeStyle(
  scheme: unknown,
  schemes?: Record<string, ColorSchemeColors>
): React.CSSProperties {
  if (typeof scheme === "string") {
    if (scheme === "none" || scheme.trim() === "") {
      return {};
    }
    if (schemes?.[scheme]) {
      return buildSchemeStyle(schemes[scheme]);
    }
    if (scheme in COLOR_SCHEME_STYLES) {
      return COLOR_SCHEME_STYLES[scheme] ?? {};
    }
  }
  return {};
}

// ---------------------------------------------------------------------------
// Hover effect vars
// ---------------------------------------------------------------------------

export function getHoverEffectVars(
  effect?: string,
  scale?: number
): React.CSSProperties {
  if (!effect && !scale) return {};
  const normalized = effect === "lift-3d" ? "lift-3d" : "vertical-lift";
  const safeScale = typeof scale === "number" && scale > 0 ? scale : 1;
  const transform = normalized === "lift-3d"
    ? `translateY(-6px) rotateX(6deg) rotateY(-4deg) scale(${safeScale})`
    : `translateY(-4px) scale(${safeScale})`;
  const shadow = normalized === "lift-3d"
    ? "0 18px 30px rgba(0, 0, 0, 0.35)"
    : "0 12px 20px rgba(0, 0, 0, 0.25)";
  const perspective = normalized === "lift-3d" ? "900px" : "none";

  return {
    ["--cms-hover-transform" as keyof React.CSSProperties]: transform,
    ["--cms-hover-shadow" as keyof React.CSSProperties]: shadow,
    ["--cms-hover-perspective" as keyof React.CSSProperties]: perspective,
  };
}

// ---------------------------------------------------------------------------
// Media styles (global)
// ---------------------------------------------------------------------------

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const withOpacity = (hex: string, opacityPercent: number): string => {
  const normalized = hex.replace("#", "").trim();
  const expanded =
    normalized.length === 3
      ? normalized.split("").map((c: string) => c + c).join("")
      : normalized;
  if (expanded.length !== 6 || Number.isNaN(Number.parseInt(expanded, 16))) {
    return hex;
  }
  const r = Number.parseInt(expanded.slice(0, 2), 16);
  const g = Number.parseInt(expanded.slice(2, 4), 16);
  const b = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha = clampNumber(opacityPercent, 0, 100) / 100;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const buildMediaShadow = (theme: ThemeSettings): string => {
  const opacity = clampNumber(theme.imageShadowOpacity, 0, 100) / 100;
  if (opacity <= 0) return "none";
  const x = theme.imageShadowX ?? 0;
  const y = theme.imageShadowY ?? 0;
  const blur = theme.imageShadowBlur ?? 0;
  return `${x}px ${y}px ${blur}px rgba(0, 0, 0, ${opacity})`;
};

export function getMediaStyleVars(theme: ThemeSettings): React.CSSProperties {
  return {
    ["--cms-media-radius" as keyof React.CSSProperties]: `${theme.imageRadius}px`,
    ["--cms-media-border-width" as keyof React.CSSProperties]: `${theme.imageBorderWidth}px`,
    ["--cms-media-border-color" as keyof React.CSSProperties]: withOpacity(
      theme.imageBorderColor,
      theme.imageBorderOpacity
    ),
    ["--cms-media-shadow" as keyof React.CSSProperties]: buildMediaShadow(theme),
  };
}

export function getMediaInlineStyles(theme: ThemeSettings): React.CSSProperties {
  return {
    borderRadius: `${theme.imageRadius}px`,
    borderWidth: `${theme.imageBorderWidth}px`,
    borderStyle: theme.imageBorderWidth > 0 ? "solid" : "none",
    borderColor: withOpacity(theme.imageBorderColor, theme.imageBorderOpacity),
    boxShadow: buildMediaShadow(theme),
  };
}

// ---------------------------------------------------------------------------
// Section / block inline styles from settings
// ---------------------------------------------------------------------------

export function getSectionStyles(
  settings: Record<string, unknown>,
  schemes?: Record<string, ColorSchemeColors>
): React.CSSProperties {
  const styles: React.CSSProperties = {};

  const pt = settings["paddingTop"];
  const pb = settings["paddingBottom"];
  const pl = settings["paddingLeft"];
  const pr = settings["paddingRight"];
  if (typeof pt === "number") styles.paddingTop = `${pt}px`;
  if (typeof pb === "number") styles.paddingBottom = `${pb}px`;
  if (typeof pl === "number") styles.paddingLeft = `${pl}px`;
  if (typeof pr === "number") styles.paddingRight = `${pr}px`;

  const mt = settings["marginTop"];
  const mb = settings["marginBottom"];
  const ml = settings["marginLeft"];
  const mr = settings["marginRight"];
  if (typeof mt === "number") styles.marginTop = `${mt}px`;
  if (typeof mb === "number") styles.marginBottom = `${mb}px`;
  if (typeof ml === "number") styles.marginLeft = `${ml}px`;
  if (typeof mr === "number") styles.marginRight = `${mr}px`;

  const colorSchemeStyles = getColorSchemeStyle(settings["colorScheme"], schemes);
  Object.assign(styles, colorSchemeStyles);

  // Per-section style overrides
  Object.assign(styles, getBlockBorderStyles(settings));
  Object.assign(styles, getBlockShadowStyles(settings));
  Object.assign(styles, getBlockBackgroundStyles(settings));
  Object.assign(styles, getLayoutStyles(settings));

  return styles;
}

// ---------------------------------------------------------------------------
// Layout styles (shared)
// ---------------------------------------------------------------------------

const OVERFLOW_VALUES = new Set(["visible", "hidden", "scroll", "auto", "clip"]);

export function getLayoutStyles(settings: Record<string, unknown>): React.CSSProperties {
  const styles: React.CSSProperties = {};

  const minHeight = settings["minHeight"];
  const maxWidth = settings["maxWidth"];
  const width = settings["width"];
  const overflow = settings["overflow"];
  const opacity = settings["opacity"];
  const zIndex = settings["zIndex"];

  if (typeof minHeight === "number" && Number.isFinite(minHeight) && minHeight > 0) {
    styles.minHeight = `${minHeight}px`;
  }
  if (typeof maxWidth === "number" && Number.isFinite(maxWidth) && maxWidth > 0) {
    styles.maxWidth = `${maxWidth}px`;
  }
  if (typeof width === "number" && Number.isFinite(width) && width > 0) {
    styles.width = `${width}px`;
  }
  if (typeof overflow === "string" && OVERFLOW_VALUES.has(overflow)) {
    styles.overflow = overflow;
  }
  if (typeof opacity === "number" && Number.isFinite(opacity)) {
    styles.opacity = clampNumber(opacity, 0, 100) / 100;
  }
  if (typeof zIndex === "number" && Number.isFinite(zIndex)) {
    styles.zIndex = zIndex;
  }

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
  const fontStyle = settings["fontStyle"] as string | undefined;
  const fontSize = settings["fontSize"] as number | undefined;
  const lineHeight = settings["lineHeight"] as number | undefined;
  const letterSpacing = settings["letterSpacing"] as number | undefined;
  const textColor = settings["textColor"] as string | undefined;

  if (fontFamily) styles.fontFamily = fontFamily;
  if (fontWeight) styles.fontWeight = fontWeight;
  if (fontStyle) styles.fontStyle = fontStyle;
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
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object" && !Array.isArray(value);

  const resolveColorWithOpacity = (color: unknown, opacityPercent: unknown): string => {
    if (typeof color !== "string") return "";
    const trimmed = color.trim();
    if (!trimmed) return "";
    if (trimmed.toLowerCase() === "transparent") return "rgba(0, 0, 0, 0)";
    const opacity =
      typeof opacityPercent === "number" && Number.isFinite(opacityPercent)
        ? clampNumber(opacityPercent, 0, 100)
        : 100;
    if (opacity >= 100) return trimmed;
    if (opacity <= 0) return "rgba(0, 0, 0, 0)";
    return withOpacity(trimmed, opacity);
  };

  const background = settings["background"];
  let appliedBackground = false;
  if (isRecord(background)) {
    const type = background.type;
    if (typeof type === "string") {
      if (type === "none") {
        appliedBackground = true;
      } else if (type === "solid") {
        const color = background.color;
        const resolved = resolveColorWithOpacity(color, 100);
        if (resolved) {
          styles.backgroundColor = resolved;
        }
        appliedBackground = true;
      } else if (type === "gradient") {
        const from = resolveColorWithOpacity(background.gradientFrom, background.gradientFromOpacity);
        const to = resolveColorWithOpacity(background.gradientTo, background.gradientToOpacity);
        const angleRaw = background.gradientAngle;
        const angle =
          typeof angleRaw === "number" && Number.isFinite(angleRaw)
            ? ((Math.round(angleRaw) % 360) + 360) % 360
            : 180;
        if (from || to) {
          styles.backgroundImage = `linear-gradient(${angle}deg, ${from || "transparent"}, ${to || "transparent"})`;
          styles.backgroundRepeat = "no-repeat";
        }
        appliedBackground = true;
      } else if (type === "image") {
        const url = typeof background.imageUrl === "string" ? background.imageUrl.trim() : "";
        if (url) {
          styles.backgroundImage = `url(${url})`;
          styles.backgroundRepeat = "no-repeat";
          styles.backgroundSize = "cover";
          styles.backgroundPosition = "center";
        }
        appliedBackground = true;
      }
    }
  }

  if (!appliedBackground) {
    const bgColor = settings["backgroundColor"] as string | undefined;
    if (bgColor) {
      styles.backgroundColor = bgColor;
    }
  }

  return styles;
}

// ---------------------------------------------------------------------------
// Container helpers
// ---------------------------------------------------------------------------

export function getSectionContainerClass(options?: {
  fullWidth?: boolean | undefined;
  maxWidthClass?: string | undefined;
  paddingClass?: string | undefined;
}): string {
  const padding = options?.paddingClass ?? "px-4 md:px-6";
  if (options?.fullWidth) {
    return `w-full ${padding}`;
  }
  const maxWidth = options?.maxWidthClass ? ` ${options.maxWidthClass}` : "";
  return `container mx-auto${maxWidth} ${padding}`;
}
