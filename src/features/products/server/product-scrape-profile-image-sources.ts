import 'server-only';

const IMAGE_EXTENSION_PATTERN = /\.(?:avif|gif|jpe?g|png|webp|svg)(?:[?#]|$)/i;
const PRODUCT_GFX_ID_PATTERN = /\/productGfx_(\d+)_/i;
const PRODUCT_GFX_SIZE_PATTERN = /\/productGfx_\d+_(\d+)_(\d+)\//i;
const PRODUCT_GFX_ATTRIBUTE_PATTERN =
  /\b(?:content|data-[\w-]+|href|src|srcset)=["']([^"']*productGfx_[^"']*)["']/gi;
const PRODUCT_GALLERY_PATTERN = /<product-gallery\b[\s\S]*?<\/product-gallery>/i;

type SourceImageCandidate = {
  key: string;
  order: number;
  score: number;
  url: string;
};

const toAbsoluteImageUrl = (value: string, baseUrl: string): string | null => {
  const normalized = value.trim().replaceAll('&amp;', '&');
  if (normalized.length === 0 || !IMAGE_EXTENSION_PATTERN.test(normalized)) return null;
  try {
    return new URL(normalized, baseUrl).toString();
  } catch {
    return null;
  }
};

const imageIdentityKey = (url: string): string => PRODUCT_GFX_ID_PATTERN.exec(url)?.[1] ?? url;

const imageSizeScore = (url: string): number => {
  const match = PRODUCT_GFX_SIZE_PATTERN.exec(url);
  if (match === null) return 0;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return 0;
  if (width === 0 && height === 0) return 1_000_000;
  return width * height;
};

const srcsetValues = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim().split(/\s+/)[0] ?? '')
    .filter((entry) => entry.length > 0);

const createCandidate = (
  value: string,
  baseUrl: string,
  order: number
): SourceImageCandidate | null => {
  const url = toAbsoluteImageUrl(value, baseUrl);
  if (url === null) return null;
  return {
    key: imageIdentityKey(url),
    order,
    score: imageSizeScore(url),
    url,
  };
};

const rememberBestCandidate = (
  imagesByKey: Map<string, SourceImageCandidate>,
  candidate: SourceImageCandidate
): void => {
  const existing = imagesByKey.get(candidate.key);
  if (existing !== undefined && candidate.score <= existing.score) return;
  imagesByKey.set(candidate.key, {
    ...candidate,
    order: existing?.order ?? candidate.order,
  });
};

const resolveProductImageSearchHtml = (html: string): string =>
  PRODUCT_GALLERY_PATTERN.exec(html)?.[0] ?? html;

export const extractScrapeImageLinksFromSourceHtml = (
  html: string,
  baseUrl: string
): string[] => {
  const imagesByKey = new Map<string, SourceImageCandidate>();
  const searchHtml = resolveProductImageSearchHtml(html);
  let order = 0;

  for (const match of searchHtml.matchAll(PRODUCT_GFX_ATTRIBUTE_PATTERN)) {
    for (const value of srcsetValues(match[1] ?? '')) {
      const candidate = createCandidate(value, baseUrl, order);
      order += 1;
      if (candidate === null) continue;
      rememberBestCandidate(imagesByKey, candidate);
    }
  }

  return Array.from(imagesByKey.values())
    .sort((left, right) => left.order - right.order)
    .map((candidate) => candidate.url);
};
