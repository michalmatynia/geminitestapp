import type { ScripterImportDraft } from '@/features/playwright/scripters';
import type { ActionSequenceKey } from '@/shared/lib/browser-execution/action-sequences';
import type { ProductScrapeProfile } from '@/shared/contracts/products/scrape-profiles';

export type ProductScrapeProfileConfig = Omit<ProductScrapeProfile, 'runtimeActionKey'> & {
  runtimeActionKey: ActionSequenceKey;
  skuPrefix: string;
  supplierName: string;
  priceComment: string;
};

export type ProductScrapeCandidate = {
  title: string;
  sku: string;
  price: number | null;
  sourceUrl: string;
  imageLinks: string[];
};

const TRACKING_QUERY_PARAM_PATTERN = /^(utm_|fbclid$|gclid$|gbraid$|wbraid$|mc_cid$|mc_eid$)/i;

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().replace(',', '.');
  if (normalized.length === 0) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    const single = normalizeString(value);
    return single !== null ? [single] : [];
  }
  return value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => entry !== null);
};

const toAbsoluteUrl = (value: string, baseUrl: string): string | null => {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
};

const canonicalizeSourceUrl = (value: string, baseUrl: string): string | null => {
  const absolute = toAbsoluteUrl(value, baseUrl);
  if (absolute === null) return null;
  try {
    const url = new URL(absolute);
    url.hash = '';
    Array.from(url.searchParams.keys()).forEach((key) => {
      if (TRACKING_QUERY_PARAM_PATTERN.test(key)) url.searchParams.delete(key);
    });
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return absolute;
  }
};

const normalizeUrls = (values: string[], baseUrl: string): string[] =>
  Array.from(
    new Set(
      values
        .map((value) => toAbsoluteUrl(value, baseUrl))
        .filter((value): value is string => value !== null)
    )
  );

const resolveUrlPathIdentityToken = (value: string): string | null => {
  try {
    const url = new URL(value);
    const token = url.pathname
      .split('/')
      .filter((segment) => segment.trim().length > 0)
      .at(-1);
    if (token === undefined || !/^[a-zA-Z0-9._-]+$/.test(token)) return null;
    return token;
  } catch {
    return null;
  }
};

const normalizeSkuToken = (value: unknown): string | null => {
  const raw = normalizeString(value);
  if (raw === null) return null;
  const tokenSource = resolveUrlPathIdentityToken(raw) ?? raw;
  const token = tokenSource
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return token.length > 0 ? token.toUpperCase() : null;
};

const getRawString = (draft: ScripterImportDraft, key: string): string | null =>
  normalizeString(draft.raw[key]);

const resolveDraftTitle = (draft: ScripterImportDraft): string | null =>
  normalizeString(draft.draft.name_pl) ??
  normalizeString(draft.draft.name) ??
  normalizeString(draft.draft.name_en);

const resolveDraftExternalId = (
  draft: ScripterImportDraft,
  sourceUrl: string | null
): string | null =>
  normalizeString(draft.externalId) ??
  getRawString(draft, 'product_id') ??
  sourceUrl;

export const buildCandidate = (
  draft: ScripterImportDraft,
  profile: ProductScrapeProfileConfig
): ProductScrapeCandidate | null => {
  const title = resolveDraftTitle(draft);
  const sourceUrl = normalizeString(draft.draft.supplierLink);
  const canonicalSourceUrl =
    sourceUrl !== null ? canonicalizeSourceUrl(sourceUrl, profile.sourceUrl) : null;
  const skuToken =
    normalizeSkuToken(draft.draft.sku) ??
    normalizeSkuToken(resolveDraftExternalId(draft, canonicalSourceUrl));
  if (title === null || skuToken === null || canonicalSourceUrl === null) return null;
  return {
    title,
    sku: `${profile.skuPrefix}${skuToken}`,
    price: normalizeNumber(draft.draft.price),
    sourceUrl: canonicalSourceUrl,
    imageLinks: normalizeUrls(normalizeStringArray(draft.draft.imageLinks), profile.sourceUrl),
  };
};

export const buildCandidateDuplicateKeys = (
  candidate: ProductScrapeCandidate,
  profile: ProductScrapeProfileConfig
): string[] => [
  `${profile.id}:sku:${candidate.sku.trim().toUpperCase()}`,
  `${profile.id}:source:${candidate.sourceUrl}`,
];
