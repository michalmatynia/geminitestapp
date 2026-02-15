/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST as POST_ACCEPT } from '@/app/api/products/[id]/studio/accept/route';
import { GET as GET_STUDIO_CONFIG, PUT as PUT_STUDIO_CONFIG } from '@/app/api/products/[id]/studio/route';
import { POST as POST_SEND } from '@/app/api/products/[id]/studio/send/route';
import { GET as GET_VARIANTS } from '@/app/api/products/[id]/studio/variants/route';
import {
  getProductStudioConfig,
  setProductStudioConfig,
} from '@/features/products/services/product-studio-config';
import {
  acceptProductStudioVariant,
  getProductStudioVariants,
  sendProductImageToStudio,
} from '@/features/products/services/product-studio-service';
import { productService } from '@/features/products/services/productService';

vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandlerWithParams:
    (
      handler: (
        req: NextRequest,
        ctx: unknown,
        params: Record<string, string>
      ) => Promise<Response>
    ) =>
      async (
        req: NextRequest,
        routeCtx: { params: Promise<Record<string, string>> }
      ): Promise<Response> =>
        handler(
          req,
          {
            requestId: 'test-request-id',
          },
          await routeCtx.params
        ),
}));

vi.mock('@/features/products/services/productService', () => ({
  productService: {
    getProductById: vi.fn(),
  },
}));

vi.mock('@/features/products/services/product-studio-config', () => ({
  getProductStudioConfig: vi.fn(),
  setProductStudioConfig: vi.fn(),
}));

vi.mock('@/features/products/services/product-studio-service', () => ({
  sendProductImageToStudio: vi.fn(),
  getProductStudioVariants: vi.fn(),
  acceptProductStudioVariant: vi.fn(),
}));

describe('Product Studio API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(productService.getProductById).mockResolvedValue({
      id: 'prod-1',
    } as Awaited<ReturnType<typeof productService.getProductById>>);
  });

  it('GET /api/products/[id]/studio returns config', async () => {
    vi.mocked(getProductStudioConfig).mockResolvedValue({
      projectId: 'studio-a',
      sourceSlotByImageIndex: { '0': 'slot-1' },
      updatedAt: '2026-02-13T10:00:00.000Z',
    });

    const response = await GET_STUDIO_CONFIG(
      new NextRequest('http://localhost/api/products/prod-1/studio'),
      { params: Promise.resolve({ id: 'prod-1' }) }
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      config: { projectId: string | null };
    };
    expect(payload.config.projectId).toBe('studio-a');
    expect(getProductStudioConfig).toHaveBeenCalledWith('prod-1');
  });

  it('PUT /api/products/[id]/studio saves project', async () => {
    vi.mocked(setProductStudioConfig).mockResolvedValue({
      projectId: 'studio-b',
      sourceSlotByImageIndex: {},
      updatedAt: '2026-02-13T10:00:00.000Z',
    });

    const response = await PUT_STUDIO_CONFIG(
      new NextRequest('http://localhost/api/products/prod-1/studio', {
        method: 'PUT',
        body: JSON.stringify({ projectId: 'studio-b' }),
      }),
      { params: Promise.resolve({ id: 'prod-1' }) }
    );

    expect(response.status).toBe(200);
    expect(setProductStudioConfig).toHaveBeenCalledWith('prod-1', {
      projectId: 'studio-b',
    });
  });

  it('PUT /api/products/[id]/studio ignores legacy sequencing payload', async () => {
    vi.mocked(setProductStudioConfig).mockResolvedValue({
      projectId: 'studio-a',
      sourceSlotByImageIndex: {},
      updatedAt: '2026-02-13T10:00:00.000Z',
    });

    const response = await PUT_STUDIO_CONFIG(
      new NextRequest('http://localhost/api/products/prod-1/studio', {
        method: 'PUT',
        body: JSON.stringify({
          sequencing: {
            enabled: true,
            cropCenterBeforeGeneration: true,
            upscaleOnAccept: false,
            upscaleScale: 2,
          },
        }),
      }),
      { params: Promise.resolve({ id: 'prod-1' }) }
    );

    expect(response.status).toBe(200);
    expect(setProductStudioConfig).toHaveBeenCalledWith('prod-1', {});
  });

  it('POST /api/products/[id]/studio/send forwards request', async () => {
    vi.mocked(sendProductImageToStudio).mockResolvedValue({
      config: {
        projectId: 'studio-a',
        sourceSlotByImageIndex: { '0': 'slot-1' },
        updatedAt: '2026-02-13T10:00:00.000Z',
      },
      sequencing: { // Added sequencing
        enabled: false,
        cropCenterBeforeGeneration: false,
        upscaleOnAccept: false,
        upscaleScale: 1,
      },
      projectId: 'studio-a',
      imageSlotIndex: 0,
      sourceSlot: {
        id: 'slot-1',
      } as any,
      runId: 'run-1',
      runStatus: 'queued',
      expectedOutputs: 1,
      dispatchMode: 'queued',
    });

    const response = await POST_SEND(
      new NextRequest('http://localhost/api/products/prod-1/studio/send', {
        method: 'POST',
        body: JSON.stringify({ imageSlotIndex: 0, projectId: 'studio-a' }),
      }),
      { params: Promise.resolve({ id: 'prod-1' }) }
    );

    expect(response.status).toBe(200);
    expect(sendProductImageToStudio).toHaveBeenCalledWith({
      productId: 'prod-1',
      imageSlotIndex: 0,
      projectId: 'studio-a',
    });
  });

  it('GET /api/products/[id]/studio/variants forwards request', async () => {
    vi.mocked(getProductStudioVariants).mockResolvedValue({
      config: {
        projectId: 'studio-a',
        sourceSlotByImageIndex: { '1': 'slot-source' },
        updatedAt: '2026-02-13T10:00:00.000Z',
      },
      sequencing: {
        enabled: true,
        cropCenterBeforeGeneration: true,
        upscaleOnAccept: true,
        upscaleScale: 2,
      },
      projectId: 'studio-a',
      sourceSlotId: 'slot-source',
      sourceSlot: {
        id: 'slot-source',
      } as any,
      variants: [
        {
          id: 'variant-1',
        } as any,
      ],
    });

    const response = await GET_VARIANTS(
      new NextRequest(
        'http://localhost/api/products/prod-1/studio/variants?imageSlotIndex=1&projectId=studio-a'
      ),
      { params: Promise.resolve({ id: 'prod-1' }) }
    );

    expect(response.status).toBe(200);
    expect(getProductStudioVariants).toHaveBeenCalledWith({
      productId: 'prod-1',
      imageSlotIndex: 1,
      projectId: 'studio-a',
    });
  });

  it('POST /api/products/[id]/studio/accept forwards request', async () => {
    vi.mocked(acceptProductStudioVariant).mockResolvedValue({
      id: 'prod-1',
      images: [],
    } as any);

    const response = await POST_ACCEPT(
      new NextRequest('http://localhost/api/products/prod-1/studio/accept', {
        method: 'POST',
        body: JSON.stringify({
          imageSlotIndex: 0,
          generationSlotId: 'variant-1',
          projectId: 'studio-a',
        }),
      }),
      { params: Promise.resolve({ id: 'prod-1' }) }
    );

    expect(response.status).toBe(200);
    expect(acceptProductStudioVariant).toHaveBeenCalledWith({
      productId: 'prod-1',
      imageSlotIndex: 0,
      generationSlotId: 'variant-1',
      projectId: 'studio-a',
    });
  });
});
