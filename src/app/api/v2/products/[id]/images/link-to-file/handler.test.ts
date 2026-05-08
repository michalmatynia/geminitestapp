/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';

const mocks = vi.hoisted(() => ({
  getProductById: vi.fn(),
  getProductRepository: vi.fn(),
  invalidateProduct: vi.fn(),
  parseJsonBody: vi.fn(),
  replaceProductImages: vi.fn(),
  updateProduct: vi.fn(),
  uploadFile: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: mocks.parseJsonBody,
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateProduct: mocks.invalidateProduct,
  },
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  uploadFile: mocks.uploadFile,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: mocks.getProductRepository,
}));

import { postHandler } from './handler';

type LinkedImageRequest = Request & {
  json: () => Promise<unknown>;
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

const createHtmlResponse = (): Response =>
  ({
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob(['<html>challenge</html>'], { type: 'text/html' })),
    headers: {
      get: (name: string): string | null =>
        name.toLowerCase() === 'content-type' ? 'text/html' : null,
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

const createSourcePageResponse = (setCookies: string[]): Response =>
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
    text: () => Promise.resolve('<html></html>'),
  }) as unknown as Response;

const createRequest = (body: unknown): LinkedImageRequest =>
  ({
    json: () => Promise.resolve(body),
  }) as LinkedImageRequest;

describe('product image link-to-file handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mocks.parseJsonBody.mockImplementation(
      async (req: LinkedImageRequest, schema: z.ZodType): Promise<unknown> => {
        const parsed = schema.safeParse(await req.json());
        if (!parsed.success) {
          return { ok: false, response: new Response(null, { status: 400 }) };
        }
        return { ok: true, data: parsed.data };
      }
    );
    mocks.getProductRepository.mockResolvedValue({
      getProductById: mocks.getProductById,
      replaceProductImages: mocks.replaceProductImages,
      updateProduct: mocks.updateProduct,
    });
  });

  it('exports the supported handlers', () => {
    expect(typeof postHandler).toBe('function');
  });

  it('downloads a linked image with product-page cookie retry and replaces the linked slot', async () => {
    const product = {
      id: 'product-1',
      imageBase64s: [''],
      imageLinks: ['https://cdn.fastcomet.example/images/miniature.webp'],
      images: [],
      sku: 'BATTLESTOCK-13033',
      supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
    };
    const updatedProduct = {
      ...product,
      imageLinks: [''],
      images: [{ imageFileId: 'image-file-1' }],
    };
    mocks.getProductById.mockResolvedValueOnce(product).mockResolvedValueOnce(updatedProduct);
    mocks.uploadFile.mockResolvedValueOnce({
      id: 'image-file-1',
      filepath: 'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/miniature.webp',
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createBlockedResponse())
      .mockResolvedValueOnce(createSourcePageResponse(['shop-session=abc; Path=/']))
      .mockResolvedValueOnce(createImageResponse('image/webp'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await postHandler(
      createRequest({
        imageSlotIndex: 0,
        url: 'https://cdn.fastcomet.example/images/miniature.webp',
      }) as never,
      {} as never,
      { id: ' product-1 ' }
    );
    const json = await response.json();

    const retryImageInit = fetchMock.mock.calls[2]?.[1] as RequestInit & {
      headers?: Record<string, string>;
    };

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://cdn.fastcomet.example/images/miniature.webp',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          referer: product.supplierLink,
          'user-agent': expect.stringContaining('Mozilla/5.0'),
        }),
        redirect: 'follow',
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      product.supplierLink,
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
        cookie: 'shop-session=abc',
      })
    );
    expect(mocks.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'miniature.webp',
        type: 'image/webp',
      }),
      {
        category: 'products',
        filenameOverride: 'miniature.webp',
        sku: 'BATTLESTOCK-13033',
      }
    );
    expect(mocks.updateProduct).toHaveBeenCalledWith('product-1', {
      imageBase64s: [''],
      imageLinks: [''],
    });
    expect(mocks.replaceProductImages).toHaveBeenCalledWith('product-1', ['image-file-1']);
    expect(mocks.invalidateProduct).toHaveBeenCalledWith('product-1');
    expect(json).toEqual({
      imageFile: {
        id: 'image-file-1',
        filepath:
          'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/miniature.webp',
      },
      product: updatedProduct,
      status: 'ok',
    });
  });

  it('retries with product-page cookies when the first image response is an HTML challenge', async () => {
    const product = {
      id: 'product-1',
      imageBase64s: [],
      imageLinks: [],
      images: [],
      sku: 'BATTLESTOCK-13033',
      supplierLink: 'https://www.battle-stock.pl/pl/p/40k-spiritseer/13033',
    };
    mocks.getProductById.mockResolvedValueOnce(product);
    mocks.uploadFile.mockResolvedValueOnce({
      id: 'image-file-1',
      filepath: 'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/photo.jpg',
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createHtmlResponse())
      .mockResolvedValueOnce(createSourcePageResponse(['cf_clearance=abc; Path=/']))
      .mockResolvedValueOnce(createImageResponse('image/jpeg'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await postHandler(
      createRequest({
        url: 'https://cdn.fastcomet.example/images/photo.jpg',
      }) as never,
      {} as never,
      { id: 'product-1' }
    );
    const json = await response.json();

    const retryImageInit = fetchMock.mock.calls[2]?.[1] as RequestInit & {
      headers?: Record<string, string>;
    };

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      product.supplierLink,
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          accept: expect.stringContaining('text/html'),
        }),
        redirect: 'follow',
      })
    );
    expect(retryImageInit.headers).toEqual(
      expect.objectContaining({
        cookie: 'cf_clearance=abc',
      })
    );
    expect(mocks.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'photo.jpg',
        type: 'image/jpeg',
      }),
      {
        category: 'products',
        filenameOverride: 'photo.jpg',
        sku: 'BATTLESTOCK-13033',
      }
    );
    expect(json).toEqual({
      imageFile: {
        id: 'image-file-1',
        filepath: 'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/photo.jpg',
      },
      status: 'ok',
    });
  });

  it('accepts octet-stream image responses when the linked URL has an image extension', async () => {
    const product = {
      id: 'product-1',
      imageBase64s: [],
      imageLinks: [],
      images: [],
      sku: 'BATTLESTOCK-13033',
      supplierLink: null,
    };
    mocks.getProductById.mockResolvedValueOnce(product);
    mocks.uploadFile.mockResolvedValueOnce({
      id: 'image-file-1',
      filepath: 'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/photo.jpg',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(createImageResponse('application/octet-stream'))
    );

    const response = await postHandler(
      createRequest({
        url: 'https://cdn.fastcomet.example/images/photo.jpg',
      }) as never,
      {} as never,
      { id: 'product-1' }
    );
    const json = await response.json();

    expect(mocks.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'photo.jpg',
        type: 'image/jpeg',
      }),
      {
        category: 'products',
        filenameOverride: 'photo.jpg',
        sku: 'BATTLESTOCK-13033',
      }
    );
    expect(json).toEqual({
      imageFile: {
        id: 'image-file-1',
        filepath: 'https://sparksofsindri.com/uploads/products/BATTLESTOCK-13033/photo.jpg',
      },
      status: 'ok',
    });
    expect(mocks.invalidateProduct).not.toHaveBeenCalled();
  });
});
