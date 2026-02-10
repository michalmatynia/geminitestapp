import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const nullableNonEmptyStringSchema = nonEmptyStringSchema.nullable();
const idArraySchema = z.array(nonEmptyStringSchema);

export const cmsThemeColorsSchema = z.object({
  primary: nonEmptyStringSchema,
  secondary: nonEmptyStringSchema,
  accent: nonEmptyStringSchema,
  background: nonEmptyStringSchema,
  surface: nonEmptyStringSchema,
  text: nonEmptyStringSchema,
  muted: nonEmptyStringSchema,
});

export const cmsThemeTypographySchema = z.object({
  headingFont: nonEmptyStringSchema,
  bodyFont: nonEmptyStringSchema,
  baseSize: z.number(),
  headingWeight: z.number(),
  bodyWeight: z.number(),
});

export const cmsThemeSpacingSchema = z.object({
  sectionPadding: nonEmptyStringSchema,
  containerMaxWidth: nonEmptyStringSchema,
});

export const cmsThemeCreateSchema = z.object({
  name: nonEmptyStringSchema,
  colors: cmsThemeColorsSchema,
  typography: cmsThemeTypographySchema,
  spacing: cmsThemeSpacingSchema,
  customCss: z.string().optional(),
});

export const cmsThemeUpdateSchema = z.object({
  name: nonEmptyStringSchema,
  colors: cmsThemeColorsSchema.optional(),
  typography: cmsThemeTypographySchema.optional(),
  spacing: cmsThemeSpacingSchema.optional(),
  customCss: z.string().nullable().optional(),
});

export const cmsPageCreateSchema = z.object({
  name: nonEmptyStringSchema,
  slugIds: idArraySchema.optional(),
});

export const cmsPageComponentSchema = z.object({
  type: nonEmptyStringSchema,
  content: z.record(z.string(), z.unknown()),
});

export const cmsPageUpdateSchema = z.object({
  name: nonEmptyStringSchema,
  status: z.enum(['draft', 'published', 'scheduled']).optional(),
  publishedAt: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  seoOgImage: z.string().nullable().optional(),
  seoCanonical: z.string().nullable().optional(),
  robotsMeta: z.string().nullable().optional(),
  showMenu: z.boolean().optional(),
  themeId: z.string().nullable().optional(),
  slugIds: idArraySchema.optional(),
  components: z.array(cmsPageComponentSchema),
});

export const cmsDomainCreateSchema = z.object({
  domain: nonEmptyStringSchema,
});

export const cmsDomainUpdateSchema = z.object({
  aliasOf: nullableNonEmptyStringSchema.optional(),
});

export const cmsSlugCreateSchema = z.object({
  slug: nonEmptyStringSchema,
});

export const cmsSlugUpdateSchema = z.object({
  slug: nonEmptyStringSchema,
  isDefault: z.boolean().optional(),
});

export const cmsSlugDomainsUpdateSchema = z.object({
  domainIds: idArraySchema,
});
