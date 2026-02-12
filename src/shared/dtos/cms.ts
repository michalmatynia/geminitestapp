import { DtoBase, NamedDto, CreateDto, UpdateDto } from '../types/base';

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
  components: (Partial<CmsPageComponentDto> & { type: string; order: number })[];
  slugs: string[] | CmsSlugDto[];
}

export interface CmsPageComponentDto extends DtoBase {
  type: string;
  order: number;
  content: Record<string, unknown>;
  pageId: string;
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

export interface CmsCssAiRequestDto {
  provider?: 'model' | 'agent';
  modelId?: string;
  agentId?: string;
  messages?: any[]; // Using any[] here to avoid circular dependency with ChatMessageDto if not careful, but typically these are ChatMessageDto
}

export type CreateCmsPageDto = CreateDto<CmsPageDto>;
export type UpdateCmsPageDto = UpdateDto<CmsPageDto>;

export type CreateCmsThemeDto = CreateDto<CmsThemeDto>;
export type UpdateCmsThemeDto = UpdateDto<CmsThemeDto>;

export type CreateCmsPageComponentDto = CreateDto<CmsPageComponentDto>;
export type UpdateCmsPageComponentDto = UpdateDto<CmsPageComponentDto>;

export type CreateCmsSlugDto = CreateDto<CmsSlugDto>;
export type UpdateCmsSlugDto = UpdateDto<CmsSlugDto>;

export type CreateCmsDomainDto = CreateDto<CmsDomainDto>;
export type UpdateCmsDomainDto = UpdateDto<CmsDomainDto>;

