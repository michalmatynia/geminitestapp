import 'server-only';

import { badRequestError } from '@/shared/errors/app-error';

import {
  cancelRemoteProductResponseBody,
  fetchWithRemoteProductTimeout,
  readResponseBlobWithTimeout,
  readResponseTextWithTimeout,
  runWithRemoteProductTimeout,
} from './product-remote-fetch-timeout';
import { isRemoteProductImageLikeResponse } from './product-remote-image-sniff';
import {
  buildImageDownloadHeaders,
  buildSourcePageHeaders,
  createDownloadedImageFile,
  IMAGE_EXTENSIONS,
  normalizeUrl,
  readSetCookieHeaders,
  resolveImageExtensionFromUrl,
  resolveImageMimeType,
  resolveRemoteProductImageFilename,
  toCookieHeader,
} from './product-remote-image-download.helpers';

export type RemoteProductSourcePageResult = {
  cookieHeader: string | null;
  html: string | null;
};

export type DownloadedRemoteProductImage = {
  file: File;
  filename: string;
  mimetype: string;
  sourceUrl: string;
};

type DownloadRemoteProductImageInput = {
  fallbackFilenamePrefix?: string | null;
  imageUrl: string;
  index?: number;
  preferredFilename?: string | null;
  refererUrl?: string | null;
  signal?: AbortSignal;
  sourcePageUrl?: string | null;
};

type FetchRemoteProductImageResponseInput = {
  imageUrl: string;
  refererUrl?: string | null;
  signal?: AbortSignal;
  sourcePageUrl?: string | null;
};

const isHtmlResponse = (headers: Headers): boolean => {
  const contentType = headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.length === 0 || contentType.includes('text/html');
};

export const fetchRemoteProductSourcePage = async (
  sourcePageUrl: string | null | undefined,
  options: { signal?: AbortSignal } = {}
): Promise<RemoteProductSourcePageResult> => {
  const normalizedSourceUrl = normalizeUrl(sourcePageUrl);
  if (normalizedSourceUrl === null) return { cookieHeader: null, html: null };

  const response = await fetchWithRemoteProductTimeout(
    'Remote product source page fetch',
    options.signal,
    async (signal) =>
      await fetch(normalizedSourceUrl, {
        cache: 'no-store',
        headers: buildSourcePageHeaders(),
        redirect: 'follow',
        signal,
      })
  );
  return {
    cookieHeader: toCookieHeader(readSetCookieHeaders(response.headers)),
    html:
      response.ok && isHtmlResponse(response.headers)
        ? await readResponseTextWithTimeout(response, options.signal)
        : null,
  };
};

const fetchImageResponse = (
  imageUrl: string,
  refererUrl: string | null,
  cookieHeader: string | null,
  signal?: AbortSignal
): Promise<Response> =>
  fetchWithRemoteProductTimeout(
    'Remote product image fetch',
    signal,
    async (timeoutSignal) =>
      await fetch(imageUrl, {
        cache: 'no-store',
        headers: buildImageDownloadHeaders(refererUrl, cookieHeader),
        redirect: 'follow',
        signal: timeoutSignal,
      })
  );

const isImageLikeResponse = async (
  response: Response,
  imageUrl: string,
  signal: AbortSignal | undefined
): Promise<boolean> =>
  await runWithRemoteProductTimeout(
    'Remote product image response sniff',
    signal,
    async () =>
      await isRemoteProductImageLikeResponse({
        extension: resolveImageExtensionFromUrl(imageUrl),
        response,
        supportedExtensions: IMAGE_EXTENSIONS,
      }),
    () => cancelRemoteProductResponseBody(response)
  );

export const fetchRemoteProductImageResponse = async ({
  imageUrl,
  refererUrl,
  signal,
  sourcePageUrl,
}: FetchRemoteProductImageResponseInput): Promise<Response> => {
  const normalizedImageUrl = normalizeUrl(imageUrl);
  if (normalizedImageUrl === null) {
    throw badRequestError('Image URL is invalid.', { url: imageUrl });
  }

  const normalizedRefererUrl = normalizeUrl(refererUrl) ?? normalizedImageUrl;
  const response = await fetchImageResponse(normalizedImageUrl, normalizedRefererUrl, null, signal);
  if (response.ok && (await isImageLikeResponse(response, normalizedImageUrl, signal))) {
    return response;
  }

  const { cookieHeader } = await fetchRemoteProductSourcePage(sourcePageUrl ?? refererUrl, {
    signal,
  });
  if (cookieHeader === null) return response;
  return await fetchImageResponse(normalizedImageUrl, normalizedRefererUrl, cookieHeader, signal);
};

export const downloadRemoteProductImageFile = async (
  input: DownloadRemoteProductImageInput
): Promise<DownloadedRemoteProductImage> => {
  const response = await fetchRemoteProductImageResponse(input);
  if (!response.ok) {
    throw badRequestError(`Failed to download image (${response.status}).`, {
      url: input.imageUrl,
      status: response.status,
    });
  }

  const blob = await readResponseBlobWithTimeout(response, input.signal);
  if (blob.size <= 0) {
    throw badRequestError('Downloaded image is empty.', { url: input.imageUrl });
  }

  const mimetype = resolveImageMimeType({
    blobType: blob.type,
    headerType: response.headers.get('content-type'),
    url: input.imageUrl,
  });
  const filename = resolveRemoteProductImageFilename({
    fallbackFilenamePrefix: input.fallbackFilenamePrefix,
    imageUrl: input.imageUrl,
    index: input.index ?? 0,
    mimetype,
    preferredFilename: input.preferredFilename,
  });

  return {
    file: createDownloadedImageFile(blob, filename, mimetype),
    filename,
    mimetype,
    sourceUrl: input.imageUrl,
  };
};
