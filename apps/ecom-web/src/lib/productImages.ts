const DEFAULT_FILE_BASE_URL = 'https://sparksofsindri.com';
const UPLOADS_SEGMENT = '/uploads/';
const LEGACY_FILE_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);
const DEFAULT_FILE_HOSTS = new Set([new URL(DEFAULT_FILE_BASE_URL).hostname]);

function normalizeFileBaseUrl(value: string | undefined): string {
  const raw = value?.trim().replace(/\/$/, '');
  if (!raw) return '';

  const url = parseHttpUrl(raw);
  if (!url) return raw;
  if (LEGACY_FILE_HOSTS.has(url.hostname.toLowerCase())) {
    const defaultUrl = new URL(DEFAULT_FILE_BASE_URL);
    url.protocol = defaultUrl.protocol;
    url.hostname = defaultUrl.hostname;
    url.port = defaultUrl.port;
  }
  return url.toString().replace(/\/$/, '');
}

function getFileBaseUrl(): string {
  const configured = normalizeFileBaseUrl(process.env.NEXT_PUBLIC_FILE_BASE_URL);
  return configured || DEFAULT_FILE_BASE_URL;
}

function getFallbackFileBaseUrl(): string {
  const configured = normalizeFileBaseUrl(process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL);
  if (configured) return configured;

  const mainAppUrl = normalizeFileBaseUrl(process.env.NEXT_PUBLIC_MAIN_APP_URL);
  if (mainAppUrl) return mainAppUrl;

  return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function uploadPathWithSuffix(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`;
}

function normalizeProductUploadPath(value: string): string | undefined {
  const normalized = value
    .replace(/^\/?public\/uploads\//i, UPLOADS_SEGMENT)
    .replace(/^\/?uploads\//i, UPLOADS_SEGMENT);
  const uploadIndex = normalized.indexOf(UPLOADS_SEGMENT);
  return uploadIndex >= 0 ? normalized.slice(uploadIndex) : undefined;
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  );
}

function isConfiguredFileOrigin(url: URL): boolean {
  const fileBaseUrl = parseHttpUrl(getFileBaseUrl());
  return fileBaseUrl !== null && url.origin === fileBaseUrl.origin;
}

function isKnownFileHost(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return (
    DEFAULT_FILE_HOSTS.has(hostname) ||
    LEGACY_FILE_HOSTS.has(hostname) ||
    isConfiguredFileOrigin(url) ||
    isLocalHostname(hostname)
  );
}

function shouldRewriteUploadHost(url: URL, uploadPath: string | undefined): uploadPath is string {
  return uploadPath !== undefined && isKnownFileHost(url);
}

export function getProductUploadPath(src: string | undefined): string | undefined {
  const raw = src?.trim();
  if (!raw) return undefined;

  if (/^https?:\/\//i.test(raw)) {
    const url = parseHttpUrl(raw);
    return url ? normalizeProductUploadPath(uploadPathWithSuffix(url)) : undefined;
  }

  return normalizeProductUploadPath(raw);
}

export function getProductImageSrc(src: string | undefined): string | undefined {
  const raw = src?.trim();
  if (!raw) return undefined;

  if (/^https?:\/\//i.test(raw)) {
    const url = parseHttpUrl(raw);
    const uploadPath = url ? normalizeProductUploadPath(uploadPathWithSuffix(url)) : undefined;
    if (url && shouldRewriteUploadHost(url, uploadPath)) {
      return `${getFileBaseUrl()}${uploadPath}`;
    }
    return raw;
  }

  const uploadPath = normalizeProductUploadPath(raw);
  if (uploadPath !== undefined) return `${getFileBaseUrl()}${uploadPath}`;
  return raw;
}

export function getProductImageFallbackSrc(src: string | undefined): string | undefined {
  const uploadPath = getProductUploadPath(src);
  if (uploadPath === undefined) return undefined;

  const fallbackBaseUrl = getFallbackFileBaseUrl();
  return fallbackBaseUrl ? `${fallbackBaseUrl}${uploadPath}` : uploadPath;
}

// All known upload hosts are listed in next.config.mjs remotePatterns, so
// every product image URL can go through Next.js Image optimization.
export function shouldBypassImageOptimization(_src: string | undefined): boolean {
  return false;
}
