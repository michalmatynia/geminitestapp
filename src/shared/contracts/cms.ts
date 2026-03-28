import { z } from 'zod';
import type { CSSProperties, ReactNode } from 'react';

import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { dtoBaseSchema } from './base';
import { chatMessageSchema } from './chatbot';
import type {
  CmsTheme,
  CreateCmsThemeDto,
  UpdateCmsThemeDto,
} from './cms-theme-contract';
export {
  cmsThemeColorsSchema,
  cmsThemeCreateSchema,
  cmsThemeSchema,
  cmsThemeSpacingSchema,
  cmsThemeTypographySchema,
  cmsThemeUpdateSchema,
  createCmsThemeSchema,
} from './cms-theme-contract';
export type {
  CmsTheme,
  CmsThemeColors,
  CmsThemeCreateInput,
  CmsThemeCreateRequestDto,
  CmsThemeDto,
  CmsThemeSpacing,
  CmsThemeTypography,
  CmsThemeUpdateInput,
  CmsThemeUpdateRequestDto,
  CreateCmsThemeDto,
  UpdateCmsThemeDto,
} from './cms-theme-contract';
import {
  cmsTranslationMetadataSchema,
  siteLocaleCodeSchema,
  type CmsTranslationStatus,
} from './site-i18n';

export * from './cms-contracts/cms-core';
export * from './cms-contracts/cms-builder';

import {
  cmsPageStatusSchema,
  cmsSlugSchema,
  cmsPageSeoSchema,
  createCmsSlugSchema,
  type CmsDomainDto,
  type Slug,
} from './cms-contracts/cms-core';
import {
  type BlockInstance,
  type ClipboardData,
  type InspectorSettings,
  cmsBlockInstanceSchema,
  pageZoneSchema,
  type SectionInstance,
} from './cms-contracts/cms-builder';
export * from './cms-animation';

const cmsRequiredStringSchema = z.string().trim().min(1);
const cmsIdArraySchema = z.array(cmsRequiredStringSchema);

/**
 * CMS Component Contract
 */
export const cmsPageBuilderComponentContentSchema = z
  .object({
    zone: z.lazy(() => pageZoneSchema),
    settings: z.record(z.string(), z.unknown()),
    blocks: z.array(z.lazy(() => cmsBlockInstanceSchema)),
    sectionId: z.string(),
    parentSectionId: z.string().nullable(),
  })
  .strict();

export type CmsPageBuilderComponentContentDto = z.infer<
  typeof cmsPageBuilderComponentContentSchema
>;

export const cmsPageComponentSchema = dtoBaseSchema.extend({
  type: z.string(),
  order: z.number(),
  content: cmsPageBuilderComponentContentSchema,
  pageId: z.string(),
});

export type CmsPageComponentDto = z.infer<typeof cmsPageComponentSchema>;
export type PageComponent = CmsPageComponentDto;

export const createCmsPageComponentSchema = cmsPageComponentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsPageComponentDto = z.infer<typeof createCmsPageComponentSchema>;
export type UpdateCmsPageComponentDto = Partial<CreateCmsPageComponentDto>;

export const cmsPageComponentInputSchema = z
  .object({
    type: z.string(),
    order: z.number(),
    content: cmsPageBuilderComponentContentSchema,
  })
  .strict();

export type CmsPageComponentInputDto = z.infer<typeof cmsPageComponentInputSchema>;
export type PageComponentInput = CmsPageComponentInputDto;

export const cmsPageComponentRequestSchema = z
  .object({
    type: cmsRequiredStringSchema,
    order: z.number(),
    content: cmsPageBuilderComponentContentSchema,
  })
  .strict();

export type CmsPageComponentRequestDto = z.infer<typeof cmsPageComponentRequestSchema>;

/**
 * CMS Page Contract
 */

export const cmsPageSchema = dtoBaseSchema
  .extend({
    name: z.string(),
    status: z.enum(['draft', 'published', 'scheduled']),
    publishedAt: z.string().optional(),
    themeId: z.string().nullable(),
    showMenu: z.boolean(),
    components: z.array(cmsPageComponentInputSchema),
    slugs: z.array(cmsSlugSchema),
  })
  .merge(cmsTranslationMetadataSchema)
  .merge(cmsPageSeoSchema);

export type CmsPageDto = z.infer<typeof cmsPageSchema>;
export type Page = CmsPageDto;

export const cmsPageCreateSchema = z
  .object({
    name: cmsRequiredStringSchema,
    slugIds: cmsIdArraySchema.optional(),
    themeId: z.string().nullable().optional(),
  })
  .strict();
export type CmsPageCreateRequestDto = z.infer<typeof cmsPageCreateSchema>;

export const cmsPageUpdateSchema = z
  .object({
    name: cmsRequiredStringSchema.optional(),
    status: cmsPageStatusSchema.optional(),
    publishedAt: z.string().nullable().optional(),
    seoTitle: z.string().nullable().optional(),
    seoDescription: z.string().nullable().optional(),
    seoOgImage: z.string().nullable().optional(),
    seoCanonical: z.string().nullable().optional(),
    robotsMeta: z.string().nullable().optional(),
    themeId: z.string().nullable().optional(),
    slugIds: cmsIdArraySchema.optional(),
    components: z.array(cmsPageComponentRequestSchema).optional(),
    showMenu: z.boolean().optional(),
  })
  .strict();
export type CmsPageUpdateRequestDto = z.infer<typeof cmsPageUpdateSchema>;

export const cmsDomainCreateSchema = z
  .object({
    domain: cmsRequiredStringSchema,
  })
  .strict();
export type CmsDomainCreateRequestDto = z.infer<typeof cmsDomainCreateSchema>;

export const cmsDomainUpdateSchema = z
  .object({
    aliasOf: z.string().nullable().optional(),
  })
  .strict();
export type CmsDomainUpdateRequestDto = z.infer<typeof cmsDomainUpdateSchema>;

export const cmsSlugCreateSchema = createCmsSlugSchema;
export type CmsSlugCreateRequestDto = z.infer<typeof cmsSlugCreateSchema>;

export const cmsSlugUpdateSchema = z
  .object({
    slug: cmsRequiredStringSchema.optional(),
    pageId: z.string().nullable().optional(),
    isDefault: z.boolean().optional(),
    locale: siteLocaleCodeSchema.optional(),
    translationGroupId: z.string().trim().min(1).max(160).nullable().optional(),
  })
  .strict();
export type CmsSlugUpdateRequestDto = z.infer<typeof cmsSlugUpdateSchema>;

export const cmsSlugDomainsUpdateSchema = z
  .object({
    domainIds: cmsIdArraySchema,
  })
  .strict();
export type CmsSlugDomainsUpdateRequestDto = z.infer<typeof cmsSlugDomainsUpdateSchema>;

/**
 * CMS AI Config Contract
 */
export const cmsCssAiProviderSchema = z.enum(['model', 'agent']);
export type CmsCssAiProviderDto = z.infer<typeof cmsCssAiProviderSchema>;
export type CustomCssAiProvider = CmsCssAiProviderDto;

export const cmsCssAiConfigSchema = z.object({
  provider: cmsCssAiProviderSchema.optional(),
  modelId: z.string().optional(),
  agentId: z.string().optional(),
  prompt: z.string().optional(),
});

export type CmsCssAiConfigDto = z.infer<typeof cmsCssAiConfigSchema>;
export type CustomCssAiConfig = CmsCssAiConfigDto;

export const DEFAULT_CUSTOM_CSS_AI_CONFIG: CustomCssAiConfig = {
  provider: 'model',
  modelId: '',
  agentId: '',
  prompt: '',
};

/**
 * CMS AI Request Contract
 */
export const cmsCssAiRequestSchema = z.object({
  provider: cmsCssAiProviderSchema.optional(),
  modelId: z.string().optional(),
  agentId: z.string().optional(),
  messages: z.array(chatMessageSchema).optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type CmsCssAiRequest = z.infer<typeof cmsCssAiRequestSchema>;

/**
 * CMS Domain Settings Contract
 */
export const cmsDomainSettingsSchema = z.object({
  zoningEnabled: z.boolean(),
});

export type CmsDomainSettingsDto = z.infer<typeof cmsDomainSettingsSchema>;
export type CmsDomainSettings = CmsDomainSettingsDto;

export const CMS_DOMAIN_SETTINGS_KEY = 'cms_domain_settings.v1';

export const DEFAULT_CMS_DOMAIN_SETTINGS: CmsDomainSettings = {
  zoningEnabled: true,
};

export const normalizeCmsDomainSettings = (
  value: Partial<CmsDomainSettings> | null | undefined
): CmsDomainSettings => ({
  zoningEnabled: value?.zoningEnabled ?? DEFAULT_CMS_DOMAIN_SETTINGS.zoningEnabled,
});

export type SettingsFieldOption = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  [key: string]: unknown;
};

export type SettingsField = {
  key: string;
  label: string;
  type: string;
  options?: ReadonlyArray<SettingsFieldOption>;
  defaultValue?: unknown;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  placeholder?: string;
  helperText?: string;
  render?: (args: {
    value: unknown;
    onChange: (value: unknown) => void;
    disabled?: boolean;
  }) => ReactNode;
  [key: string]: unknown;
};

export type BlockDefinition = {
  type: string;
  label: string;
  icon?: string;
  allowedBlockTypes?: string[];
  defaultSettings: Record<string, unknown>;
  settingsSchema: SettingsField[];
  [key: string]: unknown;
};

export type SectionDefinition = {
  type: string;
  label: string;
  icon?: string;
  allowedBlockTypes: string[];
  defaultSettings: Record<string, unknown>;
  settingsSchema: SettingsField[];
  [key: string]: unknown;
};

export type PreviewBlockProps = {
  block: BlockInstance;
  stretch?: boolean;
  mediaStyles?: CSSProperties | null;
};

export type PreviewBlockItemProps = {
  block: BlockInstance;
};

export type PageBuilderSnapshot = {
  currentPage: Page | null;
  sections: SectionInstance[];
};

export type PageBuilderState = {
  pages: Page[];
  currentPage: Page | null;
  sections: SectionInstance[];
  selectedNodeId: string | null;
  inspectorEnabled: boolean;
  inspectorSettings: InspectorSettings;
  previewMode: string;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  clipboard: ClipboardData | null;
  history: {
    past: PageBuilderSnapshot[];
    future: PageBuilderSnapshot[];
  };
  [key: string]: unknown;
};

export type PageBuilderAction = {
  type: string;
  status?: string;
  name?: string;
  seo?: Record<string, unknown>;
  slugIds?: string[];
  slugValues?: string[];
  showMenu?: boolean;
  themeId?: string | null;
  settings?: Record<string, unknown>;
  mode?: string;
  sectionId?: string;
  zone?: string;
  blockId?: string;
  columnId?: string;
  parentBlockId?: string | null;
  fromSectionId?: string;
  fromColumnId?: string;
  fromParentBlockId?: string | null;
  toSectionId?: string;
  toColumnId?: string;
  toIndex?: number;
  toParentBlockId?: string | null;
  toRowId?: string;
  toFrameId?: string;
  toZone?: string;
  toParentSectionId?: string | null;
  [key: string]: unknown;
};

/**
 * CMS Event Effects Contract
 */
export const cmsHoverEffectSchema = z.enum(['none', 'lift', 'lift-3d', 'scale', 'glow']);
export type CmsHoverEffectDto = z.infer<typeof cmsHoverEffectSchema>;
export type CmsHoverEffect = CmsHoverEffectDto;

export const cmsClickActionSchema = z.enum(['none', 'navigate', 'scroll']);
export type CmsClickActionDto = z.infer<typeof cmsClickActionSchema>;
export type CmsClickAction = CmsClickActionDto;

export const cmsClickTargetSchema = z.enum(['_self', '_blank']);
export type CmsClickTargetDto = z.infer<typeof cmsClickTargetSchema>;
export type CmsClickTarget = CmsClickTargetDto;

export const cmsScrollBehaviorSchema = z.enum(['smooth', 'auto']);
export type CmsScrollBehaviorDto = z.infer<typeof cmsScrollBehaviorSchema>;
export type CmsScrollBehavior = CmsScrollBehaviorDto;

export const cmsEventEffectsConfigSchema = z.object({
  hoverEffect: cmsHoverEffectSchema,
  hoverScale: z.number(),
  clickAction: cmsClickActionSchema,
  clickUrl: z.string(),
  clickTarget: cmsClickTargetSchema,
  clickScrollTarget: z.string(),
  clickScrollBehavior: cmsScrollBehaviorSchema,
});

export type CmsEventEffectsConfigDto = z.infer<typeof cmsEventEffectsConfigSchema>;
export type CmsEventEffectsConfig = CmsEventEffectsConfigDto;

/**
 * CMS Repository Interfaces
 */

export type PageUpdateData = Partial<Omit<CmsPageDto, 'id' | 'createdAt' | 'updatedAt'>> & {
  components?: PageComponentInput[];
};

export type CmsLookupOptionsDto = {
  locale?: string | null;
  fallbackToDefaultLocale?: boolean;
};

export type CmsPageLookupOptions = CmsLookupOptionsDto;

export type CmsSlugLookupOptions = CmsPageLookupOptions;

export type CmsRepository = {
  // Pages
  getPages(): Promise<Page[]>;
  getPageById(id: string): Promise<Page | null>;
  getPageBySlug(slug: string, options?: CmsPageLookupOptions): Promise<Page | null>;
  createPage(data: {
    name: string;
    themeId?: string | null | undefined;
    locale?: string | null;
    translationGroupId?: string | null;
    sourceLocale?: string | null;
    translationStatus?: CmsTranslationStatus;
  }): Promise<Page>;
  updatePage(id: string, data: PageUpdateData): Promise<Page | null>;
  deletePage(id: string): Promise<Page | null>;
  addSlugToPage(pageId: string, slugId: string): Promise<void>;
  removeSlugFromPage(pageId: string, slugId: string): Promise<void>;
  replacePageSlugs(pageId: string, slugIds: string[]): Promise<void>;
  replacePageComponents(pageId: string, components: PageComponentInput[]): Promise<void>;

  // Slugs
  getSlugs(options?: CmsSlugLookupOptions): Promise<Slug[]>;
  getSlugsByIds(ids: string[], options?: CmsSlugLookupOptions): Promise<Slug[]>;
  getSlugById(id: string, options?: CmsSlugLookupOptions): Promise<Slug | null>;
  getSlugByValue(slug: string, options?: CmsSlugLookupOptions): Promise<Slug | null>;
  createSlug(data: {
    slug: string;
    pageId?: string | null;
    isDefault?: boolean;
    locale?: string | null;
    translationGroupId?: string | null;
  }): Promise<Slug>;
  updateSlug(
    id: string,
    data: Partial<{
      slug: string;
      pageId: string | null;
      isDefault: boolean;
      locale: string | null;
      translationGroupId: string | null;
    }>
  ): Promise<Slug | null>;
  deleteSlug(id: string): Promise<Slug | null>;

  // Themes
  getThemes(): Promise<CmsTheme[]>;
  getThemeById(id: string): Promise<CmsTheme | null>;
  createTheme(data: CreateCmsThemeDto): Promise<CmsTheme>;
  updateTheme(id: string, data: UpdateCmsThemeDto): Promise<CmsTheme | null>;
  deleteTheme(id: string): Promise<CmsTheme | null>;
  getDefaultTheme(): Promise<CmsTheme | null>;
  setDefaultTheme(id: string): Promise<void>;

  // Domains
  getDomains(): Promise<CmsDomainDto[]>;
  getDomainById(id: string): Promise<CmsDomainDto | null>;
  createDomain(data: CmsDomainCreateRequestDto): Promise<CmsDomainDto>;
  updateDomain(id: string, data: CmsDomainUpdateRequestDto): Promise<CmsDomainDto>;
  deleteDomain(id: string): Promise<void>;
};
