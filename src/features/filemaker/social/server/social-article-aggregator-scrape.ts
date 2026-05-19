import 'server-only';

import { createCustomPlaywrightInstance } from '@/features/playwright/server/instances';
import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import {
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY,
  type SocialArticleAggregatorScrapePayload,
} from '@/shared/lib/browser-execution';
import {
  scrapedSocialArticleSchema,
  socialArticleScrapeRequestSchema,
  type ScrapedSocialArticle,
  type SocialArticleScrapeRequest,
  type SocialArticleScrapeResponse,
  type SocialArticleSourcePreset,
} from '@/shared/contracts/social-article-aggregator';
import { badRequestError } from '@/shared/errors/app-error';

import {
  createSocialArticleScrapeRun,
  getSocialArticleSourcePresetsByIds,
  upsertScrapedSocialArticles,
  upsertSocialArticleScrapeRun,
} from './social-article-aggregator-repository';

type ArticleScrapeRun = Awaited<ReturnType<typeof runPlaywrightEngineTask>>;

type RuntimeSource = {
  excludePatterns: string[];
  includePatterns: string[];
  maxArticles: number;
  presetId: string | null;
  presetName: string | null;
  url: string;
};

const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const normalizeHttpUrl = (value: string): string | null => {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
};

const toPresetSources = (preset: SocialArticleSourcePreset): RuntimeSource[] =>
  preset.urls
    .map(normalizeHttpUrl)
    .filter((url): url is string => url !== null)
    .map((url) => ({
      excludePatterns: preset.excludePatterns,
      includePatterns: preset.includePatterns,
      maxArticles: preset.maxArticlesPerSource,
      presetId: preset.id,
      presetName: preset.name,
      url,
    }));

const toCustomSources = (
  urls: string[],
  maxArticlesPerSource: number
): RuntimeSource[] =>
  uniqueStrings(urls)
    .map(normalizeHttpUrl)
    .filter((url): url is string => url !== null)
    .map((url) => ({
      excludePatterns: [],
      includePatterns: [],
      maxArticles: maxArticlesPerSource,
      presetId: null,
      presetName: null,
      url,
    }));

const buildRuntimeSources = async (
  input: SocialArticleScrapeRequest
): Promise<RuntimeSource[]> => {
  const presets = await getSocialArticleSourcePresetsByIds(input.sourcePresetIds);
  const sources = [
    ...presets.flatMap(toPresetSources),
    ...toCustomSources(input.customUrls, input.maxArticlesPerSource),
  ];
  const byUrl = new Map<string, RuntimeSource>();
  for (const source of sources) {
    if (!byUrl.has(source.url)) byUrl.set(source.url, source);
  }
  return Array.from(byUrl.values());
};

const buildArticleScrapeTask = (input: {
  maxArticlesPerSource: number;
  obeyRobotsTxt: boolean;
  sources: RuntimeSource[];
}): Parameters<typeof runPlaywrightEngineTask>[0] => ({
  request: {
    startUrl: input.sources[0]?.url ?? 'about:blank',
    input: {
      maxArticlesPerSource: input.maxArticlesPerSource,
      maxArticleChars: 45000,
      obeyRobotsTxt: input.obeyRobotsTxt,
      runtimeKey: SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY,
      sources: input.sources,
    },
    actionId: SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY,
    actionName: 'Social article aggregator scrape',
    runtimeKey: SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY,
    browserEngine: 'chromium',
    timeoutMs: 240_000,
    preventNewPages: true,
  },
  instance: createCustomPlaywrightInstance({
    family: 'scrape',
    label: 'Social article aggregator scrape',
    tags: ['filemaker', 'social', 'article-aggregator', 'playwright'],
  }),
});

const isFailedRun = (run: ArticleScrapeRun): boolean =>
  run.status === 'failed' || run.status === 'cancelled' || run.status === 'canceled';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const readRunReturnValue = (result: unknown): unknown =>
  isRecord(result) ? result['returnValue'] : null;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? uniqueStrings(value.filter((item): item is string => typeof item === 'string'))
    : [];

const parsePayload = (value: unknown): Pick<
  SocialArticleAggregatorScrapePayload,
  'articles' | 'message' | 'visitedUrls' | 'warnings'
> => {
  const record = isRecord(value) ? value : {};
  const rawArticles = Array.isArray(record['articles']) ? record['articles'] : [];
  const articles = rawArticles
    .map((article) => scrapedSocialArticleSchema.safeParse(article))
    .filter((result): result is { success: true; data: ScrapedSocialArticle } => result.success)
    .map((result) => result.data);
  return {
    articles,
    message:
      typeof record['message'] === 'string'
        ? record['message']
        : `Scraped ${articles.length} article(s).`,
    visitedUrls: normalizeStringArray(record['visitedUrls']),
    warnings: normalizeStringArray(record['warnings']),
  };
};

export async function runSocialArticleAggregatorScrape(
  rawInput: unknown
): Promise<SocialArticleScrapeResponse> {
  const input = socialArticleScrapeRequestSchema.parse(rawInput ?? {});
  const sources = await buildRuntimeSources(input);
  if (sources.length === 0) {
    throw badRequestError('Select at least one source preset or custom article source URL.');
  }

  let run = await createSocialArticleScrapeRun({
    articleIds: [],
    customUrls: uniqueStrings(input.customUrls),
    error: null,
    finishedAt: null,
    maxArticlesPerSource: input.maxArticlesPerSource,
    message: 'Starting article scrape.',
    obeyRobotsTxt: input.obeyRobotsTxt,
    playwrightRunId: null,
    sourcePresetIds: uniqueStrings(input.sourcePresetIds),
    startedAt: new Date().toISOString(),
    status: 'running',
    totalArticleCount: 0,
    visitedUrls: [],
    warnings: [],
  });

  const task = buildArticleScrapeTask({
    maxArticlesPerSource: input.maxArticlesPerSource,
    obeyRobotsTxt: input.obeyRobotsTxt,
    sources,
  });

  const runtimeRun = await runPlaywrightEngineTask(task);
  if (isFailedRun(runtimeRun)) {
    run = await upsertSocialArticleScrapeRun({
      ...run,
      error: runtimeRun.error ?? `Article scrape run status=${runtimeRun.status}`,
      finishedAt: new Date().toISOString(),
      message: 'Article scrape failed.',
      playwrightRunId: runtimeRun.runId,
      status: 'failed',
      warnings: normalizeStringArray(runtimeRun.logs),
    });
    return { articles: [], run };
  }

  const payload = parsePayload(readRunReturnValue(runtimeRun.result));
  const articles = await upsertScrapedSocialArticles({
    articles: payload.articles,
    runId: run.id,
  });
  run = await upsertSocialArticleScrapeRun({
    ...run,
    articleIds: articles.map((article) => article.id),
    finishedAt: new Date().toISOString(),
    message: payload.message,
    playwrightRunId: runtimeRun.runId,
    status: 'completed',
    totalArticleCount: articles.length,
    visitedUrls: payload.visitedUrls,
    warnings: payload.warnings,
  });

  return { articles, run };
}
