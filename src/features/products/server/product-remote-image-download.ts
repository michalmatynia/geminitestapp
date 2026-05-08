import 'server-only';

import path from 'path';

import { badRequestError } from '@/shared/errors/app-error';

import { isRemoteProductImageLikeResponse } from './product-remote-image-sniff';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

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
  sourcePageUrl?: string | null;
};

type FetchRemoteProductImageResponseInput = {
  imageUrl: string;
  refererUrl?: string | null;
  sourcePageUrl?: string | null;
};

const IMAGE_EXTENSION_MIME_TYPES = new Map<string, string>([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

const IMAGE_EXTENSIONS = new Set(IMAGE_EXTENSION_MIME_TYPES.keys());

const normalizeUrl = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) return null;

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
};

const buildImageDownloadHeaders = (
  refererUrl: string | null,
  cookieHeader: string | null = null
): HeadersInit => {
  const headers: Record<string, string> = {
    accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
    'sec-fetch-dest': 'image',
    'sec-fetch-mode': 'no-cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': BROWSER_USER_AGENT,
  };
  if (refererUrl !== null) headers.referer = refererUrl;
  if (cookieHeader !== null && cookieHeader.length > 0) headers.cookie = cookieHeader;
  return headers;
};

const buildSourcePageHeaders = (): HeadersInit => ({
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'upgrade-insecure-requests': '1',
  'user-agent': BROWSER_USER_AGENT,
});

const readSetCookieHeaders = (headers: Headers): string[] => {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies =
    typeof withGetSetCookie.getSetCookie === 'function'
      ? withGetSetCookie.getSetCookie()
      : [];
  const singleHeader = headers.get('set-cookie');
  return singleHeader === null ? setCookies : [...setCookies, singleHeader];
};

const toCookieHeader = (setCookieHeaders: string[]): string | null => {
  const cookiePairs = Array.from(
    new Set(
      setCookieHeaders
        .map((value) => value.split(';')[0]?.trim() ?? '')
        .filter((value) => value.length > 0)
    )
  );
  return cookiePairs.length > 0 ? cookiePairs.join('; ') : null;
};

const isHtmlResponse = (headers: Headers): boolean => {
  const contentType = headers.get('content-type')?.toLowerCase() ?? '';
  return contentType.length === 0 || contentType.includes('text/html');
};

const resolveImageExtensionFromUrl = (url: string): string | null => {
  try {
    const extension = path.extname(new URL(url).pathname).trim().toLowerCase();
    return extension.length > 0 ? extension : null;
  } catch {
    return null;
  }
};

export const fetchRemoteProductSourcePage = async (
  sourcePageUrl: string | null | undefined
): Promise<RemoteProductSourcePageResult> => {
  const normalizedSourceUrl = normalizeUrl(sourcePageUrl);
  if (normalizedSourceUrl === null) return { cookieHeader: null, html: null };

  const response = await fetch(normalizedSourceUrl, {
    cache: 'no-store',
    headers: buildSourcePageHeaders(),
    redirect: 'follow',
  });
  return {
    cookieHeader: toCookieHeader(readSetCookieHeaders(response.headers)),
    html: response.ok && isHtmlResponse(response.headers) ? await response.text() : null,
  };
};

const fetchImageResponse = (
  imageUrl: string,
  refererUrl: string | null,
  cookieHeader: string | null = null
): Promise<Response> =>
  fetch(imageUrl, {
    cache: 'no-store',
    headers: buildImageDownloadHeaders(refererUrl, cookieHeader),
    redirect: 'follow',
  });

const isImageLikeResponse = async (response: Response, imageUrl: string): Promise<boolean> => {
  return await isRemoteProductImageLikeResponse({
    extension: resolveImageExtensionFromUrl(imageUrl),
    response,
    supportedExtensions: IMAGE_EXTENSIONS,
  });
};

export const fetchRemoteProductImageResponse = async ({
  imageUrl,
  refererUrl,
  sourcePageUrl,
}: FetchRemoteProductImageResponseInput): Promise<Response> => {
  const normalizedImageUrl = normalizeUrl(imageUrl);
  if (normalizedImageUrl === null) {
    throw badRequestError('Image URL is invalid.', { url: imageUrl });
  }

  const normalizedRefererUrl = normalizeUrl(refererUrl) ?? normalizedImageUrl;
  const response = await fetchImageResponse(normalizedImageUrl, normalizedRefererUrl);
  if (response.ok && (await isImageLikeResponse(response, normalizedImageUrl))) return response;

  const { cookieHeader } = await fetchRemoteProductSourcePage(sourcePageUrl ?? refererUrl);
  if (cookieHeader === null) return response;
  return await fetchImageResponse(normalizedImageUrl, normalizedRefererUrl, cookieHeader);
};

const extensionForMimeType = (mimetype: string): string => {
  const normalized = mimetype.trim().toLowerCase();
  for (const [extension, mappedMimeType] of IMAGE_EXTENSION_MIME_TYPES.entries()) {
    if (mappedMimeType === normalized) return extension === '.jpeg' ? '.jpg' : extension;
  }
  return '.jpg';
};

const normalizeMimeType = (value: string | null | undefined): string =>
  value?.trim() ?? '';

const resolveDetectedMimeType = (input: {
  blobType?: string | null;
  headerType?: string | null;
}): string => {
  const blobType = normalizeMimeType(input.blobType);
  if (blobType.length > 0) return blobType;
  return normalizeMimeType(input.headerType);
};

const canUseExtensionMimeType = (detectedMime: string): boolean => {
  const normalized = detectedMime.toLowerCase();
  return normalized.length === 0 || normalized === 'application/octet-stream';
};

const resolveImageMimeType = (input: {
  blobType?: string | null;
  headerType?: string | null;
  url: string;
}): string => {
  const detectedMime = resolveDetectedMimeType(input);
  if (detectedMime.toLowerCase().startsWith('image/')) return detectedMime;

  const extension = resolveImageExtensionFromUrl(input.url);
  const extensionMimeType =
    extension === null ? undefined : IMAGE_EXTENSION_MIME_TYPES.get(extension);
  if (extensionMimeType !== undefined && canUseExtensionMimeType(detectedMime)) {
    return extensionMimeType;
  }

  throw badRequestError('URL does not point to an image.', {
    url: input.url,
    mimetype: detectedMime.length > 0 ? detectedMime : null,
  });
};

const createDownloadedImageFile = (blob: Blob, filename: string, mimetype: string): File => {
  if (typeof File === 'function') {
    return new File([blob], filename, { type: mimetype });
  }

  return Object.assign(blob, {
    lastModified: Date.now(),
    name: filename,
  }) as File;
};

const normalizeFilenameText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
};

const resolveSourceFilename = (url: string): string | null => {
  try {
    const basename = path.basename(new URL(url).pathname).trim();
    return basename.length > 0 ? basename : null;
  } catch {
    return null;
  }
};

const resolveRemoteProductImageFilename = (input: {
  fallbackFilenamePrefix?: string | null;
  imageUrl: string;
  index: number;
  mimetype: string;
  preferredFilename?: string | null;
}): string => {
  const fallbackPrefix = normalizeFilenameText(input.fallbackFilenamePrefix) ?? 'product-image';
  const source =
    normalizeFilenameText(input.preferredFilename) ??
    resolveSourceFilename(input.imageUrl) ??
    `${fallbackPrefix}-${input.index + 1}`;

  const extension = path.extname(source).trim();
  if (extension.length > 0) return source;
  return `${source}${extensionForMimeType(input.mimetype)}`;
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

  const blob = await response.blob();
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
