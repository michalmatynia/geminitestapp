'use client';

/* eslint-disable max-lines, max-lines-per-function */

import React, { useCallback, useEffect, useState } from 'react';

import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import {
  type SocialArticlePromptPreset,
  type SocialArticleRecord,
  type SocialArticleScrapeResponse,
  type SocialArticleScrapeRun,
  type SocialArticleSourcePreset,
} from '@/shared/contracts/social-article-aggregator';
import { api } from '@/shared/lib/api-client';
import { Button, Input, Textarea, useToast } from '@/shared/ui';

type ArticleListResult = { articles: SocialArticleRecord[]; total: number };
type PlaywrightScripterListEntry = {
  description: string | null;
  id: string;
  siteHost: string;
  version: number;
};
type PlaywrightScripterListResult = { scripters: PlaywrightScripterListEntry[] };

const TABS = ['articles', 'source-presets', 'prompt-presets', 'scrape-runs', 'run-scrape'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  articles: 'Articles',
  'source-presets': 'Source Presets',
  'prompt-presets': 'Prompt Presets',
  'scrape-runs': 'Scrape Runs',
  'run-scrape': 'Run Scrape',
};

const PAGE_SIZE = 50;

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const statusColor = (status: string): string => {
  if (status === 'completed') return 'text-green-600 dark:text-green-400';
  if (status === 'failed') return 'text-destructive';
  if (status === 'running') return 'text-blue-600 dark:text-blue-400';
  return 'text-muted-foreground';
};

const splitLines = (value: string): string[] =>
  value.split('\n').map((s) => s.trim()).filter(Boolean);

const joinLines = (values: string[]): string => values.join('\n');

type SourcePresetFormState = {
  id: string | null;
  name: string;
  urls: string;
  maxArticlesPerSource: number;
  crawlDepth: number;
  obeyRobotsTxt: boolean;
  enabled: boolean;
  includePatterns: string;
  excludePatterns: string;
  playwrightScripterId: string;
  playwrightScripterMode: 'assist' | 'replace';
};

const emptySourcePresetForm = (): SourcePresetFormState => ({
  id: null,
  name: '',
  urls: '',
  maxArticlesPerSource: 10,
  crawlDepth: 1,
  obeyRobotsTxt: true,
  enabled: true,
  includePatterns: '',
  excludePatterns: '',
  playwrightScripterId: '',
  playwrightScripterMode: 'assist',
});

const presetToForm = (preset: SocialArticleSourcePreset): SourcePresetFormState => ({
  id: preset.id,
  name: preset.name,
  urls: joinLines(preset.urls),
  maxArticlesPerSource: preset.maxArticlesPerSource,
  crawlDepth: preset.crawlDepth,
  obeyRobotsTxt: preset.obeyRobotsTxt,
  enabled: preset.enabled,
  includePatterns: joinLines(preset.includePatterns),
  excludePatterns: joinLines(preset.excludePatterns),
  playwrightScripterId: preset.playwrightScripterId ?? '',
  playwrightScripterMode: preset.playwrightScripterMode,
});

export function AdminArticleAggregatorPage(): React.JSX.Element {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('articles');

  // ── Articles tab ──────────────────────────────────────────────────────────
  const [articles, setArticles] = useState<SocialArticleRecord[]>([]);
  const [articlesTotal, setArticlesTotal] = useState(0);
  const [articlesOffset, setArticlesOffset] = useState(0);
  const [articlesSearch, setArticlesSearch] = useState('');
  const [articlesSearchInput, setArticlesSearchInput] = useState('');
  const [articlesScrapeRunFilter, setArticlesScrapeRunFilter] = useState('');
  const [articlesPresetFilter, setArticlesPresetFilter] = useState('');
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // ── Source presets tab ────────────────────────────────────────────────────
  const [sourcePresets, setSourcePresets] = useState<SocialArticleSourcePreset[]>([]);
  const [sourcePresetsLoading, setSourcePresetsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [sourcePresetForm, setSourcePresetForm] = useState<SourcePresetFormState>(emptySourcePresetForm());
  const [playwrightScripters, setPlaywrightScripters] = useState<PlaywrightScripterListEntry[]>([]);
  const [playwrightScriptersLoading, setPlaywrightScriptersLoading] = useState(false);

  // ── Prompt presets tab ────────────────────────────────────────────────────
  const [promptPresets, setPromptPresets] = useState<SocialArticlePromptPreset[]>([]);
  const [promptPresetsLoading, setPromptPresetsLoading] = useState(false);
  const [promptPresetName, setPromptPresetName] = useState('');
  const [promptPresetText, setPromptPresetText] = useState('');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);

  // ── Scrape runs tab ───────────────────────────────────────────────────────
  const [scrapeRuns, setScrapeRuns] = useState<SocialArticleScrapeRun[]>([]);
  const [scrapeRunsLoading, setScrapeRunsLoading] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // ── Run Scrape tab ────────────────────────────────────────────────────────
  const [runScrapePresets, setRunScrapePresets] = useState<SocialArticleSourcePreset[]>([]);
  const [runScrapeSelectedIds, setRunScrapeSelectedIds] = useState<string[]>([]);
  const [runScrapeCustomUrls, setRunScrapeCustomUrls] = useState('');
  const [runScrapeObeyRobots, setRunScrapeObeyRobots] = useState(true);
  const [runScrapeMaxArticles, setRunScrapeMaxArticles] = useState(10);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<SocialArticleScrapeResponse | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // ── Data loaders ──────────────────────────────────────────────────────────
  const loadArticles = useCallback(async (offset: number, search: string, scrapeRunId = '', sourcePresetId = ''): Promise<void> => {
    setArticlesLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        ...(search ? { search } : {}),
        ...(scrapeRunId ? { scrapeRunId } : {}),
        ...(sourcePresetId ? { sourcePresetId } : {}),
      });
      const result = await api.get<ArticleListResult>(
        `/api/filemaker/social-article-aggregator/articles?${params.toString()}`,
        { timeout: 60_000 }
      );
      setArticles(result.articles);
      setArticlesTotal(result.total);
      setArticlesOffset(offset);
      setSelectedArticleIds(new Set());
    } finally {
      setArticlesLoading(false);
    }
  }, []);

  const loadSourcePresets = useCallback(async (): Promise<void> => {
    setSourcePresetsLoading(true);
    try {
      const presets = await api.get<SocialArticleSourcePreset[]>(
        '/api/filemaker/social-article-aggregator/source-presets',
        { timeout: 60_000 }
      );
      setSourcePresets(presets);
    } finally {
      setSourcePresetsLoading(false);
    }
  }, []);

  const loadPlaywrightScripters = useCallback(async (): Promise<void> => {
    setPlaywrightScriptersLoading(true);
    try {
      const result = await api.get<PlaywrightScripterListResult>(
        '/api/playwright/scripters',
        { timeout: 60_000 }
      );
      setPlaywrightScripters(result.scripters);
    } catch {
      setPlaywrightScripters([]);
    } finally {
      setPlaywrightScriptersLoading(false);
    }
  }, []);

  const loadPromptPresets = useCallback(async (): Promise<void> => {
    setPromptPresetsLoading(true);
    try {
      const presets = await api.get<SocialArticlePromptPreset[]>(
        '/api/filemaker/social-article-aggregator/prompt-presets',
        { timeout: 60_000 }
      );
      setPromptPresets(presets);
    } finally {
      setPromptPresetsLoading(false);
    }
  }, []);

  const loadScrapeRuns = useCallback(async (): Promise<void> => {
    setScrapeRunsLoading(true);
    try {
      const runs = await api.get<SocialArticleScrapeRun[]>(
        '/api/filemaker/social-article-aggregator/runs?limit=50',
        { timeout: 60_000 }
      );
      setScrapeRuns(runs);
    } finally {
      setScrapeRunsLoading(false);
    }
  }, []);

  const loadRunScrapePresets = useCallback(async (): Promise<void> => {
    const presets = await api.get<SocialArticleSourcePreset[]>(
      '/api/filemaker/social-article-aggregator/source-presets',
      { timeout: 60_000 }
    );
    setRunScrapePresets(presets);
  }, []);

  // Eager initial load so stats strip is populated before any tab switch.
  useEffect(() => {
    void loadPromptPresets().catch(() => undefined);
    void loadScrapeRuns().catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === 'articles') {
      void loadArticles(0, articlesSearch, articlesScrapeRunFilter, articlesPresetFilter).catch(() => undefined);
      void loadSourcePresets().catch(() => undefined);
    }
    if (tab === 'source-presets') {
      void loadSourcePresets().catch(() => undefined);
      void loadPlaywrightScripters().catch(() => undefined);
    }
    if (tab === 'prompt-presets') void loadPromptPresets().catch(() => undefined);
    if (tab === 'scrape-runs') {
      void loadScrapeRuns().catch(() => undefined);
      void loadSourcePresets().catch(() => undefined);
    }
    if (tab === 'run-scrape') void loadRunScrapePresets().catch(() => undefined);
  }, [tab, loadArticles, loadSourcePresets, loadPlaywrightScripters, loadPromptPresets, loadScrapeRuns, loadRunScrapePresets]);

  // ── Articles handlers ─────────────────────────────────────────────────────
  const handleArticleSearch = useCallback((): void => {
    setArticlesSearch(articlesSearchInput);
    void loadArticles(0, articlesSearchInput, articlesScrapeRunFilter, articlesPresetFilter).catch(() => undefined);
  }, [articlesSearchInput, articlesScrapeRunFilter, articlesPresetFilter, loadArticles]);

  const handleViewRunArticles = useCallback((runId: string): void => {
    setArticlesScrapeRunFilter(runId);
    setArticlesPresetFilter('');
    setArticlesSearch('');
    setArticlesSearchInput('');
    setTab('articles');
    void loadArticles(0, '', runId).catch(() => undefined);
  }, [loadArticles]);

  const handleClearRunFilter = useCallback((): void => {
    setArticlesScrapeRunFilter('');
    void loadArticles(0, articlesSearch, '', articlesPresetFilter).catch(() => undefined);
  }, [articlesSearch, articlesPresetFilter, loadArticles]);

  const handleDeleteArticle = useCallback(async (id: string): Promise<void> => {
    setDeletingArticleId(id);
    try {
      await api.delete('/api/filemaker/social-article-aggregator/articles', { params: { id }, timeout: 30_000 });
      setArticles((current) => current.filter((a) => a.id !== id));
      setArticlesTotal((current) => Math.max(0, current - 1));
      if (expandedArticleId === id) setExpandedArticleId(null);
      toast('Article deleted', { variant: 'success' });
    } catch {
      toast('Failed to delete article', { variant: 'error' });
    } finally {
      setDeletingArticleId(null);
    }
  }, [expandedArticleId, toast]);

  const handleToggleArticleSelection = useCallback((id: string): void => {
    setSelectedArticleIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllArticles = useCallback((): void => {
    setSelectedArticleIds(new Set(articles.map((a) => a.id)));
  }, [articles]);

  const handleDeselectAllArticles = useCallback((): void => {
    setSelectedArticleIds(new Set());
  }, []);

  const handleBulkDeleteArticles = useCallback(async (): Promise<void> => {
    if (selectedArticleIds.size === 0) return;
    setIsBulkDeleting(true);
    const ids = Array.from(selectedArticleIds);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          api.delete('/api/filemaker/social-article-aggregator/articles', { params: { id }, timeout: 30_000 })
        )
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      setArticles((current) => current.filter((a) => !selectedArticleIds.has(a.id)));
      setArticlesTotal((current) => Math.max(0, current - succeeded));
      setSelectedArticleIds(new Set());
      if (expandedArticleId !== null && selectedArticleIds.has(expandedArticleId)) {
        setExpandedArticleId(null);
      }
      toast(
        failed > 0
          ? `Deleted ${succeeded}, failed to delete ${failed}`
          : `Deleted ${succeeded} article${succeeded === 1 ? '' : 's'}`,
        { variant: failed > 0 ? 'error' : 'success' }
      );
    } finally {
      setIsBulkDeleting(false);
    }
  }, [expandedArticleId, selectedArticleIds, toast]);

  const handleExportCsv = useCallback((): void => {
    if (articles.length === 0) return;
    const header = ['title', 'resolvedUrl', 'wordCount', 'sourcePreset', 'scrapedAt', 'author', 'publishedAt'];
    const rows = articles.map((a) => [
      a.title ?? '',
      a.resolvedUrl,
      String(a.wordCount),
      sourcePresets.find((p) => p.id === a.sourcePresetId)?.name ?? '',
      a.scrapedAt ?? '',
      a.author ?? '',
      a.publishedAt ?? '',
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `articles-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [articles, sourcePresets]);

  // ── Source preset handlers ────────────────────────────────────────────────
  const handleSaveSourcePreset = useCallback(async (): Promise<void> => {
    const urls = splitLines(sourcePresetForm.urls);
    if (!sourcePresetForm.name.trim() || urls.length === 0) return;
    await api.post('/api/filemaker/social-article-aggregator/source-presets', {
      preset: {
        ...(sourcePresetForm.id ? { id: sourcePresetForm.id } : {}),
        enabled: sourcePresetForm.enabled,
        crawlDepth: sourcePresetForm.crawlDepth,
        excludePatterns: splitLines(sourcePresetForm.excludePatterns),
        includePatterns: splitLines(sourcePresetForm.includePatterns),
        maxArticlesPerSource: sourcePresetForm.maxArticlesPerSource,
        name: sourcePresetForm.name.trim(),
        obeyRobotsTxt: sourcePresetForm.obeyRobotsTxt,
        playwrightScripterId: sourcePresetForm.playwrightScripterId.trim() || null,
        playwrightScripterMode: sourcePresetForm.playwrightScripterMode,
        urls,
      },
    }, { timeout: 60_000 });
    setSourcePresetForm(emptySourcePresetForm());
    await loadSourcePresets();
    toast(sourcePresetForm.id ? 'Source preset updated' : 'Source preset saved', { variant: 'success' });
  }, [loadSourcePresets, sourcePresetForm, toast]);

  const handleEditSourcePreset = useCallback((preset: SocialArticleSourcePreset): void => {
    setSourcePresetForm(presetToForm(preset));
  }, []);

  const handleCancelSourcePresetEdit = useCallback((): void => {
    setSourcePresetForm(emptySourcePresetForm());
  }, []);

  const handleDeleteSourcePreset = useCallback(async (id: string): Promise<void> => {
    await api.delete('/api/filemaker/social-article-aggregator/source-presets', { params: { id }, timeout: 60_000 });
    if (sourcePresetForm.id === id) setSourcePresetForm(emptySourcePresetForm());
    await loadSourcePresets();
    toast('Source preset deleted', { variant: 'success' });
  }, [loadSourcePresets, sourcePresetForm.id, toast]);

  const handleToggleSourcePreset = useCallback(async (preset: SocialArticleSourcePreset): Promise<void> => {
    await api.post('/api/filemaker/social-article-aggregator/source-presets', {
      preset: {
        enabled: !preset.enabled,
        crawlDepth: preset.crawlDepth,
        excludePatterns: preset.excludePatterns,
        id: preset.id,
        includePatterns: preset.includePatterns,
        maxArticlesPerSource: preset.maxArticlesPerSource,
        name: preset.name,
        obeyRobotsTxt: preset.obeyRobotsTxt,
        playwrightScripterId: preset.playwrightScripterId,
        playwrightScripterMode: preset.playwrightScripterMode,
        urls: preset.urls,
      },
    }, { timeout: 60_000 });
    await loadSourcePresets();
    toast(preset.enabled ? 'Source preset disabled' : 'Source preset enabled', { variant: 'success' });
  }, [loadSourcePresets, toast]);

  const handleSeedSourcePresets = useCallback(async (): Promise<void> => {
    setIsSeeding(true);
    try {
      const result = await api.post<{ seeded: string[]; skipped: string[] }>(
        '/api/filemaker/social-article-aggregator/source-presets/seed',
        {},
        { timeout: 30_000 }
      );
      await loadSourcePresets();
      if (result.seeded.length > 0) {
        toast(`Seeded ${result.seeded.length} preset(s): ${result.seeded.join(', ')}`, { variant: 'success' });
      } else {
        toast('All default presets already exist — nothing to seed.', { variant: 'default' });
      }
    } finally {
      setIsSeeding(false);
    }
  }, [loadSourcePresets, toast]);

  // ── Prompt preset handlers ────────────────────────────────────────────────
  const handleSavePromptPreset = useCallback(async (): Promise<void> => {
    if (!promptPresetName.trim() || !promptPresetText.trim()) return;
    await api.post('/api/filemaker/social-article-aggregator/prompt-presets', {
      preset: {
        ...(editingPromptId ? { id: editingPromptId } : {}),
        isDefault: promptPresets.length === 0 && !editingPromptId,
        name: promptPresetName.trim(),
        prompt: promptPresetText.trim(),
      },
    }, { timeout: 60_000 });
    setPromptPresetName('');
    setPromptPresetText('');
    setEditingPromptId(null);
    await loadPromptPresets();
    toast(editingPromptId ? 'Prompt preset updated' : 'Prompt preset saved', { variant: 'success' });
  }, [editingPromptId, loadPromptPresets, promptPresetName, promptPresetText, promptPresets.length, toast]);

  const handleEditPromptPreset = useCallback((preset: SocialArticlePromptPreset): void => {
    setEditingPromptId(preset.id);
    setPromptPresetName(preset.name);
    setPromptPresetText(preset.prompt);
  }, []);

  const handleSetDefaultPromptPreset = useCallback(async (preset: SocialArticlePromptPreset): Promise<void> => {
    await api.post('/api/filemaker/social-article-aggregator/prompt-presets', {
      preset: { id: preset.id, isDefault: true, name: preset.name, prompt: preset.prompt },
    }, { timeout: 60_000 });
    await loadPromptPresets();
    toast(`"${preset.name}" set as default`, { variant: 'success' });
  }, [loadPromptPresets, toast]);

  const handleDeletePromptPreset = useCallback(async (id: string): Promise<void> => {
    await api.delete('/api/filemaker/social-article-aggregator/prompt-presets', { params: { id }, timeout: 60_000 });
    if (editingPromptId === id) {
      setEditingPromptId(null);
      setPromptPresetName('');
      setPromptPresetText('');
    }
    await loadPromptPresets();
    toast('Prompt preset deleted', { variant: 'success' });
  }, [editingPromptId, loadPromptPresets, toast]);

  // ── Run Scrape handlers ───────────────────────────────────────────────────
  const handleToggleRunScrapePreset = useCallback((id: string): void => {
    setRunScrapeSelectedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }, []);

  const handleRunScrape = useCallback(async (): Promise<void> => {
    const customUrls = splitLines(runScrapeCustomUrls);
    if (runScrapeSelectedIds.length === 0 && customUrls.length === 0) return;
    setScrapeError(null);
    setScrapeResult(null);
    setIsScraping(true);
    try {
      const result = await api.post<SocialArticleScrapeResponse>(
        '/api/filemaker/social-article-aggregator/scrape',
        {
          customUrls,
          maxArticlesPerSource: runScrapeMaxArticles,
          obeyRobotsTxt: runScrapeObeyRobots,
          sourcePresetIds: runScrapeSelectedIds,
        },
        { timeout: 280_000 }
      );
      setScrapeResult(result);
      toast(`Scraped ${result.articles.length} article${result.articles.length === 1 ? '' : 's'}`, { variant: 'success' });
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : 'Scrape failed.');
    } finally {
      setIsScraping(false);
    }
  }, [runScrapeCustomUrls, runScrapeMaxArticles, runScrapeObeyRobots, runScrapeSelectedIds, toast]);

  const canRunScrape = runScrapeSelectedIds.length > 0 || splitLines(runScrapeCustomUrls).length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className='space-y-6 p-4 md:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-xl font-bold text-foreground'>Article Aggregator</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Manage scraped articles, source presets, prompt presets, and scrape run history.
          </p>
        </div>
        <div className='flex flex-wrap gap-4'>
          {(
            [
              ['articles', articlesTotal],
              ['source presets', sourcePresets.length],
              ['prompt presets', promptPresets.length],
              ['recent runs', scrapeRuns.length],
            ] as [string, number][]
          ).map(([label, value]) => (
            <div key={label} className='text-center'>
              <div className='text-2xl font-bold tabular-nums text-foreground'>{value}</div>
              <div className='text-xs text-muted-foreground'>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className='flex flex-wrap gap-1 border-b border-border'>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === t
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Articles ─────────────────────────────────────────────────────── */}
      {tab === 'articles' && (
        <div className='space-y-4'>
          <div className='flex items-center gap-2'>
            <Input
              value={articlesSearchInput}
              onChange={(e) => setArticlesSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleArticleSearch(); }}
              placeholder='Search by title or URL…'
              className='max-w-md'
            />
            <Button size='sm' onClick={handleArticleSearch} disabled={articlesLoading}>Search</Button>
            <Button
              size='sm'
              variant='ghost'
              disabled={articlesLoading}
              onClick={() => void loadArticles(articlesOffset, articlesSearch, articlesScrapeRunFilter, articlesPresetFilter).catch(() => undefined)}
              title='Refresh'
            >
              ↺
            </Button>
            {articlesSearch && (
              <Button size='sm' variant='ghost' onClick={() => {
                setArticlesSearchInput('');
                setArticlesSearch('');
                void loadArticles(0, '', articlesScrapeRunFilter, articlesPresetFilter).catch(() => undefined);
              }}>
                Clear search
              </Button>
            )}
          </div>

          {sourcePresets.length > 0 && (
            <div className='flex items-center gap-2'>
              <select
                value={articlesPresetFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setArticlesPresetFilter(val);
                  void loadArticles(0, articlesSearch, articlesScrapeRunFilter, val).catch(() => undefined);
                }}
                className='h-8 rounded border border-border bg-background px-2 text-xs text-foreground'
                aria-label='Filter by source preset'
              >
                <option value=''>All source presets</option>
                {sourcePresets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {articlesPresetFilter && (
                <Button
                  size='sm' variant='ghost' className='h-7 px-2 text-xs'
                  onClick={() => {
                    setArticlesPresetFilter('');
                    void loadArticles(0, articlesSearch, articlesScrapeRunFilter, '').catch(() => undefined);
                  }}
                >
                  ✕ Clear preset filter
                </Button>
              )}
            </div>
          )}

          {articlesScrapeRunFilter && (
            <div className='flex items-center gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-1.5'>
              <span className='text-xs text-muted-foreground'>
                Filtered by scrape run: <span className='font-mono text-foreground'>{articlesScrapeRunFilter}</span>
              </span>
              <Button size='sm' variant='ghost' className='h-5 px-1.5 text-xs' onClick={handleClearRunFilter}>
                ✕ Clear
              </Button>
            </div>
          )}

          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div className='text-xs text-muted-foreground'>
              {articlesTotal} article{articlesTotal === 1 ? '' : 's'} total
              {articlesSearch ? ` matching "${articlesSearch}"` : ''}
              {articlesScrapeRunFilter ? ' (run filter active)' : ''}
              {articlesPresetFilter
                ? ` · preset: ${sourcePresets.find((p) => p.id === articlesPresetFilter)?.name ?? articlesPresetFilter}`
                : ''}
            </div>
            {articles.length > 0 && (
              <Button
                size='sm'
                variant='ghost'
                className='h-6 px-2 text-xs text-muted-foreground'
                onClick={handleExportCsv}
                title='Export current page to CSV'
              >
                ↓ CSV
              </Button>
            )}
          </div>

          {articles.length > 0 && (
            <div className='flex items-center gap-3 border-b border-border/40 pb-2'>
              <label className='flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground'>
                <input
                  type='checkbox'
                  checked={selectedArticleIds.size === articles.length}
                  onChange={() => {
                    if (selectedArticleIds.size === articles.length) handleDeselectAllArticles();
                    else handleSelectAllArticles();
                  }}
                  disabled={isBulkDeleting}
                />
                {selectedArticleIds.size === 0 ? 'Select all' : `${selectedArticleIds.size} selected`}
              </label>
              {selectedArticleIds.size > 0 && (
                <>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-6 px-2 text-xs text-destructive hover:text-destructive'
                    disabled={isBulkDeleting}
                    onClick={() => { void handleBulkDeleteArticles(); }}
                  >
                    {isBulkDeleting ? 'Deleting…' : `Delete selected (${selectedArticleIds.size})`}
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-6 px-2 text-xs'
                    disabled={isBulkDeleting}
                    onClick={handleDeselectAllArticles}
                  >
                    Deselect all
                  </Button>
                </>
              )}
            </div>
          )}

          <div className='rounded-md border border-border'>
            {articlesLoading && articles.length === 0 && (
              <div className='p-6 text-center text-sm text-muted-foreground'>Loading…</div>
            )}
            {!articlesLoading && articles.length === 0 && (
              <div className='p-6 text-center text-sm text-muted-foreground'>No articles found.</div>
            )}
            {articles.map((article) => (
              <div key={article.id} className='border-b border-border/40 last:border-b-0'>
                <div className='flex items-start gap-2 px-4 py-3'>
                  <input
                    type='checkbox'
                    checked={selectedArticleIds.has(article.id)}
                    onChange={() => handleToggleArticleSelection(article.id)}
                    disabled={isBulkDeleting || deletingArticleId === article.id}
                    onClick={(e) => e.stopPropagation()}
                    className='mt-1 shrink-0'
                    aria-label={`Select article ${article.title ?? article.id}`}
                  />
                  <button
                    className='min-w-0 flex-1 text-left'
                    onClick={() => setExpandedArticleId(expandedArticleId === article.id ? null : article.id)}
                  >
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <p className='truncate text-sm font-medium text-foreground'>
                        {article.title || '(untitled)'}
                      </p>
                      {article.sourcePresetId && (
                        <span className='shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground'>
                          {sourcePresets.find((p) => p.id === article.sourcePresetId)?.name ?? 'preset'}
                        </span>
                      )}
                    </div>
                    <p className='truncate text-xs text-primary'>{article.resolvedUrl}</p>
                    {(article.description ?? article.excerpt) && (
                      <p className='mt-1 line-clamp-2 text-xs text-muted-foreground'>
                        {article.description ?? article.excerpt}
                      </p>
                    )}
                  </button>
                  <div className='flex shrink-0 flex-col items-end gap-1'>
                    <div className='text-right text-xs text-muted-foreground'>
                      <div>{article.wordCount} words</div>
                      <div>{formatDate(article.scrapedAt)}</div>
                    </div>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-6 px-2 text-xs text-destructive hover:text-destructive'
                      disabled={deletingArticleId === article.id || isBulkDeleting}
                      onClick={() => { void handleDeleteArticle(article.id); }}
                    >
                      {deletingArticleId === article.id ? '…' : 'Delete'}
                    </Button>
                  </div>
                </div>
                {expandedArticleId === article.id && (
                  <div className='border-t border-border/30 bg-muted/20 px-4 py-3'>
                    {article.bodyText ? (
                      <>
                        <div className='mb-1 flex items-center justify-between gap-2'>
                          <p className='text-xs font-medium text-muted-foreground'>Body text</p>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-5 px-1.5 text-[10px]'
                            onClick={() => {
                              void navigator.clipboard.writeText(article.bodyText ?? '').then(() => {
                                toast('Body text copied', { variant: 'success' });
                              });
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        <p className='max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground'>
                          {article.bodyText}
                        </p>
                      </>
                    ) : (
                      <p className='text-xs text-muted-foreground'>No body text captured.</p>
                    )}
                    {article.author && (
                      <p className='mt-2 text-xs text-muted-foreground'>Author: {article.author}</p>
                    )}
                    {article.publishedAt && (
                      <p className='text-xs text-muted-foreground'>Published: {article.publishedAt}</p>
                    )}
                    <div className='mt-2 flex items-center gap-3'>
                      <a
                        href={article.resolvedUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-xs text-primary hover:underline'
                      >
                        Open original ↗
                      </a>
                      <span className='text-xs text-muted-foreground'>
                        {article.wordCount.toLocaleString()} words
                        {article.scrapeCount > 1 && ` · scraped ${article.scrapeCount}×`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {articlesTotal > PAGE_SIZE && (
            <div className='flex items-center justify-between'>
              <Button
                size='sm' variant='outline'
                disabled={articlesOffset === 0 || articlesLoading}
                onClick={() => void loadArticles(Math.max(0, articlesOffset - PAGE_SIZE), articlesSearch, articlesScrapeRunFilter, articlesPresetFilter).catch(() => undefined)}
              >
                Previous
              </Button>
              <span className='text-xs text-muted-foreground'>
                {articlesOffset + 1}–{Math.min(articlesOffset + PAGE_SIZE, articlesTotal)} of {articlesTotal}
              </span>
              <Button
                size='sm' variant='outline'
                disabled={articlesOffset + PAGE_SIZE >= articlesTotal || articlesLoading}
                onClick={() => void loadArticles(articlesOffset + PAGE_SIZE, articlesSearch, articlesScrapeRunFilter, articlesPresetFilter).catch(() => undefined)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Source Presets ────────────────────────────────────────────────── */}
      {tab === 'source-presets' && (
        <div className='grid gap-6 lg:grid-cols-[1fr_360px]'>
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className='text-xs text-muted-foreground'>
                {sourcePresets.length} preset{sourcePresets.length !== 1 ? 's' : ''}
              </p>
              <Button
                size='sm'
                variant='outline'
                className='text-xs'
                disabled={isSeeding}
                onClick={() => { void handleSeedSourcePresets(); }}
              >
                {isSeeding ? 'Seeding…' : 'Seed defaults'}
              </Button>
            </div>
            {sourcePresetsLoading && sourcePresets.length === 0 && (
              <div className='py-6 text-center text-sm text-muted-foreground'>Loading…</div>
            )}
            {!sourcePresetsLoading && sourcePresets.length === 0 && (
              <div className='py-6 text-center text-sm text-muted-foreground'>No source presets yet. Click "Seed defaults" to add the built-in presets.</div>
            )}
            {sourcePresets.map((preset) => (
              <KangurAdminCard key={preset.id}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2'>
                      <p className='font-medium text-sm text-foreground'>{preset.name}</p>
                      {!preset.enabled && (
                        <span className='rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground'>
                          disabled
                        </span>
                      )}
                    </div>
                    <p className='mt-0.5 text-xs text-muted-foreground'>
                      Max {preset.maxArticlesPerSource} · {preset.obeyRobotsTxt ? 'obeys robots.txt' : 'ignores robots.txt'}
                      {' · '}depth {preset.crawlDepth}
                      {preset.includePatterns.length > 0 && ` · ${preset.includePatterns.length} include`}
                      {preset.excludePatterns.length > 0 && ` · ${preset.excludePatterns.length} exclude`}
                      {preset.playwrightScripterId && ` · scripter ${preset.playwrightScripterMode}: ${preset.playwrightScripterId}`}
                    </p>
                    <ul className='mt-1.5 space-y-0.5'>
                      {preset.urls.map((url) => (
                        <li key={url} className='truncate text-xs text-muted-foreground'>{url}</li>
                      ))}
                    </ul>
                  </div>
                  <div className='flex shrink-0 flex-wrap justify-end gap-1'>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='text-xs'
                      onClick={() => { void handleToggleSourcePreset(preset); }}
                    >
                      {preset.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size='sm' variant='outline' onClick={() => handleEditSourcePreset(preset)}>
                      Edit
                    </Button>
                    <Button
                      size='sm' variant='ghost'
                      onClick={() => { void handleDeleteSourcePreset(preset.id); }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </KangurAdminCard>
            ))}
          </div>

          <KangurAdminCard>
            <p className='mb-3 text-sm font-semibold text-foreground'>
              {sourcePresetForm.id ? 'Edit source preset' : 'New source preset'}
            </p>
            <div className='space-y-3'>
              <Input
                value={sourcePresetForm.name}
                onChange={(e) => setSourcePresetForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='Preset name'
                className='h-8 text-xs'
              />
              <Textarea
                value={sourcePresetForm.urls}
                onChange={(e) => setSourcePresetForm((f) => ({ ...f, urls: e.target.value }))}
                placeholder={'https://example.com/news\nhttps://other.com/blog'}
                rows={4}
                className='font-mono text-xs'
                aria-label='Source URLs (one per line)'
              />
              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1'>
                  <label className='text-xs text-muted-foreground'>Max articles/source</label>
                  <Input
                    type='number'
                    value={sourcePresetForm.maxArticlesPerSource}
                    min={1}
                    max={50}
                    onChange={(e) => setSourcePresetForm((f) => ({ ...f, maxArticlesPerSource: Number(e.target.value) || 1 }))}
                    className='h-7 text-xs'
                  />
                </div>
                <div className='space-y-1'>
                  <span className='text-xs text-muted-foreground'>Crawl depth</span>
                  <Input
                    type='number'
                    value={sourcePresetForm.crawlDepth}
                    min={0}
                    max={2}
                    onChange={(e) => {
                      const parsed = Number(e.target.value);
                      setSourcePresetForm((f) => ({
                        ...f,
                        crawlDepth: Number.isFinite(parsed)
                          ? Math.max(0, Math.min(2, Math.floor(parsed)))
                          : 0,
                      }));
                    }}
                    className='h-7 text-xs'
                    aria-label='Crawl depth'
                  />
                </div>
                <div className='flex flex-col gap-2 pt-4'>
                  <label className='flex items-center gap-2 text-xs text-muted-foreground cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={sourcePresetForm.obeyRobotsTxt}
                      onChange={(e) => setSourcePresetForm((f) => ({ ...f, obeyRobotsTxt: e.target.checked }))}
                    />
                    Obey robots.txt
                  </label>
                  <label className='flex items-center gap-2 text-xs text-muted-foreground cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={sourcePresetForm.enabled}
                      onChange={(e) => setSourcePresetForm((f) => ({ ...f, enabled: e.target.checked }))}
                    />
                    Enabled
                  </label>
                </div>
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Include patterns (one per line, optional)
                </label>
                <Textarea
                  value={sourcePresetForm.includePatterns}
                  onChange={(e) => setSourcePresetForm((f) => ({ ...f, includePatterns: e.target.value }))}
                  placeholder='/articles/\n/blog/'
                  rows={2}
                  className='font-mono text-xs'
                />
              </div>
              <div>
                <label className='mb-1 block text-xs text-muted-foreground'>
                  Exclude patterns (one per line, optional)
                </label>
                <Textarea
                  value={sourcePresetForm.excludePatterns}
                  onChange={(e) => setSourcePresetForm((f) => ({ ...f, excludePatterns: e.target.value }))}
                  placeholder='/tag/\n/author/'
                  rows={2}
                  className='font-mono text-xs'
                />
              </div>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                <div>
                  <label className='mb-1 block text-xs text-muted-foreground'>
                    Playwright scripter
                  </label>
                  <select
                    value={sourcePresetForm.playwrightScripterId}
                    onChange={(e) => setSourcePresetForm((f) => ({
                      ...f,
                      playwrightScripterId: e.target.value,
                    }))}
                    className='h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground'
                    aria-label='Playwright scripter'
                  >
                    <option value=''>
                      {playwrightScriptersLoading ? 'Loading scripters…' : 'Generic scraper only'}
                    </option>
                    {playwrightScripters.map((scripter) => (
                      <option key={scripter.id} value={scripter.id}>
                        {scripter.id} · {scripter.siteHost}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='mb-1 block text-xs text-muted-foreground'>
                    Scripter mode
                  </label>
                  <select
                    value={sourcePresetForm.playwrightScripterMode}
                    onChange={(e) => setSourcePresetForm((f) => ({
                      ...f,
                      playwrightScripterMode: e.target.value === 'replace' ? 'replace' : 'assist',
                    }))}
                    disabled={!sourcePresetForm.playwrightScripterId}
                    className='h-8 w-full rounded border border-border bg-background px-2 text-xs text-foreground disabled:opacity-60'
                    aria-label='Playwright scripter mode'
                  >
                    <option value='assist'>Assist generic scrape</option>
                    <option value='replace'>Replace generic discovery</option>
                  </select>
                </div>
              </div>
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  onClick={() => { void handleSaveSourcePreset(); }}
                  disabled={!sourcePresetForm.name.trim() || splitLines(sourcePresetForm.urls).length === 0}
                >
                  {sourcePresetForm.id ? 'Update' : 'Save preset'}
                </Button>
                {sourcePresetForm.id && (
                  <Button size='sm' variant='ghost' onClick={handleCancelSourcePresetEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </KangurAdminCard>
        </div>
      )}

      {/* ── Prompt Presets ────────────────────────────────────────────────── */}
      {tab === 'prompt-presets' && (
        <div className='grid gap-6 lg:grid-cols-[1fr_380px]'>
          <div className='space-y-3'>
            {promptPresetsLoading && promptPresets.length === 0 && (
              <div className='py-6 text-center text-sm text-muted-foreground'>Loading…</div>
            )}
            {!promptPresetsLoading && promptPresets.length === 0 && (
              <div className='py-6 text-center text-sm text-muted-foreground'>No prompt presets yet.</div>
            )}
            {promptPresets.map((preset) => (
              <KangurAdminCard key={preset.id}>
                <div className='flex items-start justify-between gap-3'>
                  <div className='min-w-0'>
                    <div className='flex items-center gap-2'>
                      <p className='font-medium text-sm text-foreground'>{preset.name}</p>
                      {preset.isDefault && (
                        <span className='rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary'>
                          Default
                        </span>
                      )}
                    </div>
                    <p className='mt-1 line-clamp-3 text-xs text-muted-foreground'>{preset.prompt}</p>
                  </div>
                  <div className='flex shrink-0 flex-wrap justify-end gap-1'>
                    {!preset.isDefault && (
                      <Button
                        size='sm' variant='ghost'
                        onClick={() => { void handleSetDefaultPromptPreset(preset); }}
                        className='text-xs'
                      >
                        Set default
                      </Button>
                    )}
                    <Button size='sm' variant='outline' onClick={() => handleEditPromptPreset(preset)}>
                      Edit
                    </Button>
                    <Button
                      size='sm' variant='ghost'
                      onClick={() => { void handleDeletePromptPreset(preset.id); }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </KangurAdminCard>
            ))}
          </div>

          <KangurAdminCard>
            <p className='mb-3 text-sm font-semibold text-foreground'>
              {editingPromptId ? 'Edit prompt preset' : 'New prompt preset'}
            </p>
            <div className='space-y-3'>
              <Input
                value={promptPresetName}
                onChange={(e) => setPromptPresetName(e.target.value)}
                placeholder='Preset name'
                className='h-8 text-xs'
              />
              <Textarea
                value={promptPresetText}
                onChange={(e) => setPromptPresetText(e.target.value)}
                placeholder='Write your aggregation prompt here…'
                rows={8}
                className='text-xs'
              />
              <div className='flex gap-2'>
                <Button
                  size='sm'
                  onClick={() => { void handleSavePromptPreset(); }}
                  disabled={!promptPresetName.trim() || !promptPresetText.trim()}
                >
                  {editingPromptId ? 'Update' : 'Save preset'}
                </Button>
                {editingPromptId && (
                  <Button size='sm' variant='ghost' onClick={() => {
                    setEditingPromptId(null);
                    setPromptPresetName('');
                    setPromptPresetText('');
                  }}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </KangurAdminCard>
        </div>
      )}

      {/* ── Scrape Runs ───────────────────────────────────────────────────── */}
      {tab === 'scrape-runs' && (
        <div className='space-y-3'>
          <div className='flex justify-end'>
            <Button
              size='sm'
              variant='ghost'
              disabled={scrapeRunsLoading}
              onClick={() => void loadScrapeRuns().catch(() => undefined)}
            >
              ↺ Refresh
            </Button>
          </div>
          {scrapeRunsLoading && scrapeRuns.length === 0 && (
            <div className='py-6 text-center text-sm text-muted-foreground'>Loading…</div>
          )}
          {!scrapeRunsLoading && scrapeRuns.length === 0 && (
            <div className='py-6 text-center text-sm text-muted-foreground'>No scrape runs yet.</div>
          )}
          <div className='rounded-md border border-border'>
            {scrapeRuns.map((run) => (
              <div key={run.id} className='border-b border-border/40 last:border-b-0'>
                <button
                  className='w-full px-4 py-3 text-left hover:bg-muted/30'
                  onClick={() => setExpandedRunId(expandedRunId === run.id ? null : run.id)}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className={`text-xs font-semibold ${statusColor(run.status)}`}>
                          {run.status}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          {run.totalArticleCount} article{run.totalArticleCount === 1 ? '' : 's'}
                        </span>
                        {run.visitedUrls.length > 0 && (
                          <span className='text-xs text-muted-foreground'>
                            · {run.visitedUrls.length} URL{run.visitedUrls.length === 1 ? '' : 's'} visited
                          </span>
                        )}
                        {run.warnings.length > 0 && (
                          <span className='text-xs text-amber-600 dark:text-amber-400'>
                            · {run.warnings.length} warning{run.warnings.length === 1 ? '' : 's'}
                          </span>
                        )}
                        {run.playwrightScripterIds.length > 0 && (
                          <span className='text-xs text-muted-foreground'>
                            · {run.playwrightScripterIds.length} scripter{run.playwrightScripterIds.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      {run.message && (
                        <p className='mt-1 text-xs text-muted-foreground'>{run.message}</p>
                      )}
                      {run.error && (
                        <p className='mt-1 text-xs text-destructive'>{run.error}</p>
                      )}
                    </div>
                    <div className='shrink-0 text-right text-xs text-muted-foreground'>
                      <div>{formatDate(run.startedAt)}</div>
                      {run.finishedAt && (
                        <div>→ {formatDate(run.finishedAt)}</div>
                      )}
                    </div>
                  </div>
                </button>
                {expandedRunId === run.id && (
                  <div className='border-t border-border/30 bg-muted/20 px-4 py-3 space-y-3'>
                    {run.warnings.length > 0 && (
                      <div>
                        <p className='mb-1 text-xs font-medium text-amber-600 dark:text-amber-400'>
                          Warnings ({run.warnings.length})
                        </p>
                        <ul className='max-h-32 overflow-y-auto space-y-0.5'>
                          {run.warnings.map((w, i) => (
                            <li key={i} className='text-xs text-muted-foreground'>
                              {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {run.visitedUrls.length > 0 && (
                      <div>
                        <p className='mb-1 text-xs font-medium text-muted-foreground'>
                          Visited URLs ({run.visitedUrls.length})
                        </p>
                        <ul className='max-h-48 overflow-y-auto space-y-0.5'>
                          {run.visitedUrls.map((url) => (
                            <li key={url} className='truncate text-xs'>
                              <a
                                href={url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-primary hover:underline'
                              >
                                {url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {run.scripterDiagnostics.length > 0 && (
                      <div>
                        <p className='mb-1 text-xs font-medium text-muted-foreground'>
                          Playwright scripter diagnostics
                        </p>
                        <ul className='space-y-1'>
                          {run.scripterDiagnostics.map((diagnostic) => (
                            <li
                              key={`${diagnostic.sourceUrl}-${diagnostic.scripterId ?? 'generic'}`}
                              className='rounded border border-border/40 px-2 py-1 text-xs text-muted-foreground'
                            >
                              <span className='font-mono text-foreground'>
                                {diagnostic.scripterId ?? 'unresolved'}
                              </span>
                              {' '}· {diagnostic.rawRecordCount} raw · {diagnostic.candidateCount} candidates · {diagnostic.articleCount} direct
                              {diagnostic.errors.length > 0 && (
                                <span className='text-destructive'>
                                  {' '}· {diagnostic.errors.length} error{diagnostic.errors.length === 1 ? '' : 's'}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {run.sourcePresetIds.length > 0 && (
                      <div>
                        <p className='mb-1 text-xs font-medium text-muted-foreground'>Source presets</p>
                        <ul className='space-y-0.5'>
                          {run.sourcePresetIds.map((id) => {
                            const preset = sourcePresets.find((p) => p.id === id);
                            return (
                              <li key={id} className='text-xs text-muted-foreground'>
                                {preset ? preset.name : id}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {run.customUrls.length > 0 && (
                      <div>
                        <p className='mb-1 text-xs font-medium text-muted-foreground'>Custom URLs</p>
                        <ul className='space-y-0.5'>
                          {run.customUrls.map((url) => (
                            <li key={url} className='truncate text-xs text-muted-foreground'>{url}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {run.totalArticleCount > 0 && (
                      <Button
                        size='sm'
                        variant='outline'
                        className='w-full text-xs'
                        onClick={() => handleViewRunArticles(run.id)}
                      >
                        View {run.totalArticleCount} article{run.totalArticleCount === 1 ? '' : 's'} from this run
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Run Scrape ────────────────────────────────────────────────────── */}
      {tab === 'run-scrape' && (
        <div className='grid gap-6 lg:grid-cols-[1fr_340px]'>
          <div className='space-y-4'>
            {runScrapePresets.length > 0 && (
              <div>
                <p className='mb-2 text-xs font-medium text-muted-foreground'>Source presets</p>
                <div className='grid gap-2 sm:grid-cols-2'>
                  {runScrapePresets.map((preset) => (
                    <label
                      key={preset.id}
                      className='flex items-start gap-2 rounded-md border border-border/50 px-3 py-2 cursor-pointer hover:bg-muted/30'
                    >
                      <input
                        type='checkbox'
                        checked={runScrapeSelectedIds.includes(preset.id)}
                        onChange={() => handleToggleRunScrapePreset(preset.id)}
                        disabled={isScraping || !preset.enabled}
                        className='mt-0.5'
                      />
                      <span className='min-w-0'>
                        <span className='block truncate text-xs font-medium text-foreground'>
                          {preset.name}
                          {!preset.enabled && (
                            <span className='ml-1 text-muted-foreground'>(disabled)</span>
                          )}
                        </span>
                        <span className='block truncate text-xs text-muted-foreground'>
                          {preset.urls.length} URL{preset.urls.length === 1 ? '' : 's'} · max {preset.maxArticlesPerSource} · depth {preset.crawlDepth}
                          {preset.playwrightScripterId && ` · scripter ${preset.playwrightScripterMode}`}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className='mb-1 text-xs font-medium text-muted-foreground'>Custom URLs (one per line)</p>
              <Textarea
                value={runScrapeCustomUrls}
                onChange={(e) => setRunScrapeCustomUrls(e.target.value)}
                placeholder='https://example.com/news'
                rows={4}
                disabled={isScraping}
                className='font-mono text-xs'
              />
            </div>

            <div className='flex flex-wrap items-center gap-4'>
              <label className='flex items-center gap-2 text-xs text-muted-foreground cursor-pointer'>
                <input
                  type='checkbox'
                  checked={runScrapeObeyRobots}
                  onChange={(e) => setRunScrapeObeyRobots(e.target.checked)}
                  disabled={isScraping}
                />
                Obey robots.txt
              </label>
              <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                <span>Max articles/source</span>
                <Input
                  type='number'
                  value={runScrapeMaxArticles}
                  min={1}
                  max={50}
                  onChange={(e) => setRunScrapeMaxArticles(Number(e.target.value) || 1)}
                  disabled={isScraping}
                  className='h-7 w-16 text-xs'
                />
              </div>
              <Button
                onClick={() => { void handleRunScrape(); }}
                disabled={isScraping || !canRunScrape}
              >
                {isScraping ? 'Scraping…' : 'Run scrape'}
              </Button>
            </div>

            {scrapeError && (
              <div className='rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
                {scrapeError}
              </div>
            )}
          </div>

          <div className='space-y-4'>
            {scrapeResult && (
              <KangurAdminCard>
                <p className='mb-2 text-sm font-semibold text-foreground'>Scrape result</p>
                <div className='space-y-1 text-xs text-muted-foreground'>
                  <div>
                    Status:{' '}
                    <span className={statusColor(scrapeResult.run.status)}>
                      {scrapeResult.run.status}
                    </span>
                  </div>
                  <div>Articles: {scrapeResult.articles.length}</div>
                  <div>URLs visited: {scrapeResult.run.visitedUrls.length}</div>
                  {scrapeResult.run.message && <div>{scrapeResult.run.message}</div>}
                  {scrapeResult.run.warnings.length > 0 && (
                    <div className='text-amber-600 dark:text-amber-400'>
                      {scrapeResult.run.warnings.length} warning{scrapeResult.run.warnings.length === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
                {scrapeResult.articles.length > 0 && (
                  <div className='mt-3 max-h-80 overflow-y-auto space-y-2'>
                    {scrapeResult.articles.map((article) => (
                      <div key={article.id} className='rounded border border-border/40 px-2 py-1.5'>
                        <p className='truncate text-xs font-medium text-foreground'>
                          {article.title || '(untitled)'}
                        </p>
                        <p className='truncate text-xs text-muted-foreground'>{article.resolvedUrl}</p>
                        <p className='text-xs text-muted-foreground'>{article.wordCount} words</p>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  size='sm'
                  variant='outline'
                  className='mt-3 w-full'
                  onClick={() => {
                    setTab('articles');
                    setArticlesPresetFilter('');
                    setArticlesScrapeRunFilter('');
                    void loadArticles(0, '').catch(() => undefined);
                  }}
                >
                  View in Articles tab
                </Button>
              </KangurAdminCard>
            )}

            {!scrapeResult && !isScraping && (
              <div className='rounded-md border border-border/40 p-6 text-center text-sm text-muted-foreground'>
                Select presets or add custom URLs, then run the scrape.
              </div>
            )}

            {isScraping && (
              <div className='rounded-md border border-border/40 p-6 text-center text-sm text-muted-foreground'>
                Scraping in progress… This may take a few minutes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
