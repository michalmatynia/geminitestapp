import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  exportProductToEcommerceMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  exportProductToEcommerce: (...args: unknown[]) =>
    mocks.exportProductToEcommerceMock(...args),
}));

import { postExportToEcommerceHandler } from './handler';

describe('product export-to-ecommerce handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exportProductToEcommerceMock.mockResolvedValue({
      success: true,
      productId: 'product-123',
      status: 'created',
      ecommerceProductId: 'product-123',
      slug: 'product-123',
      exportedAt: '2026-05-12T18:00:00.000Z',
    });
  });

  it('exports one product through the ecommerce export service', async () => {
    const response = await postExportToEcommerceHandler(
      {} as NextRequest,
      {} as ApiHandlerContext,
      { id: ' product-123 ' }
    );

    expect(mocks.exportProductToEcommerceMock).toHaveBeenCalledWith('product-123');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      success: true,
      productId: 'product-123',
      status: 'created',
      ecommerceProductId: 'product-123',
      slug: 'product-123',
      exportedAt: '2026-05-12T18:00:00.000Z',
    });
  });

  it('rejects blank product ids before calling the export service', async () => {
    await expect(
      postExportToEcommerceHandler(
        {} as NextRequest,
        {} as ApiHandlerContext,
        { id: '   ' }
      )
    ).rejects.toMatchObject({
      message: 'Invalid route parameters',
      httpStatus: 400,
    });

    expect(mocks.exportProductToEcommerceMock).not.toHaveBeenCalled();
  });
});
