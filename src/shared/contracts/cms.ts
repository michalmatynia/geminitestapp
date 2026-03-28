import { z } from 'zod';

import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import type { LabeledOptionDto } from './base';
import { dtoBaseSchema, namedDtoSchema } from './base';
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
  cmsTranslationStatusSchema,
  siteLocaleCodeSchema,
  type CmsTranslationStatus,
} from './site-i18n';

export * from './cms-contracts/cms-core';
export * from './cms-contracts/cms-builder';

import {
  cmsPageStatusSchema,
  cmsSlugSchema,
  cmsPageSeoSchema,
} from './cms-contracts/cms-core';
import {
  cmsBlockInstanceSchema,
  cmsSectionInstanceSchema,
  clipboardDataSchema,
  pageZoneSchema,
} from './cms-contracts/cms-builder';

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
  createDomain(data: CreateCmsDomainDto): Promise<CmsDomainDto>;
  updateDomain(id: string, data: UpdateCmsDomainDto): Promise<CmsDomainDto>;
  deleteDomain(id: string): Promise<void>;
};
