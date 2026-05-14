import { describe, expect, it } from 'vitest';

import {
  ensureVisibleHomeCategoryCards,
  HOME_CONTENT_DEFAULTS,
  normalizeHomeContent,
  validateHomeContent,
} from './homeContent';

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
            imageUrl: 'https://sparksofsindri.com/uploads/cms/stargater/lore/report.webp',
            visible: false,
          },
        ],
      },
    });

    expect(content.editorial.reports).toEqual([
      expect.objectContaining({
        body: 'Long article copy',
        href: '/lore-drops/gaming-report',
        imageUrl: 'https://sparksofsindri.com/uploads/cms/stargater/lore/report.webp',
        id: 'gaming-report',
        visible: false,
      }),
    ]);
  });

  it('falls back when editorial report image URL is invalid', () => {
    const content = normalizeHomeContent({
      editorial: {
        reports: [
          {
            body: 'Long article copy',
            excerpt: 'Short form',
            href: '/lore-drops/invalid-image-report',
            id: 'invalid-image-report',
            tag: 'Universe Report',
            title: 'Invalid Image',
            imageUrl: 'javascript:alert(1)',
            visible: true,
          },
        ],
      },
    });

    expect(content.editorial.reports[0]).toMatchObject({
      imageUrl: '',
      id: 'invalid-image-report',
    });
  });

  it('allows long editorial article bodies', () => {
    const body = 'A'.repeat(2000);
    const result = validateHomeContent({
      ...HOME_CONTENT_DEFAULTS,
      categories: {
        ...HOME_CONTENT_DEFAULTS.categories,
        cards: HOME_CONTENT_DEFAULTS.categories.cards.map((card) => ({
          ...card,
          href: '/products',
        })),
      },
      editorial: {
        ...HOME_CONTENT_DEFAULTS.editorial,
        reports: [
          {
            body,
            excerpt: 'Short form',
            href: '/lore-drops/long-report',
            id: 'long-report',
            imageUrl: '',
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

describe('home category content', () => {
  it('keeps configured visible universe cards', () => {
    const content = ensureVisibleHomeCategoryCards({
      ...HOME_CONTENT_DEFAULTS.categories,
      cards: [
        {
          ...HOME_CONTENT_DEFAULTS.categories.cards[0],
          id: 'custom',
          label: 'Custom Universe',
          visible: true,
        },
      ],
    });

    expect(content.cards).toHaveLength(1);
    expect(content.cards[0]?.label).toBe('Custom Universe');
  });

  it('falls back to default universe cards when all configured cards are hidden', () => {
    const content = ensureVisibleHomeCategoryCards({
      ...HOME_CONTENT_DEFAULTS.categories,
      cards: HOME_CONTENT_DEFAULTS.categories.cards.map((card) => ({
        ...card,
        visible: false,
      })),
    });

    expect(content.cards.map((card) => card.label)).toEqual(
      HOME_CONTENT_DEFAULTS.categories.cards.map((card) => card.label),
    );
    expect(content.cards.every((card) => card.visible)).toBe(true);
  });
});
