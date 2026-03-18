import { z } from 'zod';

import { localizedSchema } from './base';

const siteLocalePattern = /^[a-z]{2,3}(?:-[A-Z0-9]{2,8})*$/;

export const siteLocaleCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(16)
  .regex(siteLocalePattern, 'Invalid locale code.');

export const siteLocaleDirectionSchema = z.enum(['ltr', 'rtl']);
export type SiteLocaleDirection = z.infer<typeof siteLocaleDirectionSchema>;

export const siteLocaleSchema = z.object({
  code: siteLocaleCodeSchema,
  label: z.string().trim().min(1).max(80),
  nativeLabel: z.string().trim().min(1).max(80),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  textDirection: siteLocaleDirectionSchema.default('ltr'),
});
export type SiteLocale = z.infer<typeof siteLocaleSchema>;

export const siteLocalePrefixModeSchema = z.enum(['always', 'as-needed', 'never']);
export type SiteLocalePrefixMode = z.infer<typeof siteLocalePrefixModeSchema>;

export const siteLocaleFallbacksSchema = z.record(
  siteLocaleCodeSchema,
  z.array(siteLocaleCodeSchema).default([])
);
export type SiteLocaleFallbacks = z.infer<typeof siteLocaleFallbacksSchema>;

export const siteDomainLocaleSchema = z.object({
  domain: z.string().trim().min(1).max(200),
  defaultLocale: siteLocaleCodeSchema,
  locales: z.array(siteLocaleCodeSchema).min(1),
});
export type SiteDomainLocale = z.infer<typeof siteDomainLocaleSchema>;

export const siteI18nConfigSchema = z
  .object({
    locales: z.array(siteLocaleSchema).min(1),
    defaultLocale: siteLocaleCodeSchema,
    localePrefixMode: siteLocalePrefixModeSchema.default('as-needed'),
    cookieName: z.string().trim().min(1).max(120).default('NEXT_LOCALE'),
    fallbacks: siteLocaleFallbacksSchema.default({}),
    domains: z.array(siteDomainLocaleSchema).default([]),
  })
  .superRefine((config, ctx) => {
    const localeCodes = new Set(config.locales.map((locale) => locale.code));
    const defaultMatches = config.locales.filter((locale) => locale.isDefault);

    if (!localeCodes.has(config.defaultLocale)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultLocale'],
        message: 'defaultLocale must be listed in locales.',
      });
    }

    if (defaultMatches.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locales'],
        message: 'Only one locale can be marked as default.',
      });
    }

    for (const [sourceLocale, fallbackLocales] of Object.entries(config.fallbacks)) {
      if (!localeCodes.has(sourceLocale)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fallbacks', sourceLocale],
          message: `Unknown locale in fallbacks: ${sourceLocale}`,
        });
      }

      for (const fallbackLocale of fallbackLocales) {
        if (!localeCodes.has(fallbackLocale)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['fallbacks', sourceLocale],
            message: `Unknown fallback locale: ${fallbackLocale}`,
          });
        }
      }
    }
  });
export type SiteI18nConfig = z.infer<typeof siteI18nConfigSchema>;

export const localizedTextSchema = localizedSchema;
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const cmsTranslationStatusSchema = z.enum(['draft', 'machine', 'reviewed', 'published']);
export type CmsTranslationStatus = z.infer<typeof cmsTranslationStatusSchema>;

export const cmsTranslationMetadataSchema = z.object({
  locale: siteLocaleCodeSchema.default('pl'),
  translationGroupId: z.string().trim().min(1).max(160).nullable().default(null),
  sourceLocale: siteLocaleCodeSchema.nullable().default(null),
  translationStatus: cmsTranslationStatusSchema.default('draft'),
});
export type CmsTranslationMetadata = z.infer<typeof cmsTranslationMetadataSchema>;

export const SITE_I18N_SETTINGS_KEY = 'site_i18n_config.v1';

export const DEFAULT_SITE_I18N_CONFIG: SiteI18nConfig = siteI18nConfigSchema.parse({
  locales: [
    {
      code: 'pl',
      label: 'Polish',
      nativeLabel: 'Polski',
      enabled: true,
      isDefault: true,
      textDirection: 'ltr',
    },
    {
      code: 'en',
      label: 'English',
      nativeLabel: 'English',
      enabled: true,
      isDefault: false,
      textDirection: 'ltr',
    },
    {
      code: 'de',
      label: 'German',
      nativeLabel: 'Deutsch',
      enabled: true,
      isDefault: false,
      textDirection: 'ltr',
    },
  ],
  defaultLocale: 'pl',
  localePrefixMode: 'as-needed',
  cookieName: 'NEXT_LOCALE',
  fallbacks: {
    en: ['pl'],
    de: ['pl'],
    pl: ['en'],
  },
  domains: [],
});

export const normalizeSiteI18nConfig = (input: unknown): SiteI18nConfig => {
  const exact = siteI18nConfigSchema.safeParse(input);
  if (exact.success) {
    return exact.data;
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return DEFAULT_SITE_I18N_CONFIG;
  }

  const merged = {
    ...DEFAULT_SITE_I18N_CONFIG,
    ...input,
  };
  const mergedResult = siteI18nConfigSchema.safeParse(merged);
  if (mergedResult.success) {
    return mergedResult.data;
  }

  return DEFAULT_SITE_I18N_CONFIG;
};
