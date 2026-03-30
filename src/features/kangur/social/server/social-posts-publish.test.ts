/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isAppError } from '@/shared/errors/app-error';

const mocks = vi.hoisted(() => ({
  publishLinkedInPersonalPostMock: vi.fn(),
  deleteLinkedInPersonalPostMock: vi.fn(),
  listDueScheduledKangurSocialPostsMock: vi.fn(),
  deleteKangurSocialPostMock: vi.fn(),
  updateKangurSocialPostMock: vi.fn(),
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
  listDueScheduledKangurSocialPosts: (...args: unknown[]) =>
    mocks.listDueScheduledKangurSocialPostsMock(...args),
  deleteKangurSocialPost: (...args: unknown[]) => mocks.deleteKangurSocialPostMock(...args),
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
  unpublishKangurSocialPost,
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
  visualAnalysisError: null,
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

  it('blocks duplicate publish attempts when the post already has LinkedIn publication metadata', async () => {
    const alreadyPublishedPost: KangurSocialPost = {
      ...basePost,
      status: 'draft',
      publishedAt: '2026-03-21T10:30:00.000Z',
      linkedinPostId: 'urn:li:share:existing',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Aexisting',
    };

    let thrown: unknown;
    try {
      await publishKangurSocialPost(alreadyPublishedPost);
    } catch (error) {
      thrown = error;
    }

    expect(isAppError(thrown)).toBe(true);
    expect((thrown as Error).message).toBe('Social post is already published on LinkedIn.');
    expect(mocks.publishLinkedInPersonalPostMock).not.toHaveBeenCalled();
    expect(mocks.updateKangurSocialPostMock).not.toHaveBeenCalled();
  });
});

describe('unpublishKangurSocialPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps unpublish available when a LinkedIn post still exists but the local status drifted back to draft', async () => {
    const driftedDraftPost: KangurSocialPost = {
      ...basePost,
      status: 'draft',
      publishedAt: '2026-03-21T10:30:00.000Z',
      linkedinPostId: 'urn:li:share:123',
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
    };
    mocks.deleteLinkedInPersonalPostMock.mockResolvedValue(undefined);
    mocks.updateKangurSocialPostMock.mockImplementation(
      async (id: string, updates: Partial<KangurSocialPost>) => ({
        ...driftedDraftPost,
        id,
        ...updates,
      })
    );

    const result = await unpublishKangurSocialPost(driftedDraftPost, { keepLocal: true });

    expect(mocks.deleteLinkedInPersonalPostMock).toHaveBeenCalledWith(driftedDraftPost);
    expect(mocks.updateKangurSocialPostMock).toHaveBeenCalledWith(
      driftedDraftPost.id,
      expect.objectContaining({
        status: 'draft',
        linkedinPostId: null,
        linkedinUrl: null,
        publishedAt: null,
        publishError: null,
      })
    );
    expect(result.linkedinPostId).toBeNull();
    expect(result.publishedAt).toBeNull();
  });

  it('keeps unpublish available when the stored publication only has a LinkedIn URL', async () => {
    const urlOnlyPublishedPost: KangurSocialPost = {
      ...basePost,
      status: 'draft',
      publishedAt: '2026-03-21T10:30:00.000Z',
      linkedinPostId: null,
      linkedinUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
    };
    mocks.deleteLinkedInPersonalPostMock.mockResolvedValue(undefined);
    mocks.updateKangurSocialPostMock.mockImplementation(
      async (id: string, updates: Partial<KangurSocialPost>) => ({
        ...urlOnlyPublishedPost,
        id,
        ...updates,
      })
    );

    const result = await unpublishKangurSocialPost(urlOnlyPublishedPost, { keepLocal: true });

    expect(mocks.deleteLinkedInPersonalPostMock).toHaveBeenCalledWith(urlOnlyPublishedPost);
    expect(mocks.updateKangurSocialPostMock).toHaveBeenCalledWith(
      urlOnlyPublishedPost.id,
      expect.objectContaining({
        status: 'draft',
        linkedinPostId: null,
        linkedinUrl: null,
        publishedAt: null,
        publishError: null,
      })
    );
    expect(result.linkedinUrl).toBeNull();
    expect(result.publishedAt).toBeNull();
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
