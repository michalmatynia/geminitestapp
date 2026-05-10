import { describe, expect, it } from 'vitest';

import { SITE_CONTENT_DEFAULTS, normalizeSiteContent, validateSiteContent } from './siteContent';

describe('site content background settings', () => {
  it('defaults the cosmos parallax background to enabled', () => {
    expect(normalizeSiteContent({}).background.cosmosParallaxEnabled).toBe(true);
  });

  it('accepts a disabled cosmos parallax background setting', () => {
    const content = normalizeSiteContent({
      ...SITE_CONTENT_DEFAULTS,
      background: {
        cosmosParallaxEnabled: false,
      },
    });

    expect(content.background.cosmosParallaxEnabled).toBe(false);
  });

  it('falls back to the default when the background setting is invalid', () => {
    const result = validateSiteContent({
      ...SITE_CONTENT_DEFAULTS,
      background: {
        cosmosParallaxEnabled: 'yes',
      },
    });

    expect(result.content.background.cosmosParallaxEnabled).toBe(true);
    expect(result.errors).toContain('background.cosmosParallaxEnabled must be true or false.');
  });
});
