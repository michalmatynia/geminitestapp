import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const mocks = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  generateKangurSocialPostDraftMock: vi.fn(),
  updateKangurSocialPostMock: vi.fn(),
  findKangurSocialImageAddonsByIdsMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => mocks.resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/server/social-posts-generation', () => ({
  generateKangurSocialPostDraft: (...args: unknown[]) =>
    mocks.generateKangurSocialPostDraftMock(...args),
}));

vi.mock('@/features/kangur/server/social-posts-repository', () => ({
  updateKangurSocialPost: (...args: unknown[]) => mocks.updateKangurSocialPostMock(...args),
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

import { postKangurSocialPostGenerateHandler } from './handler';

const createContext = (body?: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-social-generate-1',
    traceId: 'trace-social-generate-1',
    correlationId: 'corr-social-generate-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('social post generate handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveKangurActorMock.mockResolvedValue({
      role: 'admin',
      actorId: 'admin-1',
    });
    mocks.findKangurSocialImageAddonsByIdsMock.mockResolvedValue([]);
    mocks.generateKangurSocialPostDraftMock.mockResolvedValue({
      titlePl: 'Generated PL',
      titleEn: 'Generated EN',
      bodyPl: 'Generated body PL',
      bodyEn: 'Generated body EN',
      combinedBody: 'Generated body PL\n\n---\n\nGenerated body EN',
      summary: 'Loaded context summary',
      docReferences: ['overview'],
      visualSummary: null,
      visualHighlights: [],
      visualDocUpdates: [],
    });
    mocks.updateKangurSocialPostMock.mockImplementation(
      async (id: string, updates: Record<string, unknown>) => ({
        id,
        ...updates,
      })
    );
  });

  it('persists the generated context summary when updating an existing post', async () => {
    const response = await postKangurSocialPostGenerateHandler(
      new NextRequest('http://localhost/api/kangur/social-posts/generate', {
        method: 'POST',
      }),
      createContext({
        postId: 'post-1',
        docReferences: ['overview'],
        notes: 'Focus on onboarding.',
        modelId: 'brain-1',
        visionModelId: 'vision-1',
        imageAddonIds: [],
        projectUrl: 'https://studiq.example.com/project',
      })
    );

    expect(mocks.updateKangurSocialPostMock).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        titlePl: 'Generated PL',
        titleEn: 'Generated EN',
        generatedSummary: 'Loaded context summary',
        contextSummary: 'Loaded context summary',
        docReferences: ['overview'],
        status: 'draft',
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'post-1',
        generatedSummary: 'Loaded context summary',
        contextSummary: 'Loaded context summary',
      })
    );
  });
});
