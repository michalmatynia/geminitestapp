import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

export const cmsPageStatusSchema = z.enum(['draft', 'published', 'scheduled']);
export type CmsPageStatusDto = z.infer<typeof cmsPageStatusSchema>;

export const cmsPageSlugLinkSchema = z.object({
  slug: z.object({
    id: z.string(),
    slug: z.string(),
  }),
});

export type CmsPageSlugLinkDto = z.infer<typeof cmsPageSlugLinkSchema>;

export const cmsPageSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: cmsPageStatusSchema,
  slugs: z.array(cmsPageSlugLinkSchema),
});

export type CmsPageSummaryDto = z.infer<typeof cmsPageSummarySchema>;

/**
 * CMS Theme Contract
 */
export const cmsThemeColorsSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
  background: z.string(),
  surface: z.string(),
  text: z.string(),
  muted: z.string(),
});
export type CmsThemeColors = z.infer<typeof cmsThemeColorsSchema>;

export const cmsThemeTypographySchema = z.object({
  headingFont: z.string(),
  bodyFont: z.string(),
  baseSize: z.number(),
  headingWeight: z.number(),
  bodyWeight: z.number(),
});
export type CmsThemeTypography = z.infer<typeof cmsThemeTypographySchema>;

export const cmsThemeSpacingSchema = z.object({
  sectionPadding: z.string(),
  containerMaxWidth: z.string(),
});
export type CmsThemeSpacing = z.infer<typeof cmsThemeSpacingSchema>;

export const cmsThemeSchema = namedDtoSchema.extend({
  colors: cmsThemeColorsSchema,
  typography: cmsThemeTypographySchema,
  spacing: cmsThemeSpacingSchema,
  customCss: z.string().optional(),
  isDefault: z.boolean(),
});

export type CmsThemeDto = z.infer<typeof cmsThemeSchema>;

export const createCmsThemeSchema = cmsThemeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsThemeDto = z.infer<typeof createCmsThemeSchema>;
export type UpdateCmsThemeDto = Partial<CreateCmsThemeDto>;

/**
 * CMS Component Contract
 */
export const cmsPageComponentSchema = dtoBaseSchema.extend({
  type: z.string(),
  order: z.number(),
  content: z.record(z.string(), z.unknown()),
  pageId: z.string(),
});

export type CmsPageComponentDto = z.infer<typeof cmsPageComponentSchema>;

export const createCmsPageComponentSchema = cmsPageComponentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsPageComponentDto = z.infer<typeof createCmsPageComponentSchema>;
export type UpdateCmsPageComponentDto = Partial<CreateCmsPageComponentDto>;

/**
 * CMS Slug Contract
 */
export const cmsSlugSchema = dtoBaseSchema.extend({
  slug: z.string(),
  pageId: z.string().nullable(),
  isDefault: z.boolean(),
});

export type CmsSlugDto = z.infer<typeof cmsSlugSchema>;

export const createCmsSlugSchema = cmsSlugSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsSlugDto = z.infer<typeof createCmsSlugSchema>;
export type UpdateCmsSlugDto = Partial<CreateCmsSlugDto>;

/**
 * CMS Domain Contract
 */
export const cmsDomainSchema = namedDtoSchema.extend({
  domain: z.string(),
  aliasOf: z.string().nullable().optional(),
});

export type CmsDomainDto = z.infer<typeof cmsDomainSchema>;

export const createCmsDomainSchema = cmsDomainSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsDomainDto = z.infer<typeof createCmsDomainSchema>;
export type UpdateCmsDomainDto = Partial<CreateCmsDomainDto>;

/**
 * CMS Page SEO Contract
 */
export const cmsPageSeoSchema = z.object({
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoOgImage: z.string().optional(),
  seoCanonical: z.string().optional(),
  robotsMeta: z.string().optional(),
});

export type CmsPageSeoDto = z.infer<typeof cmsPageSeoSchema>;

/**
 * CMS Page Builder Contracts
 */
export interface CmsBlockInstanceDto {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks?: CmsBlockInstanceDto[] | undefined;
}

export const cmsBlockInstanceSchema: z.ZodType<CmsBlockInstanceDto> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    settings: z.record(z.string(), z.unknown()),
    blocks: z.array(cmsBlockInstanceSchema).optional(),
  })
);

export const cmsSectionInstanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  zone: z.enum(['header', 'template', 'footer']),
  settings: z.record(z.string(), z.unknown()),
  blocks: z.array(cmsBlockInstanceSchema),
});

export type CmsSectionInstanceDto = z.infer<typeof cmsSectionInstanceSchema>;

export const pageZoneSchema = z.enum(['header', 'template', 'footer']);
export type PageZoneDto = z.infer<typeof pageZoneSchema>;

/**
 * CMS Page Contract
 */

export const pageComponentSchema = z.object({
  type: z.string(),
  order: z.number(),
  content: z.record(z.string(), z.unknown()),
});

export type PageComponentDto = z.infer<typeof pageComponentSchema>;

export const cmsPageSchema = dtoBaseSchema.extend({
  name: z.string(),
  status: z.enum(['draft', 'published', 'scheduled']),
  publishedAt: z.string().optional(),
  themeId: z.string().nullable(),
  showMenu: z.boolean(),
  components: z.array(cmsPageComponentSchema.partial().extend({
    type: z.string(),
    order: z.number(),
  })),
  slugs: z.union([z.array(z.string()), z.array(cmsSlugSchema)]),
}).merge(cmsPageSeoSchema);

export type CmsPageDto = z.infer<typeof cmsPageSchema>;

export const createCmsPageSchema = cmsPageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsPageDto = z.infer<typeof createCmsPageSchema>;
export type UpdateCmsPageDto = Partial<CreateCmsPageDto>;

/**
 * CMS AI Request Contract
 */
export const cmsCssAiRequestSchema = z.object({
  provider: z.enum(['model', 'agent']).optional(),
  modelId: z.string().optional(),
  agentId: z.string().optional(),
  messages: z.array(z.any()).optional(),
});

export type CmsCssAiRequestDto = z.infer<typeof cmsCssAiRequestSchema>;

/**
 * CMS Domain Settings Contract
 */
export const cmsDomainSettingsSchema = z.object({
  zoningEnabled: z.boolean(),
});

export type CmsDomainSettingsDto = z.infer<typeof cmsDomainSettingsSchema>;

/**
 * CMS Event Effects Contract
 */
export const cmsHoverEffectSchema = z.enum(['none', 'lift', 'lift-3d', 'scale', 'glow']);
export type CmsHoverEffectDto = z.infer<typeof cmsHoverEffectSchema>;

export const cmsClickActionSchema = z.enum(['none', 'navigate', 'scroll']);
export type CmsClickActionDto = z.infer<typeof cmsClickActionSchema>;

export const cmsClickTargetSchema = z.enum(['_self', '_blank']);
export type CmsClickTargetDto = z.infer<typeof cmsClickTargetSchema>;

export const cmsScrollBehaviorSchema = z.enum(['smooth', 'auto']);
export type CmsScrollBehaviorDto = z.infer<typeof cmsScrollBehaviorSchema>;

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

/**
 * CMS CSS Animation Contract
 */
export const cssAnimationEffectSchema = z.enum([
  'none',
  'fade',
  'fade-up',
  'fade-down',
  'fade-left',
  'fade-right',
  'slide-up',
  'slide-down',
  'slide-left',
  'slide-right',
  'zoom-in',
  'zoom-out',
  'flip-x',
  'flip-y',
  'rotate',
  'blur',
  'pop',
  'pulse',
  'float',
  'shake',
  'wobble',
  'glow',
]);
export type CssAnimationEffectDto = z.infer<typeof cssAnimationEffectSchema>;

export const cssAnimationTriggerSchema = z.enum(['load', 'hover', 'inView']);
export type CssAnimationTriggerDto = z.infer<typeof cssAnimationTriggerSchema>;

export const cssAnimationDirectionSchema = z.enum(['normal', 'reverse', 'alternate', 'alternate-reverse']);
export type CssAnimationDirectionDto = z.infer<typeof cssAnimationDirectionSchema>;

export const cssAnimationFillModeSchema = z.enum(['none', 'forwards', 'backwards', 'both']);
export type CssAnimationFillModeDto = z.infer<typeof cssAnimationFillModeSchema>;

export const cssAnimationConfigSchema = z.object({
  enabled: z.boolean().optional(),
  effect: cssAnimationEffectSchema.optional(),
  trigger: cssAnimationTriggerSchema.optional(),
  duration: z.number().optional(),
  delay: z.number().optional(),
  easing: z.string().optional(),
  iterations: z.number().optional(),
  loop: z.boolean().optional(),
  direction: cssAnimationDirectionSchema.optional(),
  fillMode: cssAnimationFillModeSchema.optional(),
  distance: z.number().optional(),
  scale: z.number().optional(),
  rotate: z.number().optional(),
  blur: z.number().optional(),
  replayOnExit: z.boolean().optional(),
});

export type CssAnimationConfigDto = z.infer<typeof cssAnimationConfigSchema>;

/**
 * CMS Page Builder Definitions DTOs
 */

export const settingsFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export type SettingsFieldOptionDto = z.infer<typeof settingsFieldOptionSchema>;

export const settingsFieldTypeSchema = z.enum([
  'text',
  'select',
  'radio',
  'number',
  'image',
  'asset3d',
  'color-scheme',
  'range',
  'color',
  'font-family',
  'font-weight',
  'spacing',
  'border',
  'shadow',
  'background',
  'typography',
  'link',
  'alignment',
]);

export type SettingsFieldTypeDto = z.infer<typeof settingsFieldTypeSchema>;

export const settingsFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: settingsFieldTypeSchema,
  options: z.array(settingsFieldOptionSchema).optional(),
  defaultValue: z.unknown().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  disabled: z.boolean().optional(),
});

export type SettingsFieldDto = z.infer<typeof settingsFieldSchema>;

export const sectionDefinitionSchema = z.object({
  type: z.string(),
  label: z.string(),
  icon: z.string(),
  defaultSettings: z.record(z.string(), z.unknown()),
  settingsSchema: z.array(settingsFieldSchema),
  allowedBlockTypes: z.array(z.string()),
});

export type SectionDefinitionDto = z.infer<typeof sectionDefinitionSchema>;

export const blockDefinitionSchema = z.object({
  type: z.string(),
  label: z.string(),
  icon: z.string(),
  defaultSettings: z.record(z.string(), z.unknown()),
  settingsSchema: z.array(settingsFieldSchema),
  allowedBlockTypes: z.array(z.string()).optional(),
});

export type BlockDefinitionDto = z.infer<typeof blockDefinitionSchema>;
