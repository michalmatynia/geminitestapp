import type {
  CmsThemeDto,
  CmsPageDto,
  CmsSlugDto,
  CmsDomainDto,
  CreateCmsPageDto,
  UpdateCmsPageDto,
  CreateCmsThemeDto,
  UpdateCmsThemeDto,
  CmsThemeColors,
  CmsThemeTypography,
  CmsThemeSpacing,
  CmsBlockInstanceDto,
  CmsSectionInstanceDto,
  CmsPageSeoDto
} from '../../dtos/cms';

export type {
  CmsThemeDto,
  CmsPageDto,
  CmsSlugDto,
  CmsDomainDto,
  CreateCmsPageDto,
  UpdateCmsPageDto,
  CreateCmsThemeDto,
  UpdateCmsThemeDto,
  CmsThemeColors,
  CmsThemeTypography,
  CmsThemeSpacing,
  CmsBlockInstanceDto,
  CmsSectionInstanceDto,
  CmsPageSeoDto
};

// ---------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------

export type CmsTheme = CmsThemeDto;
export type CmsThemeCreateInput = CreateCmsThemeDto;
export type CmsThemeUpdateInput = UpdateCmsThemeDto;

// ---------------------------------------------------------------------------
// Pages & Core CMS
// ---------------------------------------------------------------------------
export type PageStatus = 'draft' | 'published' | 'scheduled';

export interface PageComponent {
  type: string;
  order: number;
  content: Record<string, unknown>;
}

export interface PageSlugLink {
  slug: {
    id: string;
    slug: string;
  };
}

export type PageSeoData = CmsPageSeoDto;

export interface PageSummary {
  id: string;
  name: string;
  status: PageStatus;
  slugs: PageSlugLink[];
}

export type Page = CmsPageDto;

export type Slug = CmsSlugDto;

export type CmsDomain = CmsDomainDto;

// ---------------------------------------------------------------------------
// Page Builder Instances & Definitions
// ---------------------------------------------------------------------------
export type PageZone = 'header' | 'template' | 'footer';

export type BlockInstance = CmsBlockInstanceDto;

export type SectionInstance = CmsSectionInstanceDto;

export interface SettingsFieldOption {
  label: string;
  value: string;
}

export interface SettingsField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'select'
    | 'radio'
    | 'number'
    | 'image'
    | 'asset3d'
    | 'color-scheme'
    | 'range'
    | 'color'
    | 'font-family'
    | 'font-weight'
    | 'spacing'
    | 'border'
    | 'shadow'
    | 'background'
    | 'typography'
    | 'link'
    | 'alignment';
  options?: SettingsFieldOption[];
  defaultValue?: unknown;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export interface SectionDefinition {
  type: string;
  label: string;
  icon: string;
  defaultSettings: Record<string, unknown>;
  settingsSchema: SettingsField[];
  allowedBlockTypes: string[];
}

export interface BlockDefinition {
  type: string;
  label: string;
  icon: string;
  defaultSettings: Record<string, unknown>;
  settingsSchema: SettingsField[];
  allowedBlockTypes?: string[];
}
