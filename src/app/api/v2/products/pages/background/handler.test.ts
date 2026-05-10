import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  readEcommercePagesCmsBackground: vi.fn(),
  saveEcommercePagesCmsBackground: vi.fn(),
}));

vi.mock('@/features/products/pages/ecommerce-pages-cms/ecommerce-pages-cms.server', () => ({
  readEcommercePagesCmsBackground: mocks.readEcommercePagesCmsBackground,
  saveEcommercePagesCmsBackground: mocks.saveEcommercePagesCmsBackground,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

import { getHandler, putHandler } from './handler';

const buildContext = (userId: string | null = 'user-1'): ApiHandlerContext => ({
  correlationId: 'correlation-1',
  getElapsedMs: () => 0,
  requestId: 'request-1',
  startTime: 0,
  traceId: 'trace-1',
  userId,
});

const buildPutRequest = (body: unknown): NextRequest =>
  new Request('http://localhost/api/v2/products/pages/background', {
    method: 'PUT',
    body: JSON.stringify(body),
  }) as NextRequest;

describe('products pages CMS background handler', () => {
  beforeEach(() => {
    mocks.readEcommercePagesCmsBackground.mockReset();
    mocks.saveEcommercePagesCmsBackground.mockReset();
  });

  it('returns the saved background settings', async () => {
    mocks.readEcommercePagesCmsBackground.mockResolvedValue({
      cloudConfigured: true,
      cosmosParallaxEnabled: true,
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'user-1',
    });

    const response = await getHandler(
      new Request('http://localhost/api/v2/products/pages/background') as NextRequest,
      buildContext()
    );
    const body = (await response.json()) as {
      ok: boolean;
      background: { cosmosParallaxEnabled: boolean };
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      background: expect.objectContaining({ cosmosParallaxEnabled: true }),
    });
  });

  it('saves background settings with the authenticated user id', async () => {
    mocks.saveEcommercePagesCmsBackground.mockResolvedValue({
      cloudConfigured: true,
      cloudMirrored: true,
      cosmosParallaxEnabled: false,
      updatedAt: '2026-05-10T12:00:00.000Z',
      updatedBy: 'admin-1',
    });

    const response = await putHandler(
      buildPutRequest({ background: { cosmosParallaxEnabled: false } }),
      buildContext('admin-1')
    );
    const body = (await response.json()) as { background: { cloudMirrored: boolean } };

    expect(response.status).toBe(200);
    expect(body.background.cloudMirrored).toBe(true);
    expect(mocks.saveEcommercePagesCmsBackground).toHaveBeenCalledWith({
      background: { cosmosParallaxEnabled: false },
      userId: 'admin-1',
    });
  });

  it('rejects invalid background settings payloads', async () => {
    await expect(
      putHandler(buildPutRequest({ background: { cosmosParallaxEnabled: 'yes' } }), buildContext())
    ).rejects.toThrow('cosmosParallaxEnabled');
    expect(mocks.saveEcommercePagesCmsBackground).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated save requests before parsing the payload', async () => {
    await expect(putHandler(buildPutRequest({}), buildContext(null))).rejects.toThrow(
      'Unauthorized'
    );
    expect(mocks.saveEcommercePagesCmsBackground).not.toHaveBeenCalled();
  });
});
