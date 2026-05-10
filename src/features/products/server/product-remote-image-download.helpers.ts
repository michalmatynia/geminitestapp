import 'server-only';

import path from 'path';

import { badRequestError } from '@/shared/errors/app-error';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const IMAGE_EXTENSION_MIME_TYPES = new Map<string, string>([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

export const IMAGE_EXTENSIONS = new Set(IMAGE_EXTENSION_MIME_TYPES.keys());

export const normalizeUrl = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) return null;

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
};

export const buildImageDownloadHeaders = (
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

export const buildSourcePageHeaders = (): HeadersInit => ({
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'upgrade-insecure-requests': '1',
  'user-agent': BROWSER_USER_AGENT,
});

export const readSetCookieHeaders = (headers: Headers): string[] => {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies =
    typeof withGetSetCookie.getSetCookie === 'function'
      ? withGetSetCookie.getSetCookie()
      : [];
  const singleHeader = headers.get('set-cookie');
  return singleHeader === null ? setCookies : [...setCookies, singleHeader];
};

export const toCookieHeader = (setCookieHeaders: string[]): string | null => {
  const cookiePairs = Array.from(
    new Set(
      setCookieHeaders
        .map((value) => value.split(';')[0]?.trim() ?? '')
        .filter((value) => value.length > 0)
    )
  );
  return cookiePairs.length > 0 ? cookiePairs.join('; ') : null;
};

export const resolveImageExtensionFromUrl = (url: string): string | null => {
  try {
    const extension = path.extname(new URL(url).pathname).trim().toLowerCase();
    return extension.length > 0 ? extension : null;
  } catch {
    return null;
  }
};

const extensionForMimeType = (mimetype: string): string => {
  const normalized = mimetype.trim().toLowerCase();
  for (const [extension, mappedMimeType] of IMAGE_EXTENSION_MIME_TYPES.entries()) {
    if (mappedMimeType === normalized) return extension === '.jpeg' ? '.jpg' : extension;
  }
  return '.jpg';
};

const normalizeMimeType = (value: string | null | undefined): string => value?.trim() ?? '';

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

export const resolveImageMimeType = (input: {
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

export const createDownloadedImageFile = (
  blob: Blob,
  filename: string,
  mimetype: string
): File => {
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

export const resolveRemoteProductImageFilename = (input: {
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
