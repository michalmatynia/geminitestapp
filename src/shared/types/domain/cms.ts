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
  CmsThemeSpacing
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
  CmsThemeSpacing
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
  content: Record<string, unknown>;
}

export interface PageSlugLink {
  slug: {
    slug: string;
  };
}

export interface PageSeoData {
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  seoCanonical?: string;
  robotsMeta?: string;
}

export interface PageSummary {
  id: string;
  name: string;
  status: PageStatus;
  slugs: PageSlugLink[];
}

export interface Page {
  id: string;
  name: string;
  status: PageStatus;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImage?: string;
  seoCanonical?: string;
  robotsMeta?: string;
  themeId?: string;
  showMenu?: boolean | null;
  components: PageComponent[];
  slugs?: PageSlugLink[];
  slugIds?: string[];
}

export interface Slug {
  id: string;
  slug: string;
  createdAt?: string;
  isDefault?: boolean;
}

export interface CmsDomain {
  id: string;
  domain: string;
  aliasOf?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Page Builder Instances & Definitions
// ---------------------------------------------------------------------------
export type PageZone = 'header' | 'template' | 'footer';

export interface BlockInstance {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks?: BlockInstance[];
}

export interface SectionInstance {
  id: string;
  type: string;
  zone: PageZone;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

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
