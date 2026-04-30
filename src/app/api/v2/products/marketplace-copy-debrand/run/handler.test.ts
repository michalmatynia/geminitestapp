import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { enqueueRowRunMock, resolveIntegrationMock } = vi.hoisted(() => ({
  enqueueRowRunMock: vi.fn(),
  resolveIntegrationMock: vi.fn(),
}));

vi.mock('@/features/products/server/marketplace-copy-debrand-ai-path', () => ({
  enqueueMarketplaceCopyDebrandRowRun: (...args: unknown[]) => enqueueRowRunMock(...args),
}));

vi.mock('@/features/products/server/marketplace-copy-debrand-batch', () => ({
  resolveMarketplaceCopyDebrandIntegration: (...args: unknown[]) =>
    resolveIntegrationMock(...args),
  resolveMarketplaceCopyDebrandIntegrationName: (integration: {
    id: string;
    name: string;
    slug: string;
  }) => integration.name || integration.slug || integration.id,
}));

import { postHandler, productMarketplaceCopyDebrandRunRequestSchema } from './handler';

describe('products marketplace-copy-debrand row handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveIntegrationMock.mockImplementation(async (integrationId: string) => ({
      id: integrationId,
      slug: integrationId.replace(/^integration-/, ''),
      name: integrationId === 'integration-tradera' ? 'Tradera' : 'Vinted.pl',
    }));
    enqueueRowRunMock.mockResolvedValue('run-row-1');
  });

  it('exports the row handler and request schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof productMarketplaceCopyDebrandRunRequestSchema.safeParse).toBe('function');
  });

  it('queues a Redis runtime row debrand run with normalized marketplace integrations', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/products/marketplace-copy-debrand/run', {
        method: 'POST',
      }),
      {
        body: {
          productId: 'product-1',
          entityJson: {
            id: 'product-1',
            name_en: 'Warhammer branded title',
          },
          marketplaceCopyDebrandInput: {
            sourceEnglishTitle: 'Warhammer branded title',
            sourceEnglishDescription: 'Official branded description',
            targetRow: {
              id: 'row-1',
              index: 0,
              integrationIds: ['integration-tradera', 'integration-tradera', 'integration-vinted'],
              integrationNames: [],
              currentAlternateTitle: 'Old title',
              currentAlternateDescription: 'Old description',
            },
          },
        },
        userId: 'user-42',
      } as ApiHandlerContext
    );

    expect(resolveIntegrationMock).toHaveBeenCalledTimes(2);
    expect(enqueueRowRunMock).toHaveBeenCalledWith({
      productId: 'product-1',
      entityJson: {
        id: 'product-1',
        name_en: 'Warhammer branded title',
      },
      marketplaceCopyDebrandInput: expect.objectContaining({
        targetRow: expect.objectContaining({
          integrationIds: ['integration-tradera', 'integration-vinted'],
          integrationNames: ['Tradera', 'Vinted.pl'],
        }),
      }),
      integration: {
        id: 'integration-tradera',
        slug: 'tradera',
        name: 'Tradera',
      },
      userId: 'user-42',
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: 'queued',
      runId: 'run-row-1',
      productId: 'product-1',
    });
  });
});
