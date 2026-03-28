import { z } from 'zod';

import { namedDtoSchema } from './base';

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
export type CmsTheme = CmsThemeDto;

export const createCmsThemeSchema = cmsThemeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCmsThemeDto = z.infer<typeof createCmsThemeSchema>;
export type CmsThemeCreateInput = CreateCmsThemeDto;
export type UpdateCmsThemeDto = Partial<CreateCmsThemeDto>;
export type CmsThemeUpdateInput = UpdateCmsThemeDto;

const cmsRequiredStringSchema = z.string().trim().min(1);

export const cmsThemeCreateSchema = z.object({
  name: cmsRequiredStringSchema,
  colors: cmsThemeColorsSchema,
  typography: cmsThemeTypographySchema,
  spacing: cmsThemeSpacingSchema,
  customCss: z.string().optional(),
});

export type CmsThemeCreateRequestDto = z.infer<typeof cmsThemeCreateSchema>;

export const cmsThemeUpdateSchema = z.object({
  name: cmsRequiredStringSchema,
  colors: cmsThemeColorsSchema.optional(),
  typography: cmsThemeTypographySchema.optional(),
  spacing: cmsThemeSpacingSchema.optional(),
  customCss: z.string().nullable().optional(),
});

export type CmsThemeUpdateRequestDto = z.infer<typeof cmsThemeUpdateSchema>;
