import { z } from 'zod';
import { dtoBaseSchema } from '../base';
import { namedDtoSchema } from '../base';
import { siteLocaleCodeSchema } from '../site-i18n';

/**
 * CMS Page Contract
 */
export const cmsPageStatusSchema = z.enum(['draft', 'published', 'scheduled']);
export type CmsPageStatusDto = z.infer<typeof cmsPageStatusSchema>;
export type PageStatus = CmsPageStatusDto;

export const cmsPageSlugLinkSchema = z.object({
  slug: z.object({
    id: z.string(),
    slug: z.string(),
  }),
});
export type CmsPageSlugLinkDto = z.infer<typeof cmsPageSlugLinkSchema>;
export type PageSlugLink = CmsPageSlugLinkDto;

export const cmsPageSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  status: cmsPageStatusSchema,
  slugs: z.array(cmsPageSlugLinkSchema),
});
export type CmsPageSummaryDto = z.infer<typeof cmsPageSummarySchema>;
export type PageSummary = CmsPageSummaryDto;

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
export type PageSeoData = CmsPageSeoDto;

/**
 * CMS Slug Contract
 */
export const cmsSlugSchema = dtoBaseSchema.extend({
  slug: z.string(),
  pageId: z.string().nullable(),
  isDefault: z.boolean(),
  locale: siteLocaleCodeSchema.default('pl'),
  translationGroupId: z.string().trim().min(1).max(160).nullable().default(null),
});
export type CmsSlugDto = z.infer<typeof cmsSlugSchema>;
export type Slug = CmsSlugDto;

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
export type CmsDomain = CmsDomainDto;

export const createCmsDomainSchema = cmsDomainSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateCmsDomainDto = z.infer<typeof createCmsDomainSchema>;
export type UpdateCmsDomainDto = Partial<CreateCmsDomainDto>;
