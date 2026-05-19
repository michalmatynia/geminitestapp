/* eslint-disable max-lines, max-lines-per-function, complexity, no-await-in-loop, no-nested-ternary, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/require-await */

import type { Page } from 'playwright';

import type {
  ScrapedSocialArticle,
  SocialArticleScripterDiagnostic,
  SocialArticleSourcePresetScripterMode,
} from '@/shared/contracts/social-article-aggregator';

import { SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS } from '../social-article-aggregator-runtime-constants';

export type SocialArticleAggregatorStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped';

export type SocialArticleAggregatorStep = {
  completedAt: string | null;
  details: Array<{ label: string; value?: string | null }>;
  durationMs: number | null;
  key: string;
  label: string;
  message: string | null;
  startedAt: string | null;
  status: SocialArticleAggregatorStepStatus;
  url: string | null;
  warning: string | null;
};

export type SocialArticleAggregatorInputSource = {
  crawlDepth?: number | null;
  excludePatterns?: string[] | null;
  includePatterns?: string[] | null;
  maxArticles?: number | null;
  obeyRobotsTxt?: boolean | null;
  presetId?: string | null;
  presetName?: string | null;
  playwrightScripterDefinition?: unknown;
  playwrightScripterId?: string | null;
  playwrightScripterMode?: SocialArticleSourcePresetScripterMode | null;
  url: string;
};

export type SocialArticleAggregatorScrapeInput = {
  maxArticlesPerSource?: number | null;
  maxArticleChars?: number | null;
  obeyRobotsTxt?: boolean | null;
  sources?: SocialArticleAggregatorInputSource[] | null;
};

export type SocialArticleAggregatorScripterCandidate = {
  description?: string | null;
  rawMetadata?: Record<string, unknown>;
  title: string | null;
  url: string;
};

export type SocialArticleAggregatorScripterRunOutput = {
  articles: ScrapedSocialArticle[];
  candidates: SocialArticleAggregatorScripterCandidate[];
  diagnostic: SocialArticleScripterDiagnostic;
  visitedUrls: string[];
  warnings: string[];
};

export type SocialArticleAggregatorScrapePayload = {
  articles: ScrapedSocialArticle[];
  currentUrl: string | null;
  message: string;
  scripterDiagnostics: SocialArticleScripterDiagnostic[];
  status: 'completed' | 'failed';
  steps: SocialArticleAggregatorStep[];
  visitedUrls: string[];
  warnings: string[];
};

export type SocialArticleAggregatorSequencerContext = {
  emit: (type: string, payload: unknown) => void;
  log?: (message: string, context?: unknown) => void;
  page: Page;
  runScripter?: (
    source: SocialArticleAggregatorInputSource,
    options: { limit: number; maxArticleChars: number }
  ) => Promise<SocialArticleAggregatorScripterRunOutput>;
};

type ArticleCandidate = {
  source: SocialArticleAggregatorInputSource;
  title: string | null;
  url: string;
};

type ScriptedSourceResult = {
  candidates: ArticleCandidate[];
  replacesGenericDiscovery: boolean;
};

type ExtractedArticleSnapshot = {
  author: string | null;
  bodyText: string;
  canonicalUrl: string | null;
  description: string | null;
  hasArticleMetadata: boolean;
  imageUrl: string | null;
  publishedAt: string | null;
  title: string | null;
};

const STEP_LABELS: Record<string, string> = {
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.inputValidate]: 'Validate article sources',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.discoverArticles]: 'Discover article links',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.extractArticles]: 'Extract article content',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.finalize]: 'Finalize article scrape',
};

const DEFAULT_MAX_ARTICLES_PER_SOURCE = 10;
const MAX_ARTICLES_PER_SOURCE = 50;
const DEFAULT_CRAWL_DEPTH = 1;
const MAX_CRAWL_DEPTH = 2;
const DEFAULT_MAX_ARTICLE_CHARS = 45000;
const MAX_ARTICLE_CHARS = 100000;

const LOW_VALUE_PATH_PATTERNS = [
  /\/(account|author|cart|category|contact|login|privacy|profile|search|signin|signup|tag|terms)(\/|$)/i,
  /\/(feed|rss|wp-json)(\/|$)/i,
  /\.(avif|css|gif|ico|jpeg|jpg|js|pdf|png|svg|webp|zip)$/i,
] as const;

const ARTICLE_HINT_PATTERNS = [
  /\/(article|blog|news|post|press|story|stories|insights|resources)\//i,
  /\/20\d{2}[/-]\d{1,2}[/-]\d{1,2}\//,
  /\/20\d{2}\//,
] as const;

const normalizeText = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

const normalizeNullableText = (value: unknown): string | null => {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
};

const clipText = (value: string, max: number): string =>
  value.length <= max ? value : value.slice(0, max).trimEnd();

const clampInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const clampNonNegativeInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.floor(parsed), max);
};

const normalizeUrl = (value: unknown, baseUrl?: string): string | null => {
  const raw = normalizeText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
};

const hostWithoutWww = (host: string): string => host.replace(/^www\./i, '').toLowerCase();

const isSameHost = (left: string, right: string): boolean => {
  try {
    return hostWithoutWww(new URL(left).hostname) === hostWithoutWww(new URL(right).hostname);
  } catch {
    return false;
  }
};

const matchesPatternList = (url: string, patterns: string[] | null | undefined): boolean => {
  const entries = patterns?.map((entry) => entry.trim()).filter(Boolean) ?? [];
  return entries.some((entry) => {
    try {
      return new RegExp(entry, 'i').test(url);
    } catch {
      return url.toLowerCase().includes(entry.toLowerCase());
    }
  });
};

const isLowValueUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    const path = `${parsed.pathname}${parsed.search}`;
    return LOW_VALUE_PATH_PATTERNS.some((pattern) => pattern.test(path));
  } catch {
    return true;
  }
};

const articleLinkScore = (url: string, title: string | null): number => {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    const segments = path.split('/').filter(Boolean);
    let score = 0;
    if (segments.length >= 2) score += 20;
    if (segments.some((segment) => segment.length > 18)) score += 10;
    if (ARTICLE_HINT_PATTERNS.some((pattern) => pattern.test(path))) score += 40;
    if ((title?.trim().length ?? 0) >= 16) score += 20;
    if (parsed.searchParams.size > 3) score -= 20;
    if (segments.length <= 1) score -= 20;
    return score;
  } catch {
    return -100;
  }
};

const uniqueCandidates = (candidates: ArticleCandidate[]): ArticleCandidate[] => {
  const byUrl = new Map<string, ArticleCandidate>();
  for (const candidate of candidates) {
    if (!byUrl.has(candidate.url)) byUrl.set(candidate.url, candidate);
  }
  return Array.from(byUrl.values());
};

const createStep = (key: string): SocialArticleAggregatorStep => ({
  completedAt: null,
  details: [],
  durationMs: null,
  key,
  label: STEP_LABELS[key] ?? key,
  message: null,
  startedAt: null,
  status: 'pending',
  url: null,
  warning: null,
});

export class SocialArticleAggregatorSequencer {
  private readonly emit: (type: string, payload: unknown) => void;
  private readonly input: SocialArticleAggregatorScrapeInput;
  private readonly log: (message: string, context?: unknown) => void;
  private readonly page: Page;
  private readonly runScripter: SocialArticleAggregatorSequencerContext['runScripter'];
  private readonly steps: SocialArticleAggregatorStep[];
  private readonly visitedUrls: string[] = [];
  private readonly warnings: string[] = [];
  private readonly robotsCache = new Map<string, string[] | null>();
  private articles: ScrapedSocialArticle[] = [];
  private candidates: ArticleCandidate[] = [];
  private maxArticleChars = DEFAULT_MAX_ARTICLE_CHARS;
  private maxArticlesPerSource = DEFAULT_MAX_ARTICLES_PER_SOURCE;
  private obeyRobotsTxt = true;
  private scripterDiagnostics: SocialArticleScripterDiagnostic[] = [];
  private sources: SocialArticleAggregatorInputSource[] = [];

  constructor(
    context: SocialArticleAggregatorSequencerContext,
    input: SocialArticleAggregatorScrapeInput
  ) {
    this.page = context.page;
    this.emit = context.emit;
    this.log = context.log ?? (() => undefined);
    this.runScripter = context.runScripter;
    this.input = input;
    this.steps = [
      createStep(SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.inputValidate),
      createStep(SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.discoverArticles),
      createStep(SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.extractArticles),
      createStep(SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.finalize),
    ];
  }

  async scan(): Promise<void> {
    try {
      await this.runStep(
        SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.inputValidate,
        () => this.validateInput()
      );
      await this.runStep(
        SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.discoverArticles,
        () => this.discoverArticles()
      );
      await this.runStep(
        SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.extractArticles,
        () => this.extractArticles()
      );
      await this.runStep(
        SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.finalize,
        async () => undefined
      );
      this.emitResult('completed', `Scraped ${this.articles.length} article(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.warnings.push(message);
      this.emitResult('failed', message);
      throw error;
    }
  }

  private async validateInput(): Promise<void> {
    this.sources = (this.input.sources ?? [])
      .map((source) => ({
        ...source,
        crawlDepth: clampNonNegativeInt(source.crawlDepth, DEFAULT_CRAWL_DEPTH, MAX_CRAWL_DEPTH),
        obeyRobotsTxt: source.obeyRobotsTxt !== false,
        playwrightScripterId: normalizeNullableText(source.playwrightScripterId),
        playwrightScripterMode:
          source.playwrightScripterMode === 'replace' ? ('replace' as const) : ('assist' as const),
        url: normalizeUrl(source.url) ?? '',
      }))
      .filter((source) => source.url.length > 0);
    if (this.sources.length === 0) {
      throw new Error('At least one article source URL is required.');
    }
    this.maxArticlesPerSource = clampInt(
      this.input.maxArticlesPerSource,
      DEFAULT_MAX_ARTICLES_PER_SOURCE,
      MAX_ARTICLES_PER_SOURCE
    );
    this.maxArticleChars = clampInt(
      this.input.maxArticleChars,
      DEFAULT_MAX_ARTICLE_CHARS,
      MAX_ARTICLE_CHARS
    );
    this.obeyRobotsTxt = this.input.obeyRobotsTxt !== false;
    this.updateCurrentStep({
      details: [
        { label: 'Sources', value: String(this.sources.length) },
        { label: 'Robots.txt', value: this.obeyRobotsTxt ? 'obey' : 'ignore' },
      ],
    });
  }

  private async discoverArticles(): Promise<void> {
    const candidates: ArticleCandidate[] = [];
    for (const source of this.sources) {
      const allowed = await this.isAllowedByRobots(source.url, source);
      if (!allowed) {
        this.warnings.push(`Robots.txt disallows source ${source.url}`);
        continue;
      }
      try {
        const scripted = await this.runScriptedSource(source);
        candidates.push(...scripted.candidates);
        if (
          source.playwrightScripterMode === 'replace' &&
          scripted.replacesGenericDiscovery
        ) {
          this.updateCurrentStep({
            message: `Scripter discovered ${scripted.candidates.length} candidate article(s).`,
            url: source.url,
          });
          continue;
        }
        await this.openUrl(source.url);
        await this.dismissCookieConsent();
        const rootSnapshot = await this.extractCurrentArticleSnapshot();
        if (this.isUsableArticleSnapshot(rootSnapshot, true)) {
          candidates.push({ source, title: rootSnapshot.title, url: this.page.url() });
        }
        candidates.push(...await this.collectCrawledArticleLinks(source));
        this.updateCurrentStep({
          message: `Discovered ${candidates.length} candidate article(s).`,
          url: this.page.url(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.warnings.push(`Failed to discover articles from ${source.url}: ${message}`);
      }
    }
    this.candidates = uniqueCandidates(candidates);
  }

  private async extractArticles(): Promise<void> {
    const perSourceCounts = this.countArticlesBySource();
    for (const candidate of this.candidates) {
      const sourceKey = candidate.source.presetId ?? candidate.source.url;
      const sourceLimit = clampInt(
        candidate.source.maxArticles,
        this.maxArticlesPerSource,
        MAX_ARTICLES_PER_SOURCE
      );
      const currentCount = perSourceCounts.get(sourceKey) ?? 0;
      if (currentCount >= sourceLimit) continue;
      const allowed = await this.isAllowedByRobots(candidate.url, candidate.source);
      if (!allowed) {
        this.warnings.push(`Robots.txt disallows article ${candidate.url}`);
        continue;
      }
      try {
        await this.openUrl(candidate.url);
        await this.dismissCookieConsent();
        const snapshot = await this.extractCurrentArticleSnapshot();
        if (!this.isUsableArticleSnapshot(snapshot, false)) {
          this.warnings.push(`Skipped ${candidate.url}: no readable article body found.`);
          continue;
        }
        const resolvedUrl = normalizeUrl(this.page.url()) ?? candidate.url;
        const bodyText = clipText(snapshot.bodyText, this.maxArticleChars);
        this.articles.push({
          author: snapshot.author,
          bodyText,
          canonicalUrl: normalizeUrl(snapshot.canonicalUrl, resolvedUrl),
          description: snapshot.description,
          excerpt: clipText(bodyText, 1200),
          imageUrl: normalizeUrl(snapshot.imageUrl, resolvedUrl),
          publishedAt: snapshot.publishedAt,
          rawMetadata: {
            sourcePresetName: candidate.source.presetName ?? null,
            titleFromLink: candidate.title,
          },
          resolvedUrl,
          sourcePresetId: candidate.source.presetId ?? null,
          sourceUrl: candidate.source.url,
          title: snapshot.title ?? candidate.title ?? resolvedUrl,
          wordCount: bodyText.split(/\s+/).filter(Boolean).length,
        });
        perSourceCounts.set(sourceKey, currentCount + 1);
        this.updateCurrentStep({
          message: `Extracted ${this.articles.length} article(s).`,
          url: resolvedUrl,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.warnings.push(`Failed to extract ${candidate.url}: ${message}`);
      }
    }
  }

  private async runScriptedSource(
    source: SocialArticleAggregatorInputSource
  ): Promise<ScriptedSourceResult> {
    if (
      !source.playwrightScripterId &&
      (source.playwrightScripterDefinition === null ||
        source.playwrightScripterDefinition === undefined)
    ) {
      return { candidates: [], replacesGenericDiscovery: false };
    }
    if (!this.runScripter) {
      this.warnings.push(`No Playwright scripter runner is available for ${source.url}.`);
      return { candidates: [], replacesGenericDiscovery: false };
    }
    const sourceLimit = clampInt(
      source.maxArticles,
      this.maxArticlesPerSource,
      MAX_ARTICLES_PER_SOURCE
    );
    try {
      const result = await this.runScripter(source, {
        limit: sourceLimit * 3,
        maxArticleChars: this.maxArticleChars,
      });
      this.scripterDiagnostics.push(result.diagnostic);
      this.visitedUrls.push(...result.visitedUrls);
      this.warnings.push(...result.warnings);
      const appendedArticleCount = await this.appendScripterArticles(
        source,
        result.articles,
        sourceLimit
      );
      const candidates = this.normalizeScripterCandidates(source, result.candidates);
      return {
        candidates,
        replacesGenericDiscovery:
          result.diagnostic.errors.length === 0 &&
          appendedArticleCount + candidates.length > 0,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.warnings.push(`Playwright scripter failed for ${source.url}: ${message}`);
      return { candidates: [], replacesGenericDiscovery: false };
    }
  }

  private async appendScripterArticles(
    source: SocialArticleAggregatorInputSource,
    articles: ScrapedSocialArticle[],
    limit: number
  ): Promise<number> {
    const existingCount = this.countArticlesBySource().get(source.presetId ?? source.url) ?? 0;
    const remaining = Math.max(0, limit - existingCount);
    if (remaining === 0) return 0;
    let appended = 0;
    for (const article of articles) {
      if (appended >= remaining) return appended;
      const resolvedUrl = normalizeUrl(article.resolvedUrl, source.url);
      if (resolvedUrl === null || !this.isAllowedSourceArticleUrl(source, resolvedUrl)) {
        this.warnings.push(`Skipped scripted article ${article.resolvedUrl}: outside source filters.`);
        continue;
      }
      if (!(await this.isAllowedByRobots(resolvedUrl, source))) {
        this.warnings.push(`Robots.txt disallows scripted article ${resolvedUrl}`);
        continue;
      }
      this.articles.push({
        ...article,
        resolvedUrl,
        sourcePresetId: article.sourcePresetId ?? source.presetId ?? null,
        sourceUrl: article.sourceUrl || source.url,
      });
      appended += 1;
    }
    return appended;
  }

  private isAllowedSourceArticleUrl(
    source: SocialArticleAggregatorInputSource,
    url: string
  ): boolean {
    if (!isSameHost(url, source.url)) return false;
    if (isLowValueUrl(url)) return false;
    if (matchesPatternList(url, source.excludePatterns)) return false;
    return (source.includePatterns?.filter((entry) => entry.trim().length > 0).length ?? 0) > 0
      ? matchesPatternList(url, source.includePatterns)
      : true;
  }

  private normalizeScripterCandidates(
    source: SocialArticleAggregatorInputSource,
    candidates: SocialArticleAggregatorScripterCandidate[]
  ): ArticleCandidate[] {
    return candidates
      .map((candidate) => ({
        source,
        title: normalizeNullableText(candidate.title ?? candidate.description),
        url: normalizeUrl(candidate.url, source.url) ?? '',
      }))
      .filter((candidate) => candidate.url.length > 0)
      .filter((candidate) => this.isAllowedSourceArticleUrl(source, candidate.url));
  }

  private countArticlesBySource(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const article of this.articles) {
      const key = article.sourcePresetId ?? article.sourceUrl;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }

  private async collectCrawledArticleLinks(
    source: SocialArticleAggregatorInputSource
  ): Promise<ArticleCandidate[]> {
    const crawlDepth = clampNonNegativeInt(source.crawlDepth, DEFAULT_CRAWL_DEPTH, MAX_CRAWL_DEPTH);
    if (crawlDepth <= 0) return [];
    const discovered = await this.collectArticleLinks(source);
    if (crawlDepth <= 1) return discovered;
    return [
      ...discovered,
      ...(await this.collectNestedArticleLinks(source, discovered)),
    ];
  }

  private async collectNestedArticleLinks(
    source: SocialArticleAggregatorInputSource,
    firstLevelCandidates: ArticleCandidate[]
  ): Promise<ArticleCandidate[]> {
    const sourceLimit = clampInt(
      source.maxArticles,
      this.maxArticlesPerSource,
      MAX_ARTICLES_PER_SOURCE
    );
    const nestedCandidates: ArticleCandidate[] = [];
    const visited = new Set([source.url]);
    for (const candidate of firstLevelCandidates.slice(0, sourceLimit)) {
      if (visited.has(candidate.url)) continue;
      visited.add(candidate.url);
      const allowed = await this.isAllowedByRobots(candidate.url, source);
      if (!allowed) {
        this.warnings.push(`Robots.txt disallows discovery page ${candidate.url}`);
        continue;
      }
      try {
        await this.openUrl(candidate.url);
        await this.dismissCookieConsent();
        nestedCandidates.push(...await this.collectArticleLinks(source));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.warnings.push(`Failed to crawl discovery page ${candidate.url}: ${message}`);
      }
    }
    return nestedCandidates;
  }

  private async openUrl(url: string): Promise<void> {
    this.visitedUrls.push(url);
    this.updateCurrentStep({ url });
    await this.page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
    await this.page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => undefined);
  }

  private async dismissCookieConsent(): Promise<void> {
    const selectors = [
      'button:has-text("Accept all")',
      'button:has-text("Accept")',
      'button:has-text("I agree")',
      'button:has-text("Allow all")',
      '[role="button"]:has-text("Accept all")',
      '[aria-label*="accept" i]',
      '[id*="cookie" i] button',
      '[class*="cookie" i] button',
      '[id*="consent" i] button',
      '[class*="consent" i] button',
    ];
    for (const selector of selectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible({ timeout: 400 }).catch(() => false)) {
        await button.click({ timeout: 1000 }).catch(() => undefined);
        return;
      }
    }
  }

  private async collectArticleLinks(
    source: SocialArticleAggregatorInputSource
  ): Promise<ArticleCandidate[]> {
    const links = await this.page.evaluate(() => {
      const normalize = (value: string | null | undefined): string =>
        (value ?? '').replace(/\s+/g, ' ').trim();
      const readJsonLdUrls = (): Array<{ title: string | null; url: string }> => {
        const output: Array<{ title: string | null; url: string }> = [];
        const visit = (value: unknown): void => {
          if (!value || typeof value !== 'object') return;
          if (Array.isArray(value)) {
            value.forEach(visit);
            return;
          }
          const record = value as Record<string, unknown>;
          const graph = record['@graph'];
          if (Array.isArray(graph)) graph.forEach(visit);
          const itemList = record['itemListElement'];
          if (Array.isArray(itemList)) itemList.forEach(visit);
          const rawType = record['@type'];
          const types = Array.isArray(rawType) ? rawType : [rawType];
          const isArticle = types.some((type) =>
            typeof type === 'string' && /article|blogposting|newsarticle/i.test(type)
          );
          const rawUrl = record['url'] ?? record['mainEntityOfPage'];
          const url =
            typeof rawUrl === 'string'
              ? rawUrl
              : rawUrl && typeof rawUrl === 'object'
                ? (rawUrl as Record<string, unknown>)['@id']
                : null;
          if (isArticle && typeof url === 'string') {
            output.push({
              title: typeof record['headline'] === 'string' ? record['headline'] : null,
              url,
            });
          }
          const nestedItem = record['item'];
          if (nestedItem) visit(nestedItem);
        };
        document.querySelectorAll('script[type*="ld+json" i]').forEach((node) => {
          try {
            visit(JSON.parse(node.textContent ?? 'null') as unknown);
          } catch {
            // Ignore malformed metadata.
          }
        });
        return output;
      };
      const anchorLinks = Array.from(document.querySelectorAll('a[href]')).map((anchor) => {
        const link = anchor as HTMLAnchorElement;
        return {
          title: normalize(link.getAttribute('title')) || normalize(link.textContent) || null,
          url: link.href,
        };
      });
      return [...readJsonLdUrls(), ...anchorLinks];
    });

    const baseUrl = normalizeUrl(this.page.url()) ?? source.url;
    return links
      .map((link) => ({
        source,
        title: normalizeNullableText(link.title),
        url: normalizeUrl(link.url, baseUrl) ?? '',
      }))
      .filter((candidate) => candidate.url.length > 0)
      .filter((candidate) => this.isAllowedSourceArticleUrl(source, candidate.url))
      .map((candidate) => ({
        candidate,
        score: articleLinkScore(candidate.url, candidate.title),
      }))
      .filter((entry) => entry.score >= 20)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.candidate)
      .slice(0, clampInt(source.maxArticles, this.maxArticlesPerSource, MAX_ARTICLES_PER_SOURCE) * 3);
  }

  private async extractCurrentArticleSnapshot(): Promise<ExtractedArticleSnapshot> {
    return this.page.evaluate(() => {
      const normalize = (value: string | null | undefined): string =>
        (value ?? '').replace(/\s+/g, ' ').trim();
      const firstText = (selectors: string[]): string | null => {
        for (const selector of selectors) {
          const value = normalize(document.querySelector(selector)?.textContent);
          if (value) return value;
        }
        return null;
      };
      const meta = (selectors: string[]): string | null => {
        for (const selector of selectors) {
          const node = document.querySelector(selector);
          const value = normalize(
            node?.getAttribute('content') ??
              node?.getAttribute('href') ??
              node?.getAttribute('datetime') ??
              ''
          );
          if (value) return value;
        }
        return null;
      };
      const flattenJsonLd = (): Record<string, unknown>[] => {
        const output: Record<string, unknown>[] = [];
        const visit = (value: unknown): void => {
          if (!value || typeof value !== 'object') return;
          if (Array.isArray(value)) {
            value.forEach(visit);
            return;
          }
          const record = value as Record<string, unknown>;
          output.push(record);
          const graph = record['@graph'];
          if (Array.isArray(graph)) graph.forEach(visit);
        };
        document.querySelectorAll('script[type*="ld+json" i]').forEach((node) => {
          try {
            visit(JSON.parse(node.textContent ?? 'null') as unknown);
          } catch {
            // Ignore malformed metadata.
          }
        });
        return output;
      };
      const jsonLd = flattenJsonLd();
      const articleNode = jsonLd.find((record) => {
        const rawType = record['@type'];
        const types = Array.isArray(rawType) ? rawType : [rawType];
        return types.some(
          (type) => typeof type === 'string' && /article|blogposting|newsarticle/i.test(type)
        );
      });
      const readLdString = (keys: string[]): string | null => {
        if (!articleNode) return null;
        for (const key of keys) {
          const value = articleNode[key];
          if (Array.isArray(value)) {
            const firstValue = value
              .map((item) => {
                if (typeof item === 'string') return normalize(item);
                if (item && typeof item === 'object') {
                  const nested = item as Record<string, unknown>;
                  return normalize(
                    typeof nested['url'] === 'string'
                      ? nested['url']
                      : typeof nested['@id'] === 'string'
                        ? nested['@id']
                        : typeof nested['name'] === 'string'
                          ? nested['name']
                          : ''
                  );
                }
                return '';
              })
              .find((item) => item.length > 0);
            if (firstValue) return firstValue;
          }
          if (typeof value === 'string' && normalize(value)) return normalize(value);
          if (value && typeof value === 'object') {
            const nested = value as Record<string, unknown>;
            if (typeof nested['name'] === 'string' && normalize(nested['name'])) {
              return normalize(nested['name']);
            }
            if (typeof nested['url'] === 'string' && normalize(nested['url'])) {
              return normalize(nested['url']);
            }
            if (typeof nested['@id'] === 'string' && normalize(nested['@id'])) {
              return normalize(nested['@id']);
            }
          }
        }
        return null;
      };
      const mainCandidates = Array.from(
        document.querySelectorAll(
          'article, main, [role="main"], .article-content, .post-content, .entry-content, .content'
        )
      );
      const bestNode = mainCandidates
        .map((node) => ({ node, text: normalize(node.textContent) }))
        .sort((left, right) => right.text.length - left.text.length)[0]?.node ?? document.body;
      const bodyText = normalize(bestNode?.textContent ?? document.body?.textContent ?? '');
      const headline =
        readLdString(['headline', 'name']) ??
        meta(['meta[property="og:title"]', 'meta[name="twitter:title"]']) ??
        firstText(['h1']) ??
        normalize(document.title);
      const description =
        readLdString(['description']) ??
        meta([
          'meta[property="og:description"]',
          'meta[name="twitter:description"]',
          'meta[name="description"]',
        ]);
      return {
        author:
          readLdString(['author', 'creator']) ??
          meta(['meta[name="author"]', 'meta[property="article:author"]']),
        bodyText,
        canonicalUrl:
          meta(['link[rel="canonical"]']) ??
          readLdString(['url', 'mainEntityOfPage']) ??
          window.location.href,
        description,
        hasArticleMetadata: Boolean(articleNode),
        imageUrl:
          readLdString(['image', 'thumbnailUrl']) ??
          meta(['meta[property="og:image"]', 'meta[name="twitter:image"]']),
        publishedAt:
          readLdString(['datePublished', 'dateCreated']) ??
          meta([
            'meta[property="article:published_time"]',
            'meta[name="date"]',
            'time[datetime]',
          ]),
        title: headline || null,
      };
    });
  }

  private isUsableArticleSnapshot(
    snapshot: ExtractedArticleSnapshot,
    allowMetadataOnly: boolean
  ): boolean {
    if (snapshot.bodyText.length >= 600 && (snapshot.title?.trim().length ?? 0) > 0) {
      return true;
    }
    return allowMetadataOnly && snapshot.hasArticleMetadata && (snapshot.title?.trim().length ?? 0) > 0;
  }

  private async isAllowedByRobots(
    url: string,
    source?: SocialArticleAggregatorInputSource
  ): Promise<boolean> {
    if (!this.obeyRobotsTxt) return true;
    if (source?.obeyRobotsTxt === false) return true;
    const parsed = normalizeUrl(url);
    if (!parsed) return false;
    const target = new URL(parsed);
    const disallows = await this.readRobotsDisallows(target.origin);
    if (disallows === null) return true;
    return !disallows.some((rule) => {
      if (!rule) return false;
      if (rule === '/') return true;
      return target.pathname.startsWith(rule);
    });
  }

  private async readRobotsDisallows(origin: string): Promise<string[] | null> {
    if (this.robotsCache.has(origin)) return this.robotsCache.get(origin) ?? null;
    try {
      const response = await fetch(`${origin}/robots.txt`, {
        headers: { 'User-Agent': 'SocialArticleAggregatorBot/1.0' },
      });
      if (!response.ok) {
        this.robotsCache.set(origin, null);
        return null;
      }
      const text = await response.text();
      const disallows = this.parseRobotsDisallows(text);
      this.robotsCache.set(origin, disallows);
      return disallows;
    } catch {
      this.robotsCache.set(origin, null);
      return null;
    }
  }

  private parseRobotsDisallows(text: string): string[] {
    const disallows: string[] = [];
    let appliesToAll = false;
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.split('#')[0]?.trim() ?? '';
      if (!line) continue;
      const separatorIndex = line.indexOf(':');
      if (separatorIndex < 0) continue;
      const key = line.slice(0, separatorIndex).trim().toLowerCase();
      const value = line.slice(separatorIndex + 1).trim();
      if (key === 'user-agent') {
        appliesToAll = value === '*';
        continue;
      }
      if (key === 'disallow' && appliesToAll && value.length > 0) {
        disallows.push(value.replace(/\*.*$/, ''));
      }
    }
    return disallows;
  }

  private async runStep(
    stepKey: string,
    operation: () => Promise<void>
  ): Promise<void> {
    const startedAt = new Date().toISOString();
    this.upsertStep(stepKey, 'running', { startedAt });
    try {
      await operation();
      const completedAt = new Date().toISOString();
      this.upsertStep(stepKey, 'completed', {
        completedAt,
        durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
        startedAt,
      });
    } catch (error) {
      const completedAt = new Date().toISOString();
      this.upsertStep(stepKey, 'failed', {
        completedAt,
        durationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
        message: error instanceof Error ? error.message : String(error),
        startedAt,
      });
      throw error;
    }
  }

  private upsertStep(
    key: string,
    status: SocialArticleAggregatorStepStatus,
    patch: Partial<SocialArticleAggregatorStep> = {}
  ): SocialArticleAggregatorStep {
    const existingIndex = this.steps.findIndex((step) => step.key === key);
    const existing = existingIndex >= 0 ? this.steps[existingIndex] : null;
    const step: SocialArticleAggregatorStep = {
      completedAt: null,
      details: [],
      durationMs: null,
      key,
      label: STEP_LABELS[key] ?? key,
      message: null,
      startedAt: status === 'running' ? new Date().toISOString() : null,
      url: null,
      warning: null,
      ...existing,
      ...patch,
      status,
    };
    if (existingIndex >= 0) this.steps[existingIndex] = step;
    else this.steps.push(step);
    this.emit('progress', { steps: this.steps });
    return step;
  }

  private updateCurrentStep(patch: Partial<SocialArticleAggregatorStep>): void {
    const runningStep = [...this.steps].reverse().find((step) => step.status === 'running');
    if (!runningStep) return;
    this.upsertStep(runningStep.key, 'running', patch);
  }

  private emitResult(
    status: SocialArticleAggregatorScrapePayload['status'],
    message: string
  ): void {
    const payload: SocialArticleAggregatorScrapePayload = {
      articles: this.articles,
      currentUrl: this.page.url(),
      message,
      scripterDiagnostics: this.scripterDiagnostics,
      status,
      steps: this.steps,
      visitedUrls: Array.from(new Set(this.visitedUrls)),
      warnings: this.warnings,
    };
    this.log('Social article aggregator scrape completed', {
      articleCount: this.articles.length,
      status,
    });
    this.emit('result', payload);
  }
}
