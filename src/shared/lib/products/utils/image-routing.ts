import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  LOCAL_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
} from '@/shared/lib/products/constants';

const PRODUCT_UPLOAD_PREFIX = '/uploads/';
const LEGACY_PRODUCT_IMAGE_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);
const CURRENT_PRODUCT_IMAGE_HOSTS = new Set([new URL(DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL).hostname]);

export const normalizeProductImageExternalBaseUrl = (value: string | null | undefined): string => {
  const trimmed = value?.trim() ?? '';
  if (trimmed.length === 0) return '';

  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withProtocol = hasProtocol ? trimmed : `http://${trimmed.replace(/^\/+/, '')}`;

  try {
    const url = new URL(withProtocol);
    if (LEGACY_PRODUCT_IMAGE_HOSTS.has(url.hostname.toLowerCase())) {
      const defaultUrl = new URL(DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL);
      url.protocol = defaultUrl.protocol;
      url.hostname = defaultUrl.hostname;
      url.port = defaultUrl.port;
    }
    return url.toString().replace(/\/+$/, '');
  } catch (error) {
    logClientCatch(error, {
      source: 'products.image-routing',
      action: 'normalizeProductImageExternalBaseUrl',
      valueLength: trimmed.length,
    });
    return trimmed.replace(/\/+$/, '');
  }
};

const isLoopbackHostname = (hostname: string): boolean => {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '::1'
  );
};

const isLoopbackBaseUrl = (baseUrl: string): boolean => {
  if (baseUrl.length === 0) return false;
  try {
    return isLoopbackHostname(new URL(baseUrl).hostname);
  } catch (error) {
    logClientCatch(error, {
      source: 'products.image-routing',
      action: 'isLoopbackBaseUrl',
      baseUrl,
    });
    return false;
  }
};

const joinPathToBase = (path: string, baseUrl: string): string => {
  const normalizedBase = normalizeProductImageExternalBaseUrl(baseUrl);
  if (normalizedBase.length === 0) return path;
  const cleanedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}/${cleanedPath}`;
};

const isInlinePreviewUrl = (value: string): boolean =>
  value.startsWith('data:') || value.startsWith('blob:');

const isAbsoluteUrlLike = (value: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(value);

const isHttpProtocol = (protocol: string): boolean => {
  const normalizedProtocol = protocol.toLowerCase();
  return normalizedProtocol === 'http:' || normalizedProtocol === 'https:';
};

const isLegacyProductImageHostname = (hostname: string): boolean =>
  LEGACY_PRODUCT_IMAGE_HOSTS.has(hostname.toLowerCase());

const isCurrentProductImageHostname = (hostname: string): boolean =>
  CURRENT_PRODUCT_IMAGE_HOSTS.has(hostname.toLowerCase());

const toProductImagePath = (value: string): string =>
  value.startsWith('/') ? value : `/${value.replace(/^\/+/, '')}`;

const resolveRelativeProductImageUrl = (
  value: string,
  normalizedBase: string,
  baseIsLoopback: boolean
): string => {
  const path = toProductImagePath(value);
  if (normalizedBase.length === 0 || baseIsLoopback) {
    return path;
  }
  return joinPathToBase(path, normalizedBase);
};

const productImagePathWithSuffix = (url: URL): string =>
  `${url.pathname}${url.search}${url.hash}`;

const isRoutableProductUploadUrl = (url: URL): boolean =>
  url.pathname.startsWith(PRODUCT_UPLOAD_PREFIX) &&
  (isLegacyProductImageHostname(url.hostname) || isCurrentProductImageHostname(url.hostname));

const resolveLoopbackProductImageUrl = (
  path: string,
  normalizedBase: string,
  baseIsLoopback: boolean,
  fallback: string
): string => {
  if (baseIsLoopback) {
    return path.length > 0 ? path : fallback;
  }
  return joinPathToBase(path, normalizedBase);
};

const resolveAbsoluteProductImageUrl = (
  value: string,
  normalizedBase: string,
  baseIsLoopback: boolean
): string => {
  try {
    const parsed = new URL(value);
    if (!isHttpProtocol(parsed.protocol) || normalizedBase.length === 0) {
      return value;
    }

    const path = productImagePathWithSuffix(parsed);
    if (isRoutableProductUploadUrl(parsed)) {
      return resolveLoopbackProductImageUrl(path, normalizedBase, baseIsLoopback, value);
    }

    const isLoopbackSource = isLoopbackHostname(parsed.hostname);
    if (!isLoopbackSource) {
      return value;
    }

    return resolveLoopbackProductImageUrl(path, normalizedBase, baseIsLoopback, value);
  } catch (error) {
    logClientCatch(error, {
      source: 'products.image-routing',
      action: 'resolveProductImageUrl.parseAbsoluteUrl',
      rawValue: value,
    });
    return value;
  }
};

export const resolveProductImageUrl = (
  rawValue: string | null | undefined,
  externalBaseUrl?: string | null
): string | null => {
  const value = rawValue?.trim() ?? '';
  if (value.length === 0) return null;

  if (isInlinePreviewUrl(value)) {
    return value;
  }

  const normalizedBase = normalizeProductImageExternalBaseUrl(externalBaseUrl);
  const baseIsLoopback = isLoopbackBaseUrl(normalizedBase);

  if (value.startsWith('/')) {
    return resolveRelativeProductImageUrl(value, normalizedBase, baseIsLoopback);
  }

  if (isAbsoluteUrlLike(value)) {
    return resolveAbsoluteProductImageUrl(value, normalizedBase, baseIsLoopback);
  }

  return resolveRelativeProductImageUrl(value, normalizedBase, baseIsLoopback);
};

export type ProductImageServingMode = 'fastcomet' | 'local';

export const productImageServingRouteByMode: Record<ProductImageServingMode, string> = {
  fastcomet: DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  local: LOCAL_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
};

export const resolveProductImageServingMode = (
  externalBaseUrl: string | null | undefined
): ProductImageServingMode => {
  const normalized = normalizeProductImageExternalBaseUrl(externalBaseUrl);
  return isLoopbackBaseUrl(normalized) ? 'local' : 'fastcomet';
};
