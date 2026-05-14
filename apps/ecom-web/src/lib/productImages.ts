const DEFAULT_FILE_BASE_URL = 'https://sparksofsindri.com';
const UPLOADS_SEGMENT = '/uploads/';
const LEGACY_FILE_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);
const DEFAULT_FILE_HOSTS = new Set([new URL(DEFAULT_FILE_BASE_URL).hostname]);

function normalizeFileBaseUrl(value: string | undefined): string {
  const raw = value?.trim().replace(/\/$/, '');
  if (raw === '' || raw === undefined) return '';

  const url = parseHttpUrl(raw);
  if (url === null) return raw;
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
  return configured === '' ? DEFAULT_FILE_BASE_URL : configured;
}

function getFallbackFileBaseUrl(): string {
  const configured = normalizeFileBaseUrl(process.env.NEXT_PUBLIC_FILE_FALLBACK_BASE_URL);
  if (configured !== '') return configured;

  const mainAppUrl = normalizeFileBaseUrl(process.env.NEXT_PUBLIC_MAIN_APP_URL);
  if (mainAppUrl !== '') return mainAppUrl;

  return process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
}

function getFallbackImageProxySrc(uploadPath: string, fallbackBaseUrl: string): string | undefined {
  const fallbackUrl = parseHttpUrl(fallbackBaseUrl);
  if (fallbackUrl === null || !isLocalHostname(fallbackUrl.hostname)) return undefined;

  return `/api/product-images/fallback?path=${encodeURIComponent(uploadPath)}`;
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

function isFallbackImageProxyPath(raw: string): boolean {
  return raw.startsWith('/api/product-images/fallback?');
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

function getProductImageSrcFromUrl(raw: string): string {
  const url = parseHttpUrl(raw);
  if (url === null) return raw;

  const uploadPath = normalizeProductUploadPath(uploadPathWithSuffix(url));
  if (uploadPath === undefined) return raw;

  if (shouldRewriteUploadHost(url, uploadPath)) {
    return `${getFileBaseUrl()}${uploadPath}`;
  }

  return raw;
}

function getProductImageSrcFromPath(raw: string): string {
  const uploadPath = normalizeProductUploadPath(raw);
  if (uploadPath === undefined) return raw;

  return `${getFileBaseUrl()}${uploadPath}`;
}

export function getProductUploadPath(src: string | undefined): string | undefined {
  const raw = src?.trim();
  if (raw === '' || raw === undefined) return undefined;

  if (/^https?:\/\//i.test(raw)) {
    const url = parseHttpUrl(raw);
    if (url === null) return undefined;
    return normalizeProductUploadPath(uploadPathWithSuffix(url));
  }

  return normalizeProductUploadPath(raw);
}

export function getProductImageSrc(src: string | undefined): string | undefined {
  const raw = src?.trim();
  if (raw === '' || raw === undefined) return undefined;

  const isRemoteUrl = /^https?:\/\//i.test(raw);
  if (isRemoteUrl) return getProductImageSrcFromUrl(raw);

  return getProductImageSrcFromPath(raw);
}

export function getProductImageFallbackSrc(src: string | undefined): string | undefined {
  const uploadPath = getProductUploadPath(src);
  if (uploadPath === undefined) return undefined;

  const fallbackBaseUrl = getFallbackFileBaseUrl();
  if (fallbackBaseUrl === '') return uploadPath;

  return getFallbackImageProxySrc(uploadPath, fallbackBaseUrl) ?? `${fallbackBaseUrl}${uploadPath}`;
}

export function shouldBypassImageOptimization(src: string | undefined): boolean {
  const raw = src?.trim();
  if (raw === '' || raw === undefined) return false;
  if (isFallbackImageProxyPath(raw)) return true;

  const url = parseHttpUrl(raw);
  if (url === null) return false;

  const uploadPath = normalizeProductUploadPath(uploadPathWithSuffix(url));
  return shouldRewriteUploadHost(url, uploadPath);
}
