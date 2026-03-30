/**
 * @vitest-environment node
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/db/mongo-client', () => ({ getMongoDb: vi.fn() }));
vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: { captureException: vi.fn() },
}));

import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

const originalMongoUri = process.env['MONGODB_URI'];
const originalStorePath = process.env['KANGUR_SOCIAL_POSTS_STORE_PATH'];

const makePost = (overrides: Partial<KangurSocialPost> = {}): KangurSocialPost => ({
  id: `post-${Math.random().toString(36).slice(2, 8)}`,
  titlePl: 'StudiQ digest',
  titleEn: 'StudiQ digest',
  bodyPl: 'Polish update body',
  bodyEn: 'English update body',
  combinedBody: 'Polish update body\n---\nEnglish update body',
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
    process.env['KANGUR_SOCIAL_POSTS_STORE_PATH'] = originalStorePath;
  } else {
    delete process.env['KANGUR_SOCIAL_POSTS_STORE_PATH'];
  }
};

const loadRepository = async (storeDir: string) => {
  delete process.env['MONGODB_URI'];
  process.env['KANGUR_SOCIAL_POSTS_STORE_PATH'] = storeDir;
  vi.resetModules();
  return import('./social-posts-repository');
};

describe('social-posts-repository (in-memory published list)', () => {
  let storeDir = '';

  beforeEach(async () => {
    vi.clearAllMocks();
    storeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kangur-social-posts-'));
  });

  afterEach(async () => {
    restoreEnv();
    if (storeDir) {
      await fs.rm(storeDir, { recursive: true, force: true });
    }
  });

  it('keeps LinkedIn-published posts in the public list even if the local status drifted back to draft', async () => {
    const { listPublishedKangurSocialPosts, upsertKangurSocialPost } =
      await loadRepository(storeDir);

    await upsertKangurSocialPost(
      makePost({
        id: 'published-post',
        status: 'published',
        publishedAt: '2026-03-20T12:00:00.000Z',
      })
    );
    await upsertKangurSocialPost(
      makePost({
        id: 'drifted-draft',
        status: 'draft',
        linkedinPostId: 'urn:li:share:drifted',
        linkedinUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3Adrifted',
      })
    );
    await upsertKangurSocialPost(
      makePost({
        id: 'plain-draft',
        status: 'draft',
      })
    );

    const posts = await listPublishedKangurSocialPosts(10);

    expect(posts.map((post) => post.id)).toEqual(['published-post', 'drifted-draft']);
  });
});
