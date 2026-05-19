/* eslint-disable complexity, max-lines-per-function */

import 'server-only';

import type { Page } from 'playwright';

import type {
  ScrapedSocialArticle,
  SocialArticleScripterDiagnostic,
} from '@/shared/contracts/social-article-aggregator';
import type {
  SocialArticleAggregatorInputSource,
  SocialArticleAggregatorScripterCandidate,
  SocialArticleAggregatorScripterRunOutput,
} from '@/shared/lib/browser-execution/sequencers/SocialArticleAggregatorSequencer';

import { loadScripter } from './loader';
import { createPlaywrightPageDriver } from './playwright-page-driver';
import { mapScripterRecords } from './scripter-dry-run';
import { runScripter } from './scripter-runner';
import type {
  MappedScripterRecord,
  ScripterDefinition,
  ScripterExtractionStep,
} from './types';

const DIRECT_ARTICLE_MIN_WORDS = 40;

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const nullableText = (value: unknown): string | null => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
};

const firstText = (
  values: unknown[],
  raw: Record<string, unknown>
): string | null => {
  for (const value of values) {
    if (typeof value === 'string') {
      const fromRaw = nullableText(raw[value]);
      if (fromRaw !== null) return fromRaw;
      continue;
    }
    const direct = nullableText(value);
    if (direct !== null) return direct;
  }
  return null;
};

const normalizeUrl = (value: unknown, baseUrl: string): string | null => {
  const raw = nullableText(value);
  if (raw === null) return null;
  try {
    const parsed = new URL(raw, baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    return parsed.toString();
  } catch {
    return null;
  }
};

const clipText = (value: string, max: number): string =>
  value.length <= max ? value : value.slice(0, max).trimEnd();

const countWords = (value: string): number => value.split(/\s+/).filter(Boolean).length;

const resolveRecordUrl = (
  mapped: MappedScripterRecord,
  raw: Record<string, unknown>,
  sourceUrl: string
): string | null =>
  normalizeUrl(
    mapped.sourceUrl ??
      firstText(
        [
          'sourceUrl',
          'resolvedUrl',
          'canonicalUrl',
          'url',
          'href',
          'link',
          'permalink',
          'articleUrl',
        ],
        raw
      ),
    sourceUrl
  );

const resolveTitle = (
  mapped: MappedScripterRecord,
  raw: Record<string, unknown>,
  fallbackUrl: string
): string =>
  mapped.title ??
  firstText(['title', 'headline', 'name', 'ogTitle'], raw) ??
  fallbackUrl;

const resolveDescription = (
  mapped: MappedScripterRecord,
  raw: Record<string, unknown>
): string | null =>
  mapped.description ??
  firstText(['description', 'excerpt', 'summary', 'dek', 'subheadline'], raw);

const resolveBodyText = (raw: Record<string, unknown>, maxArticleChars: number): string => {
  const body =
    firstText(['bodyText', 'articleText', 'articleBody', 'contentText', 'content', 'body'], raw) ??
    '';
  return clipText(body, maxArticleChars);
};

const resolveImageUrl = (
  mapped: MappedScripterRecord,
  raw: Record<string, unknown>,
  resolvedUrl: string
): string | null =>
  normalizeUrl(
    mapped.images[0] ?? firstText(['imageUrl', 'image', 'thumbnailUrl', 'ogImage'], raw),
    resolvedUrl
  );

const buildArticle = (input: {
  bodyText: string;
  mapped: MappedScripterRecord;
  raw: Record<string, unknown>;
  recordIndex: number;
  resolvedUrl: string;
  source: SocialArticleAggregatorInputSource;
  title: string;
  maxArticleChars: number;
}): ScrapedSocialArticle => {
  const bodyText = clipText(input.bodyText, input.maxArticleChars);
  const description = resolveDescription(input.mapped, input.raw);
  return {
    author: firstText(['author', 'creator', 'byline'], input.raw),
    bodyText,
    canonicalUrl:
      normalizeUrl(firstText(['canonicalUrl', 'canonical', 'mainEntityOfPage'], input.raw), input.resolvedUrl) ??
      input.resolvedUrl,
    description,
    excerpt: clipText(description ?? bodyText, 1200),
    imageUrl: resolveImageUrl(input.mapped, input.raw, input.resolvedUrl),
    publishedAt: firstText(['publishedAt', 'datePublished', 'dateCreated', 'date'], input.raw),
    rawMetadata: {
      playwrightScripterId: input.source.playwrightScripterId ?? null,
      scripterRecordIndex: input.recordIndex,
      sourcePresetName: input.source.presetName ?? null,
    },
    resolvedUrl: input.resolvedUrl,
    sourcePresetId: input.source.presetId ?? null,
    sourceUrl: input.source.url,
    title: input.title,
    wordCount: countWords(bodyText),
  };
};

const adaptDefinitionEntryUrl = (
  definition: ScripterDefinition,
  sourceUrl: string
): ScripterDefinition => ({
  ...definition,
  entryUrl: sourceUrl,
  steps: definition.steps.map((step): ScripterExtractionStep => {
    if (step.kind !== 'goto') return step;
    if (step.url !== definition.entryUrl) return step;
    return { ...step, url: sourceUrl };
  }),
});

const buildDiagnostic = (input: {
  articleCount: number;
  candidateCount: number;
  errors?: string[];
  rawRecordCount: number;
  run?: Awaited<ReturnType<typeof runScripter>>;
  source: SocialArticleAggregatorInputSource;
  warnings?: string[];
}): SocialArticleScripterDiagnostic => ({
  articleCount: input.articleCount,
  candidateCount: input.candidateCount,
  errors: input.errors ?? input.run?.errors.map((error) => `${error.stepId}: ${error.message}`) ?? [],
  mode: input.source.playwrightScripterMode === 'replace' ? 'replace' : 'assist',
  rawRecordCount: input.rawRecordCount,
  scripterId: input.source.playwrightScripterId ?? null,
  sourcePresetId: input.source.presetId ?? null,
  sourceUrl: input.source.url,
  telemetry:
    input.run?.telemetry.map((entry) => ({
      durationMs: Math.max(0, Math.floor(entry.durationMs)),
      error: entry.error,
      kind: entry.kind,
      recordsAdded: Math.max(0, Math.floor(entry.recordsAdded)),
      stepId: entry.stepId,
    })) ?? [],
  visitedUrls: input.run?.visitedUrls ?? [],
  warnings: input.warnings ?? [],
});

export const runSocialArticleSourceScripter = async (
  page: Page,
  source: SocialArticleAggregatorInputSource,
  options: { limit: number; maxArticleChars: number }
): Promise<SocialArticleAggregatorScripterRunOutput> => {
  const loaded = loadScripter(source.playwrightScripterDefinition);
  if (!loaded.ok) {
    const warning = source.playwrightScripterId !== null && source.playwrightScripterId !== undefined
      ? `Playwright scripter "${source.playwrightScripterId}" is not available.`
      : 'Playwright scripter definition is missing.';
    const diagnostic = buildDiagnostic({
      articleCount: 0,
      candidateCount: 0,
      errors: loaded.errors,
      rawRecordCount: 0,
      source,
      warnings: [warning],
    });
    return {
      articles: [],
      candidates: [],
      diagnostic,
      visitedUrls: [],
      warnings: [warning, ...loaded.errors],
    };
  }

  const definition = adaptDefinitionEntryUrl(loaded.definition, source.url);
  const driver = createPlaywrightPageDriver(page);
  const run = await runScripter(definition, driver, {
    entryUrl: source.url,
    limit: options.limit,
  });
  const mappedRecords = mapScripterRecords(run.records, definition);
  const articles: ScrapedSocialArticle[] = [];
  const candidates: SocialArticleAggregatorScripterCandidate[] = [];
  const warnings: string[] = [];

  for (const record of mappedRecords) {
    const resolvedUrl = resolveRecordUrl(record.mapped, record.raw, source.url);
    if (resolvedUrl === null) {
      warnings.push(`Scripter record ${record.index} did not include an article URL.`);
      continue;
    }
    const title = resolveTitle(record.mapped, record.raw, resolvedUrl);
    const description = resolveDescription(record.mapped, record.raw);
    const bodyText = resolveBodyText(record.raw, options.maxArticleChars);
    if (countWords(bodyText) >= DIRECT_ARTICLE_MIN_WORDS) {
      articles.push(
        buildArticle({
          bodyText,
          mapped: record.mapped,
          raw: record.raw,
          recordIndex: record.index,
          resolvedUrl,
          source,
          title,
          maxArticleChars: options.maxArticleChars,
        })
      );
      continue;
    }
    candidates.push({
      description,
      rawMetadata: {
        playwrightScripterId: source.playwrightScripterId ?? null,
        scripterRecordIndex: record.index,
      },
      title,
      url: resolvedUrl,
    });
  }

  const diagnostic = buildDiagnostic({
    articleCount: articles.length,
    candidateCount: candidates.length,
    rawRecordCount: run.records.length,
    run,
    source,
    warnings,
  });
  return {
    articles,
    candidates,
    diagnostic,
    visitedUrls: run.visitedUrls,
    warnings: [
      ...warnings,
      ...run.errors.map((error) => `${error.stepId}: ${error.message}`),
    ],
  };
};
