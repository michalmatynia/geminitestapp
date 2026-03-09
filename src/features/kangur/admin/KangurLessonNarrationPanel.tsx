'use client';

import { RefreshCw, Sparkles, Volume2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  useOptionalContextRegistryPageEnvelope,
  useRegisterContextRegistryPageSource,
} from '@/features/ai/ai-context-registry/context/page-context';
import {
  KANGUR_TTS_DEFAULT_VOICE,
  KANGUR_TTS_VOICE_OPTIONS,
  type KangurLessonTtsResponse,
  type KangurLessonTtsStatusResponse,
} from '@/features/kangur/tts/contracts';
import { buildInlineVttTrackSrc } from '@/features/kangur/tts/captions';
import {
  buildKangurLessonDocumentNarrationScript,
  hasKangurLessonNarrationContent,
} from '@/features/kangur/tts/script';
import { api } from '@/shared/lib/api-client';
import { cn } from '@/shared/utils';
import { useLessonContentEditorContext } from './context/LessonContentEditorContext';

type RequestStatus = 'idle' | 'loading' | 'ready' | 'error';

const formatDateTime = (value: string | null): string | null => {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat('pl-PL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
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
  const narrationPanelSource = useMemo(
    () =>
      lesson
        ? {
            label: 'Kangur lesson narration panel',
            rootNodeIds: ['component:kangur-lesson-narration-panel', 'action:kangur-lesson-tts'],
          }
        : null,
    [lesson]
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
  const scriptKey = useMemo(
    () =>
      JSON.stringify({
        voice,
        locale: script.locale,
        lessonId: script.lessonId,
        segments: script.segments.map((segment) => segment.text),
      }),
    [script, voice]
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
          ...(pageContextRegistry ? { contextRegistry: pageContextRegistry } : {}),
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
      .catch(() => {
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
  }, [hasScriptContent, pageContextRegistry, script, voice]);

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

    try {
      const nextResponse = await api.post<KangurLessonTtsResponse>('/api/kangur/tts', {
        script,
        voice,
        forceRegenerate,
        ...(pageContextRegistry ? { contextRegistry: pageContextRegistry } : {}),
      });
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
      }
      setStatus('ready');
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to prepare lesson narration preview.'
      );
    }
  };

  const latestAudioCreatedAt = formatDateTime(getLatestAudioCreatedAt(response));
  const totalCharacters = script.segments.reduce((sum, segment) => sum + segment.text.length, 0);
  const statusLabel =
    status === 'loading'
      ? 'Preparing audio preview...'
      : isCheckingCache
        ? 'Checking cached narration...'
        : status === 'error'
          ? 'Narration preview failed.'
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
    <section
      className={cn(
        'rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-sky-50 p-5 shadow-sm'
      )}
    >
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0'>
          <div className='inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700'>
            <Volume2 className='size-3.5' />
            Narration Preview
          </div>
          <h3 className='mt-3 text-lg font-semibold text-slate-900'>Lesson voice script</h3>
          <p className='mt-1 text-sm text-slate-600'>{statusLabel}</p>
          <div className='mt-3 flex flex-wrap gap-2 text-xs text-slate-500'>
            <span className='rounded-full bg-white/80 px-2.5 py-1'>
              {script.segments.length} segment{script.segments.length === 1 ? '' : 's'}
            </span>
            <span className='rounded-full bg-white/80 px-2.5 py-1'>
              {totalCharacters} characters
            </span>
            <span className='rounded-full bg-white/80 px-2.5 py-1'>Locale: {script.locale}</span>
            {latestAudioCreatedAt ? (
              <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700'>
                Last built: {latestAudioCreatedAt}
              </span>
            ) : null}
          </div>
        </div>

        <div className='flex w-full flex-col gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 lg:max-w-sm'>
          <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
            <label className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
              Voice
              <select
                aria-label='Narration voice'
                value={voice}
                onChange={(event): void => handleVoiceChange(event.target.value)}
                className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal tracking-normal text-slate-900 outline-none ring-0'
              >
                {KANGUR_TTS_VOICE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
              Locale
              <input
                aria-label='Narration locale'
                value={document.narration?.locale ?? ''}
                onChange={(event): void => handleLocaleChange(event.target.value)}
                placeholder='pl-PL'
                className='mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal tracking-normal text-slate-900 outline-none ring-0'
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
              className='inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
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
              className='inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
            >
              <RefreshCw className={cn('size-4', status === 'loading' && 'animate-spin')} />
              Regenerate audio
            </button>
          </div>

          {!hasScriptContent ? (
            <div className='rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
              Add lesson text or narration overrides to generate a preview.
            </div>
          ) : null}
          {errorMessage ? (
            <div className='rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
              {errorMessage}
            </div>
          ) : null}
          {!errorMessage && cacheStatus && cacheStatus.state !== 'ready' ? (
            <div className='rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600'>
              {cacheStatus.message}
            </div>
          ) : null}
          {response?.mode === 'fallback' ? (
            <div className='rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800'>
              {response.message}
            </div>
          ) : null}
        </div>
      </div>

      <div className='mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
        <div className='rounded-2xl border border-white/80 bg-white/85 p-4'>
          <div className='text-sm font-semibold text-slate-900'>Narration script</div>
          <div className='mt-1 text-xs text-slate-500'>
            This is the exact spoken text generated from the current lesson draft.
          </div>
          <div className='mt-4 space-y-3'>
            {script.segments.length > 0 ? (
              script.segments.map((segment, index) => (
                <article
                  key={segment.id}
                  className='rounded-2xl border border-slate-200 bg-slate-50/70 p-3'
                >
                  <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                    Segment {index + 1}
                  </div>
                  <div className='mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700'>
                    {segment.text}
                  </div>
                </article>
              ))
            ) : (
              <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500'>
                No readable lesson text detected yet.
              </div>
            )}
          </div>
        </div>

        <div className='rounded-2xl border border-white/80 bg-white/85 p-4'>
          <div className='text-sm font-semibold text-slate-900'>Audio preview</div>
          <div className='mt-1 text-xs text-slate-500'>
            Generated audio uses the current draft and selected voice.
          </div>
          <div className='mt-4 space-y-3'>
            {response?.mode === 'audio' ? (
              response.segments.map((segment, index) => (
                <article
                  key={segment.id}
                  className='rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700'>
                      Audio segment {index + 1}
                    </div>
                    <div className='text-[11px] text-emerald-700/80'>
                      Built: {formatDateTime(segment.createdAt) ?? segment.createdAt}
                    </div>
                  </div>
                  <div className='mt-2 text-sm leading-6 text-slate-700'>{segment.text}</div>
                  <audio controls preload='none' src={segment.audioUrl} className='mt-3 w-full'>
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
              <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-500'>
                Generate audio preview to inspect the realistic narration output.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
