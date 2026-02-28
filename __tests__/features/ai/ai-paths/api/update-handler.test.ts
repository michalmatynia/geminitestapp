/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST_handler } from '@/app/api/ai-paths/update/handler';
import {
  enforceAiPathsActionRateLimit,
  ensureAiPathsPermission,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import { getProductRepository } from '@/features/products/server';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';

vi.mock('@/features/ai/ai-paths/server', () => ({
  requireAiPathsAccessOrInternal: vi.fn(),
  enforceAiPathsActionRateLimit: vi.fn(),
  ensureAiPathsPermission: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: vi.fn(),
}));

vi.mock('@/shared/lib/db/app-db-provider', () => ({
  getAppDbProvider: vi.fn(),
}));

vi.mock('@/features/products/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/products/server')>();
  return {
    ...actual,
    getProductRepository: vi.fn(),
  };
});

describe('AI Paths update handler', () => {
  const productRepository = {
    getProductById: vi.fn(),
    updateProduct: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAiPathsAccessOrInternal).mockResolvedValue({
      access: {
        userId: 'user-1',
        permissions: ['products.manage', 'ai_paths.manage'],
        isElevated: true,
      },
      isInternal: false,
    });
    vi.mocked(enforceAiPathsActionRateLimit).mockResolvedValue(undefined);
    vi.mocked(ensureAiPathsPermission).mockImplementation(() => {});
    vi.mocked(getAppDbProvider).mockResolvedValue('mongodb');
    vi.mocked(getProductDataProvider).mockResolvedValue('mongodb');
    vi.mocked(getProductRepository).mockResolvedValue(
      productRepository as unknown as Awaited<ReturnType<typeof getProductRepository>>
    );
  });

  it('merges simple parameter inference into existing product parameters without touching custom fields', async () => {
    productRepository.getProductById.mockResolvedValue({
      id: 'product-1',
      parameters: [
        {
          parameterId: 'cf_model_name',
          value: 'X100',
          valuesByLanguage: { en: 'X100' },
        },
        { parameterId: 'sp:p_color', value: '' },
        { parameterId: 'sp:p_material', value: 'Steel' },
        { parameterId: 'sp:p_model_number', value: '' },
      ],
    });
    productRepository.updateProduct.mockResolvedValue({
      id: 'product-1',
    });

    const request = new NextRequest('http://localhost/api/ai-paths/update', {
      method: 'POST',
      body: JSON.stringify({
        entityType: 'product',
        entityId: 'product-1',
        updates: {
          simpleParameters: [
            { parameterId: 'p_color', value: 'Blue' },
            { parameterId: 'p_material', value: 'Plastic' },
            { parameterId: 'p_unknown', value: 'Ignored' },
          ],
        },
      }),
    });

    const response = await POST_handler(request, {} as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      entityType: 'product',
      entityId: 'product-1',
    });
    expect(productRepository.updateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        parameters: [
          {
            parameterId: 'cf_model_name',
            value: 'X100',
            valuesByLanguage: { en: 'X100' },
          },
          { parameterId: 'sp:p_color', value: 'Blue' },
          { parameterId: 'sp:p_material', value: 'Steel' },
          { parameterId: 'sp:p_model_number', value: '' },
        ],
      })
    );
    expect(productRepository.updateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.not.objectContaining({
        simpleParameters: expect.anything(),
      })
    );
  });
});
