export interface CmsThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
}

export interface CmsThemeTypography {
  headingFont: string;
  bodyFont: string;
  baseSize: number;
  headingWeight: number;
  bodyWeight: number;
}

export interface CmsThemeSpacing {
  sectionPadding: string;
  containerMaxWidth: string;
}

export interface CmsTheme {
  id: string;
  name: string;
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
  customCss?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CmsThemeCreateInput {
  name: string;
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
  customCss?: string | undefined;
}

export interface CmsThemeUpdateInput {
  name?: string | undefined;
  colors?: CmsThemeColors | undefined;
  typography?: CmsThemeTypography | undefined;
  spacing?: CmsThemeSpacing | undefined;
  customCss?: string | null | undefined;
}
