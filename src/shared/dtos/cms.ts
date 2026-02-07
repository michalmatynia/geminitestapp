import { DtoBase, NamedDto } from '../types/base';

// CMS DTOs
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

export interface CmsThemeDto extends NamedDto {
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
  customCss?: string | undefined;
  isDefault: boolean;
}

export interface CmsPageDto extends DtoBase {
  name: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  seoCanonical?: string;
  robotsMeta?: string;
  themeId: string | null;
  showMenu: boolean;
  components: any[];
  slugs: any[];
}

export interface CmsSlugDto extends DtoBase {
  slug: string;
  pageId: string | null;
  isDefault: boolean;
}

export interface CmsDomainDto extends NamedDto {
  domain: string;
  aliasOf?: string | null;
}

export interface CreateCmsPageDto {
  name: string;
  status?: 'draft' | 'published' | 'scheduled';
  seoTitle?: string;
  seoDescription?: string;
  themeId?: string;
  showMenu?: boolean;
  components?: any[];
  slugs?: string[];
}

export interface UpdateCmsPageDto extends Partial<CreateCmsPageDto> {}

export interface CreateCmsThemeDto {
  name: string;
  colors: CmsThemeColors;
  typography: CmsThemeTypography;
  spacing: CmsThemeSpacing;
  customCss?: string | undefined;
  isDefault?: boolean;
}

export interface UpdateCmsThemeDto extends Partial<CreateCmsThemeDto> {}
