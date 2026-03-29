/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  findKangurSocialImageAddonsByIdsMock: vi.fn(),
  analyzeKangurSocialVisualsMock: vi.fn(),
  updateKangurSocialPostMock: vi.fn(),
  generateKangurSocialPostDraftMock: vi.fn(),
}));

vi.mock('./social-image-addons-repository', () => ({
  findKangurSocialImageAddonsByIds: (...args: unknown[]) =>
    mocks.findKangurSocialImageAddonsByIdsMock(...args),
}));

vi.mock('./social-posts-vision', () => ({
  analyzeKangurSocialVisuals: (...args: unknown[]) =>
    mocks.analyzeKangurSocialVisualsMock(...args),
}));

vi.mock('./social-posts-repository', () => ({
  updateKangurSocialPost: (...args: unknown[]) => mocks.updateKangurSocialPostMock(...args),
}));

vi.mock('./social-posts-generation', () => ({
  generateKangurSocialPostDraft: (...args: unknown[]) =>
    mocks.generateKangurSocialPostDraftMock(...args),
}));

import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import { runKangurSocialPostVisualAnalysisJob } from './social-posts-runtime';

const basePost: KangurSocialPost = {
  id: 'post-1',
  titlePl: 'Draft PL',
  titleEn: 'Draft EN',
  bodyPl: 'Body PL',
  bodyEn: 'Body EN',
  combinedBody: 'Body PL\n\n---\n\nBody EN',
  status: 'draft',
  scheduledAt: null,
  publishedAt: null,
  linkedinPostId: null,
  linkedinUrl: null,
  linkedinConnectionId: null,
  brainModelId: null,
  visionModelId: null,
  publishError: null,
  imageAssets: [],
  imageAddonIds: ['addon-0'],
  docReferences: ['docs/overview.mdx', 'docs/pricing.mdx'],
  contextSummary: null,
  generatedSummary: null,
  visualSummary: null,
  visualHighlights: [],
  visualDocUpdates: [],
  visualAnalysisSourceImageAddonIds: [],
  visualAnalysisSourceDocReferences: [],
  visualAnalysisSourceVisionModelId: null,
  visualAnalysisStatus: null,
  visualAnalysisUpdatedAt: null,
  visualAnalysisJobId: null,
  visualAnalysisModelId: null,
  docUpdatesAppliedAt: null,
  docUpdatesAppliedBy: null,
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-03-29T12:00:00.000Z',
  updatedAt: '2026-03-29T12:00:00.000Z',
};

describe('runKangurSocialPostVisualAnalysisJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findKangurSocialImageAddonsByIdsMock.mockResolvedValue([
      { id: 'addon-1', kind: 'capture', url: 'https://studiq.example.com/capture-1.png' },
    ]);
    mocks.analyzeKangurSocialVisualsMock.mockResolvedValue({
      summary: 'The hero now shows a larger classroom card.',
      highlights: ['Larger classroom card'],
      docUpdates: [],
    });
    mocks.updateKangurSocialPostMock.mockImplementation(
      async (id: string, updates: Partial<KangurSocialPost>) => ({
        ...basePost,
        id,
        ...updates,
      })
    );
  });

  it('keeps existing doc references untouched when saving image analysis', async () => {
    const result = await runKangurSocialPostVisualAnalysisJob({
      postId: 'post-1',
      actorId: 'user-1',
      visionModelId: 'vision-model',
      imageAddonIds: ['addon-1'],
      jobId: 'job-1',
    });

    const updates = mocks.updateKangurSocialPostMock.mock.calls[0]?.[1] as
      | Partial<KangurSocialPost>
      | undefined;

    expect(updates).not.toHaveProperty('docReferences');
    expect(result.savedPost?.docReferences).toEqual(basePost.docReferences);
    expect(result.savedPost?.visualAnalysisSourceImageAddonIds).toEqual(['addon-1']);
    expect(result.savedPost?.visualSummary).toBe('The hero now shows a larger classroom card.');
  });
});
