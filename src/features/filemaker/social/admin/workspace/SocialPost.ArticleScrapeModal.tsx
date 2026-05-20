'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  type SocialArticleScrapeResponse,
  type SocialArticleSourcePreset,
} from '@/shared/contracts/social-article-aggregator';
import { api } from '@/shared/lib/api-client';
import {
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS,
} from '@/shared/lib/browser-execution';
import { AppModal } from '@/shared/ui/app-modal';
import { Badge, Button, Input, Textarea } from '@/shared/ui/primitives.public';
import { ToggleRow } from '@/shared/ui/forms-and-actions.public';

import { useArticleScrapeBrowserModeSetting } from './SocialPost.ArticleScrapeModal.browser-mode';
import { splitLooseUrls } from './SocialPost.ArticleAggregatorPanel.utils';

const SCRAPE_TIMEOUT_MS = 260_000;

const STEP_LABELS: Record<string, string> = {
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserPreparation]: 'Browser preparation',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserOpen]: 'Browser open',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.inputValidate]: 'Validate inputs',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.discoverArticles]: 'Discover articles',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.extractArticles]: 'Extract articles',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.finalize]: 'Finalize & persist',
  [SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserClose]: 'Browser close',
};

const ORDERED_STEPS = [
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserPreparation,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserOpen,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.inputValidate,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.discoverArticles,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.extractArticles,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.finalize,
  SOCIAL_ARTICLE_AGGREGATOR_SCRAPE_RUNTIME_STEPS.browserClose,
];

export type SocialArticleScrapeModalProps = {
  open: boolean;
  onClose: () => void;
  onCompleted: (response: SocialArticleScrapeResponse) => void;
  onScrapeStart?: () => void;
  onScrapeEnd?: () => void;
  sourcePresets: SocialArticleSourcePreset[];
  selectedPresetIds: string[];
  onSelectedPresetIdsChange: (ids: string[]) => void;
  initialCustomUrls?: string;
  initialMaxArticlesPerSource?: number;
  initialObeyRobotsTxt?: boolean;
};

export function SocialArticleScrapeModal({
  open,
  onClose,
  onCompleted,
  onScrapeStart,
  onScrapeEnd,
  sourcePresets,
  selectedPresetIds,
  onSelectedPresetIdsChange,
  initialCustomUrls = '',
  initialMaxArticlesPerSource = 10,
  initialObeyRobotsTxt = true,
}: SocialArticleScrapeModalProps): React.JSX.Element {
  const [customUrls, setCustomUrls] = useState(initialCustomUrls);
  const [maxArticlesPerSource, setMaxArticlesPerSource] = useState(initialMaxArticlesPerSource);
  const [obeyRobotsTxt, setObeyRobotsTxt] = useState(initialObeyRobotsTxt);

  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessages, setScrapeMessages] = useState<string[]>([]);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapeResult, setScrapeResult] = useState<SocialArticleScrapeResponse | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const browserMode = useArticleScrapeBrowserModeSetting(open);

  useEffect(() => {
    if (open) {
      setCustomUrls(initialCustomUrls);
      setMaxArticlesPerSource(initialMaxArticlesPerSource);
      setObeyRobotsTxt(initialObeyRobotsTxt);
      setScrapeMessages([]);
      setScrapeError(null);
      setScrapeResult(null);
    }
  }, [open, initialCustomUrls, initialMaxArticlesPerSource, initialObeyRobotsTxt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [scrapeMessages]);

  const canScrape =
    !isScraping &&
    (selectedPresetIds.length > 0 || splitLooseUrls(customUrls).length > 0);

  const handleTogglePreset = useCallback(
    (presetId: string): void => {
      onSelectedPresetIdsChange(
        selectedPresetIds.includes(presetId)
          ? selectedPresetIds.filter((id) => id !== presetId)
          : [...selectedPresetIds, presetId]
      );
    },
    [onSelectedPresetIdsChange, selectedPresetIds]
  );

  const addMessage = useCallback((message: string): void => {
    setScrapeMessages((prev) => [...prev.slice(-49), message]);
  }, []);

  const handleScrape = useCallback(async (): Promise<void> => {
    setScrapeError(null);
    setScrapeResult(null);
    setScrapeMessages([]);
    setIsScraping(true);

    addMessage('Saving browser mode settings…');
    try {
      await browserMode.persist();
    } catch {
      // Non-fatal — continue with current runtime setting
    }

    addMessage('Starting article scrape…');
    onScrapeStart?.();

    try {
      const response = await api.post<SocialArticleScrapeResponse>(
        '/api/filemaker/social-article-aggregator/scrape',
        {
          customUrls: splitLooseUrls(customUrls),
          maxArticlesPerSource,
          obeyRobotsTxt,
          sourcePresetIds: selectedPresetIds,
        },
        { timeout: SCRAPE_TIMEOUT_MS }
      );

      setScrapeResult(response);

      const { run } = response;
      addMessage(
        run.status === 'completed'
          ? `Scrape complete — ${response.articles.length} article${response.articles.length === 1 ? '' : 's'} found.`
          : run.message || 'Scrape finished.'
      );

      if (run.warnings.length > 0) {
        run.warnings.forEach((w) => addMessage(`Warning: ${w}`));
      }

      if (run.visitedUrls.length > 0) {
        addMessage(`Visited ${run.visitedUrls.length} URL${run.visitedUrls.length === 1 ? '' : 's'}.`);
      }

      for (const diag of run.scripterDiagnostics) {
        if (diag.scripterId) {
          addMessage(
            `Scripter ${diag.scripterId}: ${diag.articleCount} article${diag.articleCount === 1 ? '' : 's'} from ${diag.sourceUrl}`
          );
        }
        for (const err of diag.errors) {
          addMessage(`Scripter error: ${err}`);
        }
      }

      onCompleted(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Article scrape failed.';
      setScrapeError(message);
      addMessage(`Error: ${message}`);
    } finally {
      setIsScraping(false);
      onScrapeEnd?.();
    }
  }, [addMessage, browserMode, customUrls, maxArticlesPerSource, obeyRobotsTxt, onCompleted, onScrapeEnd, onScrapeStart, selectedPresetIds]);

  const handleClose = useCallback((): void => {
    if (isScraping) return;
    onClose();
  }, [isScraping, onClose]);

  const selectedPresets = sourcePresets.filter((p) => selectedPresetIds.includes(p.id));

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title='Scrape articles'
      size='lg'
      lockClose={isScraping}
      closeOnOutside={!isScraping}
      closeOnEscape={!isScraping}
      footer={
        <div className='flex items-center justify-between gap-3'>
          <Button
            type='button'
            variant='ghost'
            onClick={handleClose}
            disabled={isScraping}
          >
            {scrapeResult !== null ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type='button'
            onClick={() => { void handleScrape(); }}
            disabled={!canScrape}
          >
            {isScraping ? 'Scraping…' : 'Start scrape'}
          </Button>
        </div>
      }
    >
      <div className='space-y-5'>

        {/* Action steps */}
        <div className='rounded-md border border-border/60 bg-muted/10 p-3'>
          <p className='mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Playwright sequencer steps
          </p>
          <div className='flex flex-wrap gap-2'>
            {ORDERED_STEPS.map((stepId, index) => (
              <div
                key={stepId}
                className='flex items-center gap-1.5 rounded border border-border/40 bg-background px-2 py-1 text-xs'
              >
                <span className='flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground'>
                  {index + 1}
                </span>
                <span className='text-foreground'>{STEP_LABELS[stepId] ?? stepId}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Browser mode */}
        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
          <ToggleRow
            label='Headless mode'
            description='Run browser without a visible window.'
            checked={browserMode.headless}
            onCheckedChange={browserMode.setHeadless}
            disabled={isScraping}
            loading={browserMode.isLoading || browserMode.isSaving}
            variant='switch'
            toggleOnRowClick
          >
            <div className='pt-1 text-[11px] font-medium text-foreground'>
              Current: {browserMode.headless ? 'Headless' : 'Headed'}
              {browserMode.hasUnsavedChanges && (
                <span className='ml-1 text-muted-foreground'>(unsaved)</span>
              )}
            </div>
          </ToggleRow>

          {browserMode.action !== null ? (
            <div className='rounded-md border border-border/40 bg-muted/10 p-2 text-xs text-muted-foreground'>
              <p className='font-medium text-foreground'>{browserMode.action.name}</p>
              {browserMode.action.isSeedFallback ? (
                <Badge variant='outline' className='mt-1'>Seed default</Badge>
              ) : (
                <Badge variant='success' className='mt-1'>Saved action</Badge>
              )}
              <p className='mt-1'>
                Steps: {browserMode.action.enabledStepCount}/{browserMode.action.totalStepCount}
              </p>
            </div>
          ) : null}
        </div>

        {/* Source presets */}
        {sourcePresets.length > 0 ? (
          <div>
            <p className='mb-2 text-xs font-semibold text-muted-foreground'>Source presets</p>
            <div className='grid gap-2 md:grid-cols-2'>
              {sourcePresets.map((preset) => (
                <label
                  key={preset.id}
                  className={[
                    'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2',
                    selectedPresetIds.includes(preset.id)
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/50',
                    !preset.enabled ? 'opacity-60' : '',
                  ].join(' ')}
                >
                  <input
                    type='checkbox'
                    checked={selectedPresetIds.includes(preset.id)}
                    onChange={() => handleTogglePreset(preset.id)}
                    disabled={isScraping || !preset.enabled}
                    className='mt-0.5'
                    aria-label={`Select source preset ${preset.name}`}
                  />
                  <span className='min-w-0'>
                    <span className='flex items-center gap-1 text-xs font-medium text-foreground'>
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
                      {preset.playwrightScripterId &&
                        ` · ${preset.playwrightScripterMode}: ${preset.playwrightScripterId}`}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {/* Custom URLs */}
        <div>
          <label className='mb-1 block text-xs font-semibold text-muted-foreground'>
            Custom article source URLs
          </label>
          <Textarea
            value={customUrls}
            onChange={(event) => setCustomUrls(event.target.value)}
            placeholder={'https://example.com/news\nhttps://blog.example.com'}
            rows={3}
            disabled={isScraping}
            className='font-mono text-xs'
            aria-label='Custom article source URLs'
          />
        </div>

        {/* Scrape options */}
        <div className='flex flex-wrap items-center gap-4'>
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
            <span>Max articles per source</span>
            <Input
              type='number'
              value={maxArticlesPerSource}
              min={1}
              max={50}
              onChange={(event) =>
                setMaxArticlesPerSource(Number(event.target.value) || 1)
              }
              disabled={isScraping}
              className='h-8 w-20 text-xs'
              aria-label='Maximum articles per source'
            />
          </div>
        </div>

        {/* Summary badge */}
        {(selectedPresets.length > 0 || splitLooseUrls(customUrls).length > 0) && (
          <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
            {selectedPresets.length > 0 && (
              <Badge variant='secondary'>
                {selectedPresets.length} preset{selectedPresets.length === 1 ? '' : 's'} selected
              </Badge>
            )}
            {splitLooseUrls(customUrls).length > 0 && (
              <Badge variant='secondary'>
                {splitLooseUrls(customUrls).length} custom URL{splitLooseUrls(customUrls).length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
        )}

        {/* Live progress */}
        {(isScraping || scrapeMessages.length > 0) && (
          <div className='rounded-md border border-border/60 bg-muted/10'>
            <div className='flex items-center justify-between border-b border-border/40 px-3 py-2'>
              <span className='text-xs font-semibold'>
                {isScraping ? 'Scraping…' : scrapeResult !== null ? 'Scrape complete' : 'Scrape log'}
              </span>
              {scrapeResult !== null && (
                <Badge variant='success'>
                  {scrapeResult.articles.length} article{scrapeResult.articles.length === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
            <div className='max-h-40 overflow-y-auto px-3 py-2 space-y-1'>
              {scrapeMessages.map((msg, index) => (
                <p key={`msg-${index}`} className='text-xs text-muted-foreground'>
                  {msg}
                </p>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Error */}
        {scrapeError !== null && (
          <p className='rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive'>
            {scrapeError}
          </p>
        )}

        {/* Result: visited URLs */}
        {scrapeResult !== null && scrapeResult.run.visitedUrls.length > 0 && (
          <div>
            <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
              Visited URLs ({scrapeResult.run.visitedUrls.length})
            </p>
            <div className='max-h-36 space-y-1 overflow-auto pr-1'>
              {scrapeResult.run.visitedUrls.slice(0, 20).map((url) => (
                <a
                  key={url}
                  href={url}
                  target='_blank'
                  rel='noreferrer'
                  className='block break-all rounded border border-border/40 px-2 py-1 text-xs text-muted-foreground hover:text-foreground'
                >
                  {url}
                </a>
              ))}
              {scrapeResult.run.visitedUrls.length > 20 && (
                <p className='px-2 py-1 text-xs text-muted-foreground'>
                  …and {scrapeResult.run.visitedUrls.length - 20} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppModal>
  );
}
