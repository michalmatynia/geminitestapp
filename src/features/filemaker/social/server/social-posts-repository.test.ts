/**
 * @vitest-environment node
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/db/mongo-client', () => ({ getMongoDb: vi.fn() }));
vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: { captureException: vi.fn() },
}));

import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';

const originalMongoUri = process.env['MONGODB_URI'];
const originalStorePath = process.env['SOCIAL_PUBLISHING_POSTS_STORE_PATH'];

const makePost = (overrides: Partial<SocialPublishingPost> = {}): SocialPublishingPost => ({
  id: `post-${Math.random().toString(36).slice(2, 8)}`,
  titlePl: 'Product digest',
  titleEn: 'Product digest',
  bodyPl: 'Polish update body',
  bodyEn: 'English update body',
  combinedBody: 'Polish update body\n---\nEnglish update body',
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
  visualAnalysisStatus: null,
  visualAnalysisUpdatedAt: null,
  visualAnalysisJobId: null,
  visualAnalysisModelId: null,
  visualAnalysisError: null,
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-03-19T10:00:00.000Z',
  updatedAt: '2026-03-19T10:00:00.000Z',
  ...overrides,
});

const restoreEnv = (): void => {
  if (originalMongoUri) {
    process.env['MONGODB_URI'] = originalMongoUri;
  } else {
    delete process.env['MONGODB_URI'];
  }

  if (originalStorePath) {
    process.env['SOCIAL_PUBLISHING_POSTS_STORE_PATH'] = originalStorePath;
  } else {
    delete process.env['SOCIAL_PUBLISHING_POSTS_STORE_PATH'];
  }
};

const loadRepository = async (storeDir: string) => {
  delete process.env['MONGODB_URI'];
  process.env['SOCIAL_PUBLISHING_POSTS_STORE_PATH'] = storeDir;
  vi.resetModules();
  return import('./social-posts-repository');
};

describe('social-posts-repository (in-memory published list)', () => {
  let storeDir = '';

  beforeEach(async () => {
    vi.clearAllMocks();
    storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'social-publishing-posts-'));
  });

  afterEach(async () => {
    restoreEnv();
    if (storeDir) {
      await fs.rm(storeDir, { recursive: true, force: true });
    }
  });

  it('keeps published posts in the public list even if the local status drifted back to draft', async () => {
    const { listPublishedSocialPublishingPosts, upsertSocialPublishingPost } =
      await loadRepository(storeDir);

    await upsertSocialPublishingPost(
      makePost({
        id: 'published-post',
        status: 'published',
        publishedAt: '2026-03-20T12:00:00.000Z',
      })
    );
    await upsertSocialPublishingPost(
      makePost({
        id: 'drifted-draft',
        status: 'draft',
        publishedPostId: 'urn:li:share:drifted',
        publishedUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Adrifted',
      })
    );
    await upsertSocialPublishingPost(
      makePost({
        id: 'plain-draft',
        status: 'draft',
      })
    );

    const posts = await listPublishedSocialPublishingPosts(10);

    expect(posts.map((post) => post.id)).toEqual(['published-post', 'drifted-draft']);
  });
});
