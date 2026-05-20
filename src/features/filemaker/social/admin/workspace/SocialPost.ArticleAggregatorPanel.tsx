'use client';

/* eslint-disable max-lines, max-lines-per-function, complexity, no-nested-ternary, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import {
  buildSocialArticleAggregationContextArticle,
  type SocialArticleAggregationContextArticle,
  type SocialArticlePromptPreset,
  type SocialArticleRecord,
  type SocialArticleScrapeRun,
  type SocialArticleScrapeResponse,
  type SocialArticleSourcePreset,
} from '@/shared/contracts/social-article-aggregator';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { enqueueAiPathRun, getAiPathRunResult } from '@/shared/lib/ai-paths/api/client';
import { SOCIAL_ARTICLE_AGGREGATION_PATH_ID } from '@/shared/lib/ai-paths/social-article-aggregation';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { safeSetTimeout } from '@/shared/lib/timers';
import { Button, Input, Textarea, useToast } from '@/shared/ui';

import {
  buildSocialArticleAggregationAiPathPayload,
  resolveSocialArticleAggregationPathId,
  SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
} from './SocialPost.ArticleAggregatorPanel.ai-path';
import { SocialArticleScrapeModal } from './SocialPost.ArticleScrapeModal';
import { extractSocialArticleAggregationAiPathRunText } from './SocialPost.ArticleAggregatorPanel.ai-path-result';
import {
  buildRetainedArticleLoadState,
  deriveArticleSourcePresetIds,
  deriveArticleSourceUrls,
  deriveScrapeResultSourceMetadata,
  splitLooseUrls,
} from './SocialPost.ArticleAggregatorPanel.utils';
import { useSocialPostContext } from './SocialPostContext';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 120;
const ARTICLE_CONTEXT_CHAR_BUDGET = 60000;
const RETAINED_ARTICLE_PAGE_SIZE = 50;

const DEFAULT_AGGREGATION_PROMPT =
  'Write one English social post that summarizes the selected articles. Use only the article context, keep the post clear and publish-ready, and include source-aware claims without inventing facts.';
const NO_ARTICLES_GENERATION_MESSAGE =
  'No articles were found. Scrape or select at least one article before generating a post.';

type AiPathPollResult = {
  rawResult: unknown;
  text: string | null;
};

type ParsedGeneratedPost = {
  bodyEn: string;
  summary: string | null;
  titleEn: string;
};

type RetainedArticleListResponse = {
  articles: SocialArticleRecord[];
  total: number;
};

type PlaywrightScripterListEntry = {
  description: string | null;
  id: string;
  siteHost: string;
  version: number;
};

type PlaywrightScripterListResponse = {
  scripters: PlaywrightScripterListEntry[];
};

const compactText = (value: string | null | undefined, max = 8000): string =>
  (value ?? '').trim().slice(0, max).trimEnd();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parseJsonLikeOutput = (text: string): Record<string, unknown> | null => {
  const trimmed = text.trim();
  const candidates = [
    trimmed,
    trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? null,
    trimmed.match(/```\s*([\s\S]*?)```/i)?.[1] ?? null,
    trimmed.match(/\{[\s\S]*\}/)?.[0] ?? null,
  ].filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isRecord(parsed)) return parsed;
    } catch {
      // Try the next possible shape.
    }
  }
  return null;
};

const parseGeneratedPost = (text: string): ParsedGeneratedPost => {
  const json = parseJsonLikeOutput(text);
  const title =
    compactText(
      typeof json?.['titleEn'] === 'string'
        ? json['titleEn']
        : typeof json?.['title'] === 'string'
          ? json['title']
          : null,
      200
    ) || compactText(text.split('\n')[0], 120) || 'Article summary';
  const body =
    compactText(
      typeof json?.['bodyEn'] === 'string'
        ? json['bodyEn']
        : typeof json?.['body'] === 'string'
          ? json['body']
          : typeof json?.['post'] === 'string'
            ? json['post']
            : text,
      8000
    ) || text.trim();
  const summary =
    compactText(
      typeof json?.['summary'] === 'string'
        ? json['summary']
        : typeof json?.['sourceNotes'] === 'string'
          ? json['sourceNotes']
          : null,
      8000
    ) || null;
  return {
    bodyEn: body,
    summary,
    titleEn: title,
  };
};

const pollAiPathRunResult = async (
  runId: string,
  onProgress: (attempt: number, status: string) => void,
  attempt = 0
): Promise<AiPathPollResult | null> => {
  if (attempt >= MAX_POLL_ATTEMPTS) return null;
  const result = await getAiPathRunResult(runId, { timeoutMs: 30_000 });
  if (!result.ok) throw new Error(result.error ?? 'Failed to fetch AI-Path result.');
  const { run } = result.data;
  if (run.status === 'completed') {
    return {
      rawResult: run.result ?? run.runtimeState,
      text: extractSocialArticleAggregationAiPathRunText(run),
    };
  }
  if (run.status === 'failed' || run.status === 'canceled') {
    throw new Error(run.status === 'failed' ? 'AI-Path run failed.' : 'AI-Path run canceled.');
  }
  onProgress(attempt + 1, run.status);
  await new Promise<void>((resolve) => {
    safeSetTimeout(() => resolve(), POLL_INTERVAL_MS);
  });
  return pollAiPathRunResult(runId, onProgress, attempt + 1);
};

const buildContextArticles = (
  articles: SocialArticleRecord[]
): SocialArticleAggregationContextArticle[] => {
  const output: SocialArticleAggregationContextArticle[] = [];
  let remaining = ARTICLE_CONTEXT_CHAR_BUDGET;
  for (const article of articles) {
    if (remaining <= 0) break;
    const contextArticle = buildSocialArticleAggregationContextArticle(article);
    const bodyText = contextArticle.bodyText.slice(0, Math.max(0, remaining));
    remaining -= bodyText.length;
    output.push({ ...contextArticle, bodyText });
  }
  return output;
};

export function SocialArticleAggregatorPanel(): React.JSX.Element {
  const {
    activePost,
    articleAggregatorPathId,
    handleCreateDraft,
    patchMutation,
    setEditorState,
  } = useSocialPostContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const restoredPostIdRef = useRef<string | null>(null);

  const [sourcePresets, setSourcePresets] = useState<SocialArticleSourcePreset[]>([]);
  const [promptPresets, setPromptPresets] = useState<SocialArticlePromptPreset[]>([]);
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>([]);
  const [customUrls, setCustomUrls] = useState('');
  const [obeyRobotsTxt, setObeyRobotsTxt] = useState(true);
  const [maxArticlesPerSource, setMaxArticlesPerSource] = useState(10);
  const [sourcePresetName, setSourcePresetName] = useState('');
  const [sourcePresetUrls, setSourcePresetUrls] = useState('');
  const [sourcePresetCrawlDepth, setSourcePresetCrawlDepth] = useState(1);
  const [sourcePresetScripterId, setSourcePresetScripterId] = useState('');
  const [sourcePresetScripterMode, setSourcePresetScripterMode] = useState<'assist' | 'replace'>('assist');
  const [playwrightScripters, setPlaywrightScripters] = useState<PlaywrightScripterListEntry[]>([]);
  const [isLoadingPlaywrightScripters, setIsLoadingPlaywrightScripters] = useState(false);

  const [articles, setArticles] = useState<SocialArticleRecord[]>([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [articleFilter, setArticleFilter] = useState('');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [retainedSearch, setRetainedSearch] = useState('');
  const [retainedSourcePresetId, setRetainedSourcePresetId] = useState('');
  const [retainedArticleOffset, setRetainedArticleOffset] = useState(0);
  const [retainedArticlePageCount, setRetainedArticlePageCount] = useState(0);
  const [retainedArticleTotal, setRetainedArticleTotal] = useState<number | null>(null);
  const [retainedArticleError, setRetainedArticleError] = useState<string | null>(null);
  const [isLoadingRetainedArticles, setIsLoadingRetainedArticles] = useState(false);
  const [recentRuns, setRecentRuns] = useState<SocialArticleScrapeRun[]>([]);
  const [isLoadingRecentRuns, setIsLoadingRecentRuns] = useState(false);
  const [runHistoryError, setRunHistoryError] = useState<string | null>(null);
  const [scrapeRunId, setScrapeRunId] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeModalOpen, setScrapeModalOpen] = useState(false);

  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [promptPresetName, setPromptPresetName] = useState('');
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_AGGREGATION_PROMPT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [generatedParsed, setGeneratedParsed] = useState<ParsedGeneratedPost | null>(null);
  const [showRawOutput, setShowRawOutput] = useState(false);

  const [articleSort, setArticleSort] = useState<'date-desc' | 'words-desc' | 'title-asc'>('date-desc');
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  const selectedArticles = useMemo(
    () => articles.filter((article) => selectedArticleIds.includes(article.id)),
    [articles, selectedArticleIds]
  );

  const filteredArticles = useMemo(() => {
    const q = articleFilter.trim().toLowerCase();
    const base = q
      ? articles.filter(
          (a) =>
            (a.title ?? '').toLowerCase().includes(q) ||
            a.resolvedUrl.toLowerCase().includes(q) ||
            (a.description ?? '').toLowerCase().includes(q)
        )
      : [...articles];
    if (articleSort === 'words-desc') {
      base.sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0));
    } else if (articleSort === 'title-asc') {
      base.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
    }
    return base;
  }, [articles, articleFilter, articleSort]);

  const filteredArticleIds = useMemo(
    () => filteredArticles.map((article) => article.id),
    [filteredArticles]
  );

  const allFilteredArticlesSelected = useMemo(
    () =>
      filteredArticleIds.length > 0 &&
      filteredArticleIds.every((articleId) => selectedArticleIds.includes(articleId)),
    [filteredArticleIds, selectedArticleIds]
  );

  const selectedWordCount = useMemo(
    () => selectedArticles.reduce((sum, a) => sum + (a.wordCount ?? 0), 0),
    [selectedArticles]
  );

  const selectedCharCount = useMemo(
    () => selectedArticles.reduce((sum, a) => sum + (a.bodyText?.length ?? 0), 0),
    [selectedArticles]
  );

  const selectedArticleSourcePresetIds = useMemo(
    () =>
      deriveArticleSourcePresetIds(selectedArticles, selectedPresetIds),
    [selectedArticles, selectedPresetIds]
  );

  const selectedArticleSourceUrls = useMemo(
    () =>
      deriveArticleSourceUrls(selectedArticles, splitLooseUrls(customUrls)),
    [customUrls, selectedArticles]
  );

  const contextBudgetExceeded = selectedCharCount > ARTICLE_CONTEXT_CHAR_BUDGET;
  const retainedArticlePageStart =
    retainedArticleTotal !== null && retainedArticlePageCount > 0
      ? retainedArticleOffset + 1
      : 0;
  const retainedArticlePageEnd =
    retainedArticleTotal !== null
      ? Math.min(retainedArticleOffset + retainedArticlePageCount, retainedArticleTotal)
      : 0;
  const canLoadPreviousRetainedArticles = retainedArticleOffset > 0;
  const canLoadNextRetainedArticles =
    retainedArticleTotal !== null &&
    retainedArticleOffset + retainedArticlePageCount < retainedArticleTotal;
  const noArticlesSelected = selectedArticles.length === 0;
  const articleAggregatorPathResolution = resolveSocialArticleAggregationPathId(
    articleAggregatorPathId
  );
  const effectiveArticleAggregatorPathId = articleAggregatorPathResolution.pathId;
  const isUsingDefaultArticleAggregatorPath = articleAggregatorPathResolution.isDefault;

  const resetRetainedArticlePaging = useCallback((): void => {
    setRetainedArticleOffset(0);
    setRetainedArticlePageCount(0);
    setRetainedArticleTotal(null);
    setRetainedArticleError(null);
  }, []);

  const loadPresets = useCallback(
    async (options: { applyDefaultPrompt?: boolean } = {}): Promise<void> => {
      setIsLoadingPresets(true);
      try {
        const [sources, prompts] = await Promise.all([
          api.get<SocialArticleSourcePreset[]>(
            '/api/filemaker/social-article-aggregator/source-presets',
            { timeout: 60_000 }
          ),
          api.get<SocialArticlePromptPreset[]>(
            '/api/filemaker/social-article-aggregator/prompt-presets',
            { timeout: 60_000 }
          ),
        ]);
        setSourcePresets(sources);
        setPromptPresets(prompts);
        if (options.applyDefaultPrompt === true) {
          const defaultPrompt = prompts.find((preset) => preset.isDefault);
          if (defaultPrompt) {
            setSelectedPromptId(defaultPrompt.id);
            setCustomPrompt(defaultPrompt.prompt);
          }
        }
      } finally {
        setIsLoadingPresets(false);
      }
    },
    []
  );

  const loadRecentRuns = useCallback(async (): Promise<void> => {
    setIsLoadingRecentRuns(true);
    setRunHistoryError(null);
    try {
      const runs = await api.get<SocialArticleScrapeRun[]>(
        '/api/filemaker/social-article-aggregator/runs',
        { params: { limit: 12 }, timeout: 60_000 }
      );
      setRecentRuns(runs);
    } catch (error) {
      setRunHistoryError(error instanceof Error ? error.message : 'Failed to load scrape runs.');
    } finally {
      setIsLoadingRecentRuns(false);
    }
  }, []);

  const loadPlaywrightScripters = useCallback(async (): Promise<void> => {
    setIsLoadingPlaywrightScripters(true);
    try {
      const response = await api.get<PlaywrightScripterListResponse>(
        '/api/playwright/scripters',
        { timeout: 60_000 }
      );
      setPlaywrightScripters(response.scripters);
    } catch {
      setPlaywrightScripters([]);
    } finally {
      setIsLoadingPlaywrightScripters(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      loadPresets({ applyDefaultPrompt: true }),
      loadRecentRuns(),
      loadPlaywrightScripters(),
    ]).catch((error) => {
      setScrapeError(error instanceof Error ? error.message : 'Failed to load article presets.');
    });
  }, [loadPresets, loadPlaywrightScripters, loadRecentRuns]);

  const handleTogglePreset = useCallback((presetId: string): void => {
    setSelectedPresetIds((current) =>
      current.includes(presetId)
        ? current.filter((id) => id !== presetId)
        : [...current, presetId]
    );
  }, []);

  const handleSaveSourcePreset = useCallback(async (): Promise<void> => {
    const urls = splitLooseUrls(sourcePresetUrls);
    if (!sourcePresetName.trim() || urls.length === 0) return;
    const saved = await api.post<SocialArticleSourcePreset>(
      '/api/filemaker/social-article-aggregator/source-presets',
      {
        preset: {
          enabled: true,
          crawlDepth: sourcePresetCrawlDepth,
          maxArticlesPerSource,
          name: sourcePresetName.trim(),
          obeyRobotsTxt,
          playwrightScripterId: sourcePresetScripterId.trim() || null,
          playwrightScripterMode: sourcePresetScripterMode,
          urls,
        },
      },
      { timeout: 60_000 }
    );
    setSourcePresetName('');
    setSourcePresetUrls('');
    setSourcePresetCrawlDepth(1);
    setSourcePresetScripterId('');
    setSourcePresetScripterMode('assist');
    await loadPresets();
    setSelectedPresetIds((current) =>
      current.includes(saved.id) ? current : [...current, saved.id]
    );
  }, [
    loadPresets,
    maxArticlesPerSource,
    obeyRobotsTxt,
    sourcePresetName,
    sourcePresetCrawlDepth,
    sourcePresetScripterId,
    sourcePresetScripterMode,
    sourcePresetUrls,
  ]);

  const handleDeleteSourcePreset = useCallback(
    async (presetId: string): Promise<void> => {
      await api.delete<SocialArticleSourcePreset>(
        '/api/filemaker/social-article-aggregator/source-presets',
        { params: { id: presetId }, timeout: 60_000 }
      );
      setSelectedPresetIds((current) => current.filter((id) => id !== presetId));
      await loadPresets();
    },
    [loadPresets]
  );

  const handleSavePromptPreset = useCallback(async (): Promise<void> => {
    if (!promptPresetName.trim() || !customPrompt.trim()) return;
    const saved = await api.post<SocialArticlePromptPreset>(
      '/api/filemaker/social-article-aggregator/prompt-presets',
      {
        preset: {
          isDefault: promptPresets.length === 0,
          name: promptPresetName.trim(),
          prompt: customPrompt.trim(),
        },
      },
      { timeout: 60_000 }
    );
    setPromptPresetName('');
    await loadPresets();
    setSelectedPromptId(saved.id);
    setCustomPrompt(saved.prompt);
  }, [customPrompt, loadPresets, promptPresetName, promptPresets.length]);

  const handleDeletePromptPreset = useCallback(async (presetId: string): Promise<void> => {
    const normalizedPresetId = presetId.trim();
    if (!normalizedPresetId) return;
    await api.delete<SocialArticlePromptPreset>(
      '/api/filemaker/social-article-aggregator/prompt-presets',
      { params: { id: normalizedPresetId }, timeout: 60_000 }
    );
    const deletedSelectedPrompt = selectedPromptId === normalizedPresetId;
    if (deletedSelectedPrompt) {
      setSelectedPromptId('');
      setCustomPrompt(DEFAULT_AGGREGATION_PROMPT);
    }
    await loadPresets({ applyDefaultPrompt: deletedSelectedPrompt });
  }, [loadPresets, selectedPromptId]);

  const handlePromptPresetChange = useCallback(
    (presetId: string): void => {
      setSelectedPromptId(presetId);
      const preset = promptPresets.find((entry) => entry.id === presetId);
      if (preset) setCustomPrompt(preset.prompt);
    },
    [promptPresets]
  );

  const handleSetDefaultPromptPreset = useCallback(
    async (preset: SocialArticlePromptPreset): Promise<void> => {
      await api.post(
        '/api/filemaker/social-article-aggregator/prompt-presets',
        { preset: { id: preset.id, isDefault: true, name: preset.name, prompt: preset.prompt } },
        { timeout: 60_000 }
      );
      await loadPresets();
      toast(`"${preset.name}" set as default`, { variant: 'success' });
    },
    [loadPresets, toast]
  );

  const resolveTargetPost = useCallback(async (): Promise<SocialPublishingPost | null> => {
    if (activePost) return activePost;
    return handleCreateDraft();
  }, [activePost, handleCreateDraft]);

  const persistPostArticleMetadata = useCallback(
    async (
      post: SocialPublishingPost,
      updates: Partial<SocialPublishingPost>
    ): Promise<SocialPublishingPost> => {
      const updated = await patchMutation.mutateAsync({
        id: post.id,
        updates,
      });
      queryClient.setQueryData<SocialPublishingPost>(
        QUERY_KEYS.socialPublishing.post(updated.id),
        updated
      );
      return updated;
    },
    [patchMutation, queryClient]
  );

  const persistSelectedArticleIds = useCallback(
    async (nextSelectedArticleIds: string[]): Promise<void> => {
      const targetPost = await resolveTargetPost();
      if (!targetPost) return;
      const nextSelectedArticles = articles.filter((article) =>
        nextSelectedArticleIds.includes(article.id)
      );
      await persistPostArticleMetadata(targetPost, {
        articleIds: nextSelectedArticleIds,
        articleScrapeRunId: scrapeRunId,
        articleSourcePresetIds: deriveArticleSourcePresetIds(
          nextSelectedArticles,
          selectedPresetIds
        ),
        articleSourceUrls: deriveArticleSourceUrls(
          nextSelectedArticles,
          splitLooseUrls(customUrls)
        ),
      });
    },
    [
      articles,
      customUrls,
      persistPostArticleMetadata,
      resolveTargetPost,
      scrapeRunId,
      selectedPresetIds,
    ]
  );

  const handlePersistArticleSelectionError = useCallback((error: unknown): void => {
    setScrapeError(
      error instanceof Error ? error.message : 'Failed to persist article selection.'
    );
  }, []);

  const handleToggleArticle = useCallback((articleId: string): void => {
    const nextSelectedArticleIds = selectedArticleIds.includes(articleId)
      ? selectedArticleIds.filter((id) => id !== articleId)
      : [...selectedArticleIds, articleId];
    setSelectedArticleIds(nextSelectedArticleIds);
    void persistSelectedArticleIds(nextSelectedArticleIds).catch(
      handlePersistArticleSelectionError
    );
  }, [
    handlePersistArticleSelectionError,
    persistSelectedArticleIds,
    selectedArticleIds,
  ]);

  const handleToggleFilteredArticles = useCallback((): void => {
    const nextSelectedArticleIds = allFilteredArticlesSelected
      ? selectedArticleIds.filter((id) => !filteredArticleIds.includes(id))
      : [...new Set([...selectedArticleIds, ...filteredArticleIds])];
    setSelectedArticleIds(nextSelectedArticleIds);
    void persistSelectedArticleIds(nextSelectedArticleIds).catch(
      handlePersistArticleSelectionError
    );
  }, [
    allFilteredArticlesSelected,
    filteredArticleIds,
    handlePersistArticleSelectionError,
    persistSelectedArticleIds,
    selectedArticleIds,
  ]);

  const handleLoadScrapeRun = useCallback(async (run: SocialArticleScrapeRun): Promise<void> => {
    if (run.articleIds.length === 0) {
      setArticles([]);
      setSelectedArticleIds([]);
      setScrapeRunId(run.id);
      setScrapeStatus('Loaded scrape run with no retained articles.');
      const targetPost = await resolveTargetPost();
      if (targetPost) {
        await persistPostArticleMetadata(targetPost, {
          articleIds: [],
          articleScrapeRunId: run.id,
          articleSourcePresetIds: run.sourcePresetIds,
          articleSourceUrls: run.customUrls,
        });
      }
      return;
    }

    setScrapeError(null);
    setScrapeStatus('Loading retained articles…');
    const params = new URLSearchParams({ ids: run.articleIds.join(',') });
    try {
      const retainedArticles = await api.get<SocialArticleRecord[]>(
        `/api/filemaker/social-article-aggregator/articles?${params.toString()}`,
        { timeout: 60_000 }
      );
      const articleIds = retainedArticles.map((article) => article.id);
      const sourcePresetIds = deriveArticleSourcePresetIds(
        retainedArticles,
        run.sourcePresetIds
      );
      const sourceUrls = deriveArticleSourceUrls(retainedArticles, run.customUrls);
      setArticles(retainedArticles);
      setSelectedArticleIds(articleIds);
      setArticleFilter('');
      setExpandedArticleId(null);
      setScrapeRunId(run.id);
      setSelectedPresetIds(sourcePresetIds);
      setCustomUrls(sourceUrls.join('\n'));
      setObeyRobotsTxt(run.obeyRobotsTxt);
      setMaxArticlesPerSource(run.maxArticlesPerSource);
      setScrapeStatus(
        `Loaded ${retainedArticles.length} retained article${retainedArticles.length === 1 ? '' : 's'} from scrape run.`
      );
      const targetPost = await resolveTargetPost();
      if (targetPost) {
        await persistPostArticleMetadata(targetPost, {
          articleIds,
          articleScrapeRunId: run.id,
          articleSourcePresetIds: sourcePresetIds,
          articleSourceUrls: sourceUrls,
        });
      }
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : 'Failed to load retained articles.');
    }
  }, [persistPostArticleMetadata, resolveTargetPost]);

  const handleLoadRetainedArticles = useCallback(async (
    options: { append?: boolean; offset?: number } = {}
  ): Promise<void> => {
    const append = options.append === true;
    const offset = Math.max(0, options.offset ?? 0);
    setIsLoadingRetainedArticles(true);
    setRetainedArticleError(null);
    setScrapeStatus('Loading retained article library…');
    try {
      const response = await api.get<RetainedArticleListResponse>(
        '/api/filemaker/social-article-aggregator/articles',
        {
          params: {
            limit: RETAINED_ARTICLE_PAGE_SIZE,
            offset,
            search: retainedSearch.trim(),
            sourcePresetId: retainedSourcePresetId || undefined,
          },
          timeout: 60_000,
        }
      );
      const loadState = buildRetainedArticleLoadState({
        append,
        currentArticles: articles,
        currentSelectedArticleIds: selectedArticleIds,
        fallbackSourcePresetIds: retainedSourcePresetId ? [retainedSourcePresetId] : [],
        incomingArticles: response.articles,
        offset,
        total: response.total,
      });
      setArticles(loadState.articles);
      setSelectedArticleIds(loadState.selectedArticleIds);
      setArticleFilter('');
      setExpandedArticleId(null);
      setScrapeRunId(null);
      setSelectedPresetIds(loadState.sourcePresetIds);
      setCustomUrls(loadState.sourceUrls.join('\n'));
      setRetainedArticleOffset(offset);
      setRetainedArticlePageCount(response.articles.length);
      setRetainedArticleTotal(response.total);
      setScrapeStatus(loadState.status);
      const targetPost = await resolveTargetPost();
      if (targetPost) {
        await persistPostArticleMetadata(targetPost, {
          articleIds: loadState.selectedArticleIds,
          articleScrapeRunId: null,
          articleSourcePresetIds: loadState.sourcePresetIds,
          articleSourceUrls: loadState.sourceUrls,
        });
      }
    } catch (error) {
      setRetainedArticleError(
        error instanceof Error ? error.message : 'Failed to load retained articles.'
      );
      setScrapeStatus(null);
    } finally {
      setIsLoadingRetainedArticles(false);
    }
  }, [
    articles,
    persistPostArticleMetadata,
    resolveTargetPost,
    retainedSearch,
    retainedSourcePresetId,
    selectedArticleIds,
  ]);

  const handleDeleteRetainedArticle = useCallback(async (article: SocialArticleRecord): Promise<void> => {
    const label = article.title || article.resolvedUrl;
    if (typeof window !== 'undefined' && !window.confirm(`Delete retained article "${label}"?`)) {
      return;
    }

    setDeletingArticleId(article.id);
    try {
      await api.delete<SocialArticleRecord>(
        '/api/filemaker/social-article-aggregator/articles',
        { params: { id: article.id }, timeout: 60_000 }
      );
      const nextSelectedArticleIds = selectedArticleIds.filter((id) => id !== article.id);
      const nextSelectedArticles = articles.filter(
        (entry) => entry.id !== article.id && nextSelectedArticleIds.includes(entry.id)
      );
      setArticles((current) => current.filter((entry) => entry.id !== article.id));
      setSelectedArticleIds(nextSelectedArticleIds);
      setExpandedArticleId((current) => current === article.id ? null : current);
      if (activePost) {
        await persistPostArticleMetadata(activePost, {
          articleIds: nextSelectedArticleIds,
          articleSourcePresetIds: deriveArticleSourcePresetIds(nextSelectedArticles),
          articleSourceUrls: deriveArticleSourceUrls(nextSelectedArticles),
        });
      }
      toast('Retained article deleted', { variant: 'success' });
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : 'Failed to delete retained article.');
    } finally {
      setDeletingArticleId(null);
    }
  }, [activePost, articles, persistPostArticleMetadata, selectedArticleIds, toast]);

  useEffect(() => {
    const postId = activePost?.id ?? null;
    if (!postId || restoredPostIdRef.current === postId) return;
    restoredPostIdRef.current = postId;

    const savedPresetIds = activePost?.articleSourcePresetIds ?? [];
    const savedUrls = activePost?.articleSourceUrls ?? [];
    const savedPromptId = activePost?.articlePromptPresetId ?? '';
    const savedPrompt = activePost?.articleAggregationPrompt;
    const savedRunId = activePost?.articleScrapeRunId ?? null;
    const savedArticleIds = activePost?.articleIds ?? [];
    const savedSummary = activePost?.articleAggregationSummary ?? null;

    if (savedPresetIds.length > 0) setSelectedPresetIds(savedPresetIds);
    if (savedUrls.length > 0) setCustomUrls(savedUrls.join('\n'));
    if (savedPromptId) setSelectedPromptId(savedPromptId);
    if (savedPrompt) setCustomPrompt(savedPrompt);
    if (savedRunId) setScrapeRunId(savedRunId);
    if (savedSummary) setGeneratedOutput(savedSummary);

    if (savedArticleIds.length > 0) {
      const params = new URLSearchParams({ ids: savedArticleIds.join(',') });
      void api
        .get<SocialArticleRecord[]>(
          `/api/filemaker/social-article-aggregator/articles?${params.toString()}`,
          { timeout: 60_000 }
        )
        .then((fetched) => {
          if (fetched.length > 0) {
            setArticles(fetched);
            setSelectedArticleIds(fetched.map((a) => a.id));
            setScrapeStatus(`Restored ${fetched.length} article${fetched.length === 1 ? '' : 's'} from previous scrape.`);
          }
        })
        .catch(() => {
          // Non-fatal — user can re-scrape.
        });
    }
  }, [activePost]);

  const handleScrape = useCallback(async (): Promise<void> => {
    setScrapeError(null);
    setGenerationError(null);
    setScrapeStatus('Scraping article sources...');
    setGeneratedOutput(null);
    setIsScraping(true);
    try {
      const response = await api.post<SocialArticleScrapeResponse>(
        '/api/filemaker/social-article-aggregator/scrape',
        {
          customUrls: splitLooseUrls(customUrls),
          maxArticlesPerSource,
          obeyRobotsTxt,
          sourcePresetIds: selectedPresetIds,
        },
        { timeout: 260_000 }
      );
      const articleIds = response.articles.map((article) => article.id);
      const { sourcePresetIds, sourceUrls } = deriveScrapeResultSourceMetadata({
        articles: response.articles,
        fallbackSourcePresetIds: selectedPresetIds,
        fallbackSourceUrls: splitLooseUrls(customUrls),
        run: response.run,
      });
      setArticles(response.articles);
      setSelectedArticleIds(articleIds);
      setArticleFilter('');
      setExpandedArticleId(null);
      setScrapeRunId(response.run.id);
      setSelectedPresetIds(sourcePresetIds);
      setCustomUrls(sourceUrls.join('\n'));
      setRecentRuns((current) => [
        response.run,
        ...current.filter((run) => run.id !== response.run.id),
      ].slice(0, 12));
      setScrapeStatus(
        response.run.status === 'completed'
          ? `Scraped ${response.articles.length} article${response.articles.length === 1 ? '' : 's'}.`
          : response.run.message || 'Article scrape finished.'
      );
      if (articleIds.length === 0) {
        setScrapeStatus(NO_ARTICLES_GENERATION_MESSAGE);
        setGenerationError(NO_ARTICLES_GENERATION_MESSAGE);
        toast(NO_ARTICLES_GENERATION_MESSAGE, { variant: 'warning' });
      }
      if (response.run.warnings.length > 0) {
        toast(`${response.run.warnings.length} scrape warning${response.run.warnings.length === 1 ? '' : 's'}`, {
          variant: 'warning',
        });
      }
      const targetPost = await resolveTargetPost();
      if (targetPost) {
        await persistPostArticleMetadata(targetPost, {
          articleIds,
          articleScrapeRunId: response.run.id,
          articleSourcePresetIds: sourcePresetIds,
          articleSourceUrls: sourceUrls,
        });
      }
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : 'Article scrape failed.');
    } finally {
      setIsScraping(false);
    }
  }, [customUrls, maxArticlesPerSource, obeyRobotsTxt, persistPostArticleMetadata, resolveTargetPost, selectedPresetIds, toast]);

  const handleScrapeCompleted = useCallback(async (response: SocialArticleScrapeResponse): Promise<void> => {
    setScrapeError(null);
    setGenerationError(null);
    setScrapeModalOpen(false);
    const articleIds = response.articles.map((article) => article.id);
    const { sourcePresetIds, sourceUrls } = deriveScrapeResultSourceMetadata({
      articles: response.articles,
      fallbackSourcePresetIds: selectedPresetIds,
      fallbackSourceUrls: splitLooseUrls(customUrls),
      run: response.run,
    });
    setArticles(response.articles);
    setSelectedArticleIds(articleIds);
    setArticleFilter('');
    setExpandedArticleId(null);
    setScrapeRunId(response.run.id);
    setSelectedPresetIds(sourcePresetIds);
    setCustomUrls(sourceUrls.join('\n'));
    setRecentRuns((current) => [
      response.run,
      ...current.filter((run) => run.id !== response.run.id),
    ].slice(0, 12));
    setScrapeStatus(
      response.run.status === 'completed'
        ? `Scraped ${response.articles.length} article${response.articles.length === 1 ? '' : 's'}.`
        : response.run.message || 'Article scrape finished.'
    );
    if (articleIds.length === 0) {
      setScrapeStatus(NO_ARTICLES_GENERATION_MESSAGE);
      setGenerationError(NO_ARTICLES_GENERATION_MESSAGE);
      toast(NO_ARTICLES_GENERATION_MESSAGE, { variant: 'warning' });
    }
    if (response.run.warnings.length > 0) {
      toast(`${response.run.warnings.length} scrape warning${response.run.warnings.length === 1 ? '' : 's'}`, {
        variant: 'warning',
      });
    }
    const targetPost = await resolveTargetPost();
    if (targetPost) {
      await persistPostArticleMetadata(targetPost, {
        articleIds,
        articleScrapeRunId: response.run.id,
        articleSourcePresetIds: sourcePresetIds,
        articleSourceUrls: sourceUrls,
      });
    }
  }, [customUrls, persistPostArticleMetadata, resolveTargetPost, selectedPresetIds, toast]);

  const handleGenerate = useCallback(async (): Promise<void> => {
    const pathId = effectiveArticleAggregatorPathId;
    if (noArticlesSelected) {
      setGenerationError(NO_ARTICLES_GENERATION_MESSAGE);
      toast(NO_ARTICLES_GENERATION_MESSAGE, { variant: 'warning' });
      return;
    }

    setGenerationError(null);
    setGeneratedOutput(null);
    setGeneratedParsed(null);
    setGenerationStatus('Enqueueing AI-Path run…');
    setShowRawOutput(false);
    setIsGenerating(true);

    try {
      const targetPost = await resolveTargetPost();
      if (!targetPost) {
        setGenerationError('Create or select a social post first.');
        return;
      }
      const prompt = customPrompt.trim() || DEFAULT_AGGREGATION_PROMPT;
      const contextArticles = buildContextArticles(selectedArticles);
      const aiPathPayload = buildSocialArticleAggregationAiPathPayload({
        articleIds: selectedArticles.map((article) => article.id),
        articleRunId: scrapeRunId,
        articleWordCount: selectedWordCount,
        articles: contextArticles,
        contextCharacterBudget: ARTICLE_CONTEXT_CHAR_BUDGET,
        originalCharacterCount: selectedCharCount,
        post: targetPost,
        prompt,
        promptPresetId: selectedPromptId || null,
        sourcePresetIds: selectedArticleSourcePresetIds,
        sourceUrls: selectedArticleSourceUrls,
      });
      const enqueueResult = await enqueueAiPathRun(
        {
          contextRegistry: aiPathPayload.contextRegistry,
          pathId,
          entityId: targetPost.id,
          entityType: 'social-publishing-post',
          meta: {
            articleCount: contextArticles.length,
            articleRunId: scrapeRunId,
            source: 'social-article-aggregator',
            workflow: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
          },
          triggerContext: aiPathPayload.triggerContext,
          triggerEvent: SOCIAL_ARTICLE_AGGREGATION_TRIGGER_EVENT,
        },
        { timeoutMs: 60_000 }
      );
      if (!enqueueResult.ok) {
        setGenerationError(enqueueResult.error ?? 'Failed to enqueue AI-Path run.');
        return;
      }

      const runId = enqueueResult.data.run.id;
      setGenerationStatus('Waiting for AI-Path run…');
      const runResult = await pollAiPathRunResult(runId, (attempt, status) => {
        const elapsed = Math.round((attempt * POLL_INTERVAL_MS) / 1000);
        setGenerationStatus(`Running (${status} · ${elapsed}s elapsed)…`);
      });
      if (runResult?.text === null || runResult?.text === undefined) {
        setGenerationError('AI-Path completed but returned no text output.');
        return;
      }

      const parsed = parseGeneratedPost(runResult.text);
      const updates: Partial<SocialPublishingPost> = {
        articleAggregationPathId: pathId,
        articleAggregationPrompt: prompt,
        articleAggregationRunId: runId,
        articleAggregationSummary: parsed.summary ?? runResult.text.slice(0, 8000),
        articleIds: selectedArticles.map((article) => article.id),
        articlePromptPresetId: selectedPromptId || null,
        articleScrapeRunId: scrapeRunId,
        articleSourcePresetIds: selectedArticleSourcePresetIds,
        articleSourceUrls: selectedArticleSourceUrls,
        bodyEn: parsed.bodyEn,
        bodyPl: '',
        combinedBody: parsed.bodyEn,
        contentType: 'article-aggregator',
        generatedSummary: parsed.summary ?? runResult.text.slice(0, 8000),
        titleEn: parsed.titleEn,
        titlePl: '',
      };
      const updated = await patchMutation.mutateAsync({
        id: targetPost.id,
        updates,
      });
      queryClient.setQueryData<SocialPublishingPost>(
        QUERY_KEYS.socialPublishing.post(updated.id),
        updated
      );
      setEditorState((current) => ({
        ...current,
        bodyEn: updated.bodyEn,
        bodyPl: updated.bodyPl,
        titleEn: updated.titleEn,
        titlePl: updated.titlePl,
      }));
      setGeneratedOutput(runResult.text);
      setGeneratedParsed(parsed);
      setGenerationStatus(null);
      toast('Article post generated', { variant: 'success' });
    } catch (error) {
      setGenerationStatus(null);
      setGenerationError(error instanceof Error ? error.message : 'Article aggregation failed.');
    } finally {
      setIsGenerating(false);
    }
  }, [
    activePost,
    customPrompt,
    customUrls,
    effectiveArticleAggregatorPathId,
    patchMutation,
    queryClient,
    resolveTargetPost,
    scrapeRunId,
    selectedArticleSourcePresetIds,
    selectedArticleSourceUrls,
    selectedArticles,
    selectedCharCount,
    selectedPromptId,
    selectedWordCount,
    setEditorState,
    noArticlesSelected,
    toast,
  ]);

  const canScrape = selectedPresetIds.length > 0 || splitLooseUrls(customUrls).length > 0;

  return (
    <>
    <KangurAdminCard>
      <div className='space-y-6'>
        <div>
          <div className='mb-3 flex items-center justify-between gap-2'>
            <span className='text-sm font-semibold text-foreground'>Article Aggregator</span>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-6 px-2 text-xs'
              disabled={isLoadingPresets || isScraping}
              onClick={() => { void loadPresets().catch(() => undefined); }}
              title='Refresh presets'
            >
              {isLoadingPresets ? '…' : '↺ Presets'}
            </Button>
          </div>
          <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]'>
            <div className='space-y-3'>
              <Button
                size='sm'
                onClick={() => setScrapeModalOpen(true)}
                disabled={isScraping}
              >
                {isScraping ? 'Scraping...' : 'Scrape articles'}
              </Button>
              {customUrls.trim().length > 0 && (
                <p className='text-xs text-muted-foreground'>
                  Custom URLs active · <button
                    type='button'
                    className='underline hover:no-underline'
                    onClick={() => setScrapeModalOpen(true)}
                  >
                    Edit in scrape modal
                  </button>
                </p>
              )}
            </div>

            <div className='space-y-2'>
              <Input
                value={sourcePresetName}
                onChange={(event) => setSourcePresetName(event.target.value)}
                placeholder='Preset name'
                disabled={isScraping}
                className='h-8 text-xs'
                aria-label='Source preset name'
              />
              <Textarea
                value={sourcePresetUrls}
                onChange={(event) => setSourcePresetUrls(event.target.value)}
                placeholder='Preset URLs'
                rows={3}
                disabled={isScraping}
                className='font-mono text-xs'
                aria-label='Source preset URLs'
              />
              <div className='block text-xs text-muted-foreground'>
                <span className='mb-1 block'>Crawl depth</span>
                <Input
                  type='number'
                  value={sourcePresetCrawlDepth}
                  min={0}
                  max={2}
                  onChange={(event) =>
                    setSourcePresetCrawlDepth(
                      Math.max(0, Math.min(2, Number(event.target.value) || 0))
                    )
                  }
                  disabled={isScraping}
                  className='h-8 text-xs'
                  aria-label='Source preset crawl depth'
                />
              </div>
              <div className='grid gap-2 sm:grid-cols-2'>
                <label className='block text-xs text-muted-foreground'>
                  <span className='mb-1 block'>Playwright scripter</span>
                  <select
                    value={sourcePresetScripterId}
                    onChange={(event) => setSourcePresetScripterId(event.target.value)}
                    disabled={isScraping || isLoadingPlaywrightScripters}
                    className='h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground disabled:opacity-60'
                    aria-label='Source preset Playwright scripter'
                  >
                    <option value=''>
                      {isLoadingPlaywrightScripters ? 'Loading...' : 'Generic scraper'}
                    </option>
                    {playwrightScripters.map((scripter) => (
                      <option key={scripter.id} value={scripter.id}>
                        {scripter.id} · {scripter.siteHost}
                      </option>
                    ))}
                  </select>
                </label>
                <label className='block text-xs text-muted-foreground'>
                  <span className='mb-1 block'>Scripter mode</span>
                  <select
                    value={sourcePresetScripterMode}
                    onChange={(event) =>
                      setSourcePresetScripterMode(
                        event.target.value === 'replace' ? 'replace' : 'assist'
                      )
                    }
                    disabled={isScraping || sourcePresetScripterId.length === 0}
                    className='h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground disabled:opacity-60'
                    aria-label='Source preset Playwright scripter mode'
                  >
                    <option value='assist'>Assist scrape</option>
                    <option value='replace'>Replace discovery</option>
                  </select>
                </label>
              </div>
              <Button
                size='sm'
                variant='outline'
                onClick={() => { void handleSaveSourcePreset(); }}
                disabled={!sourcePresetName.trim() || splitLooseUrls(sourcePresetUrls).length === 0}
              >
                Save source preset
              </Button>
            </div>
          </div>

          {sourcePresets.length > 0 && (
            <div className='mt-3 grid gap-2 md:grid-cols-2'>
              {sourcePresets.map((preset) => (
                <div
                  key={preset.id}
                  className={[
                    'flex items-start justify-between gap-3 rounded-md border px-3 py-2',
                    preset.enabled
                      ? 'border-border/50'
                      : 'border-border/30 opacity-60',
                  ].join(' ')}
                >
                  <label className='flex min-w-0 items-start gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={selectedPresetIds.includes(preset.id)}
                      onChange={() => handleTogglePreset(preset.id)}
                      disabled={isScraping || !preset.enabled}
                      className='mt-0.5'
                      aria-label={`Select source preset ${preset.name}`}
                    />
                    <span className='min-w-0'>
                      <span className='flex items-center gap-1.5 text-xs font-medium text-foreground'>
                        <span className='truncate'>{preset.name}</span>
                        {!preset.enabled && (
                          <span className='shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground'>
                            disabled
                          </span>
                        )}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        {preset.urls.length} URL{preset.urls.length === 1 ? '' : 's'}
                        {' · '}max {preset.maxArticlesPerSource}
                        {' · '}depth {preset.crawlDepth}
                        {preset.playwrightScripterId && ` · ${preset.playwrightScripterMode}: ${preset.playwrightScripterId}`}
                      </span>
                    </span>
                  </label>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={() => { void handleDeleteSourcePreset(preset.id); }}
                    disabled={isScraping}
                    className='shrink-0 px-2 text-xs'
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className='mt-4 rounded-md border border-border/50'>
            <div className='flex items-center justify-between gap-2 border-b border-border/40 px-3 py-2'>
              <div className='text-xs font-medium text-muted-foreground'>
                Recent scrape runs
              </div>
              <Button
                size='sm'
                variant='ghost'
                className='h-6 px-2 text-xs'
                disabled={isLoadingRecentRuns || isScraping}
                onClick={() => { void loadRecentRuns(); }}
              >
                {isLoadingRecentRuns ? 'Loading…' : 'Refresh'}
              </Button>
            </div>
            {runHistoryError && (
              <div className='border-b border-border/40 px-3 py-2 text-xs text-destructive'>
                {runHistoryError}
              </div>
            )}
            {recentRuns.length === 0 ? (
              <div className='px-3 py-3 text-xs text-muted-foreground'>
                No retained scrape runs yet.
              </div>
            ) : (
              <div className='max-h-44 overflow-y-auto'>
                {recentRuns.map((run) => (
                  <div
                    key={run.id}
                    className={[
                      'flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2 last:border-b-0',
                      scrapeRunId === run.id ? 'bg-primary/5' : '',
                    ].join(' ')}
                  >
                    <div className='min-w-0'>
                      <div className='flex items-center gap-1.5 text-xs font-medium text-foreground'>
                        <span className='truncate'>
                          {new Date(run.startedAt).toLocaleString()}
                        </span>
                        <span className='shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground'>
                          {run.status}
                        </span>
                      </div>
                      <div className='truncate text-xs text-muted-foreground'>
                        {run.totalArticleCount} article{run.totalArticleCount === 1 ? '' : 's'}
                        {' · '}
                        {run.sourcePresetIds.length + run.customUrls.length} source
                        {run.sourcePresetIds.length + run.customUrls.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <Button
                      size='sm'
                      variant={scrapeRunId === run.id ? 'outline' : 'ghost'}
                      className='h-6 shrink-0 px-2 text-xs'
                      disabled={isScraping || isGenerating}
                      onClick={() => { void handleLoadScrapeRun(run); }}
                    >
                      {scrapeRunId === run.id ? 'Loaded' : 'Load'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='mt-3 rounded-md border border-border/50'>
            <div className='border-b border-border/40 px-3 py-2 text-xs font-medium text-muted-foreground'>
              Retained article library
            </div>
            <div className='grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_180px_auto]'>
              <Input
                value={retainedSearch}
                onChange={(event) => {
                  setRetainedSearch(event.target.value);
                  resetRetainedArticlePaging();
                }}
                placeholder='Search retained articles'
                className='h-8 text-xs'
                aria-label='Search retained articles'
              />
              <select
                value={retainedSourcePresetId}
                onChange={(event) => {
                  setRetainedSourcePresetId(event.target.value);
                  resetRetainedArticlePaging();
                }}
                className='h-8 rounded border border-border bg-background px-2 text-xs text-foreground'
                aria-label='Filter retained articles by source preset'
              >
                <option value=''>All sources</option>
                {sourcePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <div className='flex flex-wrap items-center gap-1'>
                <Button
                  size='sm'
                  variant='outline'
                  disabled={isLoadingRetainedArticles || isScraping || isGenerating}
                  onClick={() => { void handleLoadRetainedArticles({ offset: 0 }); }}
                >
                  {isLoadingRetainedArticles ? 'Loading…' : 'Load retained'}
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  disabled={isLoadingRetainedArticles || isScraping || isGenerating}
                  onClick={() => {
                    void handleLoadRetainedArticles({ append: true, offset: 0 });
                  }}
                >
                  Append retained
                </Button>
              </div>
            </div>
            {(retainedArticleTotal !== null || retainedArticleError) && (
              <div className='flex flex-wrap items-center justify-between gap-2 border-t border-border/40 px-3 py-2 text-xs'>
                {retainedArticleError ? (
                  <span className='text-destructive'>{retainedArticleError}</span>
                ) : (
                  <span className='text-muted-foreground'>
                    {retainedArticleTotal === 0
                      ? 'No retained articles matched.'
                      : `Showing ${retainedArticlePageStart}-${retainedArticlePageEnd} of ${retainedArticleTotal} retained article${retainedArticleTotal === 1 ? '' : 's'}.`}
                  </span>
                )}
                {!retainedArticleError && retainedArticleTotal !== null && retainedArticleTotal > 0 && (
                  <div className='flex items-center gap-1'>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-6 px-2 text-xs'
                      disabled={
                        isLoadingRetainedArticles ||
                        isScraping ||
                        isGenerating ||
                        !canLoadPreviousRetainedArticles
                      }
                      onClick={() => {
                        void handleLoadRetainedArticles({
                          offset: Math.max(
                            retainedArticleOffset - RETAINED_ARTICLE_PAGE_SIZE,
                            0
                          ),
                        });
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-6 px-2 text-xs'
                      disabled={
                        isLoadingRetainedArticles ||
                        isScraping ||
                        isGenerating ||
                        !canLoadNextRetainedArticles
                      }
                      onClick={() => {
                        void handleLoadRetainedArticles({
                          offset: retainedArticleOffset + RETAINED_ARTICLE_PAGE_SIZE,
                        });
                      }}
                    >
                      Next
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      className='h-6 px-2 text-xs'
                      disabled={
                        isLoadingRetainedArticles ||
                        isScraping ||
                        isGenerating ||
                        !canLoadNextRetainedArticles
                      }
                      onClick={() => {
                        void handleLoadRetainedArticles({
                          append: true,
                          offset: retainedArticleOffset + RETAINED_ARTICLE_PAGE_SIZE,
                        });
                      }}
                    >
                      Append next
                    </Button>
                    </div>
                  )}
                </div>
            )}
          </div>

          {scrapeStatus && (
            <p className='mt-2 text-xs text-muted-foreground'>{scrapeStatus}</p>
          )}
          {scrapeError && (
            <div className='mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
              {scrapeError}
            </div>
          )}
        </div>

        {articles.length > 0 && (
          <div>
            <div className='mb-2 space-y-1.5'>
              <div className='flex flex-wrap items-center gap-2'>
                <div className='flex-1'>
                  <Input
                    value={articleFilter}
                    onChange={(e) => setArticleFilter(e.target.value)}
                    placeholder='Filter articles…'
                    className='h-7 text-xs'
                    aria-label='Filter scraped articles'
                  />
                </div>
                <select
                  value={articleSort}
                  onChange={(e) => setArticleSort(e.target.value as typeof articleSort)}
                  className='h-7 rounded border border-border bg-background px-1.5 text-xs text-foreground'
                  aria-label='Sort articles'
                >
                  <option value='date-desc'>Newest first</option>
                  <option value='words-desc'>Most words first</option>
                  <option value='title-asc'>Title A–Z</option>
                </select>
              </div>
              <div className='flex items-center justify-between gap-2'>
                <div className='text-xs text-muted-foreground'>
                  {selectedArticles.length}/{articles.length} selected
                  {selectedWordCount > 0 && (
                    <span className='ml-2 text-foreground'>
                      ~{selectedWordCount.toLocaleString()} words
                    </span>
                  )}
                </div>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={handleToggleFilteredArticles}
                >
                  {allFilteredArticlesSelected
                    ? 'Deselect filtered'
                    : 'Select filtered'}
                </Button>
              </div>
            </div>
            <div className='max-h-80 overflow-y-auto rounded-md border border-border/50'>
              {filteredArticles.length === 0 && (
                <div className='px-3 py-4 text-center text-xs text-muted-foreground'>
                  No articles match the filter.
                </div>
              )}
              {filteredArticles.map((article) => (
                <div key={article.id} className='border-b border-border/40 last:border-b-0'>
                  <div className='flex items-start gap-2 px-3 py-2'>
                    <input
                      type='checkbox'
                      checked={selectedArticleIds.includes(article.id)}
                      onChange={() => handleToggleArticle(article.id)}
                      className='mt-1 shrink-0'
                      aria-label={`Select article ${article.title || article.resolvedUrl}`}
                    />
                    <div className='min-w-0 flex-1'>
                      <span className='block truncate text-xs font-medium text-foreground'>
                        {article.title || '(untitled)'}
                      </span>
                      <span className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <span className='truncate'>{article.canonicalUrl || article.resolvedUrl}</span>
                        {article.sourcePresetId && (
                          <span className='shrink-0 rounded bg-muted px-1 py-0.5 text-[10px]'>
                            {sourcePresets.find((p) => p.id === article.sourcePresetId)?.name ?? 'preset'}
                          </span>
                        )}
                      </span>
                      {(article.description ?? article.excerpt) && (
                        <span className='mt-0.5 line-clamp-2 block text-xs text-muted-foreground'>
                          {article.description ?? article.excerpt}
                        </span>
                      )}
                    </div>
                    <div className='flex shrink-0 flex-col items-end gap-1'>
                      {article.wordCount > 0 && (
                        <span className='text-xs text-muted-foreground'>
                          {article.wordCount.toLocaleString()}w
                        </span>
                      )}
                      {article.bodyText && (
                        <button
                          className='text-xs text-primary hover:underline'
                          onClick={() =>
                            setExpandedArticleId(
                              expandedArticleId === article.id ? null : article.id
                            )
                          }
                          aria-label={
                            expandedArticleId === article.id ? 'Collapse preview' : 'Preview body'
                          }
                        >
                          {expandedArticleId === article.id ? '▲' : '▼'}
                        </button>
                      )}
                      <button
                        className='text-xs text-destructive hover:underline disabled:opacity-50'
                        disabled={deletingArticleId === article.id}
                        onClick={() => { void handleDeleteRetainedArticle(article); }}
                      >
                        {deletingArticleId === article.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  {expandedArticleId === article.id && article.bodyText && (
                    <div className='border-t border-border/20 bg-muted/20 px-3 pb-2 pt-1'>
                      <p className='max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground'>
                        {article.bodyText.slice(0, 1200)}
                        {article.bodyText.length > 1200 && (
                          <span className='text-muted-foreground'>
                            {' '}…({article.bodyText.length - 1200} more chars)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]'>
          <div className='space-y-2'>
            {promptPresets.length > 0 && (
              <div className='rounded-md border border-border/50'>
                <div
                  className='flex cursor-pointer items-center gap-2 border-b border-border/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30'
                  onClick={() => {
                    setSelectedPromptId('');
                    setCustomPrompt(DEFAULT_AGGREGATION_PROMPT);
                  }}
                >
                  <input
                    type='radio'
                    readOnly
                    checked={selectedPromptId === ''}
                    aria-label='Custom prompt'
                  />
                  Custom prompt
                </div>
                {promptPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className='flex items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5 last:border-b-0'
                  >
                    <label className='flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs'>
                      <input
                        type='radio'
                        checked={selectedPromptId === preset.id}
                        onChange={() => handlePromptPresetChange(preset.id)}
                        aria-label={`Select prompt preset ${preset.name}`}
                      />
                      <span className='truncate font-medium text-foreground'>{preset.name}</span>
                      {preset.isDefault && (
                        <span className='shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary'>
                          Default
                        </span>
                      )}
                    </label>
                    <div className='flex shrink-0 items-center gap-1'>
                      {!preset.isDefault && (
                        <Button
                          size='sm'
                          variant='ghost'
                          onClick={() => { void handleSetDefaultPromptPreset(preset); }}
                          disabled={isGenerating}
                          className='h-5 px-1.5 text-[10px]'
                        >
                          Set default
                        </Button>
                      )}
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => { void handleDeletePromptPreset(preset.id); }}
                        disabled={isGenerating}
                        className='shrink-0 px-2 text-xs'
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              value={customPrompt}
              onChange={(event) => {
                setCustomPrompt(event.target.value);
                setSelectedPromptId('');
              }}
              rows={5}
              disabled={isGenerating}
              aria-label='Aggregation prompt'
            />
          </div>
          <div className='space-y-2'>
            <Input
              value={promptPresetName}
              onChange={(event) => setPromptPresetName(event.target.value)}
              placeholder='Prompt preset name'
              className='h-8 text-xs'
              aria-label='Prompt preset name'
            />
            <Button
              size='sm'
              variant='outline'
              onClick={() => { void handleSavePromptPreset(); }}
              disabled={!promptPresetName.trim() || !customPrompt.trim()}
            >
              Save prompt preset
            </Button>
            <div className='space-y-1 pt-2'>
              <Button
                size='sm'
                onClick={() => { void handleGenerate(); }}
                disabled={isGenerating}
                title={
                  noArticlesSelected
                    ? 'Scrape or select at least one article before generating a post.'
                    : isUsingDefaultArticleAggregatorPath
                    ? `Using default Article Aggregator AI Path: ${SOCIAL_ARTICLE_AGGREGATION_PATH_ID}.`
                    : undefined
                }
              >
                {isGenerating ? 'Generating…' : 'Generate post'}
              </Button>
              {generationStatus && (
                <p className='text-xs text-muted-foreground'>{generationStatus}</p>
              )}
            </div>
            {isUsingDefaultArticleAggregatorPath && (
              <p className='text-xs text-muted-foreground'>
                Using default Article Aggregator AI Path:{' '}
                <span className='font-mono'>{SOCIAL_ARTICLE_AGGREGATION_PATH_ID}</span>.
              </p>
            )}
            {contextBudgetExceeded && (
              <p className='text-xs text-amber-600 dark:text-amber-400'>
                Selected articles exceed the{' '}
                {(ARTICLE_CONTEXT_CHAR_BUDGET / 1000).toFixed(0)}k char budget —
                body text will be truncated.
              </p>
            )}
          </div>
        </div>

        {generationError && (
          <div className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
            {generationError}
          </div>
        )}

        {generatedOutput !== null && (
          <div className='space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-semibold text-foreground'>Generated post</span>
              <div className='flex items-center gap-2'>
                <button
                  className='text-xs text-muted-foreground hover:text-foreground'
                  onClick={() => setShowRawOutput((v) => !v)}
                >
                  {showRawOutput ? 'Structured view' : 'Raw output'}
                </button>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-6 px-2 text-xs'
                  onClick={() => {
                    const textToCopy = generatedParsed
                      ? `${generatedParsed.titleEn}\n\n${generatedParsed.bodyEn}`
                      : generatedOutput;
                    void navigator.clipboard.writeText(textToCopy).then(() => {
                      toast('Copied to clipboard', { variant: 'success' });
                    });
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>

            {generatedParsed && !showRawOutput ? (
              <div className='space-y-3 rounded-md border border-border/50 p-3'>
                <div>
                  <p className='mb-1 text-xs font-medium text-muted-foreground'>Title</p>
                  <p className='text-sm font-medium text-foreground'>{generatedParsed.titleEn}</p>
                </div>
                <div>
                  <p className='mb-1 text-xs font-medium text-muted-foreground'>Body</p>
                  <p className='whitespace-pre-wrap text-xs leading-relaxed text-foreground'>
                    {generatedParsed.bodyEn}
                  </p>
                </div>
                {generatedParsed.summary && (
                  <div>
                    <p className='mb-1 text-xs font-medium text-muted-foreground'>Summary / source notes</p>
                    <p className='whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground'>
                      {generatedParsed.summary}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <Textarea
                value={generatedOutput}
                readOnly
                rows={8}
                className='font-mono text-xs'
                aria-label='Generated article aggregation output'
              />
            )}
          </div>
        )}
      </div>
    </KangurAdminCard>

    <SocialArticleScrapeModal
      open={scrapeModalOpen}
      onClose={() => setScrapeModalOpen(false)}
      onCompleted={(response) => { void handleScrapeCompleted(response); }}
      onScrapeStart={() => setIsScraping(true)}
      onScrapeEnd={() => setIsScraping(false)}
      sourcePresets={sourcePresets}
      selectedPresetIds={selectedPresetIds}
      onSelectedPresetIdsChange={setSelectedPresetIds}
      initialCustomUrls={customUrls}
      initialMaxArticlesPerSource={maxArticlesPerSource}
      initialObeyRobotsTxt={obeyRobotsTxt}
    />
    </>
  );
}
