import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

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
 * CMS Page Contract
 */
export const cmsPageSchema = dtoBaseSchema.extend({
  name: z.string(),
  status: z.enum(['draft', 'published', 'scheduled']),
  publishedAt: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoOgImage: z.string().optional(),
  seoCanonical: z.string().optional(),
  robotsMeta: z.string().optional(),
  themeId: z.string().nullable(),
  showMenu: z.boolean(),
  components: z.array(z.lazy(() => cmsPageComponentSchema.partial().extend({
    type: z.string(),
    order: z.number(),
  }))),
  slugs: z.union([z.array(z.string()), z.array(cmsSlugSchema)]),
});

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
