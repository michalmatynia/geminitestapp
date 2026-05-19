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
  obeyRobotsTxt: boolean;
  enabled: boolean;
  includePatterns: string;
  excludePatterns: string;
};

const emptySourcePresetForm = (): SourcePresetFormState => ({
  id: null,
  name: '',
  urls: '',
  maxArticlesPerSource: 10,
  obeyRobotsTxt: true,
  enabled: true,
  includePatterns: '',
  excludePatterns: '',
});

const presetToForm = (preset: SocialArticleSourcePreset): SourcePresetFormState => ({
  id: preset.id,
  name: preset.name,
  urls: joinLines(preset.urls),
  maxArticlesPerSource: preset.maxArticlesPerSource,
  obeyRobotsTxt: preset.obeyRobotsTxt,
  enabled: preset.enabled,
  includePatterns: joinLines(preset.includePatterns),
  excludePatterns: joinLines(preset.excludePatterns),
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
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [expandedArticleId, setExpandedArticleId] = useState<string | null>(null);
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);

  // ── Source presets tab ────────────────────────────────────────────────────
  const [sourcePresets, setSourcePresets] = useState<SocialArticleSourcePreset[]>([]);
  const [sourcePresetsLoading, setSourcePresetsLoading] = useState(false);
  const [sourcePresetForm, setSourcePresetForm] = useState<SourcePresetFormState>(emptySourcePresetForm());

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
  const loadArticles = useCallback(async (offset: number, search: string, scrapeRunId = ''): Promise<void> => {
    setArticlesLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
        ...(search ? { search } : {}),
        ...(scrapeRunId ? { scrapeRunId } : {}),
      });
      const result = await api.get<ArticleListResult>(
        `/api/filemaker/social-article-aggregator/articles?${params.toString()}`,
        { timeout: 60_000 }
      );
      setArticles(result.articles);
      setArticlesTotal(result.total);
      setArticlesOffset(offset);
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

  useEffect(() => {
    if (tab === 'articles') void loadArticles(0, articlesSearch, articlesScrapeRunFilter).catch(() => undefined);
    if (tab === 'source-presets') void loadSourcePresets().catch(() => undefined);
    if (tab === 'prompt-presets') void loadPromptPresets().catch(() => undefined);
    if (tab === 'scrape-runs') {
      void loadScrapeRuns().catch(() => undefined);
      void loadSourcePresets().catch(() => undefined);
    }
    if (tab === 'run-scrape') void loadRunScrapePresets().catch(() => undefined);
  }, [tab, loadArticles, loadSourcePresets, loadPromptPresets, loadScrapeRuns, loadRunScrapePresets]);

  // ── Articles handlers ─────────────────────────────────────────────────────
  const handleArticleSearch = useCallback((): void => {
    setArticlesSearch(articlesSearchInput);
    void loadArticles(0, articlesSearchInput, articlesScrapeRunFilter).catch(() => undefined);
  }, [articlesSearchInput, articlesScrapeRunFilter, loadArticles]);

  const handleViewRunArticles = useCallback((runId: string): void => {
    setArticlesScrapeRunFilter(runId);
    setArticlesSearch('');
    setArticlesSearchInput('');
    setTab('articles');
    void loadArticles(0, '', runId).catch(() => undefined);
  }, [loadArticles]);

  const handleClearRunFilter = useCallback((): void => {
    setArticlesScrapeRunFilter('');
    void loadArticles(0, articlesSearch, '').catch(() => undefined);
  }, [articlesSearch, loadArticles]);

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

  // ── Source preset handlers ────────────────────────────────────────────────
  const handleSaveSourcePreset = useCallback(async (): Promise<void> => {
    const urls = splitLines(sourcePresetForm.urls);
    if (!sourcePresetForm.name.trim() || urls.length === 0) return;
    await api.post('/api/filemaker/social-article-aggregator/source-presets', {
      preset: {
        ...(sourcePresetForm.id ? { id: sourcePresetForm.id } : {}),
        enabled: sourcePresetForm.enabled,
        excludePatterns: splitLines(sourcePresetForm.excludePatterns),
        includePatterns: splitLines(sourcePresetForm.includePatterns),
        maxArticlesPerSource: sourcePresetForm.maxArticlesPerSource,
        name: sourcePresetForm.name.trim(),
        obeyRobotsTxt: sourcePresetForm.obeyRobotsTxt,
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
        excludePatterns: preset.excludePatterns,
        id: preset.id,
        includePatterns: preset.includePatterns,
        maxArticlesPerSource: preset.maxArticlesPerSource,
        name: preset.name,
        obeyRobotsTxt: preset.obeyRobotsTxt,
        urls: preset.urls,
      },
    }, { timeout: 60_000 });
    await loadSourcePresets();
    toast(preset.enabled ? 'Source preset disabled' : 'Source preset enabled', { variant: 'success' });
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
      <div>
        <h1 className='text-xl font-bold text-foreground'>Article Aggregator</h1>
        <p className='mt-1 text-sm text-muted-foreground'>
          Manage scraped articles, source presets, prompt presets, and scrape run history.
        </p>
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
              onClick={() => void loadArticles(articlesOffset, articlesSearch, articlesScrapeRunFilter).catch(() => undefined)}
              title='Refresh'
            >
              ↺
            </Button>
            {articlesSearch && (
              <Button size='sm' variant='ghost' onClick={() => {
                setArticlesSearchInput('');
                setArticlesSearch('');
                void loadArticles(0, '', articlesScrapeRunFilter).catch(() => undefined);
              }}>
                Clear search
              </Button>
            )}
          </div>

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

          <div className='text-xs text-muted-foreground'>
            {articlesTotal} article{articlesTotal === 1 ? '' : 's'} total
            {articlesSearch ? ` matching "${articlesSearch}"` : ''}
            {articlesScrapeRunFilter ? ' (run filter active)' : ''}
          </div>

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
                  <button
                    className='min-w-0 flex-1 text-left'
                    onClick={() => setExpandedArticleId(expandedArticleId === article.id ? null : article.id)}
                  >
                    <p className='truncate text-sm font-medium text-foreground'>
                      {article.title || '(untitled)'}
                    </p>
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
                      disabled={deletingArticleId === article.id}
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
                onClick={() => void loadArticles(Math.max(0, articlesOffset - PAGE_SIZE), articlesSearch, articlesScrapeRunFilter).catch(() => undefined)}
              >
                Previous
              </Button>
              <span className='text-xs text-muted-foreground'>
                {articlesOffset + 1}–{Math.min(articlesOffset + PAGE_SIZE, articlesTotal)} of {articlesTotal}
              </span>
              <Button
                size='sm' variant='outline'
                disabled={articlesOffset + PAGE_SIZE >= articlesTotal || articlesLoading}
                onClick={() => void loadArticles(articlesOffset + PAGE_SIZE, articlesSearch, articlesScrapeRunFilter).catch(() => undefined)}
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
            {sourcePresetsLoading && sourcePresets.length === 0 && (
              <div className='py-6 text-center text-sm text-muted-foreground'>Loading…</div>
            )}
            {!sourcePresetsLoading && sourcePresets.length === 0 && (
              <div className='py-6 text-center text-sm text-muted-foreground'>No source presets yet.</div>
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
                      {preset.includePatterns.length > 0 && ` · ${preset.includePatterns.length} include`}
                      {preset.excludePatterns.length > 0 && ` · ${preset.excludePatterns.length} exclude`}
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
                          {preset.urls.length} URL{preset.urls.length === 1 ? '' : 's'} · max {preset.maxArticlesPerSource}
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
