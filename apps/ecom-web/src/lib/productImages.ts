const DEFAULT_FILE_BASE_URL = 'https://sparksofsindri.com';
const UPLOADS_PREFIX = '/uploads/';
const LEGACY_FILE_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);

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

function shouldRewriteUploadHost(url: URL): boolean {
  return url.pathname.startsWith(UPLOADS_PREFIX) && LEGACY_FILE_HOSTS.has(url.hostname.toLowerCase());
}

export function getProductUploadPath(src: string | undefined): string | undefined {
  const raw = src?.trim();
  if (!raw) return undefined;
  if (raw.startsWith(UPLOADS_PREFIX)) return raw;

  if (/^https?:\/\//i.test(raw)) {
    const url = parseHttpUrl(raw);
    return url?.pathname.startsWith(UPLOADS_PREFIX) ? uploadPathWithSuffix(url) : undefined;
  }

  return undefined;
}

export function getProductImageSrc(src: string | undefined): string | undefined {
  const raw = src?.trim();
  if (!raw) return undefined;

  if (/^https?:\/\//i.test(raw)) {
    const url = parseHttpUrl(raw);
    if (url && shouldRewriteUploadHost(url)) {
      return `${getFileBaseUrl()}${uploadPathWithSuffix(url)}`;
    }
    return raw;
  }

  if (raw.startsWith(UPLOADS_PREFIX)) return `${getFileBaseUrl()}${raw}`;
  return raw;
}

export function getProductImageFallbackSrc(src: string | undefined): string | undefined {
  return getProductUploadPath(src);
}

export function shouldBypassImageOptimization(src: string | undefined): boolean {
  const resolvedSrc = getProductImageSrc(src);
  if (!resolvedSrc || !/^https?:\/\//i.test(resolvedSrc)) return false;

  try {
    const url = new URL(resolvedSrc);
    return url.pathname.startsWith(UPLOADS_PREFIX);
  } catch {
    return false;
  }
}
