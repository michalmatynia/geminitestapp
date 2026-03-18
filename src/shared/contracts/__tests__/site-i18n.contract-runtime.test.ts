import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SITE_I18N_CONFIG,
  cmsTranslationMetadataSchema,
  normalizeSiteI18nConfig,
  siteI18nConfigSchema,
} from '@/shared/contracts/site-i18n';

describe('site i18n contract', () => {
  it('parses the default multilingual configuration', () => {
    expect(siteI18nConfigSchema.parse(DEFAULT_SITE_I18N_CONFIG)).toEqual(DEFAULT_SITE_I18N_CONFIG);
  });

  it('fills translation metadata defaults for legacy monolingual records', () => {
    expect(cmsTranslationMetadataSchema.parse({})).toEqual({
      locale: 'pl',
      translationGroupId: null,
      sourceLocale: null,
      translationStatus: 'draft',
    });
  });

  it('falls back to defaults when an invalid config payload is provided', () => {
    expect(normalizeSiteI18nConfig({ locales: [], defaultLocale: 'fr' })).toEqual(
      DEFAULT_SITE_I18N_CONFIG
    );
  });
});
