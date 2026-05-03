import { describe, expect, it, vi } from 'vitest';

const {
  apiHandlerMock,
  getProductsMetadataHandlerMock,
  postProductsMetadataHandlerMock,
  querySchemaMock,
} = vi.hoisted(() => ({
  apiHandlerMock: vi.fn((handler: unknown, options: unknown) =>
    Object.assign(vi.fn(), {
      handler,
      options,
    })
  ),
  getProductsMetadataHandlerMock: vi.fn(),
  postProductsMetadataHandlerMock: vi.fn(),
  querySchemaMock: { parse: vi.fn() },
}));

vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler: apiHandlerMock,
}));

vi.mock('../metadata/handler', () => ({
  getProductsMetadataHandler: getProductsMetadataHandlerMock,
  postProductsMetadataHandler: postProductsMetadataHandlerMock,
  querySchema: querySchemaMock,
}));

import { GET, POST } from './route-handler';

describe('product simple-parameters route module', () => {
  it('exports the supported route handlers', () => {
    expect(typeof GET).toBe('function');
    expect(typeof POST).toBe('function');
  });

  it('parses catalogId query input for list requests', () => {
    expect(apiHandlerMock).toHaveBeenNthCalledWith(
      1,
      expect.any(Function),
      expect.objectContaining({
        source: 'v2.products.simple-parameters.GET',
        querySchema: querySchemaMock,
        requireAuth: true,
      })
    );
  });
});
