import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';

const mocks = vi.hoisted(() => ({
  listIntegrationsMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  decryptSecretMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: () => ({
    listIntegrations: (...args: unknown[]) => mocks.listIntegrationsMock(...args),
    listConnections: (...args: unknown[]) => mocks.listConnectionsMock(...args),
    updateConnection: (...args: unknown[]) => mocks.updateConnectionMock(...args),
  }),
  decryptSecret: (...args: unknown[]) => mocks.decryptSecretMock(...args),
}));

import { publishLinkedInPersonalPost } from './social-posts-publish.linkedin';

const basePost: KangurSocialPost = {
  id: 'post-1',
  titlePl: '',
  titleEn: '',
  bodyPl: 'Czesc',
  bodyEn: 'Hello',
  combinedBody: '',
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
  generatedSummary: null,
  visualSummary: null,
  visualHighlights: [],
  visualDocUpdates: [],
  visualAnalysisSourceImageAddonIds: [],
  visualAnalysisSourceDocReferences: [],
  visualAnalysisSourceVisionModelId: null,
  docUpdatesAppliedAt: null,
  docUpdatesAppliedBy: null,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('publishLinkedInPersonalPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.decryptSecretMock.mockImplementation((value: string) => value);
  });

  it('throws when LinkedIn integration is missing', async () => {
    mocks.listIntegrationsMock.mockResolvedValue([]);

    await expect(publishLinkedInPersonalPost(basePost)).rejects.toThrow(
      'LinkedIn integration is not configured'
    );
  });

  it('publishes a post using the selected LinkedIn connection', async () => {
    mocks.listIntegrationsMock.mockResolvedValue([
      {
        id: 'int-1',
        slug: 'linkedin',
        name: 'LinkedIn',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
    ]);
    mocks.listConnectionsMock.mockResolvedValue([
      {
        id: 'conn-1',
        integrationId: 'int-1',
        name: 'LinkedIn Primary',
        linkedinAccessToken: 'token-1',
        linkedinTokenUpdatedAt: new Date().toISOString(),
        linkedinExpiresAt: null,
        linkedinPersonUrn: null,
        linkedinProfileUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
      {
        id: 'conn-2',
        integrationId: 'int-1',
        name: 'LinkedIn Secondary',
        linkedinAccessToken: 'token-2',
        linkedinTokenUpdatedAt: new Date(Date.now() + 5000).toISOString(),
        linkedinExpiresAt: null,
        linkedinPersonUrn: 'urn:li:person:existing',
        linkedinProfileUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
    ]);

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url === 'https://example.com/image.jpg') {
        return new Response('image-bytes', {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        });
      }

      if (url.startsWith('https://api.linkedin.com/v2/userinfo')) {
        expect(init?.headers).toMatchObject({
          Authorization: 'Bearer token-1',
        });
        return new Response(
          JSON.stringify({ sub: 'person-1', name: 'kangur' }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      if (url.startsWith('https://api.linkedin.com/v2/assets')) {
        return new Response(
          JSON.stringify({
            value: {
              asset: 'urn:li:digitalmediaAsset:img-1',
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://upload.linkedin.com/upload/1',
                },
              },
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        );
      }

      if (url === 'https://upload.linkedin.com/upload/1') {
        expect(init?.method).toBe('PUT');
        return new Response(null, { status: 201 });
      }

      if (url.startsWith('https://api.linkedin.com/v2/ugcPosts')) {
        return new Response(JSON.stringify({ id: 'urn:li:share:123' }), {
          status: 201,
          headers: {
            'content-type': 'application/json',
            'x-restli-id': 'urn:li:share:123',
          },
        });
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const post: KangurSocialPost = {
      ...basePost,
      linkedinConnectionId: 'conn-1',
      imageAssets: [{ id: 'img-1', url: 'https://example.com/image.jpg' }],
    };

    const result = await publishLinkedInPersonalPost(post);

    expect(result).toEqual({
      postId: 'urn:li:share:123',
      url: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A123',
    });
    expect(mocks.updateConnectionMock).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        linkedinPersonUrn: 'urn:li:person:person-1',
        linkedinProfileUrl: 'https://www.linkedin.com/in/kangur',
      })
    );
  });
});
