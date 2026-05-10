import { describe, expect, it } from 'vitest';

import { HOME_CONTENT_DEFAULTS, normalizeHomeContent, validateHomeContent } from './homeContent';

describe('home manifesto content', () => {
  it('defaults the manifesto background image to empty', () => {
    expect(normalizeHomeContent({}).manifesto.backgroundImageUrl).toBe('');
  });

  it('accepts a manifesto background image URL', () => {
    const content = normalizeHomeContent({
      ...HOME_CONTENT_DEFAULTS,
      manifesto: {
        ...HOME_CONTENT_DEFAULTS.manifesto,
        backgroundImageUrl:
          'https://sparksofsindri.com/uploads/cms/stargater/manifesto/creed.webp',
      },
    });

    expect(content.manifesto.backgroundImageUrl).toContain('/manifesto/creed.webp');
  });

  it('falls back when the manifesto background image URL is invalid', () => {
    const result = validateHomeContent({
      ...HOME_CONTENT_DEFAULTS,
      manifesto: {
        ...HOME_CONTENT_DEFAULTS.manifesto,
        backgroundImageUrl: 'javascript:alert(1)',
      },
    });

    expect(result.content.manifesto.backgroundImageUrl).toBe('');
    expect(result.errors).toContain(
      'manifesto.backgroundImageUrl must be an internal path, anchor, or http(s) URL.'
    );
  });
});

describe('home editorial article content', () => {
  it('normalizes editorial reports as readable Lore & Drops articles', () => {
    const content = normalizeHomeContent({
      editorial: {
        reports: [
          {
            body: 'Long article copy',
            excerpt: 'Short form',
            href: '#',
            id: 'Gaming Report',
            tag: 'Gaming Drop',
            title: 'Gaming Report',
            visible: false,
          },
        ],
      },
    });

    expect(content.editorial.reports).toEqual([
      expect.objectContaining({
        body: 'Long article copy',
        href: '/lore-drops/gaming-report',
        id: 'gaming-report',
        visible: false,
      }),
    ]);
  });

  it('allows long editorial article bodies', () => {
    const body = 'A'.repeat(2000);
    const result = validateHomeContent({
      editorial: {
        reports: [
          {
            body,
            excerpt: 'Short form',
            href: '/lore-drops/long-report',
            id: 'long-report',
            tag: 'Universe Report',
            title: 'Long Report',
            visible: true,
          },
        ],
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.content.editorial.reports[0]?.body).toBe(body);
  });
});
