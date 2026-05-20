import type { SemanticArticleRecord, SemanticExtractedRecord, SemanticMappedRecord } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIRECT_ARTICLE_MIN_WORDS = 40;

const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;

const clip = (text: string, max: number): string =>
  text.length <= max ? text : text.slice(0, max).trimEnd();

const normalizeUrl = (value: string | null | undefined, baseUrl: string): string | null => {
  if (!value?.trim()) return null;
  try {
    const parsed = new URL(value.trim(), baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return null;
  }
};

const firstText = (
  keys: string[],
  raw: Record<string, unknown>
): string | null => {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
};

// ── Field resolution — semantic fields first, raw fallbacks second ────────────

const resolveUrl = (mapped: SemanticMappedRecord, raw: Record<string, unknown>, baseUrl: string): string | null =>
  normalizeUrl(
    mapped.sourceUrl ??
      firstText(['sourceUrl', 'resolvedUrl', 'canonicalUrl', 'url', 'href', 'link', 'permalink', 'articleUrl'], raw),
    baseUrl
  );

const resolveCanonical = (
  mapped: SemanticMappedRecord,
  raw: Record<string, unknown>,
  resolvedUrl: string
): string =>
  normalizeUrl(
    mapped.canonicalUrl ??
      firstText(['canonicalUrl', 'canonical', 'mainEntityOfPage'], raw),
    resolvedUrl
  ) ?? resolvedUrl;

const resolveTitle = (mapped: SemanticMappedRecord, raw: Record<string, unknown>, fallback: string): string =>
  mapped.title ??
  firstText(['title', 'headline', 'name', 'ogTitle'], raw) ??
  fallback;

const resolveDescription = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.description ??
  firstText(['description', 'excerpt', 'summary', 'dek', 'subheadline'], raw);

const resolveBodyText = (mapped: SemanticMappedRecord, raw: Record<string, unknown>, maxChars: number): string => {
  const body =
    mapped.bodyText ??
    firstText(['bodyText', 'articleText', 'articleBody', 'contentText', 'content', 'body'], raw) ??
    '';
  return clip(body, maxChars);
};

const resolveAuthor = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.author ?? firstText(['author', 'creator', 'byline'], raw);

const resolvePublishedAt = (mapped: SemanticMappedRecord, raw: Record<string, unknown>): string | null =>
  mapped.publishedAt ?? firstText(['publishedAt', 'datePublished', 'dateCreated', 'date'], raw);

const resolveImageUrl = (
  mapped: SemanticMappedRecord,
  raw: Record<string, unknown>,
  resolvedUrl: string
): string | null =>
  normalizeUrl(
    mapped.images[0] ?? firstText(['imageUrl', 'image', 'thumbnailUrl', 'ogImage'], raw),
    resolvedUrl
  );

const resolveExcerpt = (
  mapped: SemanticMappedRecord,
  description: string | null,
  bodyText: string
): string | null =>
  mapped.excerpt ?? ((description ? clip(description, 1200) : clip(bodyText, 1200)) || null);

// ── Context ───────────────────────────────────────────────────────────────────

export type ArticleAdapterContext = {
  baseUrl: string;
  presetId?: string | null;
  presetName?: string | null;
  maxBodyChars?: number;
};

// ── Result type ───────────────────────────────────────────────────────────────

export type ArticleAdapterResult =
  | { kind: 'article'; record: SemanticArticleRecord }
  | { kind: 'candidate'; title: string; url: string; description: string | null };

// ── Adapter ───────────────────────────────────────────────────────────────────

export const toSemanticArticleResult = (
  extracted: SemanticExtractedRecord,
  context: ArticleAdapterContext
): ArticleAdapterResult | null => {
  const { mapped, raw } = extracted;
  const maxBodyChars = context.maxBodyChars ?? 45000;
  const baseUrl = context.baseUrl;

  const resolvedUrl = resolveUrl(mapped, raw, baseUrl);
  if (resolvedUrl === null) return null;

  const title = resolveTitle(mapped, raw, resolvedUrl);
  const description = resolveDescription(mapped, raw);
  const bodyText = resolveBodyText(mapped, raw, maxBodyChars);

  // Records with < 40 words of body are candidates (links for deeper crawl)
  if (countWords(bodyText) < DIRECT_ARTICLE_MIN_WORDS) {
    return { kind: 'candidate', title, url: resolvedUrl, description };
  }

  const canonicalUrl = resolveCanonical(mapped, raw, resolvedUrl);

  const record: SemanticArticleRecord = {
    title,
    description,
    bodyText,
    excerpt: resolveExcerpt(mapped, description, bodyText),
    sourceUrl: resolvedUrl,
    canonicalUrl,
    author: resolveAuthor(mapped, raw),
    publishedAt: resolvePublishedAt(mapped, raw),
    imageUrl: resolveImageUrl(mapped, raw, resolvedUrl),
    tags: mapped.tags,
    language: mapped.language,
    wordCount: countWords(bodyText),
    raw,
  };

  return { kind: 'article', record };
};

export const toSemanticArticleRecords = (
  records: SemanticExtractedRecord[],
  context: ArticleAdapterContext
): { articles: SemanticArticleRecord[]; candidates: Array<{ title: string; url: string; description: string | null }>; skipped: number } => {
  const articles: SemanticArticleRecord[] = [];
  const candidates: Array<{ title: string; url: string; description: string | null }> = [];
  let skipped = 0;

  for (const record of records) {
    const result = toSemanticArticleResult(record, context);
    if (result === null) { skipped++; continue; }
    if (result.kind === 'article') articles.push(result.record);
    else candidates.push(result);
  }

  return { articles, candidates, skipped };
};
