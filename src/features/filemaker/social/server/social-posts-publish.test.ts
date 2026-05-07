/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isAppError } from '@/shared/errors/app-error';

const mocks = vi.hoisted(() => ({
  publishLinkedInPersonalPostMock: vi.fn(),
  deleteLinkedInPersonalPostMock: vi.fn(),
  listDueScheduledSocialPublishingPostsMock: vi.fn(),
  deleteSocialPublishingPostMock: vi.fn(),
  updateSocialPublishingPostMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarningMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('./social-posts-publish.linkedin', () => ({
  publishLinkedInPersonalPost: (...args: unknown[]) =>
    mocks.publishLinkedInPersonalPostMock(...args),
  deleteLinkedInPersonalPost: (...args: unknown[]) =>
    mocks.deleteLinkedInPersonalPostMock(...args),
}));

vi.mock('./social-posts-repository', () => ({
  listDueScheduledSocialPublishingPosts: (...args: unknown[]) =>
    mocks.listDueScheduledSocialPublishingPostsMock(...args),
  deleteSocialPublishingPost: (...args: unknown[]) => mocks.deleteSocialPublishingPostMock(...args),
  updateSocialPublishingPost: (...args: unknown[]) => mocks.updateSocialPublishingPostMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logInfo: mocks.logInfoMock,
    logWarning: mocks.logWarningMock,
    captureException: mocks.captureExceptionMock,
  },
}));

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import {
  publishDueScheduledSocialPublishingPosts,
  publishSocialPublishingPost,
  unpublishSocialPublishingPost,
} from './social-posts-publish';

const basePost: SocialPublishingPost = {
  id: 'post-1',
  titlePl: '',
  titleEn: '',
  bodyPl: 'Czesc',
  bodyEn: 'Hello',
  combinedBody: 'Czesc / Hello',
  status: 'draft',
  scheduledAt: null,
  publishedAt: null,
  publishedPostId: null,
  publishedUrl: null,
  publishingConnectionId: 'conn-1',
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
  visualAnalysisError: null,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('publishSocialPublishingPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes a post and updates its status', async () => {
    mocks.publishLinkedInPersonalPostMock.mockResolvedValue({
      postId: 'urn:li:share:123',
      url: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
    });
    mocks.updateSocialPublishingPostMock.mockImplementation(
      async (id: string, updates: Partial<SocialPublishingPost>) => ({
        ...basePost,
        id,
        ...updates,
      })
    );

    const result = await publishSocialPublishingPost(basePost);

    expect(mocks.publishLinkedInPersonalPostMock).toHaveBeenCalledWith(basePost, {
      mode: 'published',
    });
    expect(mocks.updateSocialPublishingPostMock).toHaveBeenCalledWith(
      basePost.id,
      expect.objectContaining({
        status: 'published',
        publishedPostId: 'urn:li:share:123',
        publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
        publishError: null,
      })
    );
    expect(result.status).toBe('published');
  });

  it('marks the post as failed when publish throws', async () => {
    const longMessage = 'x'.repeat(1100);
    mocks.publishLinkedInPersonalPostMock.mockRejectedValue(new Error(longMessage));
    mocks.updateSocialPublishingPostMock.mockImplementation(
      async (id: string, updates: Partial<SocialPublishingPost>) => ({
        ...basePost,
        id,
        ...updates,
      })
    );

    await expect(publishSocialPublishingPost(basePost)).rejects.toThrow(longMessage);

    const failedCall = mocks.updateSocialPublishingPostMock.mock.calls.find(
      (call) => call[0] === basePost.id && call[1]?.status === 'failed'
    );
    expect(failedCall).toBeTruthy();
    const publishError = failedCall?.[1]?.publishError as string | undefined;
    expect(publishError).toBeTruthy();
    expect(publishError?.length).toBeLessThanOrEqual(1000);
    expect(publishError?.endsWith('...')).toBe(true);
  });

  it('blocks duplicate publish attempts when the post already has Publication metadata', async () => {
    const alreadyPublishedPost: SocialPublishingPost = {
      ...basePost,
      status: 'draft',
      publishedAt: '2026-03-21T10:30:00.000Z',
      publishedPostId: 'urn:li:share:existing',
      publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Aexisting',
    };

    let thrown: unknown;
    try {
      await publishSocialPublishingPost(alreadyPublishedPost);
    } catch (error) {
      thrown = error;
    }

    expect(isAppError(thrown)).toBe(true);
    expect((thrown as Error).message).toBe('Social post is already published.');
    expect(mocks.publishLinkedInPersonalPostMock).not.toHaveBeenCalled();
    expect(mocks.updateSocialPublishingPostMock).not.toHaveBeenCalled();
  });
});

describe('unpublishSocialPublishingPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps unpublish available when a LinkedIn post still exists but the local status drifted back to draft', async () => {
    const driftedDraftPost: SocialPublishingPost = {
      ...basePost,
      status: 'draft',
      publishedAt: '2026-03-21T10:30:00.000Z',
      publishedPostId: 'urn:li:share:123',
      publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
    };
    mocks.deleteLinkedInPersonalPostMock.mockResolvedValue(undefined);
    mocks.updateSocialPublishingPostMock.mockImplementation(
      async (id: string, updates: Partial<SocialPublishingPost>) => ({
        ...driftedDraftPost,
        id,
        ...updates,
      })
    );

    const result = await unpublishSocialPublishingPost(driftedDraftPost, { keepLocal: true });

    expect(mocks.deleteLinkedInPersonalPostMock).toHaveBeenCalledWith(driftedDraftPost);
    expect(mocks.updateSocialPublishingPostMock).toHaveBeenCalledWith(
      driftedDraftPost.id,
      expect.objectContaining({
        status: 'draft',
        publishedPostId: null,
        publishedUrl: null,
        publishedAt: null,
        publishError: null,
      })
    );
    expect(result.publishedPostId).toBeNull();
    expect(result.publishedAt).toBeNull();
  });

  it('keeps unpublish available when the stored publication only has a published URL', async () => {
    const urlOnlyPublishedPost: SocialPublishingPost = {
      ...basePost,
      status: 'draft',
      publishedAt: '2026-03-21T10:30:00.000Z',
      publishedPostId: null,
      publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
    };
    mocks.deleteLinkedInPersonalPostMock.mockResolvedValue(undefined);
    mocks.updateSocialPublishingPostMock.mockImplementation(
      async (id: string, updates: Partial<SocialPublishingPost>) => ({
        ...urlOnlyPublishedPost,
        id,
        ...updates,
      })
    );

    const result = await unpublishSocialPublishingPost(urlOnlyPublishedPost, { keepLocal: true });

    expect(mocks.deleteLinkedInPersonalPostMock).toHaveBeenCalledWith(urlOnlyPublishedPost);
    expect(mocks.updateSocialPublishingPostMock).toHaveBeenCalledWith(
      urlOnlyPublishedPost.id,
      expect.objectContaining({
        status: 'draft',
        publishedPostId: null,
        publishedUrl: null,
        publishedAt: null,
        publishError: null,
      })
    );
    expect(result.publishedUrl).toBeNull();
    expect(result.publishedAt).toBeNull();
  });
});

describe('publishDueScheduledSocialPublishingPosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty list when there are no due posts', async () => {
    mocks.listDueScheduledSocialPublishingPostsMock.mockResolvedValue([]);

    const result = await publishDueScheduledSocialPublishingPosts();

    expect(result).toEqual([]);
    expect(mocks.publishLinkedInPersonalPostMock).not.toHaveBeenCalled();
  });

  it('publishes due posts and marks failures', async () => {
    const postA: SocialPublishingPost = { ...basePost, id: 'post-a' };
    const postB: SocialPublishingPost = { ...basePost, id: 'post-b' };
    const postsById = new Map<string, SocialPublishingPost>([
      [postA.id, postA],
      [postB.id, postB],
    ]);

    mocks.listDueScheduledSocialPublishingPostsMock.mockResolvedValue([postA, postB]);
    mocks.publishLinkedInPersonalPostMock.mockImplementation(async (post: SocialPublishingPost) => {
      if (post.id === postA.id) {
        return {
          postId: 'urn:li:share:1',
          url: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A1',
        };
      }
      throw new Error('publish failed');
    });
    mocks.updateSocialPublishingPostMock.mockImplementation(
      async (id: string, updates: Partial<SocialPublishingPost>) => ({
        ...(postsById.get(id) ?? basePost),
        id,
        ...updates,
      })
    );

    const result = await publishDueScheduledSocialPublishingPosts();

    expect(result).toHaveLength(2);
    expect(result.find((post) => post.id === postA.id)?.status).toBe('published');
    expect(result.find((post) => post.id === postB.id)?.status).toBe('failed');

    const publishedCall = mocks.updateSocialPublishingPostMock.mock.calls.find(
      (call) => call[0] === postA.id && call[1]?.status === 'published'
    );
    const failedCall = mocks.updateSocialPublishingPostMock.mock.calls.find(
      (call) => call[0] === postB.id && call[1]?.status === 'failed'
    );
    expect(publishedCall).toBeTruthy();
    expect(failedCall).toBeTruthy();
  });
});
