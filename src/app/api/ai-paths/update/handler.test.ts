import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAiPathsAccessOrInternalMock,
  enforceAiPathsActionRateLimitMock,
  ensureAiPathsPermissionMock,
  parseJsonBodyMock,
  productUpdateSafeParseMock,
  noteUpdateSafeParseMock,
  getAppDbProviderMock,
  getProductDataProviderMock,
  getProductRepositoryMock,
  repositoryUpdateProductMock,
  productGetByIdMock,
  productUpdateMock,
  noteGetByIdMock,
  noteUpdateMock,
} = vi.hoisted(() => ({
  requireAiPathsAccessOrInternalMock: vi.fn(),
  enforceAiPathsActionRateLimitMock: vi.fn(),
  ensureAiPathsPermissionMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  productUpdateSafeParseMock: vi.fn(),
  noteUpdateSafeParseMock: vi.fn(),
  getAppDbProviderMock: vi.fn(),
  getProductDataProviderMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  repositoryUpdateProductMock: vi.fn(),
  productGetByIdMock: vi.fn(),
  productUpdateMock: vi.fn(),
  noteGetByIdMock: vi.fn(),
  noteUpdateMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  enforceAiPathsActionRateLimit: enforceAiPathsActionRateLimitMock,
  ensureAiPathsPermission: ensureAiPathsPermissionMock,
  requireAiPathsAccessOrInternal: requireAiPathsAccessOrInternalMock,
}));

vi.mock('@/features/notesapp', () => ({
  noteUpdateSchema: {
    safeParse: noteUpdateSafeParseMock,
  },
}));

vi.mock('@/features/notesapp/server', () => ({
  noteService: {
    getById: noteGetByIdMock,
    update: noteUpdateMock,
  },
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
  productUpdateSchema: {
    safeParse: productUpdateSafeParseMock,
  },
  getProductDataProvider: getProductDataProviderMock,
  productService: {
    getProductById: productGetByIdMock,
    updateProduct: productUpdateMock,
  },
  getProductRepository: getProductRepositoryMock,
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: getAppDbProviderMock,
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: getProductDataProviderMock,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: getProductRepositoryMock,
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: productGetByIdMock,
    updateProduct: productUpdateMock,
  },
}));

import { POST_handler } from './handler';

describe('ai-paths update handler', () => {
  beforeEach(() => {
    requireAiPathsAccessOrInternalMock.mockReset().mockResolvedValue({
      access: { id: 'access-1' },
      isInternal: false,
    });
    enforceAiPathsActionRateLimitMock.mockReset().mockResolvedValue(undefined);
    ensureAiPathsPermissionMock.mockReset().mockReturnValue(undefined);
    parseJsonBodyMock.mockReset().mockResolvedValue({
      ok: true,
      data: {
        entityType: 'product',
        entityId: 'product-1',
        updates: {
          parameters: [],
        },
      },
    });
    productUpdateSafeParseMock.mockReset().mockImplementation((value: unknown) => ({
      success: true,
      data: value,
    }));
    noteUpdateSafeParseMock.mockReset().mockImplementation((value: unknown) => ({
      success: true,
      data: value,
    }));
    getAppDbProviderMock.mockReset().mockResolvedValue({});
    getProductDataProviderMock.mockReset().mockResolvedValue('mongodb');
    repositoryUpdateProductMock.mockReset().mockResolvedValue({ id: 'product-1' });
    getProductRepositoryMock.mockReset().mockResolvedValue({
      updateProduct: repositoryUpdateProductMock,
    });
    productGetByIdMock.mockReset().mockResolvedValue({
      id: 'product-1',
      parameters: [{ parameterId: 'param-1', value: 'value-1' }],
      noteIds: ['old-note'],
    });
    productUpdateMock.mockReset().mockResolvedValue({ id: 'product-1' });
    noteGetByIdMock.mockReset();
    noteUpdateMock.mockReset();
  });

  it('routes product updates through productService instead of the repository', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entityType: 'product',
          entityId: 'product-1',
          updates: { parameters: [] },
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(productUpdateSafeParseMock).toHaveBeenCalledWith({ parameters: [] });
    expect(productUpdateMock).toHaveBeenCalledWith('product-1', { parameters: [] });
    expect(getProductRepositoryMock).not.toHaveBeenCalled();
    expect(repositoryUpdateProductMock).not.toHaveBeenCalled();
  });

  it('uses the product service read and write path for append mode merges', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        entityType: 'product',
        entityId: 'product-1',
        mode: 'append',
        updates: {
          parameters: [{ parameterId: 'param-2', value: 'value-2' }],
          noteIds: ['new-note'],
        },
      },
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entityType: 'product',
          entityId: 'product-1',
          mode: 'append',
          updates: {
            parameters: [{ parameterId: 'param-2', value: 'value-2' }],
            noteIds: ['new-note'],
          },
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(productGetByIdMock).toHaveBeenCalledWith('product-1');
    expect(productUpdateSafeParseMock).toHaveBeenCalledWith({
      noteIds: ['old-note', 'new-note'],
      parameters: [
        { parameterId: 'param-1', value: 'value-1' },
        { parameterId: 'param-2', value: 'value-2' },
      ],
    });
    expect(productUpdateMock).toHaveBeenCalledWith('product-1', {
      noteIds: ['old-note', 'new-note'],
      parameters: [
        { parameterId: 'param-1', value: 'value-1' },
        { parameterId: 'param-2', value: 'value-2' },
      ],
    });
    expect(getProductRepositoryMock).not.toHaveBeenCalled();
    expect(repositoryUpdateProductMock).not.toHaveBeenCalled();
  });
});
