import 'server-only';

import { createCustomPlaywrightInstance } from '@/features/playwright/server/instances';
import { runPlaywrightEngineTask } from '@/features/playwright/server/runtime';
import {
  getDefaultScripterRegistry,
  type ScripterDefinition,
} from '@/features/playwright/scripters/public';
import {
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_KEY,
  type SocialArticleAggregatorScrapePayload,
} from '@/shared/lib/browser-execution';
import {
  scrapedSocialArticleSchema,
  socialArticleScripterDiagnosticSchema,
  socialArticleScrapeRequestSchema,
  type ScrapedSocialArticle,
  type SocialArticleScripterDiagnostic,
  type SocialArticleScrapeRequest,
  type SocialArticleScrapeResponse,
  type SocialArticleScrapeRun,
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
  crawlDepth: number;
  excludePatterns: string[];
  includePatterns: string[];
  maxArticles: number;
  obeyRobotsTxt: boolean;
  presetId: string | null;
  presetName: string | null;
  playwrightScripterDefinition: ScripterDefinition | null;
  playwrightScripterId: string | null;
  playwrightScripterMode: 'assist' | 'replace';
  url: string;
};

type ScripterDefinitionById = Map<string, ScripterDefinition>;

type RuntimeSourcePlan = {
  customUrls: string[];
  sourcePresetIds: string[];
  sources: RuntimeSource[];
};

const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const NO_ARTICLES_WARNING = 'No articles were found. Post generation requires at least one scraped article.';

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

const toPresetSources = (
  preset: SocialArticleSourcePreset,
  scripterDefinitions: ScripterDefinitionById
): RuntimeSource[] =>
  preset.urls
    .map(normalizeHttpUrl)
    .filter((url): url is string => url !== null)
    .map((url) => ({
      crawlDepth: preset.crawlDepth,
      excludePatterns: preset.excludePatterns,
      includePatterns: preset.includePatterns,
      maxArticles: preset.maxArticlesPerSource,
      obeyRobotsTxt: preset.obeyRobotsTxt,
      presetId: preset.id,
      presetName: preset.name,
      playwrightScripterDefinition:
        preset.playwrightScripterId !== null
          ? scripterDefinitions.get(preset.playwrightScripterId) ?? null
          : null,
      playwrightScripterId: preset.playwrightScripterId,
      playwrightScripterMode: preset.playwrightScripterMode,
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
      crawlDepth: 1,
      excludePatterns: [],
      includePatterns: [],
      maxArticles: maxArticlesPerSource,
      obeyRobotsTxt: true,
      presetId: null,
      presetName: null,
      playwrightScripterDefinition: null,
      playwrightScripterId: null,
      playwrightScripterMode: 'assist',
      url,
    }));

const loadScripterDefinitions = async (
  presets: SocialArticleSourcePreset[]
): Promise<ScripterDefinitionById> => {
  const ids = uniqueStrings(
    presets
      .map((preset) => preset.playwrightScripterId ?? '')
      .filter((id) => id.length > 0)
  );
  if (ids.length === 0) return new Map();
  const registry = getDefaultScripterRegistry();
  const definitions = await Promise.all(
    ids.map(async (id): Promise<[string, ScripterDefinition | null]> => [
      id,
      await registry.get(id),
    ])
  );
  return new Map(
    definitions.filter((entry): entry is [string, ScripterDefinition] => entry[1] !== null)
  );
};

const buildRuntimeSourcePlan = async (
  input: SocialArticleScrapeRequest
): Promise<RuntimeSourcePlan> => {
  const presets = await getSocialArticleSourcePresetsByIds(input.sourcePresetIds);
  const enabledPresets = presets.filter((preset) => preset.enabled);
  const scripterDefinitions = await loadScripterDefinitions(enabledPresets);
  const sources = [
    ...enabledPresets.flatMap((preset) => toPresetSources(preset, scripterDefinitions)),
    ...toCustomSources(input.customUrls, input.maxArticlesPerSource),
  ];
  const byUrl = new Map<string, RuntimeSource>();
  for (const source of sources) {
    if (!byUrl.has(source.url)) byUrl.set(source.url, source);
  }
  const runtimeSources = Array.from(byUrl.values());
  return {
    customUrls: uniqueStrings(runtimeSources.filter((source) => source.presetId === null).map((source) => source.url)),
    sourcePresetIds: uniqueStrings(runtimeSources.map((source) => source.presetId ?? '')),
    sources: runtimeSources,
  };
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

const parseScripterDiagnostics = (value: unknown): SocialArticleScripterDiagnostic[] =>
  Array.isArray(value)
    ? value
        .map((item) => socialArticleScripterDiagnosticSchema.safeParse(item))
        .filter((result): result is { success: true; data: SocialArticleScripterDiagnostic } =>
          result.success
        )
        .map((result) => result.data)
    : [];

const parsePayload = (value: unknown): Pick<
  SocialArticleAggregatorScrapePayload,
  'articles' | 'message' | 'scripterDiagnostics' | 'visitedUrls' | 'warnings'
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
    scripterDiagnostics: parseScripterDiagnostics(record['scripterDiagnostics']),
    visitedUrls: normalizeStringArray(record['visitedUrls']),
    warnings: normalizeStringArray(record['warnings']),
  };
};

type ParsedScrapePayload = ReturnType<typeof parsePayload>;

const markScrapeRunFailed = async (
  run: SocialArticleScrapeRun,
  runtimeRun: ArticleScrapeRun
): Promise<SocialArticleScrapeRun> =>
  upsertSocialArticleScrapeRun({
    ...run,
    error: runtimeRun.error ?? `Article scrape run status=${runtimeRun.status}`,
    finishedAt: new Date().toISOString(),
    message: 'Article scrape failed.',
    playwrightRunId: runtimeRun.runId,
    playwrightScripterIds: run.playwrightScripterIds,
    scripterDiagnostics: run.scripterDiagnostics,
    status: 'failed',
    warnings: normalizeStringArray(runtimeRun.logs),
  });

const markScrapeRunCompleted = async (input: {
  articles: Awaited<ReturnType<typeof upsertScrapedSocialArticles>>;
  payload: ParsedScrapePayload;
  run: SocialArticleScrapeRun;
  runtimeRun: ArticleScrapeRun;
}): Promise<SocialArticleScrapeRun> =>
  upsertSocialArticleScrapeRun({
    ...input.run,
    articleIds: input.articles.map((article) => article.id),
    finishedAt: new Date().toISOString(),
    message: input.articles.length === 0 ? NO_ARTICLES_WARNING : input.payload.message,
    playwrightRunId: input.runtimeRun.runId,
    playwrightScripterIds: input.run.playwrightScripterIds,
    scripterDiagnostics: input.payload.scripterDiagnostics,
    status: 'completed',
    totalArticleCount: input.articles.length,
    visitedUrls: input.payload.visitedUrls,
    warnings: input.articles.length === 0
      ? uniqueStrings([...input.payload.warnings, NO_ARTICLES_WARNING])
      : input.payload.warnings,
  });

export async function runSocialArticleAggregatorScrape(
  rawInput: unknown
): Promise<SocialArticleScrapeResponse> {
  const input = socialArticleScrapeRequestSchema.parse(rawInput ?? {});
  const sourcePlan = await buildRuntimeSourcePlan(input);
  const sources = sourcePlan.sources;
  if (sources.length === 0) {
    throw badRequestError('Select at least one enabled source preset or custom article source URL.');
  }

  let run = await createSocialArticleScrapeRun({
    articleIds: [],
    customUrls: sourcePlan.customUrls,
    error: null,
    finishedAt: null,
    maxArticlesPerSource: input.maxArticlesPerSource,
    message: 'Starting article scrape.',
    obeyRobotsTxt: input.obeyRobotsTxt,
    playwrightRunId: null,
    playwrightScripterIds: uniqueStrings(
      sources.map((source) => source.playwrightScripterId ?? '')
    ),
    scripterDiagnostics: [],
    sourcePresetIds: sourcePlan.sourcePresetIds,
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
    run = await markScrapeRunFailed(run, runtimeRun);
    return { articles: [], run };
  }

  const payload = parsePayload(readRunReturnValue(runtimeRun.result));
  const articles = await upsertScrapedSocialArticles({
    articles: payload.articles,
    runId: run.id,
  });
  run = await markScrapeRunCompleted({ articles, payload, run, runtimeRun });

  return { articles, run };
}
