/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  publishLinkedInPersonalPostMock: vi.fn(),
  listDueScheduledKangurSocialPostsMock: vi.fn(),
  updateKangurSocialPostMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarningMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('./social-posts-publish.linkedin', () => ({
  publishLinkedInPersonalPost: (...args: unknown[]) =>
    mocks.publishLinkedInPersonalPostMock(...args),
}));

vi.mock('./social-posts-repository', () => ({
  listDueScheduledKangurSocialPosts: (...args: unknown[]) =>
    mocks.listDueScheduledKangurSocialPostsMock(...args),
  updateKangurSocialPost: (...args: unknown[]) => mocks.updateKangurSocialPostMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logInfo: mocks.logInfoMock,
    logWarning: mocks.logWarningMock,
    captureException: mocks.captureExceptionMock,
  },
}));

import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import {
  publishDueScheduledKangurSocialPosts,
  publishKangurSocialPost,
} from './social-posts-publish';

const basePost: KangurSocialPost = {
  id: 'post-1',
  titlePl: '',
  titleEn: '',
  bodyPl: 'Czesc',
  bodyEn: 'Hello',
  combinedBody: 'Czesc / Hello',
  status: 'draft',
  scheduledAt: null,
  publishedAt: null,
  linkedinPostId: null,
  linkedinUrl: null,
  linkedinConnectionId: 'conn-1',
  brainModelId: null,
  visionModelId: null,
  publishError: null,
  imageAssets: [],
  imageAddonIds: [],
  docReferences: [],
  generatedSummary: null,
  visualSummary: null,
  visualHighlights: [],
  visualAnalysisSourceImageAddonIds: [],
  visualAnalysisSourceVisionModelId: null,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('publishKangurSocialPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes a post and updates its status', async () => {
    mocks.publishLinkedInPersonalPostMock.mockResolvedValue({
      postId: 'urn:li:share:123',
      url: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
    });
    mocks.updateKangurSocialPostMock.mockImplementation(
      async (id: string, updates: Partial<KangurSocialPost>) => ({
        ...basePost,
        id,
        ...updates,
      })
    );

    const result = await publishKangurSocialPost(basePost);

    expect(mocks.publishLinkedInPersonalPostMock).toHaveBeenCalledWith(basePost, {
      mode: 'published',
    });
    expect(mocks.updateKangurSocialPostMock).toHaveBeenCalledWith(
      basePost.id,
      expect.objectContaining({
        status: 'published',
        linkedinPostId: 'urn:li:share:123',
        linkedinUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
        publishError: null,
      })
    );
    expect(result.status).toBe('published');
  });

  it('marks the post as failed when publish throws', async () => {
    const longMessage = 'x'.repeat(1100);
    mocks.publishLinkedInPersonalPostMock.mockRejectedValue(new Error(longMessage));
    mocks.updateKangurSocialPostMock.mockImplementation(
      async (id: string, updates: Partial<KangurSocialPost>) => ({
        ...basePost,
        id,
        ...updates,
      })
    );

    await expect(publishKangurSocialPost(basePost)).rejects.toThrow(longMessage);

    const failedCall = mocks.updateKangurSocialPostMock.mock.calls.find(
      (call) => call[0] === basePost.id && call[1]?.status === 'failed'
    );
    expect(failedCall).toBeTruthy();
    const publishError = failedCall?.[1]?.publishError as string | undefined;
    expect(publishError).toBeTruthy();
    expect(publishError?.length).toBeLessThanOrEqual(1000);
    expect(publishError?.endsWith('...')).toBe(true);
  });
});

describe('publishDueScheduledKangurSocialPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list when there are no due posts', async () => {
    mocks.listDueScheduledKangurSocialPostsMock.mockResolvedValue([]);

    const result = await publishDueScheduledKangurSocialPosts();

    expect(result).toEqual([]);
    expect(mocks.publishLinkedInPersonalPostMock).not.toHaveBeenCalled();
  });

  it('publishes due posts and marks failures', async () => {
    const postA: KangurSocialPost = { ...basePost, id: 'post-a' };
    const postB: KangurSocialPost = { ...basePost, id: 'post-b' };
    const postsById = new Map<string, KangurSocialPost>([
      [postA.id, postA],
      [postB.id, postB],
    ]);

    mocks.listDueScheduledKangurSocialPostsMock.mockResolvedValue([postA, postB]);
    mocks.publishLinkedInPersonalPostMock.mockImplementation(async (post: KangurSocialPost) => {
      if (post.id === postA.id) {
        return {
          postId: 'urn:li:share:1',
          url: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A1',
        };
      }
      throw new Error('publish failed');
    });
    mocks.updateKangurSocialPostMock.mockImplementation(
      async (id: string, updates: Partial<KangurSocialPost>) => ({
        ...(postsById.get(id) ?? basePost),
        id,
        ...updates,
      })
    );

    const result = await publishDueScheduledKangurSocialPosts();

    expect(result).toHaveLength(2);
    expect(result.find((post) => post.id === postA.id)?.status).toBe('published');
    expect(result.find((post) => post.id === postB.id)?.status).toBe('failed');

    const publishedCall = mocks.updateKangurSocialPostMock.mock.calls.find(
      (call) => call[0] === postA.id && call[1]?.status === 'published'
    );
    const failedCall = mocks.updateKangurSocialPostMock.mock.calls.find(
      (call) => call[0] === postB.id && call[1]?.status === 'failed'
    );
    expect(publishedCall).toBeTruthy();
    expect(failedCall).toBeTruthy();
  });
});
