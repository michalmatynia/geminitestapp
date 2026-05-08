/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  uploadFile: mocks.uploadFile,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

import type { ProductScrapeCandidate } from './product-scrape-profiles.candidates';
import { resolveScrapeImagePayload } from './product-scrape-profile-images';

const candidate: ProductScrapeCandidate = {
  imageLinks: [
    'https://www.battle-stock.pl/images/first.jpg',
    'https://www.battle-stock.pl/images/second',
  ],
  price: 60,
  sku: 'BATTLESTOCK-13033',
  sourceUrl: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
  title: '40k spiritseer',
};

const createImageResponse = (type: string): Response =>
  ({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob(['image-bytes'], { type })),
    headers: {
      get: (name: string): string | null =>
        name.toLowerCase() === 'content-type' ? type : null,
    },
  }) as Response;

const createBlockedResponse = (status = 403): Response =>
  ({
    ok: false,
    status,
    blob: () => Promise.resolve(new Blob([])),
    headers: {
      get: () => null,
    },
  }) as Response;

const createSourcePageResponse = (
  setCookies: string[],
  html = '<html></html>'
): Response =>
  ({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob(['<html></html>'], { type: 'text/html' })),
    headers: {
      get: (name: string): string | null =>
        name.toLowerCase() === 'set-cookie'
          ? (setCookies[0] ?? null)
          : name.toLowerCase() === 'content-type'
            ? 'text/html'
            : null,
      getSetCookie: (): string[] => setCookies,
    },
    text: () => Promise.resolve(html),
  }) as unknown as Response;

describe('resolveScrapeImagePayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps scraped links without downloading when image import mode is links', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveScrapeImagePayload({
      candidate,
      dryRun: false,
      imageImportMode: 'links',
    });

    expect(result).toEqual({ imageLinks: candidate.imageLinks });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it('keeps scraped links without downloading when the upload image step is disabled', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveScrapeImagePayload({
      candidate,
      dryRun: false,
      imageImportMode: 'files',
      imageStepControls: { uploadProductImages: false },
    });

    expect(result).toEqual({ imageLinks: candidate.imageLinks });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it('does not use product gallery fallback images when that sequencer step is disabled', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createSourcePageResponse([], '<source srcset="/image.webp 1x">'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveScrapeImagePayload({
      candidate: { ...candidate, imageLinks: [] },
      dryRun: false,
      imageImportMode: 'files',
      imageStepControls: { collectProductGalleryImages: false },
    });

    expect(result).toEqual({ imageLinks: [] });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it('downloads scraped images, uploads them, and stores uploaded file urls in file mode', async () => {
    const firstStoredUrl =
      'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/first.jpg';
    const secondStoredUrl =
      'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/battlestock-13033-2.webp';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createImageResponse('image/jpeg'))
        .mockResolvedValueOnce(createImageResponse('image/webp'))
    );
    mocks.uploadFile
      .mockResolvedValueOnce({ id: 'image-file-1', filepath: firstStoredUrl })
      .mockResolvedValueOnce({ id: 'image-file-2', filepath: secondStoredUrl });

    const result = await resolveScrapeImagePayload({
      candidate,
      dryRun: false,
      imageImportMode: 'files',
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      'https://www.battle-stock.pl/images/first.jpg',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          accept: expect.stringContaining('image/webp'),
          referer: candidate.sourceUrl,
          'user-agent': expect.stringContaining('Mozilla/5.0'),
        }),
        redirect: 'follow',
      })
    );
    expect(result).toEqual({
      imageFileIds: ['image-file-1', 'image-file-2'],
      imageLinks: [firstStoredUrl, secondStoredUrl],
    });
    expect(mocks.uploadFile).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'first.jpg',
        type: 'image/jpeg',
      }),
      {
        category: 'products',
        filenameOverride: 'first.jpg',
        sku: 'BATTLESTOCK-13033',
      }
    );
    expect(mocks.uploadFile).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        name: 'battlestock-13033-2.webp',
        type: 'image/webp',
      }),
      {
        category: 'products',
        filenameOverride: 'battlestock-13033-2.webp',
        sku: 'BATTLESTOCK-13033',
      }
    );
  });

  it('retries a blocked scrape image download with source page cookies', async () => {
    const storedUrl =
      'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/first.jpg';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createBlockedResponse())
      .mockResolvedValueOnce(
        createSourcePageResponse(['shop-session=abc; Path=/', 'currency=PLN; Path=/'])
      )
      .mockResolvedValueOnce(createImageResponse('image/jpeg'));
    vi.stubGlobal('fetch', fetchMock);
    mocks.uploadFile.mockResolvedValueOnce({ id: 'image-file-1', filepath: storedUrl });

    const result = await resolveScrapeImagePayload({
      candidate: { ...candidate, imageLinks: [candidate.imageLinks[0]!] },
      dryRun: false,
      imageImportMode: 'files',
    });

    const firstImageInit = fetchMock.mock.calls[0]?.[1] as RequestInit & {
      headers?: Record<string, string>;
    };
    const retryImageInit = fetchMock.mock.calls[2]?.[1] as RequestInit & {
      headers?: Record<string, string>;
    };

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      candidate.imageLinks[0],
      expect.objectContaining({
        headers: expect.objectContaining({
          referer: candidate.sourceUrl,
          'user-agent': expect.stringContaining('Mozilla/5.0'),
        }),
      })
    );
    expect(firstImageInit.headers).not.toHaveProperty('cookie');
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      candidate.sourceUrl,
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          accept: expect.stringContaining('text/html'),
          'user-agent': expect.stringContaining('Mozilla/5.0'),
        }),
        redirect: 'follow',
      })
    );
    expect(retryImageInit.headers).toEqual(
      expect.objectContaining({
        cookie: 'shop-session=abc; currency=PLN',
      })
    );
    expect(result).toEqual({
      imageFileIds: ['image-file-1'],
      imageLinks: [storedUrl],
    });
  });

  it('downloads product page images when the scrape draft has no image links', async () => {
    const storedUrl =
      'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/source-page.webp';
    const sourcePageHtml = `
      <meta property="og:image" content="/environment/cache/images/productGfx_9255_500_500/source-page.jpg">
      <source srcset="/environment/cache/images/productGfx_9255_1500_1500/source-page.webp 1x">
      <img src="/environment/cache/images/productGfx_9255_50_50/source-page.jpg">
    `;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createSourcePageResponse([], sourcePageHtml))
      .mockResolvedValueOnce(createImageResponse('image/webp'));
    vi.stubGlobal('fetch', fetchMock);
    mocks.uploadFile.mockResolvedValueOnce({ id: 'image-file-1', filepath: storedUrl });

    const result = await resolveScrapeImagePayload({
      candidate: { ...candidate, imageLinks: [] },
      dryRun: false,
      imageImportMode: 'files',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, candidate.sourceUrl, expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://www.battle-stock.pl/environment/cache/images/productGfx_9255_1500_1500/source-page.webp',
      expect.any(Object)
    );
    expect(result).toEqual({
      imageFileIds: ['image-file-1'],
      imageLinks: [storedUrl],
    });
  });

  it('uses product page image links when scraped image links cannot be downloaded', async () => {
    const firstStoredUrl =
      'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/source-page-1.webp';
    const secondStoredUrl =
      'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/source-page-2.webp';
    const sourcePageHtml = `
      <source srcset="/environment/cache/images/productGfx_9255_1500_1500/source-page-1.webp 1x">
      <source srcset="/environment/cache/images/productGfx_9256_1500_1500/source-page-2.webp 1x">
    `;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createBlockedResponse())
      .mockResolvedValueOnce(createSourcePageResponse([]))
      .mockResolvedValueOnce(createSourcePageResponse([], sourcePageHtml))
      .mockResolvedValueOnce(createImageResponse('image/webp'))
      .mockResolvedValueOnce(createImageResponse('image/webp'));
    vi.stubGlobal('fetch', fetchMock);
    mocks.uploadFile
      .mockResolvedValueOnce({ id: 'image-file-1', filepath: firstStoredUrl })
      .mockResolvedValueOnce({ id: 'image-file-2', filepath: secondStoredUrl });

    const result = await resolveScrapeImagePayload({
      candidate: { ...candidate, imageLinks: [candidate.imageLinks[0]!] },
      dryRun: false,
      imageImportMode: 'files',
    });

    expect(fetchMock).toHaveBeenNthCalledWith(3, candidate.sourceUrl, expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'https://www.battle-stock.pl/environment/cache/images/productGfx_9255_1500_1500/source-page-1.webp',
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      'https://www.battle-stock.pl/environment/cache/images/productGfx_9256_1500_1500/source-page-2.webp',
      expect.any(Object)
    );
    expect(result).toEqual({
      imageFileIds: ['image-file-1', 'image-file-2'],
      imageLinks: [firstStoredUrl, secondStoredUrl],
    });
  });

  it('keeps the scraped source link when an individual file upload fails', async () => {
    const storedUrl =
      'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/first.jpg';
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createImageResponse('image/jpeg'))
        .mockResolvedValueOnce(createImageResponse('image/jpeg'))
    );
    mocks.uploadFile
      .mockResolvedValueOnce({ id: 'image-file-1', filepath: storedUrl })
      .mockRejectedValueOnce(new Error('upload failed'));

    const result = await resolveScrapeImagePayload({
      candidate,
      dryRun: false,
      imageImportMode: 'files',
    });

    expect(result).toEqual({
      imageFileIds: ['image-file-1'],
      imageLinks: [storedUrl, candidate.imageLinks[1]],
    });
    expect(mocks.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        action: 'uploadScrapeImage',
        service: 'product-scrape-profiles',
        sku: 'BATTLESTOCK-13033',
        sourceUrl: candidate.imageLinks[1],
      })
    );
  });
});
