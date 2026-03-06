'use client';

import { Pause, Play, RefreshCw, Square, Volume2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  KANGUR_TTS_DEFAULT_VOICE,
  KANGUR_TTS_VOICE_OPTIONS,
  type KangurLessonTtsAudioResponse,
  type KangurLessonTtsResponse,
  type KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
import {
  buildKangurLessonDocumentNarrationScript,
  buildKangurLessonNarrationScriptFromText,
  hasKangurLessonNarrationContent,
  normalizeKangurLessonNarrationText,
} from '@/features/kangur/tts/script';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';
import { api } from '@/shared/lib/api-client';
import { cn } from '@/shared/utils';

const PLAYER_PREFERENCES_KEY = 'kangur.lesson.narrator.preferences.v1';
const RATE_OPTIONS = [
  { value: 0.9, label: '90%' },
  { value: 1.0, label: '100%' },
  { value: 1.1, label: '110%' },
] as const;

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

type KangurLessonNarratorProps = {
  lesson: Pick<KangurLesson, 'id' | 'title' | 'description' | 'contentMode'>;
  lessonDocument: KangurLessonDocument | null;
  lessonContentRef: React.RefObject<HTMLElement | null>;
  className?: string | undefined;
};

const loadStoredPreferences = (): {
  voice: KangurLessonTtsVoice;
  playbackRate: number;
} => {
  if (typeof window === 'undefined') {
    return {
      voice: KANGUR_TTS_DEFAULT_VOICE,
      playbackRate: 1,
    };
  }

  try {
    const raw = window.localStorage.getItem(PLAYER_PREFERENCES_KEY);
    if (!raw) {
      return {
        voice: KANGUR_TTS_DEFAULT_VOICE,
        playbackRate: 1,
      };
    }
    const parsed = JSON.parse(raw) as {
      voice?: string;
      playbackRate?: number;
    };
    const voice = KANGUR_TTS_VOICE_OPTIONS.some((entry) => entry.value === parsed.voice)
      ? (parsed.voice as KangurLessonTtsVoice)
      : KANGUR_TTS_DEFAULT_VOICE;
    const playbackRate = RATE_OPTIONS.some((entry) => entry.value === parsed.playbackRate)
      ? parsed.playbackRate ?? 1
      : 1;
    return {
      voice,
      playbackRate,
    };
  } catch {
    return {
      voice: KANGUR_TTS_DEFAULT_VOICE,
      playbackRate: 1,
    };
  }
};

const extractNarrationTextFromElement = (element: HTMLElement | null): string => {
  if (!element) return '';
  const cloned = element.cloneNode(true) as HTMLElement;
  cloned
    .querySelectorAll(
      'button, input, select, textarea, audio, video, svg, img, [data-kangur-tts-ignore="true"]'
    )
    .forEach((node) => node.remove());

  return normalizeKangurLessonNarrationText(cloned.innerText || cloned.textContent || '');
};

export function KangurLessonNarrator(props: KangurLessonNarratorProps): React.JSX.Element | null {
  const { lesson, lessonDocument, lessonContentRef, className } = props;
  const [preferences] = useState(loadStoredPreferences);
  const [voice, setVoice] = useState<KangurLessonTtsVoice>(preferences.voice);
  const [playbackRate, setPlaybackRate] = useState<number>(preferences.playbackRate);
  const [observedText, setObservedText] = useState('');
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modeLabel, setModeLabel] = useState<'audio' | 'fallback'>('audio');
  const [manifest, setManifest] = useState<KangurLessonTtsAudioResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<KangurLessonTtsAudioResponse['segments']>([]);
  const fallbackSegmentsRef = useRef<Array<{ id: string; text: string }>>([]);
  const currentIndexRef = useRef(0);
  const responseCacheRef = useRef<Map<string, KangurLessonTtsResponse>>(new Map());
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      PLAYER_PREFERENCES_KEY,
      JSON.stringify({ voice, playbackRate })
    );
  }, [playbackRate, voice]);

  useEffect(() => {
    if (lesson.contentMode === 'document') {
      setObservedText('');
      return;
    }

    const root = lessonContentRef.current;
    if (!root) {
      setObservedText('');
      return;
    }

    let timeoutId: number | null = null;
    const updateText = (): void => {
      setObservedText(extractNarrationTextFromElement(root));
    };

    updateText();

    if (typeof MutationObserver === 'undefined') {
      return;
    }

    const observer = new MutationObserver(() => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(updateText, 120);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [lesson.contentMode, lesson.id, lessonContentRef]);

  const script = useMemo(() => {
    if (lesson.contentMode === 'document' && lessonDocument) {
      return buildKangurLessonDocumentNarrationScript({
        lessonId: lesson.id,
        title: lesson.title,
        description: lesson.description,
        document: lessonDocument,
      });
    }

    return buildKangurLessonNarrationScriptFromText({
      lessonId: lesson.id,
      title: lesson.title,
      description: lesson.description,
      text: observedText,
    });
  }, [lesson.contentMode, lesson.description, lesson.id, lesson.title, lessonDocument, observedText]);

  const scriptCacheKey = useMemo(
    () =>
      JSON.stringify({
        lessonId: script.lessonId,
        voice,
        segments: script.segments.map((segment) => segment.text),
      }),
    [script, voice]
  );

  const stopPlayback = useCallback(() => {
    stopRequestedRef.current = true;
    audioQueueRef.current = [];
    fallbackSegmentsRef.current = [];
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    setStatus('idle');
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }, []);

  useEffect(() => {
    stopPlayback();
    setErrorMessage(null);
    setModeLabel('audio');

    const cached = responseCacheRef.current.get(scriptCacheKey);
    if (cached?.mode === 'audio') {
      setManifest(cached);
      return;
    }

    setManifest(null);
  }, [scriptCacheKey, stopPlayback]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  const speakFallbackSegments = useCallback(
    (segments: Array<{ id: string; text: string }>, startIndex: number = 0): void => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setStatus('error');
        setErrorMessage('Browser narration fallback is not available in this environment.');
        return;
      }

      const nextSegment = segments[startIndex];
      if (!nextSegment) {
        setStatus('idle');
        return;
      }

      stopRequestedRef.current = false;
      fallbackSegmentsRef.current = segments;
      audioQueueRef.current = [];
      currentIndexRef.current = startIndex;
      setCurrentIndex(startIndex);
      setModeLabel('fallback');
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(nextSegment.text);
      utterance.lang = script.locale;
      utterance.rate = playbackRate;
      utterance.onstart = () => {
        setStatus('playing');
      };
      utterance.onend = () => {
        if (stopRequestedRef.current) {
          return;
        }
        const nextIndex = startIndex + 1;
        if (nextIndex >= segments.length) {
          setStatus('idle');
          return;
        }
        speakFallbackSegments(segments, nextIndex);
      };
      utterance.onerror = () => {
        setStatus('error');
        setErrorMessage('Browser narration fallback failed to start.');
      };
      window.speechSynthesis.speak(utterance);
    },
    [playbackRate, script.locale]
  );

  const playAudioSegments = useCallback(
    async (segments: KangurLessonTtsAudioResponse['segments'], startIndex: number = 0) => {
      const audio = audioRef.current;
      const nextSegment = segments[startIndex];
      if (!audio || !nextSegment) {
        setStatus('error');
        setErrorMessage('The lesson narrator could not start audio playback.');
        return;
      }

      stopRequestedRef.current = false;
      audioQueueRef.current = segments;
      fallbackSegmentsRef.current = [];
      currentIndexRef.current = startIndex;
      setCurrentIndex(startIndex);
      setModeLabel('audio');
      audio.src = nextSegment.audioUrl;
      audio.playbackRate = playbackRate;

      try {
        await audio.play();
        setStatus('playing');
      } catch {
        setStatus('error');
        setErrorMessage('The browser blocked audio playback. Try the play button again.');
      }
    },
    [playbackRate]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = (): void => {
      const nextIndex = currentIndexRef.current + 1;
      const nextSegment = audioQueueRef.current[nextIndex];
      if (!nextSegment) {
        setStatus('idle');
        return;
      }

      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      audio.src = nextSegment.audioUrl;
      audio.playbackRate = playbackRate;
      void audio.play().catch(() => {
        setStatus('error');
        setErrorMessage('The next narration segment could not start.');
      });
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playbackRate]);

  const prepareNarration = useCallback(
    async (forceRegenerate: boolean = false): Promise<KangurLessonTtsResponse | null> => {
      if (!hasKangurLessonNarrationContent(script)) {
        setStatus('error');
        setErrorMessage('There is not enough visible lesson text to read aloud yet.');
        return null;
      }

      if (!forceRegenerate) {
        const cached = responseCacheRef.current.get(scriptCacheKey);
        if (cached) {
          if (cached.mode === 'audio') {
            setManifest(cached);
          }
          return cached;
        }
      }

      setStatus('loading');
      setErrorMessage(null);

      try {
        const response = await api.post<KangurLessonTtsResponse>('/api/kangur/tts', {
          script,
          voice,
          forceRegenerate,
        });
        responseCacheRef.current.set(scriptCacheKey, response);
        if (response.mode === 'audio') {
          setManifest(response);
        } else {
          setManifest(null);
        }
        setStatus('idle');
        return response;
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Failed to prepare lesson narration.');
        return null;
      }
    },
    [script, scriptCacheKey, voice]
  );

  const handlePlay = useCallback(async () => {
    setErrorMessage(null);

    if (status === 'paused') {
      const audio = audioRef.current;
      if (audioQueueRef.current.length > 0 && audio) {
        try {
          audio.playbackRate = playbackRate;
          await audio.play();
          setStatus('playing');
        } catch {
          setStatus('error');
          setErrorMessage('Audio playback could not resume.');
        }
        return;
      }

      if (typeof window !== 'undefined' && window.speechSynthesis?.paused) {
        window.speechSynthesis.resume();
        setStatus('playing');
        return;
      }
    }

    const response = await prepareNarration(false);
    if (!response) return;

    if (response.mode === 'audio') {
      await playAudioSegments(response.segments, 0);
      return;
    }

    speakFallbackSegments(response.segments, 0);
  }, [playAudioSegments, playbackRate, prepareNarration, speakFallbackSegments, status]);

  const handlePause = useCallback(() => {
    const audio = audioRef.current;
    if (audioQueueRef.current.length > 0 && audio) {
      audio.pause();
      setStatus('paused');
      return;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
      setStatus('paused');
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    stopPlayback();
    responseCacheRef.current.delete(scriptCacheKey);
    const response = await prepareNarration(true);
    if (!response) return;
    if (response.mode === 'audio') {
      await playAudioSegments(response.segments, 0);
      return;
    }
    speakFallbackSegments(response.segments, 0);
  }, [playAudioSegments, prepareNarration, scriptCacheKey, speakFallbackSegments, stopPlayback]);

  const totalSegments = manifest?.segments.length ?? script.segments.length;
  const statusLabel =
    status === 'loading'
      ? 'Preparing narration...'
      : status === 'playing'
        ? modeLabel === 'audio'
          ? 'Playing neural narration'
          : 'Playing browser fallback narration'
        : status === 'paused'
          ? 'Narration paused'
          : status === 'error'
            ? 'Narration unavailable'
            : 'Ready to read the visible lesson';

  if (!hasKangurLessonNarrationContent(script)) {
    return null;
  }

  return (
    <div
      data-kangur-tts-ignore='true'
      className={cn(
        'w-full max-w-5xl rounded-[28px] border border-indigo-200/80 bg-white/92 p-4 shadow-lg',
        className
      )}
    >
      <audio ref={audioRef} preload='none' className='hidden' />
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <div className='inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700'>
            <Volume2 className='size-3.5' /> Lesson narrator
          </div>
          <div className='mt-3 text-lg font-semibold text-slate-900'>{lesson.title}</div>
          <div className='mt-1 text-sm text-slate-600'>{statusLabel}</div>
          <div className='mt-2 text-xs text-slate-500'>
            Reads the currently visible lesson content. Segment {Math.min(currentIndex + 1, totalSegments)} of{' '}
            {totalSegments}.
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {status === 'playing' ? (
            <button
              type='button'
              onClick={handlePause}
              className='inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700'
            >
              <Pause className='size-4' /> Pause
            </button>
          ) : (
            <button
              type='button'
              onClick={() => {
                void handlePlay();
              }}
              disabled={status === 'loading'}
              className='inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60'
            >
              <Play className='size-4' /> {status === 'loading' ? 'Preparing...' : 'Play'}
            </button>
          )}
          <button
            type='button'
            onClick={stopPlayback}
            disabled={status === 'loading' || status === 'idle'}
            className='inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <Square className='size-4' /> Stop
          </button>
          <button
            type='button'
            onClick={() => {
              void handleRefresh();
            }}
            disabled={status === 'loading'}
            className='inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
          >
            <RefreshCw className='size-4' /> Refresh audio
          </button>
        </div>
      </div>

      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        <label className='flex flex-col gap-1 text-sm font-medium text-slate-700'>
          Voice
          <select
            value={voice}
            onChange={(event): void => {
              setVoice(event.target.value as KangurLessonTtsVoice);
            }}
            className='rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-300'
          >
            {KANGUR_TTS_VOICE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className='flex flex-col gap-1 text-sm font-medium text-slate-700'>
          Playback speed
          <select
            value={String(playbackRate)}
            onChange={(event): void => {
              setPlaybackRate(Number(event.target.value));
            }}
            className='rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-300'
          >
            {RATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {errorMessage ? (
        <div className='mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700'>
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
