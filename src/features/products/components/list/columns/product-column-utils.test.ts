import { describe, expect, it } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  hasFilledMarketplaceCopy,
  hasAnyProductImageStorageStatus,
  hasEnglishProductDescription,
  hasEnglishProductTitle,
  hasPolishProductDescription,
  hasPolishProductTitle,
  getImageFilepath,
  resolveEffectiveDefaultPriceGroupId,
  resolveMarketplaceStatusWithLocalFeedback,
  resolveProductImageStorageStatus,
} from './product-column-utils';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
    baseProductId: null,
    importSource: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Keychain', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Keychain',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 3,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: 'category-1',
    catalogId: 'catalog-1',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('resolveEffectiveDefaultPriceGroupId', () => {
  it('prefers the product default price group when it is present', () => {
    const product = createProduct({
      defaultPriceGroupId: ' product-group ',
      catalogId: 'catalog-1',
    });

    expect(
      resolveEffectiveDefaultPriceGroupId(
        product,
        new Map([['catalog-1', 'catalog-group']])
      )
    ).toBe('product-group');
  });

  it('falls back to the catalog default price group when the product default is missing', () => {
    const product = createProduct({
      defaultPriceGroupId: null,
      catalogId: ' catalog-1 ',
    });

    expect(
      resolveEffectiveDefaultPriceGroupId(
        product,
        new Map([['catalog-1', 'catalog-group']])
      )
    ).toBe('catalog-group');
  });

  it('returns null when neither product nor catalog provide a default price group', () => {
    const product = createProduct({
      defaultPriceGroupId: '',
      catalogId: 'catalog-1',
    });

    expect(resolveEffectiveDefaultPriceGroupId(product, new Map())).toBeNull();
  });
});

describe('getImageFilepath', () => {
  it('prefers filepath and falls back to public image URL fields', () => {
    expect(
      getImageFilepath({
        filepath: ' /uploads/products/SKU/photo.webp ',
        publicUrl: 'https://files.example.test/photo.webp',
      })
    ).toBe(' /uploads/products/SKU/photo.webp ');
    expect(getImageFilepath({ filepath: '', publicUrl: 'https://files.example.test/a.webp' }))
      .toBe('https://files.example.test/a.webp');
    expect(getImageFilepath({ url: 'https://files.example.test/b.webp' }))
      .toBe('https://files.example.test/b.webp');
    expect(getImageFilepath({ thumbnailUrl: 'https://files.example.test/thumb.webp' }))
      .toBe('https://files.example.test/thumb.webp');
  });
});

describe('resolveMarketplaceStatusWithLocalFeedback', () => {
  it('promotes stale recovery statuses to active when local feedback is completed', () => {
    expect(
      resolveMarketplaceStatusWithLocalFeedback({
        serverStatus: 'auth_required',
        localFeedbackStatus: 'completed',
      })
    ).toBe('active');
  });

  it('prefers in-flight local feedback over stale failure statuses', () => {
    expect(
      resolveMarketplaceStatusWithLocalFeedback({
        serverStatus: 'failed',
        localFeedbackStatus: 'queued',
      })
    ).toBe('queued');
  });

  it('prefers expired local recovery feedback over stale in-flight server statuses', () => {
    expect(
      resolveMarketplaceStatusWithLocalFeedback({
        serverStatus: 'queued',
        localFeedbackStatus: 'failed',
      })
    ).toBe('failed');
  });

  it('keeps the server status when it is already successful', () => {
    expect(
      resolveMarketplaceStatusWithLocalFeedback({
        serverStatus: 'active',
        localFeedbackStatus: 'completed',
      })
    ).toBe('active');
  });
});

describe('product list status helpers', () => {
  it('detects FastComet, local, and external-link image storage statuses', () => {
    const product = createProduct({
      imageLinks: [' https://cdn.example.test/source.jpg '],
      images: [
        {
          productId: 'product-1',
          imageFileId: 'fastcomet-image',
          assignedAt: '2026-01-01T00:00:00.000Z',
          imageFile: {
            id: 'fastcomet-image',
            filename: 'fastcomet.jpg',
            filepath: 'https://sparksofsindri.com/uploads/products/SKU/fastcomet.jpg',
            mimetype: 'image/jpeg',
            size: 1,
            storageProvider: 'fastcomet',
            metadata: {
              localPublicPath: '/uploads/products/SKU/fastcomet.jpg',
              mirroredLocally: true,
              storageSource: 'fastcomet',
            },
          },
        },
      ] as ProductWithImages['images'],
    });

    const status = resolveProductImageStorageStatus(product);

    expect(status).toEqual({
      hasFastCometImage: true,
      hasLocalImage: true,
      hasExternalLinkImage: true,
    });
    expect(hasAnyProductImageStorageStatus(status)).toBe(true);
  });

  it('treats direct FastComet uploads without a mirror as remote-only images', () => {
    const status = resolveProductImageStorageStatus(
      createProduct({
        images: [
          {
            productId: 'product-1',
            imageFileId: 'fastcomet-image',
            assignedAt: '2026-01-01T00:00:00.000Z',
            imageFile: {
              id: 'fastcomet-image',
              filename: 'fastcomet.jpg',
              filepath: 'https://sparksofsindri.com/uploads/products/SKU/fastcomet.jpg',
              mimetype: 'image/jpeg',
              size: 1,
              storageProvider: 'fastcomet',
              metadata: {
                mirroredLocally: false,
                storageSource: 'fastcomet',
              },
            },
          },
        ] as ProductWithImages['images'],
      })
    );

    expect(status).toEqual({
      hasFastCometImage: true,
      hasLocalImage: false,
      hasExternalLinkImage: false,
    });
  });

  it('detects legacy local uploads from non-http image file paths', () => {
    const status = resolveProductImageStorageStatus(
      createProduct({
        images: [
          {
            productId: 'product-1',
            imageFileId: 'local-image',
            assignedAt: '2026-01-01T00:00:00.000Z',
            imageFile: {
              id: 'local-image',
              filename: 'local.jpg',
              filepath: '/uploads/products/SKU/local.jpg',
              mimetype: 'image/jpeg',
              size: 1,
            },
          },
        ] as ProductWithImages['images'],
      })
    );

    expect(status).toEqual({
      hasFastCometImage: false,
      hasLocalImage: true,
      hasExternalLinkImage: false,
    });
  });

  it('detects marketplace copy only when an assigned override has title or description text', () => {
    expect(
      hasFilledMarketplaceCopy(
        createProduct({
          marketplaceContentOverrides: [
            {
              integrationIds: ['tradera'],
              title: '  ',
              description: null,
            },
          ],
        })
      )
    ).toBe(false);

    expect(
      hasFilledMarketplaceCopy(
        createProduct({
          marketplaceContentOverrides: [
            {
              integrationIds: ['tradera'],
              title: '',
              description: ' Marketplace description ',
            },
          ],
        })
      )
    ).toBe(true);
  });

  it('detects direct and nested English titles', () => {
    expect(hasEnglishProductTitle(createProduct({ name_en: ' Keychain ' }))).toBe(true);
    expect(
      hasEnglishProductTitle(
        createProduct({
          name: { en: 'Pendant', pl: null, de: null },
          name_en: null,
        })
      )
    ).toBe(true);
    expect(
      hasEnglishProductTitle(createProduct({ name: { en: '', pl: null, de: null }, name_en: ' ' }))
    ).toBe(false);
  });

  it('detects direct and nested English descriptions', () => {
    expect(
      hasEnglishProductDescription(createProduct({ description_en: ' English description ' }))
    ).toBe(true);
    expect(
      hasEnglishProductDescription(
        createProduct({
          description: { en: 'Description', pl: null, de: null },
          description_en: null,
        })
      )
    ).toBe(true);
    expect(hasEnglishProductDescription(createProduct({ description_en: ' ' }))).toBe(false);
  });

  it('detects direct and nested Polish titles', () => {
    expect(hasPolishProductTitle(createProduct({ name_pl: ' Brelok ' }))).toBe(true);
    expect(
      hasPolishProductTitle(
        createProduct({
          name: { en: 'Keychain', pl: 'Wisiorek', de: null },
          name_pl: null,
        })
      )
    ).toBe(true);
    expect(hasPolishProductTitle(createProduct({ name_pl: ' ' }))).toBe(false);
  });

  it('detects direct and nested Polish descriptions', () => {
    expect(hasPolishProductDescription(createProduct({ description_pl: ' Polski opis ' }))).toBe(
      true
    );
    expect(
      hasPolishProductDescription(
        createProduct({
          description: { en: '', pl: 'Opis', de: null },
          description_pl: null,
        })
      )
    ).toBe(true);
    expect(hasPolishProductDescription(createProduct({ description_pl: ' ' }))).toBe(false);
  });
});
