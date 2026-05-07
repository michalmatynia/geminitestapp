/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  buildKangurDocContextMock: vi.fn(),
  resolveKangurDocReferencesMock: vi.fn(),
  createSocialPublishingImageAddonsBatchMock: vi.fn(),
  generateSocialPublishingPostDraftMock: vi.fn(),
  findSocialPublishingImageAddonsByIdsMock: vi.fn(),
  getSocialPublishingPostByIdMock: vi.fn(),
  updateSocialPublishingPostMock: vi.fn(),
  upsertSocialPublishingPostMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('./social-posts-docs', () => ({
  buildKangurDocContext: (...args: unknown[]) => mocks.buildKangurDocContextMock(...args),
  resolveKangurDocReferences: (...args: unknown[]) =>
    mocks.resolveKangurDocReferencesMock(...args),
}));

vi.mock('./social-image-addons-batch', () => ({
  createSocialPublishingImageAddonsBatch: (...args: unknown[]) =>
    mocks.createSocialPublishingImageAddonsBatchMock(...args),
}));

vi.mock('./social-posts-generation', () => ({
  generateSocialPublishingPostDraft: (...args: unknown[]) =>
    mocks.generateSocialPublishingPostDraftMock(...args),
}));

vi.mock('./social-image-addons-repository', () => ({
  findSocialPublishingImageAddonsByIds: (...args: unknown[]) =>
    mocks.findSocialPublishingImageAddonsByIdsMock(...args),
}));

vi.mock('./social-posts-repository', () => ({
  getSocialPublishingPostById: (...args: unknown[]) =>
    mocks.getSocialPublishingPostByIdMock(...args),
  updateSocialPublishingPost: (...args: unknown[]) =>
    mocks.updateSocialPublishingPostMock(...args),
  upsertSocialPublishingPost: (...args: unknown[]) =>
    mocks.upsertSocialPublishingPostMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { runSocialPublishingPostPipeline } from './social-posts-pipeline';

const basePost: SocialPublishingPost = {
  id: 'post-1',
  titlePl: 'Draft PL',
  titleEn: 'Draft EN',
  bodyPl: 'Body PL',
  bodyEn: 'Body EN',
  combinedBody: 'Body PL\n\n---\n\nBody EN',
  status: 'draft',
  scheduledAt: null,
  publishedAt: null,
  publishedPostId: null,
  publishedUrl: null,
  publishingConnectionId: null,
  brainModelId: null,
  visionModelId: null,
  publishError: null,
  imageAssets: [],
  imageAddonIds: [],
  docReferences: [],
  contextSummary: null,
  generatedSummary: null,
  visualSummary: null,
  visualHighlights: [],
  visualAnalysisSourceImageAddonIds: [],
  visualAnalysisSourceVisionModelId: null,
  visualAnalysisError: null,
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T10:00:00.000Z',
};

describe('runSocialPublishingPostPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.resolveKangurDocReferencesMock.mockReturnValue([{ id: 'overview' }]);
    mocks.buildKangurDocContextMock.mockResolvedValue({
      summary: 'Loaded context summary',
      context: 'Resolved documentation context',
    });
    mocks.getSocialPublishingPostByIdMock.mockResolvedValue(basePost);
    mocks.upsertSocialPublishingPostMock.mockImplementation(async (post: SocialPublishingPost) => post);
    mocks.findSocialPublishingImageAddonsByIdsMock.mockResolvedValue([]);
    mocks.generateSocialPublishingPostDraftMock.mockResolvedValue({
      titlePl: 'Generated PL',
      titleEn: 'Generated EN',
      bodyPl: 'Generated body PL',
      bodyEn: 'Generated body EN',
      combinedBody: 'Generated body PL\n\n---\n\nGenerated body EN',
      summary: 'Generated draft summary',
      docReferences: ['overview'],
      visualSummary: null,
      visualHighlights: [],
    });
    mocks.updateSocialPublishingPostMock.mockImplementation(
      async (id: string, updates: Partial<SocialPublishingPost>) => ({
        ...basePost,
        id,
        ...updates,
      })
    );
  });

  it('returns the generated draft and keeps the resolved context summary in the saved result', async () => {
    const reportProgress = vi.fn();

    const result = await runSocialPublishingPostPipeline(
      {
        postId: 'post-1',
        editorState: {
          titlePl: 'Draft PL',
          titleEn: 'Draft EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        imageAssets: [],
        imageAddonIds: [],
        captureMode: 'existing_assets',
        publishingConnectionId: null,
        brainModelId: 'brain-model',
        visionModelId: 'vision-model',
        projectUrl: 'https://studiq.example.com',
        generationNotes: 'Focus on the new onboarding improvements.',
        docReferences: ['overview'],
        actorId: 'user-1',
      },
      { reportProgress }
    );

    expect(mocks.buildKangurDocContextMock).toHaveBeenCalledWith([{ id: 'overview' }]);
    expect(mocks.upsertSocialPublishingPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'post-1',
        contextSummary: 'Loaded context summary',
        docReferences: ['overview'],
        status: 'draft',
      })
    );
    expect(mocks.updateSocialPublishingPostMock).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        titlePl: 'Generated PL',
        titleEn: 'Generated EN',
        generatedSummary: 'Generated draft summary',
        contextSummary: 'Loaded context summary',
        docReferences: ['overview'],
        status: 'draft',
      })
    );
    expect(result.contextSummary).toBe('Loaded context summary');
    expect(result.contextDocCount).toBe(1);
    expect(result.generatedPost.titlePl).toBe('Generated PL');
    expect(result.generatedPost.generatedSummary).toBe('Generated draft summary');
    expect(result.generatedPost.contextSummary).toBe('Loaded context summary');
    expect(reportProgress).toHaveBeenLastCalledWith(
      expect.objectContaining({
        step: 'generating',
        contextSummary: 'Loaded context summary',
      })
    );
  });

  it('persists the analysis source snapshot when generated content includes visual analysis', async () => {
    mocks.generateSocialPublishingPostDraftMock.mockResolvedValueOnce({
      titlePl: 'Generated PL',
      titleEn: 'Generated EN',
      bodyPl: 'Generated body PL',
      bodyEn: 'Generated body EN',
      combinedBody: 'Generated body PL\n\n---\n\nGenerated body EN',
      summary: 'Generated draft summary',
      docReferences: ['overview'],
      visualSummary: 'The teacher CTA is larger in the hero.',
      visualHighlights: ['Larger teacher CTA'],
    });

    await runSocialPublishingPostPipeline({
      postId: 'post-1',
      editorState: {
        titlePl: 'Draft PL',
        titleEn: 'Draft EN',
        bodyPl: 'Body PL',
        bodyEn: 'Body EN',
      },
      imageAssets: [],
      imageAddonIds: ['addon-1'],
      captureMode: 'existing_assets',
      publishingConnectionId: null,
      brainModelId: 'brain-model',
      visionModelId: 'vision-model',
      projectUrl: 'https://studiq.example.com',
      generationNotes: 'Focus on the new onboarding improvements.',
      docReferences: ['overview'],
      actorId: 'user-1',
    });

    expect(mocks.updateSocialPublishingPostMock).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        visualAnalysisSourceImageAddonIds: ['addon-1'],
        visualAnalysisSourceVisionModelId: 'vision-model',
      })
    );
  });

  it('keeps published posts in published status while saving and regenerating pipeline output', async () => {
    mocks.getSocialPublishingPostByIdMock.mockResolvedValueOnce({
      ...basePost,
      status: 'draft',
      publishedAt: '2026-03-19T12:00:00.000Z',
      publishedPostId: 'urn:li:share:published',
      publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Apublished',
    });

    await runSocialPublishingPostPipeline({
      postId: 'post-1',
      editorState: {
        titlePl: 'Draft PL',
        titleEn: 'Draft EN',
        bodyPl: 'Body PL',
        bodyEn: 'Body EN',
      },
      imageAssets: [],
      imageAddonIds: [],
      captureMode: 'existing_assets',
      publishingConnectionId: null,
      brainModelId: 'brain-model',
      visionModelId: 'vision-model',
      projectUrl: 'https://studiq.example.com',
      generationNotes: 'Focus on the new onboarding improvements.',
      docReferences: ['overview'],
      actorId: 'user-1',
    });

    expect(mocks.upsertSocialPublishingPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'published',
      })
    );
    expect(mocks.updateSocialPublishingPostMock).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        status: 'published',
      })
    );
  });

  it('reports live Playwright capture counters during fresh capture runs', async () => {
    const reportProgress = vi.fn();
    mocks.createSocialPublishingImageAddonsBatchMock.mockImplementation(
      async ({
        onProgress,
      }: {
        onProgress?: (progress: Record<string, number | string | null>) => Promise<void>;
      }) => {
        await onProgress?.({
          processedCount: 1,
          completedCount: 0,
          failureCount: 0,
          remainingCount: 2,
          totalCount: 2,
          currentCaptureId: 'game',
          currentCaptureStatus: 'waiting_for_page_ready',
          message: '[game] Waiting for route capture-ready flag.',
        });
        return {
          addons: [
            {
              id: 'addon-1',
              presetId: 'game',
              imageAsset: { id: 'asset-1', url: '/asset-1.png', filepath: '/asset-1.png' },
            },
          ],
          failures: [{ id: 'lessons', reason: 'timeout' }],
          runId: 'run-capture',
          requestedPresetCount: 2,
          usedPresetCount: 2,
          usedPresetIds: ['game', 'lessons'],
        };
      }
    );

    await runSocialPublishingPostPipeline(
      {
        postId: 'post-1',
        editorState: {
          titlePl: 'Draft PL',
          titleEn: 'Draft EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        imageAssets: [],
        imageAddonIds: [],
        captureMode: 'fresh_capture',
        batchCaptureBaseUrl: 'https://studiq.example.com',
        batchCapturePresetIds: ['game', 'lessons'],
        batchCapturePresetLimit: 2,
        publishingConnectionId: null,
        brainModelId: 'brain-model',
        visionModelId: 'vision-model',
        projectUrl: 'https://studiq.example.com',
        generationNotes: 'Focus on visuals.',
        docReferences: ['overview'],
        actorId: 'user-1',
      },
      { reportProgress }
    );

    expect(reportProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'capturing',
        captureCompletedCount: 0,
        captureFailureCount: 0,
        captureRemainingCount: 2,
        captureTotalCount: 2,
        message:
          '[game] Waiting for route capture-ready flag. (0 captured, 2 left of 2 presets.)',
      })
    );
    expect(reportProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'capturing',
        captureCompletedCount: 1,
        captureFailureCount: 1,
        captureRemainingCount: 0,
        captureTotalCount: 2,
        runId: 'run-capture',
      })
    );
  });

  it('falls back to the aggregate capture summary when no detailed progress message is available', async () => {
    const reportProgress = vi.fn();
    mocks.createSocialPublishingImageAddonsBatchMock.mockImplementation(
      async ({
        onProgress,
      }: {
        onProgress?: (progress: Record<string, number>) => Promise<void>;
      }) => {
        await onProgress?.({
          processedCount: 1,
          completedCount: 1,
          failureCount: 0,
          remainingCount: 1,
          totalCount: 2,
        });
        return {
          addons: [
            {
              id: 'addon-1',
              presetId: 'game',
              imageAsset: { id: 'asset-1', url: '/asset-1.png', filepath: '/asset-1.png' },
            },
          ],
          failures: [],
          runId: 'run-capture',
          requestedPresetCount: 2,
          usedPresetCount: 2,
          usedPresetIds: ['game', 'lessons'],
        };
      }
    );

    await runSocialPublishingPostPipeline(
      {
        postId: 'post-1',
        editorState: {
          titlePl: 'Draft PL',
          titleEn: 'Draft EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        imageAssets: [],
        imageAddonIds: [],
        captureMode: 'fresh_capture',
        batchCaptureBaseUrl: 'https://studiq.example.com',
        batchCapturePresetIds: ['game', 'lessons'],
        batchCapturePresetLimit: 2,
        publishingConnectionId: null,
        brainModelId: 'brain-model',
        visionModelId: 'vision-model',
        projectUrl: 'https://studiq.example.com',
        generationNotes: 'Focus on visuals.',
        docReferences: ['overview'],
        actorId: 'user-1',
      },
      { reportProgress }
    );

    expect(reportProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        step: 'capturing',
        captureCompletedCount: 1,
        captureFailureCount: 0,
        captureRemainingCount: 1,
        captureTotalCount: 2,
        message: 'Playwright capture in progress: 1 captured, 1 left of 2 presets.',
      })
    );
  });

  it('rejects pipeline runs when Project URL is missing or localhost-only', async () => {
    await expect(
      runSocialPublishingPostPipeline({
        postId: 'post-1',
        editorState: {
          titlePl: 'Draft PL',
          titleEn: 'Draft EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        imageAssets: [],
        imageAddonIds: [],
        captureMode: 'existing_assets',
        publishingConnectionId: null,
        brainModelId: 'brain-model',
        visionModelId: 'vision-model',
        projectUrl: '',
        generationNotes: 'Focus on the new onboarding improvements.',
        docReferences: ['overview'],
        actorId: 'user-1',
      })
    ).rejects.toThrow('Set Settings Project URL before generating social posts.');

    await expect(
      runSocialPublishingPostPipeline({
        postId: 'post-1',
        editorState: {
          titlePl: 'Draft PL',
          titleEn: 'Draft EN',
          bodyPl: 'Body PL',
          bodyEn: 'Body EN',
        },
        imageAssets: [],
        imageAddonIds: [],
        captureMode: 'existing_assets',
        publishingConnectionId: null,
        brainModelId: 'brain-model',
        visionModelId: 'vision-model',
        projectUrl: 'http://localhost:3000',
        generationNotes: 'Focus on the new onboarding improvements.',
        docReferences: ['overview'],
        actorId: 'user-1',
      })
    ).rejects.toThrow(
      'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.'
    );

    expect(mocks.upsertSocialPublishingPostMock).not.toHaveBeenCalled();
    expect(mocks.generateSocialPublishingPostDraftMock).not.toHaveBeenCalled();
    expect(mocks.updateSocialPublishingPostMock).not.toHaveBeenCalled();
  });

  it('passes prefetched visual analysis into draft generation when provided', async () => {
    await runSocialPublishingPostPipeline({
      postId: 'post-1',
      editorState: {
        titlePl: 'Draft PL',
        titleEn: 'Draft EN',
        bodyPl: 'Body PL',
        bodyEn: 'Body EN',
      },
      imageAssets: [],
      imageAddonIds: ['addon-1'],
      captureMode: 'existing_assets',
      publishingConnectionId: null,
      brainModelId: 'brain-model',
      visionModelId: 'vision-model',
      projectUrl: 'https://studiq.example.com',
      generationNotes: 'Focus on the updated hero.',
      docReferences: ['overview'],
      prefetchedVisualAnalysis: {
        summary: 'The hero now shows a larger classroom card.',
        highlights: ['Larger classroom card'],
      },
      requireVisualAnalysisInBody: true,
      actorId: 'user-1',
    });

    expect(mocks.generateSocialPublishingPostDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prefetchedVisualAnalysis: {
          summary: 'The hero now shows a larger classroom card.',
          highlights: ['Larger classroom card'],
        },
        requireVisualAnalysisInBody: true,
      })
    );
  });

  it('preserves more than 12 existing attached images in the existing-assets path', async () => {
    const imageAssets = Array.from({ length: 13 }, (_, index) => ({
      id: `asset-${index + 1}`,
      url: `/asset-${index + 1}.png`,
      filepath: `/asset-${index + 1}.png`,
    }));

    await runSocialPublishingPostPipeline({
      postId: 'post-1',
      editorState: {
        titlePl: 'Draft PL',
        titleEn: 'Draft EN',
        bodyPl: 'Body PL',
        bodyEn: 'Body EN',
      },
      imageAssets,
      imageAddonIds: ['addon-1'],
      captureMode: 'existing_assets',
      publishingConnectionId: null,
      brainModelId: 'brain-model',
      visionModelId: 'vision-model',
      projectUrl: 'https://studiq.example.com',
      generationNotes: 'Keep all selected visuals attached.',
      docReferences: ['overview'],
      actorId: 'user-1',
    });

    expect(mocks.upsertSocialPublishingPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        imageAssets,
      })
    );
    expect(mocks.updateSocialPublishingPostMock).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({
        imageAssets,
      })
    );
  });

  it('dedupes captured assets by real image identity instead of only the preferred asset key', async () => {
    mocks.createSocialPublishingImageAddonsBatchMock.mockResolvedValueOnce({
      addons: [
        {
          id: 'addon-1',
          presetId: 'game',
          imageAsset: {
            id: 'captured-asset-1',
            url: '/existing-hero.png',
            filepath: '/existing-hero.png',
          },
        },
      ],
      failures: [],
      runId: 'run-capture',
      requestedPresetCount: 1,
      usedPresetCount: 1,
      usedPresetIds: ['game'],
    });

    await runSocialPublishingPostPipeline({
      postId: 'post-1',
      editorState: {
        titlePl: 'Draft PL',
        titleEn: 'Draft EN',
        bodyPl: 'Body PL',
        bodyEn: 'Body EN',
      },
      imageAssets: [
        {
          id: 'existing-hero-id',
          url: '/existing-hero.png',
          filepath: '/existing-hero.png',
        },
      ],
      imageAddonIds: [],
      captureMode: 'fresh_capture',
      batchCaptureBaseUrl: 'https://studiq.example.com',
      batchCapturePresetIds: ['game'],
      batchCapturePresetLimit: 1,
      publishingConnectionId: null,
      brainModelId: 'brain-model',
      visionModelId: 'vision-model',
      projectUrl: 'https://studiq.example.com',
      generationNotes: 'Deduplicate captured visuals.',
      docReferences: ['overview'],
      actorId: 'user-1',
    });

    expect(mocks.upsertSocialPublishingPostMock).toHaveBeenCalledWith(
      expect.objectContaining({
        imageAssets: [
          {
            id: 'existing-hero-id',
            url: '/existing-hero.png',
            filepath: '/existing-hero.png',
          },
        ],
      })
    );
  });
});
