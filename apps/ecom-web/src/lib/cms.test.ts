/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CHECKOUT_CONTENT_DEFAULTS } from '@/data/checkoutContent';
import { getCheckoutCmsSnapshot, getCheckoutContent, localizeCheckoutContent, saveCheckoutContent } from './cms';

const cmsDbMocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
  createIndex: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => cmsDbMocks,
  })),
}));

beforeEach(() => {
  cmsDbMocks.findOne.mockReset();
  cmsDbMocks.updateOne.mockReset();
  cmsDbMocks.createIndex.mockReset();
  cmsDbMocks.createIndex.mockResolvedValue('page_1_locale_1');
  cmsDbMocks.updateOne.mockResolvedValue({});
});

describe('checkout CMS localization', () => {
  it('returns the original checkout content for the default locale', () => {
    expect(localizeCheckoutContent(CHECKOUT_CONTENT_DEFAULTS, 'en')).toBe(CHECKOUT_CONTENT_DEFAULTS);
  });

  it('localizes shipping zones and methods for Polish checkout content', () => {
    const localized = localizeCheckoutContent(CHECKOUT_CONTENT_DEFAULTS, 'pl');
    const euZone = localized.shippingZones.find((zone) => zone.id === 'eu');
    const standardMethod = euZone?.methods.find((method) => method.id === 'standard');
    const expressMethod = euZone?.methods.find((method) => method.id === 'express');

    expect(euZone?.label).toBe('Unia Europejska');
    expect(euZone?.countries).toContain('France');
    expect(standardMethod).toMatchObject({
      label: 'Dostawa standardowa',
      detail: '3-5 dni roboczych',
      priceLabel: 'Darmowa',
      businessDaysMin: 3,
      businessDaysMax: 5,
    });
    expect(expressMethod).toMatchObject({
      label: 'Dostawa ekspresowa',
      detail: '2-3 dni roboczych',
      priceLabel: '€ 18',
    });
  });

  it('localizes free shipping banner text while preserving its amount placeholder', () => {
    const localized = localizeCheckoutContent(CHECKOUT_CONTENT_DEFAULTS, 'pl');

    expect(localized.freeShippingBannerLabel).toBe('Dodaj jeszcze {amount}, aby otrzymać darmową dostawę');
  });

  it('uses an exact Polish checkout document without applying fallback localization again', async () => {
    const polishContent = {
      ...CHECKOUT_CONTENT_DEFAULTS,
      shippingTitle: 'Własny tytuł dostawy',
    };
    cmsDbMocks.findOne.mockResolvedValueOnce({
      page: 'checkout',
      locale: 'pl',
      content: polishContent,
      updatedAt: new Date('2026-05-01T12:00:00.000Z'),
      updatedBy: 'admin',
    });

    const content = await getCheckoutContent('pl');

    expect(content.shippingTitle).toBe('Własny tytuł dostawy');
    expect(cmsDbMocks.findOne).toHaveBeenCalledWith({ page: 'checkout', locale: 'pl' });
    expect(cmsDbMocks.findOne).toHaveBeenCalledTimes(1);
  });

  it('pre-populates missing Polish snapshots from the localized English fallback', async () => {
    cmsDbMocks.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        page: 'checkout',
        locale: 'en',
        content: CHECKOUT_CONTENT_DEFAULTS,
        updatedAt: new Date('2026-05-01T12:00:00.000Z'),
        updatedBy: 'admin',
      });

    const snapshot = await getCheckoutCmsSnapshot('pl');

    expect(snapshot.updatedAt).toBeNull();
    expect(snapshot.updatedBy).toBeNull();
    expect(snapshot.content.shippingTitle).toBe('Metoda dostawy');
  });

  it('saves checkout content to the requested locale', async () => {
    const snapshot = await saveCheckoutContent(CHECKOUT_CONTENT_DEFAULTS, 'admin', 'pl');

    expect(cmsDbMocks.updateOne).toHaveBeenCalledWith(
      { page: 'checkout', locale: 'pl' },
      expect.objectContaining({
        $set: expect.objectContaining({
          page: 'checkout',
          locale: 'pl',
          content: CHECKOUT_CONTENT_DEFAULTS,
          updatedBy: 'admin',
        }),
      }),
      { upsert: true },
    );
    expect(snapshot.content).toBe(CHECKOUT_CONTENT_DEFAULTS);
    expect(snapshot.updatedBy).toBe('admin');
  });
});
