import { describe, expect, it } from 'vitest';

import {
  cmsDomainCreateSchema,
  cmsPageCreateSchema,
  cmsPageUpdateSchema,
  cmsSlugDomainsUpdateSchema,
  cmsThemeCreateSchema,
} from '@/shared/contracts/cms';

describe('cms contract runtime', () => {
  it('parses cms create payloads used by routes', () => {
    expect(
      cmsThemeCreateSchema.parse({
        name: 'Storefront',
        colors: {
          primary: '#111111',
          secondary: '#222222',
          accent: '#333333',
          background: '#ffffff',
          surface: '#f5f5f5',
          text: '#000000',
          muted: '#777777',
        },
        typography: {
          headingFont: 'Alegreya',
          bodyFont: 'Source Sans Pro',
          baseSize: 16,
          headingWeight: 700,
          bodyWeight: 400,
        },
        spacing: {
          sectionPadding: '4rem',
          containerMaxWidth: '1200px',
        },
      }).name
    ).toBe('Storefront');

    expect(
      cmsPageCreateSchema.parse({
        name: 'Landing',
        slugIds: ['slug-1'],
        themeId: null,
      }).slugIds
    ).toEqual(['slug-1']);

    expect(cmsDomainCreateSchema.parse({ domain: 'example.com' }).domain).toBe('example.com');
  });

  it('parses cms update payloads and rejects blank identifiers', () => {
    expect(
      cmsPageUpdateSchema.parse({
        name: 'Landing',
        components: [
          {
            type: 'hero',
            order: 1,
            content: {
              zone: 'template',
              settings: {},
              blocks: [],
              sectionId: 'section-1',
              parentSectionId: null,
            },
          },
        ],
      }).components
    ).toHaveLength(1);

    expect(() =>
      cmsSlugDomainsUpdateSchema.parse({
        domainIds: ['   '],
      })
    ).toThrow();
  });
});
