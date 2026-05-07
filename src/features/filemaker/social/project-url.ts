const LOOPBACK_HOST_PATTERN = /^(?:127(?:\.\d{1,3}){3}|0\.0\.0\.0|::1)$/i;
const LOCALHOST_SUBDOMAIN_PATTERN = /(^|\.)localhost$/i;
const PRIVATE_HOST_PATTERN =
  /^(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2}|10\.0\.2\.2)$/i;
const DEVELOPMENT_URL_WITH_SCHEME_PATTERN =
  /\bhttps?:\/\/(?:localhost|(?:[a-z0-9-]+\.)*localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|::1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2})(?::\d+)?(?:\/[^\s)\]}]*)?/gi;
const DEVELOPMENT_HOST_PATTERN =
  /(^|[\s`("'[\]{}<])((?:localhost|(?:[a-z0-9-]+\.)*localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\]|::1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}|169\.254(?:\.\d{1,3}){2})(?::\d+)?(?:\/[^\s)\]}]*)?)/gi;

export const SOCIAL_PUBLISHING_PROJECT_URL_REQUIRED_MESSAGE =
  'Set Settings Project URL before generating social posts.';

export const SOCIAL_PUBLISHING_PROJECT_URL_INVALID_MESSAGE =
  'Settings Project URL must be a valid public URL. Localhost, loopback, and private network URLs are not allowed.';

export const normalizeSocialPublishingProjectUrl = (
  value: string | null | undefined
): string => value?.trim() ?? '';

const isLoopbackHost = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (normalized === '') return false;
  return (
    normalized === 'localhost' ||
    LOCALHOST_SUBDOMAIN_PATTERN.test(normalized) ||
    LOOPBACK_HOST_PATTERN.test(normalized) ||
    PRIVATE_HOST_PATTERN.test(normalized)
  );
};

export const getSocialPublishingProjectUrlError = (
  value: string | null | undefined
): string | null => {
  const normalized = normalizeSocialPublishingProjectUrl(value);
  if (normalized === '') {
    return SOCIAL_PUBLISHING_PROJECT_URL_REQUIRED_MESSAGE;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return SOCIAL_PUBLISHING_PROJECT_URL_INVALID_MESSAGE;
    }
    if (isLoopbackHost(parsed.hostname)) {
      return SOCIAL_PUBLISHING_PROJECT_URL_INVALID_MESSAGE;
    }
    return null;
  } catch {
    return SOCIAL_PUBLISHING_PROJECT_URL_INVALID_MESSAGE;
  }
};

export const sanitizeSocialPublishingPromptText = (value: string): string =>
  value
    .replace(
      DEVELOPMENT_URL_WITH_SCHEME_PATTERN,
      '[local development URL removed]'
    )
    .replace(
      DEVELOPMENT_HOST_PATTERN,
      (_match, prefix: string) => `${prefix}[local development URL removed]`
    );
