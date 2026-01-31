
import type { CmsTheme } from "../../types/theme";

interface ThemeProviderProps {
  theme: CmsTheme;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps): React.ReactNode {
  const cssVars: Record<string, string> = {
    "--cms-color-primary": theme.colors.primary,
    "--cms-color-secondary": theme.colors.secondary,
    "--cms-color-accent": theme.colors.accent,
    "--cms-color-background": theme.colors.background,
    "--cms-color-surface": theme.colors.surface,
    "--cms-color-text": theme.colors.text,
    "--cms-color-muted": theme.colors.muted,
    "--cms-font-heading": theme.typography.headingFont,
    "--cms-font-body": theme.typography.bodyFont,
    "--cms-font-base-size": `${theme.typography.baseSize}px`,
    "--cms-font-heading-weight": String(theme.typography.headingWeight),
    "--cms-font-body-weight": String(theme.typography.bodyWeight),
    "--cms-spacing-section": theme.spacing.sectionPadding,
    "--cms-spacing-container": theme.spacing.containerMaxWidth,
  };

  return (
    <div style={cssVars as React.CSSProperties}>
      {children}
    </div>
  );
}
