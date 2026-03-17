'use client';

import { RefreshCw, Sparkles, Volume2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { resolveKangurLessonDocumentPages } from '@/features/kangur/lesson-documents';
import { buildInlineVttTrackSrc } from '@/features/kangur/tts/captions';
import { buildKangurLessonTtsEnvelopeSignature } from '@/features/kangur/tts/context-registry/instructions';
import {
  KANGUR_TTS_DEFAULT_VOICE,
  KANGUR_TTS_VOICE_OPTIONS,
  type KangurLessonTtsResponse,
  type KangurLessonTtsStatusResponse,
} from '@/features/kangur/tts/contracts';
import {
  buildKangurLessonDocumentNarrationScript,
  buildKangurLessonDocumentNarrationSignature,
  hasKangurLessonNarrationContent,
} from '@/features/kangur/tts/script';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import { buildContextRegistryConsumerEnvelope } from '@/shared/lib/ai-context-registry/page-context-shared';
import { api } from '@/shared/lib/api-client';
import { Badge } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';
import {
  withKangurClientError,
  withKangurClientErrorSync,
} from '@/features/kangur/observability/client';

import { validateKangurLessonPageDraft } from './content-creator-insights';
import { useLessonContentEditorContext } from './context/LessonContentEditorContext';

type RequestStatus = 'idle' | 'loading' | 'ready' | 'error';

const KANGUR_LESSON_NARRATION_PANEL_CONTEXT_ROOT_IDS = [
  'component:kangur-lesson-narration-panel',
  'action:kangur-lesson-tts',
] as const;

const formatDateTime = (value: string | null): string | null => {
  if (!value) return null;
  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.lesson-narration',
      action: 'format-date',
      description: 'Formats narration timestamps for the lesson narration panel.',
      context: { value },
    },
    () =>
      new Intl.DateTimeFormat('pl-PL', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value)),
    { fallback: value }
  );
};

const getLatestAudioCreatedAt = (response: KangurLessonTtsResponse | null): string | null => {
  if (response?.mode !== 'audio' || response.segments.length === 0) {
    return null;
  }

  return response.segments.reduce<string | null>(
    (latest, segment) => (!latest || segment.createdAt > latest ? segment.createdAt : latest),
    null
  );
};

export function KangurLessonNarrationPanel(): React.JSX.Element {
  const { lesson, document, onChange } = useLessonContentEditorContext();
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();
  const requestContextRegistry = useMemo(
    () =>
      pageContextRegistry
        ? buildContextRegistryConsumerEnvelope({
          refs: pageContextRegistry.refs,
          resolved: pageContextRegistry.resolved ?? null,
          rootNodeIds: [...KANGUR_LESSON_NARRATION_PANEL_CONTEXT_ROOT_IDS],
        })
        : null,
    [pageContextRegistry]
  );
  const narrationPanelSource = useMemo(
    () =>
      lesson
        ? {
          label: 'Kangur lesson narration panel',
          rootNodeIds: [...KANGUR_LESSON_NARRATION_PANEL_CONTEXT_ROOT_IDS],
        }
        : null,
    [lesson]
  );
  const contextRegistrySignature = useMemo(
    () => buildKangurLessonTtsEnvelopeSignature(requestContextRegistry),
    [requestContextRegistry]
  );
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [response, setResponse] = useState<KangurLessonTtsResponse | null>(null);
  const [cacheStatus, setCacheStatus] = useState<KangurLessonTtsStatusResponse | null>(null);
  const [isCheckingCache, setIsCheckingCache] = useState(false);

  useRegisterContextRegistryPageSource('kangur-lesson-narration-panel', narrationPanelSource);

  if (!lesson) {
    return <></>;
  }

  const voice = document.narration?.voice ?? KANGUR_TTS_DEFAULT_VOICE;
  const script = useMemo(
    () =>
      buildKangurLessonDocumentNarrationScript({
        lessonId: lesson.id,
        title: lesson.title,
        description: lesson.description ?? '',
        document,
      }),
    [document, lesson.description, lesson.id, lesson.title]
  );

  const hasScriptContent = hasKangurLessonNarrationContent(script);
  const pageNarrationReviews = useMemo(
    () =>
      resolveKangurLessonDocumentPages(document).map((page, index) => ({
        page,
        index,
        review: validateKangurLessonPageDraft(page),
      })),
    [document]
  );
  const coverage = useMemo(
    () =>
      pageNarrationReviews.reduce(
        (summary, item) => ({
          explicitOverrideCount:
            summary.explicitOverrideCount + item.review.narrationCoverage.explicitOverrideCount,
          visualBlockCount:
            summary.visualBlockCount + item.review.narrationCoverage.visualBlockCount,
          activityBlockCount:
            summary.activityBlockCount + item.review.narrationCoverage.activityBlockCount,
          visualBlocksNeedingDescriptions:
            summary.visualBlocksNeedingDescriptions +
            item.review.narrationCoverage.visualBlocksNeedingDescriptions,
          activityBlocksUsingDefaultNarration:
            summary.activityBlocksUsingDefaultNarration +
            item.review.narrationCoverage.activityBlocksUsingDefaultNarration,
        }),
        {
          explicitOverrideCount: 0,
          visualBlockCount: 0,
          activityBlockCount: 0,
          visualBlocksNeedingDescriptions: 0,
          activityBlocksUsingDefaultNarration: 0,
        }
      ),
    [pageNarrationReviews]
  );
  const coverageRecommendations = useMemo(() => {
    const recommendations: string[] = [];

    if (coverage.explicitOverrideCount === 0 && hasScriptContent) {
      recommendations.push('Narration is fully auto-derived from visible lesson content right now.');
    }
    if (coverage.visualBlocksNeedingDescriptions > 0) {
      recommendations.push(
        coverage.visualBlocksNeedingDescriptions === 1
          ? 'Add narration descriptions to 1 visual block so the illustration is explained aloud.'
          : `Add narration descriptions to ${coverage.visualBlocksNeedingDescriptions} visual blocks so the illustrations are explained aloud.`
      );
    }
    if (coverage.activityBlocksUsingDefaultNarration > 0) {
      recommendations.push(
        coverage.activityBlocksUsingDefaultNarration === 1
          ? '1 activity still uses generic default narration. Add a custom description if the task needs more guidance.'
          : `${coverage.activityBlocksUsingDefaultNarration} activities still use generic default narration. Add custom descriptions if the tasks need more guidance.`
      );
    }

    return recommendations;
  }, [coverage, hasScriptContent]);
  const narrationPreviewSignature = useMemo(
    () =>
      buildKangurLessonDocumentNarrationSignature({
        lessonId: lesson.id,
        title: lesson.title,
        description: lesson.description,
        document,
        voice,
        locale: document.narration?.locale,
      }),
    [document, lesson.description, lesson.id, lesson.title, voice]
  );
  const narrationPreviewIsFresh =
    !hasScriptContent ||
    !document.narration?.previewSourceSignature ||
    document.narration.previewSourceSignature === narrationPreviewSignature;
  const scriptKey = useMemo(
    () =>
      JSON.stringify({
        voice,
        locale: script.locale,
        lessonId: script.lessonId,
        contextRegistrySignature,
        segments: script.segments.map((segment) => segment.text),
      }),
    [contextRegistrySignature, script, voice]
  );
  const stampNarrationPreviewMetadata = React.useCallback(
    (previewedAt: string | null | undefined): void => {
      const nextPreviewedAt = previewedAt ?? document.narration?.lastPreviewedAt ?? new Date().toISOString();
      if (
        document.narration?.previewSourceSignature === narrationPreviewSignature &&
        document.narration?.lastPreviewedAt === nextPreviewedAt
      ) {
        return;
      }

      onChange({
        ...document,
        narration: {
          ...(document.narration ?? {}),
          voice,
          locale: document.narration?.locale ?? script.locale,
          previewSourceSignature: narrationPreviewSignature,
          lastPreviewedAt: nextPreviewedAt,
        },
      });
    },
    [document, narrationPreviewSignature, onChange, script.locale, voice]
  );

  useEffect(() => {
    setStatus('idle');
    setErrorMessage(null);
    setResponse(null);
    setCacheStatus(null);
  }, [scriptKey]);

  useEffect(() => {
    if (!hasScriptContent) {
      setIsCheckingCache(false);
      setCacheStatus(null);
      return;
    }

    let active = true;
    setIsCheckingCache(true);

    void api
      .post<KangurLessonTtsStatusResponse>(
        '/api/kangur/tts/status',
        {
          script,
          voice,
          ...(requestContextRegistry ? { contextRegistry: requestContextRegistry } : {}),
        },
        { logError: false }
      )
      .then((nextStatus) => {
        if (!active) return;
        setCacheStatus(nextStatus);
        if (nextStatus.state === 'ready') {
          setResponse({
            mode: 'audio',
            voice: nextStatus.voice,
            segments: nextStatus.segments,
          });
        }
      })
      .catch((error) => {
        void ErrorSystem.captureException(error);
        if (!active) return;
        setCacheStatus(null);
      })
      .finally(() => {
        if (!active) return;
        setIsCheckingCache(false);
      });

    return () => {
      active = false;
    };
  }, [hasScriptContent, requestContextRegistry, script, voice]);

  useEffect(() => {
    if (cacheStatus?.state !== 'ready' || !hasScriptContent) {
      return;
    }

    stampNarrationPreviewMetadata(cacheStatus.latestCreatedAt);
  }, [cacheStatus, hasScriptContent, stampNarrationPreviewMetadata]);

  const handleVoiceChange = (nextVoice: string): void => {
    const normalizedVoice = KANGUR_TTS_VOICE_OPTIONS.find(
      (option) => option.value === nextVoice
    )?.value;
    if (!normalizedVoice) return;

    onChange({
      ...document,
      narration: {
        ...(document.narration ?? {}),
        voice: normalizedVoice,
      },
    });
  };

  const handleLocaleChange = (nextLocale: string): void => {
    onChange({
      ...document,
      narration: {
        ...document.narration,
        locale: nextLocale,
      },
    });
  };

  const handlePreparePreview = async (forceRegenerate: boolean): Promise<void> => {
    if (!hasScriptContent) return;

    setStatus('loading');
    setErrorMessage(null);

    const nextResponse = await withKangurClientError(
      {
        source: 'kangur.admin.lesson-narration',
        action: 'prepare-preview',
        description: 'Generates a narration preview for the lesson.',
        context: { lessonId: lesson.id, forceRegenerate },
      },
      async () =>
        await api.post<KangurLessonTtsResponse>('/api/kangur/tts', {
          script,
          voice,
          forceRegenerate,
          ...(requestContextRegistry ? { contextRegistry: requestContextRegistry } : {}),
        }),
      {
        fallback: null,
        onError: (error) => {
          setStatus('error');
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to prepare lesson narration preview.'
          );
        },
      }
    );

    if (!nextResponse) {
      return;
    }

    setResponse(nextResponse);
    if (nextResponse.mode === 'audio') {
      const latestCreatedAt = nextResponse.segments.reduce<string | null>(
        (latest, segment) => (!latest || segment.createdAt > latest ? segment.createdAt : latest),
        null
      );
      setCacheStatus({
        state: 'ready',
        voice: nextResponse.voice,
        latestCreatedAt,
        message: 'Cached audio is available for this lesson draft.',
        segments: nextResponse.segments,
      });
      stampNarrationPreviewMetadata(latestCreatedAt);
    }
    setStatus('ready');
  };

  const latestAudioCreatedAt = formatDateTime(getLatestAudioCreatedAt(response));
  const lastPreviewedAt = formatDateTime(document.narration?.lastPreviewedAt ?? null);
  const totalCharacters = script.segments.reduce((sum, segment) => sum + segment.text.length, 0);
  const statusLabel =
    status === 'loading'
      ? 'Preparing audio preview...'
      : isCheckingCache
        ? 'Checking cached narration...'
        : status === 'error'
          ? 'Narration preview failed.'
          : hasScriptContent && !narrationPreviewIsFresh
            ? 'Narration preview needs refresh after recent lesson or voice changes.'
            : response?.mode === 'audio'
              ? 'Neural preview ready.'
              : cacheStatus?.state === 'tts_unavailable'
                ? 'Neural TTS is not configured for this workspace.'
                : cacheStatus?.state === 'missing'
                  ? 'Audio has not been generated for this lesson draft yet.'
                  : response?.mode === 'fallback'
                    ? 'Neural preview unavailable. Browser fallback would be used.'
                    : 'Review the narration script and generate audio when ready.';

  return (
    <section className={cn('rounded-2xl border border-border/60 bg-card/40 p-5 shadow-sm')}>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0'>
          <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground'>
            <Volume2 className='size-3.5' />
            Narration Preview
          </div>
          <h3 className='mt-3 text-lg font-semibold text-foreground'>Lesson voice script</h3>
          <p className='mt-1 text-sm text-muted-foreground'>{statusLabel}</p>
          <div className='mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground'>
            <span className='rounded-full border border-border/60 bg-background/70 px-2.5 py-1'>
              {script.segments.length} segment{script.segments.length === 1 ? '' : 's'}
            </span>
            <span className='rounded-full border border-border/60 bg-background/70 px-2.5 py-1'>
              {totalCharacters} characters
            </span>
            <span className='rounded-full border border-border/60 bg-background/70 px-2.5 py-1'>
              Locale: {script.locale}
            </span>
            {latestAudioCreatedAt ? (
              <span className='rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300'>
                Last built: {latestAudioCreatedAt}
              </span>
            ) : null}
            <span
              className={cn(
                'rounded-full border px-2.5 py-1',
                narrationPreviewIsFresh
                  ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-400/20 bg-amber-500/10 text-amber-200'
              )}
            >
              {narrationPreviewIsFresh ? 'Preview up to date' : 'Refresh needed'}
            </span>
            {lastPreviewedAt ? (
              <span className='rounded-full border border-border/60 bg-background/70 px-2.5 py-1'>
                Previewed: {lastPreviewedAt}
              </span>
            ) : null}
          </div>
        </div>

        <div className='flex w-full flex-col gap-3 rounded-2xl border border-border/60 bg-background/60 p-4 lg:max-w-sm'>
          <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
            <label className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
              Voice
              <select
                aria-label='Narration voice'
                value={voice}
                onChange={(event): void => handleVoiceChange(event.target.value)}
                className='mt-2 h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm font-normal tracking-normal text-foreground outline-none transition focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
              >
                {KANGUR_TTS_VOICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
              Locale
              <input
                aria-label='Narration locale'
                value={document.narration?.locale ?? ''}
                onChange={(event): void => handleLocaleChange(event.target.value)}
                placeholder='pl-PL'
                className='mt-2 h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm font-normal tracking-normal text-foreground outline-none transition focus:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
              />
            </label>
          </div>

          <div className='flex flex-wrap gap-2'>
            <button
              type='button'
              onClick={(): void => {
                void handlePreparePreview(false);
              }}
              disabled={!hasScriptContent || status === 'loading'}
              aria-label={
                response?.mode === 'audio' ? 'Refresh preview' : 'Generate audio preview'
              }
              className='inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
            >
              <Sparkles className='size-4' />
              {response?.mode === 'audio' ? 'Refresh preview' : 'Generate audio preview'}
            </button>
            <button
              type='button'
              onClick={(): void => {
                void handlePreparePreview(true);
              }}
              disabled={!hasScriptContent || status === 'loading'}
              aria-label='Regenerate audio'
              className='inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background disabled:cursor-not-allowed disabled:opacity-60'
            >
              <RefreshCw className={cn('size-4', status === 'loading' && 'animate-spin')} />
              Regenerate audio
            </button>
          </div>

          {!hasScriptContent ? (
            <div className='rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200'>
              Add lesson text or narration overrides to generate a preview.
            </div>
          ) : null}
          <div className='rounded-2xl border border-border/60 bg-card/30 px-3 py-3'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
              Narration coverage
            </div>
            <div className='mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground'>
              <span className='rounded-full border border-border/60 bg-background/80 px-2.5 py-1'>
                {coverage.explicitOverrideCount} explicit override
                {coverage.explicitOverrideCount === 1 ? '' : 's'}
              </span>
              <span className='rounded-full border border-border/60 bg-background/80 px-2.5 py-1'>
                {coverage.visualBlockCount} visual block{coverage.visualBlockCount === 1 ? '' : 's'}
              </span>
              <span className='rounded-full border border-border/60 bg-background/80 px-2.5 py-1'>
                {coverage.activityBlockCount} activit{coverage.activityBlockCount === 1 ? 'y' : 'ies'}
              </span>
            </div>
            {coverageRecommendations.length > 0 ? (
              <ul className='mt-3 space-y-1 text-xs leading-relaxed text-muted-foreground'>
                {coverageRecommendations.map((recommendation) => (
                  <li key={recommendation}>• {recommendation}</li>
                ))}
              </ul>
            ) : (
              <div className='mt-3 text-xs leading-relaxed text-emerald-300'>
                Narration overrides and descriptive content are in good shape for this draft.
              </div>
            )}
          </div>
          {errorMessage ? (
            <div className='rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'>
              {errorMessage}
            </div>
          ) : null}
          {!errorMessage && cacheStatus && cacheStatus.state !== 'ready' ? (
            <div className='rounded-2xl border border-border/60 bg-card/30 px-3 py-2 text-sm text-muted-foreground'>
              {cacheStatus.message}
            </div>
          ) : null}
          {response?.mode === 'fallback' ? (
            <div className='rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200'>
              {response.message}
            </div>
          ) : null}
        </div>
      </div>

      <div className='mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        <div className='rounded-2xl border border-border/60 bg-background/60 p-4 xl:col-span-2'>
          <div className='text-sm font-semibold text-foreground'>Page-by-page narration review</div>
          <div className='mt-1 text-xs text-muted-foreground'>
            Scan which lesson pages are ready for narration and which still need descriptions or better activity guidance.
          </div>
          <div className='mt-4 grid gap-3 md:grid-cols-2'>
            {pageNarrationReviews.map(({ page, index, review }) => {
              const pageLabel = page.title?.trim() || `Page ${index + 1}`;
              const sectionLabel = page.sectionTitle?.trim();
              const coverageState = review.narrationCoverage.state;

              return (
                <article
                  key={page.id}
                  className='rounded-2xl border border-border/60 bg-card/30 p-3'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div>
                      {sectionLabel ? (
                        <div className='text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                          {sectionLabel}
                        </div>
                      ) : null}
                      <div className='text-sm font-semibold text-foreground'>{pageLabel}</div>
                    </div>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] uppercase tracking-wide',
                        coverageState === 'ready'
                          ? 'border-sky-400/40 text-sky-300'
                          : coverageState === 'needs-review'
                            ? 'border-amber-400/40 text-amber-300'
                            : 'border-slate-500/40 text-slate-300'
                      )}
                    >
                      {review.narrationCoverage.summaryLabel}
                    </Badge>
                  </div>
                  <div className='mt-2 text-xs leading-relaxed text-muted-foreground'>
                    {review.narrationCoverage.detail}
                  </div>
                  <div className='mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground'>
                    <span className='rounded-full border border-border/60 bg-background/80 px-2.5 py-1'>
                      {review.blockCount} block{review.blockCount === 1 ? '' : 's'}
                    </span>
                    <span className='rounded-full border border-border/60 bg-background/80 px-2.5 py-1'>
                      {review.narrationCoverage.explicitOverrideCount} override
                      {review.narrationCoverage.explicitOverrideCount === 1 ? '' : 's'}
                    </span>
                    {review.narrationCoverage.visualBlockCount > 0 ? (
                      <span className='rounded-full border border-border/60 bg-background/80 px-2.5 py-1'>
                        {review.narrationCoverage.visualBlockCount} visual
                      </span>
                    ) : null}
                    {review.narrationCoverage.activityBlockCount > 0 ? (
                      <span className='rounded-full border border-border/60 bg-background/80 px-2.5 py-1'>
                        {review.narrationCoverage.activityBlockCount} activit
                        {review.narrationCoverage.activityBlockCount === 1 ? 'y' : 'ies'}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <div className='rounded-2xl border border-border/60 bg-background/60 p-4'>
          <div className='text-sm font-semibold text-foreground'>Narration script</div>
          <div className='mt-1 text-xs text-muted-foreground'>
            This is the exact spoken text generated from the current lesson draft.
          </div>
          <div className='mt-4 space-y-3'>
            {script.segments.length > 0 ? (
              script.segments.map((segment, index) => (
                <article
                  key={segment.id}
                  className='rounded-2xl border border-border/60 bg-card/30 p-3'
                >
                  <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                    Segment {index + 1}
                  </div>
                  <div className='mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground'>
                    {segment.text}
                  </div>
                </article>
              ))
            ) : (
              <div className='rounded-2xl border border-dashed border-border/60 bg-card/30 p-4 text-sm text-muted-foreground'>
                No readable lesson text detected yet.
              </div>
            )}
          </div>
        </div>

        <div className='rounded-2xl border border-border/60 bg-background/60 p-4'>
          <div className='text-sm font-semibold text-foreground'>Audio preview</div>
          <div className='mt-1 text-xs text-muted-foreground'>
            Generated audio uses the current draft and selected voice.
          </div>
          <div className='mt-4 space-y-3'>
            {response?.mode === 'audio' ? (
              response.segments.map((segment, index) => (
                <article
                  key={segment.id}
                  className='rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300'>
                      Audio segment {index + 1}
                    </div>
                    <div className='text-[11px] text-emerald-300/80'>
                      Built: {formatDateTime(segment.createdAt) ?? segment.createdAt}
                    </div>
                  </div>
                  <div className='mt-2 text-sm leading-6 text-foreground'>{segment.text}</div>
                  <audio
                    controls
                    preload='none'
                    src={segment.audioUrl}
                    className='mt-3 w-full'
                    aria-label={`Audio segment ${index + 1}`}
                  >
                    <track
                      default
                      kind='captions'
                      label={`Narration transcript ${index + 1}`}
                      src={buildInlineVttTrackSrc(segment.text)}
                      srcLang={script.locale}
                    />
                  </audio>
                </article>
              ))
            ) : (
              <div className='rounded-2xl border border-dashed border-border/60 bg-card/30 p-4 text-sm text-muted-foreground'>
                Generate audio preview to inspect the realistic narration output.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
