import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const mocks = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  analyzeKangurSocialVisualsMock: vi.fn(),
  findKangurSocialImageAddonsByIdsMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => mocks.resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/server/social-posts-vision', () => ({
  analyzeKangurSocialVisuals: (...args: unknown[]) =>
    mocks.analyzeKangurSocialVisualsMock(...args),
}));

vi.mock('@/features/kangur/server/social-image-addons-repository', () => ({
  findKangurSocialImageAddonsByIds: (...args: unknown[]) =>
    mocks.findKangurSocialImageAddonsByIdsMock(...args),
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: (...args: unknown[]) => mocks.logKangurServerEventMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import { postKangurSocialPostAnalyzeVisualsHandler } from './handler';

const createContext = (body?: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-social-analyze-1',
    traceId: 'trace-social-analyze-1',
    correlationId: 'corr-social-analyze-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('social post analyze visuals handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKangurActorMock.mockResolvedValue({
      role: 'admin',
      actorId: 'admin-1',
    });
    mocks.findKangurSocialImageAddonsByIdsMock.mockResolvedValue([
      { id: 'addon-1', title: 'Homepage hero' },
    ]);
    mocks.analyzeKangurSocialVisualsMock.mockResolvedValue({
      summary: 'The hero now uses a larger classroom card.',
      highlights: ['Larger classroom card'],
      docUpdates: [],
    });
  });

  it('returns structured visual analysis for the selected image add-ons', async () => {
    const response = await postKangurSocialPostAnalyzeVisualsHandler(
      new NextRequest('http://localhost/api/kangur/social-posts/analyze-visuals', {
        method: 'POST',
      }),
      createContext({
        postId: 'post-1',
        docReferences: ['overview'],
        notes: 'Focus on homepage changes.',
        visionModelId: 'vision-1',
        imageAddonIds: ['addon-1'],
      })
    );

    expect(mocks.findKangurSocialImageAddonsByIdsMock).toHaveBeenCalledWith(['addon-1']);
    expect(mocks.analyzeKangurSocialVisualsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        docReferences: ['overview'],
        notes: 'Focus on homepage changes.',
        modelId: 'vision-1',
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: 'The hero now uses a larger classroom card.',
      highlights: ['Larger classroom card'],
      docUpdates: [],
    });
  });
});
