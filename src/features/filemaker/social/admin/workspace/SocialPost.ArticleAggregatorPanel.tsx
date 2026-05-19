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
  type SocialArticleScrapeResponse,
  type SocialArticleSourcePreset,
} from '@/shared/contracts/social-article-aggregator';
import type { SocialPublishingPost } from '@/shared/contracts/social-publishing-posts';
import { enqueueAiPathRun, getAiPathRunResult } from '@/shared/lib/ai-paths/api/client';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { safeSetTimeout } from '@/shared/lib/timers';
import { Button, Input, Textarea, useToast } from '@/shared/ui';

import { useSocialPostContext } from './SocialPostContext';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 120;
const ARTICLE_CONTEXT_CHAR_BUDGET = 60000;

const DEFAULT_AGGREGATION_PROMPT =
  'Write one English social post that summarizes the selected articles. Use only the article context, keep the post clear and publish-ready, and include source-aware claims without inventing facts.';

type AiPathPollResult = {
  rawResult: unknown;
  text: string | null;
};

type ParsedGeneratedPost = {
  bodyEn: string;
  summary: string | null;
  titleEn: string;
};

const splitLooseUrls = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );

const compactText = (value: string | null | undefined, max = 8000): string =>
  (value ?? '').trim().slice(0, max).trimEnd();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const extractTextFromUnknown = (value: unknown, depth = 0): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (depth > 4 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = extractTextFromUnknown(item, depth + 1);
      if (result !== null) return result;
    }
    return null;
  }
  if (isRecord(value)) {
    const priorityKeys = ['post', 'body', 'bodyEn', 'text', 'content', 'summary', 'output', 'result'];
    for (const key of priorityKeys) {
      const result = extractTextFromUnknown(value[key], depth + 1);
      if (result !== null) return result;
    }
    for (const item of Object.values(value)) {
      const result = extractTextFromUnknown(item, depth + 1);
      if (result !== null) return result;
    }
  }
  return null;
};

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
      rawResult: run.result,
      text: extractTextFromUnknown(run.result),
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

  const [articles, setArticles] = useState<SocialArticleRecord[]>([]);
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [articleFilter, setArticleFilter] = useState('');
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [scrapeRunId, setScrapeRunId] = useState<string | null>(null);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);

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

  const selectedWordCount = useMemo(
    () => selectedArticles.reduce((sum, a) => sum + (a.wordCount ?? 0), 0),
    [selectedArticles]
  );

  const selectedCharCount = useMemo(
    () => selectedArticles.reduce((sum, a) => sum + (a.bodyText?.length ?? 0), 0),
    [selectedArticles]
  );

  const contextBudgetExceeded = selectedCharCount > ARTICLE_CONTEXT_CHAR_BUDGET;

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

  useEffect(() => {
    void loadPresets({ applyDefaultPrompt: true }).catch((error) => {
      setScrapeError(error instanceof Error ? error.message : 'Failed to load article presets.');
    });
  }, [loadPresets]);

  const handleTogglePreset = useCallback((presetId: string): void => {
    setSelectedPresetIds((current) =>
      current.includes(presetId)
        ? current.filter((id) => id !== presetId)
        : [...current, presetId]
    );
  }, []);

  const handleToggleArticle = useCallback((articleId: string): void => {
    setSelectedArticleIds((current) =>
      current.includes(articleId)
        ? current.filter((id) => id !== articleId)
        : [...current, articleId]
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
          maxArticlesPerSource,
          name: sourcePresetName.trim(),
          obeyRobotsTxt,
          urls,
        },
      },
      { timeout: 60_000 }
    );
    setSourcePresetName('');
    setSourcePresetUrls('');
    await loadPresets();
    setSelectedPresetIds((current) =>
      current.includes(saved.id) ? current : [...current, saved.id]
    );
  }, [loadPresets, maxArticlesPerSource, obeyRobotsTxt, sourcePresetName, sourcePresetUrls]);

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

  const resolveTargetPost = useCallback(async (): Promise<SocialPublishingPost | null> => {
    if (activePost) return activePost;
    return handleCreateDraft();
  }, [activePost, handleCreateDraft]);

  const handleScrape = useCallback(async (): Promise<void> => {
    setScrapeError(null);
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
      setArticles(response.articles);
      setSelectedArticleIds(response.articles.map((article) => article.id));
      setArticleFilter('');
      setExpandedArticleId(null);
      setScrapeRunId(response.run.id);
      setScrapeStatus(
        response.run.status === 'completed'
          ? `Scraped ${response.articles.length} article${response.articles.length === 1 ? '' : 's'}.`
          : response.run.message || 'Article scrape finished.'
      );
      if (response.run.warnings.length > 0) {
        toast(`${response.run.warnings.length} scrape warning${response.run.warnings.length === 1 ? '' : 's'}`, {
          variant: 'warning',
        });
      }
      const targetPost = await resolveTargetPost();
      if (targetPost) {
        await patchMutation.mutateAsync({
          id: targetPost.id,
          updates: {
            articleIds: response.articles.map((article) => article.id),
            articleScrapeRunId: response.run.id,
            articleSourcePresetIds: selectedPresetIds,
            articleSourceUrls: splitLooseUrls(customUrls),
          },
        });
      }
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : 'Article scrape failed.');
    } finally {
      setIsScraping(false);
    }
  }, [customUrls, maxArticlesPerSource, obeyRobotsTxt, patchMutation, resolveTargetPost, selectedPresetIds, toast]);

  const handleGenerate = useCallback(async (): Promise<void> => {
    const pathId = articleAggregatorPathId?.trim();
    if (!pathId) {
      setGenerationError('Configure Article Aggregator AI Path ID in Settings -> Models.');
      return;
    }
    if (selectedArticles.length === 0) {
      setGenerationError('Select at least one scraped article.');
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
      const enqueueResult = await enqueueAiPathRun(
        {
          pathId,
          entityId: targetPost.id,
          entityType: 'social-publishing-post',
          triggerContext: {
            articleIds: selectedArticles.map((article) => article.id),
            articleRunId: scrapeRunId,
            articles: contextArticles,
            language: 'en',
            mode: 'social_article_aggregation',
            postId: targetPost.id,
            prompt,
            promptPresetId: selectedPromptId || null,
            sourcePresetIds: selectedPresetIds,
          },
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
        articleSourcePresetIds: selectedPresetIds,
        articleSourceUrls: splitLooseUrls(customUrls),
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
    articleAggregatorPathId,
    customPrompt,
    customUrls,
    patchMutation,
    queryClient,
    resolveTargetPost,
    scrapeRunId,
    selectedArticleIds,
    selectedArticles,
    selectedPresetIds,
    selectedPromptId,
    setEditorState,
    toast,
  ]);

  const canScrape = selectedPresetIds.length > 0 || splitLooseUrls(customUrls).length > 0;

  return (
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
              <Textarea
                value={customUrls}
                onChange={(event) => setCustomUrls(event.target.value)}
                placeholder='https://example.com/news'
                rows={3}
                disabled={isScraping}
                className='font-mono text-xs'
                aria-label='Custom article source URLs'
              />
              <div className='flex flex-wrap items-center gap-3'>
                <label className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <input
                    type='checkbox'
                    checked={obeyRobotsTxt}
                    onChange={(event) => setObeyRobotsTxt(event.target.checked)}
                    disabled={isScraping}
                    aria-label='Obey robots.txt'
                  />
                  Obey robots.txt
                </label>
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <span>Max articles</span>
                  <Input
                    type='number'
                    value={maxArticlesPerSource}
                    min={1}
                    max={50}
                    onChange={(event) => setMaxArticlesPerSource(Number(event.target.value) || 1)}
                    disabled={isScraping}
                    className='h-8 w-20 text-xs'
                    aria-label='Maximum articles per source'
                  />
                </div>
                <Button
                  size='sm'
                  onClick={() => { void handleScrape(); }}
                  disabled={isScraping || !canScrape}
                >
                  {isScraping ? 'Scraping...' : 'Scrape articles'}
                </Button>
              </div>
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
                  onClick={() =>
                    setSelectedArticleIds(
                      selectedArticles.length === filteredArticles.length
                        ? selectedArticleIds.filter(
                            (id) => !filteredArticles.some((a) => a.id === id)
                          )
                        : [...new Set([...selectedArticleIds, ...filteredArticles.map((a) => a.id)])]
                    )
                  }
                >
                  {selectedArticles.length === filteredArticles.length && filteredArticles.length > 0
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
                disabled={isGenerating || selectedArticles.length === 0}
                title={
                  !articleAggregatorPathId?.trim()
                    ? 'Configure Article Aggregator AI Path ID in Settings -> Models.'
                    : undefined
                }
              >
                {isGenerating ? 'Generating…' : 'Generate post'}
              </Button>
              {generationStatus && (
                <p className='text-xs text-muted-foreground'>{generationStatus}</p>
              )}
            </div>
            {!articleAggregatorPathId?.trim() && (
              <p className='text-xs text-amber-600 dark:text-amber-400'>
                Article Aggregator AI Path ID is required.
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
  );
}
