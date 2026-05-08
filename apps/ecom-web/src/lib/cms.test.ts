/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CHECKOUT_CONTENT_DEFAULTS } from '@/data/checkoutContent';
import { SITE_CONTENT_DEFAULTS } from '@/data/siteContent';
import {
  deleteCheckoutContent,
  getCheckoutCmsSnapshot,
  getCheckoutContent,
  getSiteCmsSnapshot,
  localizeCheckoutContent,
  saveCheckoutContent,
  saveSiteContent,
  saveSiteLogo,
} from './cms';

const cmsDbMocks = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  updateOne: vi.fn(),
  updateMany: vi.fn(),
  deleteOne: vi.fn(),
  createIndex: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getDb: vi.fn(async () => ({
    collection: () => cmsDbMocks,
  })),
}));

beforeEach(() => {
  cmsDbMocks.find.mockReset();
  cmsDbMocks.findOne.mockReset();
  cmsDbMocks.updateOne.mockReset();
  cmsDbMocks.updateMany.mockReset();
  cmsDbMocks.deleteOne.mockReset();
  cmsDbMocks.createIndex.mockReset();
  cmsDbMocks.find.mockReturnValue({ toArray: vi.fn(async () => []) });
  cmsDbMocks.createIndex.mockResolvedValue('page_1_locale_1');
  cmsDbMocks.updateOne.mockResolvedValue({});
  cmsDbMocks.updateMany.mockResolvedValue({});
  cmsDbMocks.deleteOne.mockResolvedValue({ deletedCount: 1 });
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

  it('deletes only non-default locale snapshots', async () => {
    const deleted = await deleteCheckoutContent('pl');
    const defaultDeleted = await deleteCheckoutContent('en');

    expect(deleted).toBe(true);
    expect(defaultDeleted).toBe(false);
    expect(cmsDbMocks.deleteOne).toHaveBeenCalledTimes(1);
    expect(cmsDbMocks.deleteOne).toHaveBeenCalledWith({ page: 'checkout', locale: 'pl' });
  });
});

describe('site CMS shared logo', () => {
  it('merges the default locale logo into an existing Polish site snapshot', async () => {
    const englishSite = {
      ...SITE_CONTENT_DEFAULTS,
      nav: {
        ...SITE_CONTENT_DEFAULTS.nav,
        logoUrl: 'https://sparksofsindri.com/uploads/ecom/logos/arcana.png',
        logoAlt: 'ARCANA NEXUS',
      },
    };
    const polishSite = {
      ...SITE_CONTENT_DEFAULTS,
      nav: {
        ...SITE_CONTENT_DEFAULTS.nav,
        brandSuffix: 'PL',
        logoUrl: '',
        logoAlt: '',
      },
    };
    const englishDoc = {
      page: 'site',
      locale: 'en',
      content: englishSite,
      updatedAt: new Date('2026-05-08T12:00:00.000Z'),
      updatedBy: 'admin',
    };
    cmsDbMocks.findOne.mockResolvedValueOnce({
      page: 'site',
      locale: 'pl',
      content: polishSite,
      updatedAt: new Date('2026-05-08T12:05:00.000Z'),
      updatedBy: 'admin',
    });
    cmsDbMocks.find.mockReturnValueOnce({ toArray: vi.fn(async () => [englishDoc]) });

    const snapshot = await getSiteCmsSnapshot('pl');

    expect(snapshot.content.nav.brandSuffix).toBe('PL');
    expect(snapshot.content.nav.logoUrl).toBe('https://sparksofsindri.com/uploads/ecom/logos/arcana.png');
    expect(snapshot.content.nav.logoAlt).toBe('ARCANA NEXUS');
  });

  it('propagates a saved site logo to all locale documents', async () => {
    const content = {
      ...SITE_CONTENT_DEFAULTS,
      nav: {
        ...SITE_CONTENT_DEFAULTS.nav,
        logoUrl: 'https://sparksofsindri.com/uploads/ecom/logos/new-logo.webp',
        logoAlt: 'Arcana mark',
      },
    };

    const snapshot = await saveSiteContent(content, 'admin', 'pl');

    expect(cmsDbMocks.updateOne).toHaveBeenCalledWith(
      { page: 'site', locale: 'pl' },
      expect.objectContaining({
        $set: expect.objectContaining({
          page: 'site',
          locale: 'pl',
          content,
          updatedBy: 'admin',
        }),
      }),
      { upsert: true },
    );
    expect(cmsDbMocks.updateMany).toHaveBeenCalledWith(
      { page: 'site' },
      expect.objectContaining({
        $set: expect.objectContaining({
          'content.nav.logoUrl': 'https://sparksofsindri.com/uploads/ecom/logos/new-logo.webp',
          'content.nav.logoAlt': 'Arcana mark',
          updatedBy: 'admin',
        }),
      }),
    );
    expect(snapshot.content.nav.logoUrl).toBe('https://sparksofsindri.com/uploads/ecom/logos/new-logo.webp');
  });

  it('saves an uploaded logo without overwriting localized site copy', async () => {
    cmsDbMocks.findOne.mockResolvedValueOnce({
      page: 'site',
      locale: 'en',
      content: {
        ...SITE_CONTENT_DEFAULTS,
        nav: {
          ...SITE_CONTENT_DEFAULTS.nav,
          logoUrl: 'https://sparksofsindri.com/uploads/ecom/logos/uploaded.png',
          logoAlt: 'Uploaded logo',
        },
      },
      updatedAt: new Date('2026-05-08T12:00:00.000Z'),
      updatedBy: 'admin',
    });

    const snapshot = await saveSiteLogo(
      'https://sparksofsindri.com/uploads/ecom/logos/uploaded.png',
      'Uploaded logo',
      'admin',
    );

    expect(cmsDbMocks.updateMany).toHaveBeenCalledWith(
      { page: 'site' },
      expect.objectContaining({
        $set: expect.objectContaining({
          'content.nav.logoUrl': 'https://sparksofsindri.com/uploads/ecom/logos/uploaded.png',
          'content.nav.logoAlt': 'Uploaded logo',
        }),
      }),
    );
    expect(snapshot.content.nav.logoUrl).toBe('https://sparksofsindri.com/uploads/ecom/logos/uploaded.png');
  });
});
