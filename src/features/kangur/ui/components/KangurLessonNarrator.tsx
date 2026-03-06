'use client';

import { Pause, Play, Square, Volume2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  KANGUR_NARRATOR_SETTINGS_KEY,
  parseKangurNarratorSettings,
} from '@/features/kangur/settings';
import {
  KANGUR_TTS_DEFAULT_VOICE,
  type KangurLessonTtsAudioResponse,
  type KangurLessonTtsResponse,
} from '@/features/kangur/tts/contracts';
import {
  buildKangurLessonDocumentNarrationScript,
  buildKangurLessonNarrationScriptFromText,
  hasKangurLessonNarrationContent,
  normalizeKangurLessonNarrationText,
} from '@/features/kangur/tts/script';
import {
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn } from '@/shared/utils';

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

type KangurLessonNarratorProps = {
  lesson: Pick<KangurLesson, 'id' | 'title' | 'description' | 'contentMode'>;
  lessonDocument: KangurLessonDocument | null;
  lessonContentRef: React.RefObject<HTMLElement | null>;
  className?: string | undefined;
};

const DEFAULT_PLAYBACK_RATE = 1;
const SERVER_MODE_FALLBACK_HINT =
  'Switch Kangur narrator settings to Client narrator if you want browser speech instead.';

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
  const settingsStore = useSettingsStore();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const narratorSettings = useMemo(
    () => parseKangurNarratorSettings(rawNarratorSettings),
    [rawNarratorSettings]
  );
  const voice =
    lesson.contentMode === 'document'
      ? (lessonDocument?.narration?.voice ?? KANGUR_TTS_DEFAULT_VOICE)
      : KANGUR_TTS_DEFAULT_VOICE;
  const [observedText, setObservedText] = useState('');
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manifest, setManifest] = useState<KangurLessonTtsAudioResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<KangurLessonTtsAudioResponse['segments']>([]);
  const fallbackSegmentsRef = useRef<Array<{ id: string; text: string }>>([]);
  const currentIndexRef = useRef(0);
  const responseCacheRef = useRef<Map<string, KangurLessonTtsAudioResponse>>(new Map());
  const stopRequestedRef = useRef(false);

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
        engine: narratorSettings.engine,
        voice,
        locale: script.locale,
        segments: script.segments.map((segment) => segment.text),
      }),
    [narratorSettings.engine, script, voice]
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
    setManifest(responseCacheRef.current.get(scriptCacheKey) ?? null);
  }, [scriptCacheKey, stopPlayback]);

  const speakClientSegments = useCallback(
    (segments: Array<{ id: string; text: string }>, startIndex: number = 0): void => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setStatus('error');
        setErrorMessage('Client narration is not available in this browser.');
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
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(nextSegment.text);
      utterance.lang = script.locale;
      utterance.rate = DEFAULT_PLAYBACK_RATE;
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
        speakClientSegments(segments, nextIndex);
      };
      utterance.onerror = () => {
        setStatus('error');
        setErrorMessage('Client narration failed to start.');
      };
      window.speechSynthesis.speak(utterance);
    },
    [script.locale]
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
      audio.src = nextSegment.audioUrl;
      audio.playbackRate = DEFAULT_PLAYBACK_RATE;

      try {
        await audio.play();
        setStatus('playing');
      } catch {
        setStatus('error');
        setErrorMessage('The browser blocked audio playback. Try the play button again.');
      }
    },
    []
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
      audio.playbackRate = DEFAULT_PLAYBACK_RATE;
      void audio.play().catch(() => {
        setStatus('error');
        setErrorMessage('The next narration segment could not start.');
      });
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const prepareServerNarration = useCallback(async (): Promise<KangurLessonTtsAudioResponse | null> => {
    if (!hasKangurLessonNarrationContent(script)) {
      setStatus('error');
      setErrorMessage('There is not enough visible lesson text to read aloud yet.');
      return null;
    }

    const cached = responseCacheRef.current.get(scriptCacheKey);
    if (cached) {
      setManifest(cached);
      return cached;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await api.post<KangurLessonTtsResponse>('/api/kangur/tts', {
        script,
        voice,
        forceRegenerate: false,
      });

      if (response.mode !== 'audio') {
        setManifest(null);
        setStatus('error');
        setErrorMessage(`${response.message} ${SERVER_MODE_FALLBACK_HINT}`);
        return null;
      }

      responseCacheRef.current.set(scriptCacheKey, response);
      setManifest(response);
      setStatus('idle');
      return response;
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to prepare lesson narration.');
      return null;
    }
  }, [script, scriptCacheKey, voice]);

  const handlePlay = useCallback(async () => {
    setErrorMessage(null);

    if (status === 'paused') {
      const audio = audioRef.current;
      if (audioQueueRef.current.length > 0 && audio) {
        try {
          audio.playbackRate = DEFAULT_PLAYBACK_RATE;
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

    if (narratorSettings.engine === 'client') {
      stopPlayback();
      speakClientSegments(script.segments, 0);
      return;
    }

    const response = await prepareServerNarration();
    if (!response) return;
    await playAudioSegments(response.segments, 0);
  }, [narratorSettings.engine, playAudioSegments, prepareServerNarration, script.segments, speakClientSegments, status, stopPlayback]);

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

  const totalSegments = manifest?.segments.length ?? script.segments.length;
  const engineLabel =
    narratorSettings.engine === 'server' ? 'server narration' : 'browser narration';
  const statusLabel =
    status === 'loading'
      ? 'Preparing server narration...'
      : status === 'playing'
        ? narratorSettings.engine === 'server'
          ? 'Playing server narration'
          : 'Playing browser narration'
        : status === 'paused'
          ? 'Narration paused'
          : status === 'error'
            ? 'Narration unavailable'
            : `Ready to read the visible lesson with ${engineLabel}`;

  if (!hasKangurLessonNarrationContent(script)) {
    return null;
  }

  return (
    <KangurPanel
      data-kangur-tts-ignore='true'
      className={cn(
        'w-full max-w-5xl border-indigo-200/80 bg-white/92',
        className
      )}
      padding='lg'
      variant='soft'
    >
      <audio ref={audioRef} preload='none' className='hidden' />
      <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <KangurLessonChip accent='indigo' className='gap-2 text-[11px] uppercase tracking-[0.16em]'>
            <Volume2 className='size-3.5' /> Lesson narrator
          </KangurLessonChip>
          <div className='mt-3 text-lg font-semibold text-slate-900'>{lesson.title}</div>
          <div className='mt-1 text-sm text-slate-600'>{statusLabel}</div>
          <div className='mt-2 text-xs text-slate-500'>
            Reads the currently visible lesson content. Segment {Math.min(currentIndex + 1, totalSegments)} of{' '}
            {totalSegments}. Narrator mode is managed in Kangur settings.
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {status === 'playing' ? (
            <KangurButton
              type='button'
              onClick={handlePause}
              variant='primary'
            >
              <Pause className='size-4' /> Pause
            </KangurButton>
          ) : (
            <KangurButton
              type='button'
              onClick={() => {
                void handlePlay();
              }}
              disabled={status === 'loading'}
              variant='primary'
            >
              <Play className='size-4' /> {status === 'loading' ? 'Preparing...' : 'Play'}
            </KangurButton>
          )}
          <KangurButton
            type='button'
            onClick={stopPlayback}
            disabled={status === 'loading' || status === 'idle'}
            variant='secondary'
          >
            <Square className='size-4' /> Stop
          </KangurButton>
        </div>
      </div>

      {errorMessage ? (
        <KangurLessonCallout accent='rose' className='mt-4 text-sm text-rose-700' padding='sm'>
          {errorMessage}
        </KangurLessonCallout>
      ) : null}
    </KangurPanel>
  );
}
