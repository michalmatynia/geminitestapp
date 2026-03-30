import 'server-only';

import fs from 'fs/promises';

import mime from 'mime-types';

import {
  getIntegrationRepository,
  decryptSecret,
} from '@/features/integrations/server';
import { getDiskPathFromPublicPath, isHttpFilepath } from '@/features/files/server';
import {
  buildKangurSocialPostCombinedBody,
  type KangurSocialPost,
} from '@/shared/contracts/kangur-social-posts';
import type { LinkedInProfileResponseDto } from '@/shared/contracts/integrations';
import { configurationError, operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

export type LinkedInPublishResult = {
  postId: string;
  url: string;
};

type LinkedInPublishMode = 'published' | 'draft';

const API_BASE_URL = process.env['LINKEDIN_API_BASE_URL'] ?? 'https://api.linkedin.com/v2';
const ASSET_RECIPE = 'urn:li:digitalmediaRecipe:feedshare-image';
const UPLOAD_RELATIONSHIP = 'urn:li:userGeneratedContent';
const RESTLI_PROTOCOL_VERSION = '2.0.0';

type RegisteredUpload = {
  asset: string;
  uploadUrl: string;
};

const toTimestamp = (value: string | Date | null | undefined): number | null => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveContentType = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.split(';')[0]?.trim();
  return normalized ? normalized : null;
};

const fetchLinkedInProfile = async (
  accessToken: string
): Promise<LinkedInProfileResponseDto | null> => {
  const response = await fetch(
    `${API_BASE_URL}/userinfo`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.ok) return null;
  return (await response.json()) as LinkedInProfileResponseDto;
};

const extractLinkedInPostUrn = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('urn:li:')) return trimmed;
  if (trimmed.startsWith('http')) {
    try {
      const url = new URL(trimmed);
      const match = url.pathname.match(/\/feed\/update\/([^/]+)/i);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch (_error) {
      return trimmed;
    }
  }
  return trimmed;
};

const resolveLinkedInConnection = async (preferredConnectionId?: string | null) => {
  const repo = await getIntegrationRepository();
  const integrations = await repo.listIntegrations();
  const integration = integrations.find((entry) => entry.slug === 'linkedin') ?? null;
  if (!integration) {
    throw configurationError(
      'LinkedIn integration is not configured. Create it in Admin > Integrations.'
    );
  }
  const connections = await repo.listConnections(integration.id);
  if (connections.length === 0) {
    throw configurationError('LinkedIn connection not found. Add a connection in Admin > Integrations.');
  }
  const preferredId = preferredConnectionId?.trim();
  if (preferredId) {
    const preferred = connections.find((connection) => connection.id === preferredId) ?? null;
    if (!preferred) {
      throw configurationError('Selected LinkedIn connection was not found.');
    }
    if (!preferred.linkedinAccessToken?.trim()) {
      throw configurationError(
        'Selected LinkedIn connection is not authorized. Reauthorize LinkedIn in Admin > Integrations.'
      );
    }
    return { repo, connection: preferred };
  }
  const withToken = connections.filter(
    (connection) => Boolean(connection.linkedinAccessToken?.trim())
  );
  if (withToken.length === 0) {
    throw configurationError(
      'LinkedIn is not connected. Connect LinkedIn in Admin > Integrations.'
    );
  }

  const sorted = [...withToken].sort((left, right) => {
    const leftTs = toTimestamp(left.linkedinTokenUpdatedAt) ?? toTimestamp(left.updatedAt) ?? 0;
    const rightTs = toTimestamp(right.linkedinTokenUpdatedAt) ?? toTimestamp(right.updatedAt) ?? 0;
    return rightTs - leftTs;
  });

  return { repo, connection: sorted[0] };
};

const ensurePersonUrn = async (
  repo: Awaited<ReturnType<typeof getIntegrationRepository>>,
  connectionId: string,
  accessToken: string,
  existingUrn: string | null,
  existingProfileUrl: string | null
): Promise<{ personUrn: string; profileUrl: string | null }> => {
  const trimmedUrn = existingUrn?.trim();
  if (trimmedUrn) {
    return { personUrn: trimmedUrn, profileUrl: existingProfileUrl ?? null };
  }

  const profile = await fetchLinkedInProfile(accessToken);
  const personUrn = profile?.sub ? `urn:li:person:${profile.sub}` : null;
  if (!personUrn) {
    throw configurationError(
      'Unable to resolve LinkedIn profile. Reauthorize LinkedIn in Admin > Integrations.'
    );
  }

  const profileUrl = profile?.name
    ? `https://www.linkedin.com/in/${encodeURIComponent(profile.name)}`
    : null;

  await repo.updateConnection(connectionId, {
    linkedinPersonUrn: personUrn,
    linkedinProfileUrl: profileUrl,
  });

  return { personUrn, profileUrl };
};

const registerLinkedInUpload = async (
  accessToken: string,
  ownerUrn: string
): Promise<RegisteredUpload> => {
  const response = await fetch(`${API_BASE_URL}/assets?action=registerUpload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': RESTLI_PROTOCOL_VERSION,
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: [ASSET_RECIPE],
        owner: ownerUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: UPLOAD_RELATIONSHIP,
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch((error) => {
      void ErrorSystem.captureException(error);
      return '';
    });
    throw operationFailedError(
      `LinkedIn image registration failed${detail ? `: ${detail}` : '.'}`
    );
  }

  const payload = (await response.json()) as {
    value?: {
      asset?: string;
      uploadMechanism?: Record<string, { uploadUrl?: string }>;
    };
  };

  const uploadMechanism = payload?.value?.uploadMechanism ?? {};
  const uploadUrl =
    uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl ??
    null;
  const asset = payload?.value?.asset ?? null;

  if (!uploadUrl || !asset) {
    throw operationFailedError('LinkedIn image registration response is incomplete.');
  }

  return { asset, uploadUrl };
};

const uploadLinkedInImage = async (
  uploadUrl: string,
  buffer: Buffer,
  contentType: string
): Promise<void> => {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': buffer.length.toString(),
    },
    body: new Uint8Array(buffer),
  });

  if (!response.ok) {
    const detail = await response.text().catch((error) => {
      void ErrorSystem.captureException(error);
      return '';
    });
    throw operationFailedError(
      `LinkedIn image upload failed${detail ? `: ${detail}` : '.'}`
    );
  }
};

const resolveImageAsset = async (
  asset: KangurSocialPost['imageAssets'][number]
): Promise<{ buffer: Buffer; contentType: string } | null> => {
  const source = asset.filepath?.trim() || asset.url?.trim() || asset.thumbnailUrl?.trim();
  if (!source) return null;

  if (isHttpFilepath(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      const detail = await response.text().catch((error) => {
        void ErrorSystem.captureException(error);
        return '';
      });
      throw operationFailedError(
        `Failed to download image${detail ? `: ${detail}` : '.'}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const headerType = resolveContentType(response.headers.get('content-type'));
    const lookup = mime.lookup(source);
    const inferredType = resolveContentType(typeof lookup === 'string' ? lookup : null);
    const contentType = headerType ?? inferredType;
    if (!contentType?.startsWith('image/')) {
      throw configurationError('LinkedIn publish supports image files only.');
    }
    return { buffer: Buffer.from(arrayBuffer), contentType };
  }

  // Absolute temp paths (e.g. /var/tmp/libapp-uploads/...) are read directly;
  // relative public paths go through getDiskPathFromPublicPath.
  const diskPath = source.startsWith('/var/tmp/') ? source : getDiskPathFromPublicPath(source);
  const buffer = await fs.readFile(diskPath);
  const lookup = mime.lookup(diskPath);
  const inferredType = resolveContentType(typeof lookup === 'string' ? lookup : null);
  if (!inferredType?.startsWith('image/')) {
    throw configurationError('LinkedIn publish supports image files only.');
  }
  return { buffer, contentType: inferredType };
};

export async function publishLinkedInPersonalPost(
  post: KangurSocialPost,
  options?: { mode?: LinkedInPublishMode; skipImages?: boolean }
): Promise<LinkedInPublishResult> {
  const startedAt = Date.now();
  const imageAssets = options?.skipImages ? [] : (post.imageAssets ?? []);
  const text =
    post.combinedBody?.trim() ||
    buildKangurSocialPostCombinedBody(post.bodyPl, post.bodyEn).trim();
  const publishMode: LinkedInPublishMode = options?.mode ?? 'published';
  const lifecycleState = publishMode === 'draft' ? 'DRAFT' : 'PUBLISHED';
  const baseContext = {
    service: 'kangur.social-posts.linkedin',
    postId: post.id,
    linkedinConnectionId: post.linkedinConnectionId ?? null,
    bodyLength: text.length,
    imageCount: imageAssets.length,
    publishMode,
  };
  let stage = 'resolve_connection';
  let uploadedCount = 0;

  try {
    const { repo, connection } = await resolveLinkedInConnection(post.linkedinConnectionId);
    if (!connection) {
      throw configurationError(
        'LinkedIn connection is missing. Connect LinkedIn in Admin > Integrations.'
      );
    }

    stage = 'validate_token';
    const expiresAt = toTimestamp(connection.linkedinExpiresAt);
    if (expiresAt && expiresAt <= Date.now()) {
      throw configurationError(
        'LinkedIn access token has expired. Reauthorize LinkedIn in Admin > Integrations.'
      );
    }

    const encryptedToken = connection.linkedinAccessToken;
    if (!encryptedToken) {
      throw configurationError(
        'LinkedIn access token is missing. Connect LinkedIn in Admin > Integrations.'
      );
    }

    const accessToken = decryptSecret(encryptedToken);
    if (!accessToken) {
      throw configurationError(
        'LinkedIn access token is invalid. Reauthorize LinkedIn in Admin > Integrations.'
      );
    }

    stage = 'ensure_person';
    const { personUrn } = await ensurePersonUrn(
      repo,
      connection.id,
      accessToken,
      connection.linkedinPersonUrn ?? null,
      connection.linkedinProfileUrl ?? null
    );

    if (!text) {
      throw configurationError('LinkedIn post content is empty.');
    }

    const mediaAssets: string[] = [];

    for (const [index, asset] of imageAssets.slice(0, 9).entries()) {
      stage = `resolve_asset_${index + 1}`;
      const resolved = await resolveImageAsset(asset);
      if (!resolved) continue;
      stage = `register_upload_${index + 1}`;
      const register = await registerLinkedInUpload(accessToken, personUrn);
      stage = `upload_image_${index + 1}`;
      await uploadLinkedInImage(register.uploadUrl, resolved.buffer, resolved.contentType);
      mediaAssets.push(register.asset);
      uploadedCount += 1;
    }

    const shareMediaCategory = mediaAssets.length > 0 ? 'IMAGE' : 'NONE';
    const ugcPayload: Record<string, unknown> = {
      author: personUrn,
      lifecycleState,
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text,
          },
          shareMediaCategory,
          ...(mediaAssets.length > 0
            ? {
              media: mediaAssets.map((asset) => ({
                status: 'READY',
                media: asset,
              })),
            }
            : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    stage = 'publish_post';
    const response = await fetch(`${API_BASE_URL}/ugcPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': RESTLI_PROTOCOL_VERSION,
      },
      body: JSON.stringify(ugcPayload),
    });

    stage = 'parse_response';
    let payload: { id?: string } | null = null;
    const responseText = await response.text();
    if (responseText) {
      try {
        payload = JSON.parse(responseText) as { id?: string };
      } catch (error) {
        void ErrorSystem.captureException(error, {
          ...baseContext,
          action: 'parseResponse',
          stage,
        });
        payload = null;
      }
    }

    if (!response.ok) {
      throw operationFailedError(
        `LinkedIn post failed${responseText ? `: ${responseText}` : '.'}`
      );
    }

    const postId =
      response.headers.get('x-restli-id')?.trim() ||
      payload?.id?.trim() ||
      null;

    if (!postId) {
      throw operationFailedError('LinkedIn post succeeded but returned no post id.');
    }

    const url = `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`;

    void ErrorSystem.logInfo('Kangur LinkedIn post published', {
      ...baseContext,
      durationMs: Date.now() - startedAt,
      uploadedCount,
      skippedImageCount: Math.max(0, imageAssets.length - uploadedCount),
      shareMediaCategory,
    });

    return {
      postId,
      url,
    };
  } catch (error) {
    void ErrorSystem.captureException(error, {
      ...baseContext,
      action: 'publish',
      stage,
      uploadedCount,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

export async function deleteLinkedInPersonalPost(post: KangurSocialPost): Promise<void> {
  const startedAt = Date.now();
  const postReference = post.linkedinPostId?.trim() ? post.linkedinPostId : post.linkedinUrl;
  const postUrn = extractLinkedInPostUrn(postReference ?? null);
  if (!postUrn) {
    throw configurationError('LinkedIn publication details are missing.');
  }

  const baseContext = {
    service: 'kangur.social-posts.linkedin',
    postId: post.id,
    linkedinConnectionId: post.linkedinConnectionId ?? null,
    linkedinPostUrn: postUrn,
  };

  try {
    const { connection } = await resolveLinkedInConnection(post.linkedinConnectionId);
    if (!connection) {
      throw configurationError(
        'LinkedIn connection is missing. Connect LinkedIn in Admin > Integrations.'
      );
    }

    const expiresAt = toTimestamp(connection.linkedinExpiresAt);
    if (expiresAt && expiresAt <= Date.now()) {
      throw configurationError(
        'LinkedIn access token has expired. Reauthorize LinkedIn in Admin > Integrations.'
      );
    }

    const encryptedToken = connection.linkedinAccessToken;
    if (!encryptedToken) {
      throw configurationError(
        'LinkedIn access token is missing. Connect LinkedIn in Admin > Integrations.'
      );
    }

    const accessToken = decryptSecret(encryptedToken);
    if (!accessToken) {
      throw configurationError(
        'LinkedIn access token is invalid. Reauthorize LinkedIn in Admin > Integrations.'
      );
    }

    const encodedUrn = encodeURIComponent(postUrn);
    const response = await fetch(`${API_BASE_URL}/ugcPosts/${encodedUrn}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': RESTLI_PROTOCOL_VERSION,
      },
    });

    if (!response.ok && response.status !== 404) {
      const detail = await response.text().catch((error) => {
        void ErrorSystem.captureException(error);
        return '';
      });
      throw operationFailedError(
        `LinkedIn post delete failed${detail ? `: ${detail}` : '.'}`
      );
    }

    void ErrorSystem.logInfo('Kangur LinkedIn post deleted', {
      ...baseContext,
      durationMs: Date.now() - startedAt,
    });

  } catch (error) {
    void ErrorSystem.captureException(error, {
      ...baseContext,
      action: 'delete',
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
