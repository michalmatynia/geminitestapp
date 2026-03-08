'use client';

import { Pause, Play, Volume2 } from 'lucide-react';
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
import { buildInlineVttTrackSrc } from '@/features/kangur/tts/captions';
import {
  buildKangurLessonDocumentNarrationScript,
  buildKangurLessonNarrationScriptFromText,
  hasKangurLessonNarrationContent,
  normalizeKangurLessonNarrationText,
} from '@/features/kangur/tts/script';
import { KangurButton, KangurSummaryPanel } from '@/features/kangur/ui/design/primitives';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn } from '@/shared/utils';

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type PlaybackTransport = 'server' | 'client' | 'client-fallback' | null;

type KangurLessonNarratorProps = {
  lesson: Pick<KangurLesson, 'id' | 'title' | 'description' | 'contentMode'>;
  lessonDocument: KangurLessonDocument | null;
  lessonContentRef: React.RefObject<HTMLElement | null>;
  className?: string | undefined;
  readLabel?: string | undefined;
  pauseLabel?: string | undefined;
  resumeLabel?: string | undefined;
  loadingLabel?: string | undefined;
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
  const {
    lesson,
    lessonDocument,
    lessonContentRef,
    className,
    readLabel = 'Read',
    pauseLabel = 'Pause',
    resumeLabel = 'Resume',
    loadingLabel = 'Preparing...',
  } = props;
  const settingsStore = useSettingsStore();
  const rawNarratorSettings = settingsStore.get(KANGUR_NARRATOR_SETTINGS_KEY);
  const narratorSettings = useMemo(
    () => parseKangurNarratorSettings(rawNarratorSettings),
    [rawNarratorSettings]
  );
  const defaultVoice = narratorSettings.voice ?? KANGUR_TTS_DEFAULT_VOICE;
  const voice =
    lesson.contentMode === 'document'
      ? (lessonDocument?.narration?.voice ?? defaultVoice)
      : defaultVoice;
  const [observedText, setObservedText] = useState('');
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [manifest, setManifest] = useState<KangurLessonTtsAudioResponse | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setPlaybackTransport] = useState<PlaybackTransport>(null);
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
  }, [
    lesson.contentMode,
    lesson.description,
    lesson.id,
    lesson.title,
    lessonDocument,
    observedText,
  ]);

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
    setPlaybackTransport(null);
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
    setFallbackMessage(null);
    setManifest(responseCacheRef.current.get(scriptCacheKey) ?? null);
  }, [scriptCacheKey, stopPlayback]);

  useEffect(
    () => () => {
      stopRequestedRef.current = true;
      audioQueueRef.current = [];
      fallbackSegmentsRef.current = [];
      currentIndexRef.current = 0;

      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }

      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel();
      }
    },
    []
  );

  const speakClientSegments = useCallback(
    (
      segments: Array<{ id: string; text: string }>,
      startIndex: number = 0,
      transport: Exclude<PlaybackTransport, 'server' | null> = 'client'
    ): void => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setPlaybackTransport(null);
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
      setPlaybackTransport(transport);
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
        speakClientSegments(segments, nextIndex, transport);
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
      setPlaybackTransport('server');
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

  const prepareServerNarration = useCallback(async (): Promise<
    KangurLessonTtsAudioResponse | 'client-fallback' | null
  > => {
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
        const canUseBrowserFallback =
          typeof window !== 'undefined' && Boolean(window.speechSynthesis);
        const combinedMessage = `${response.message} ${SERVER_MODE_FALLBACK_HINT}`;

        if (canUseBrowserFallback && response.segments.length > 0) {
          setFallbackMessage(combinedMessage);
          speakClientSegments(response.segments, 0, 'client-fallback');
          return 'client-fallback';
        }

        setFallbackMessage(null);
        setStatus('error');
        setErrorMessage(combinedMessage);
        return null;
      }

      responseCacheRef.current.set(scriptCacheKey, response);
      setManifest(response);
      setFallbackMessage(null);
      setStatus('idle');
      return response;
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to prepare lesson narration.'
      );
      return null;
    }
  }, [script, scriptCacheKey, speakClientSegments, voice]);

  const handlePlay = useCallback(async () => {
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

    setErrorMessage(null);
    setFallbackMessage(null);

    if (narratorSettings.engine === 'client') {
      stopPlayback();
      speakClientSegments(script.segments, 0, 'client');
      return;
    }

    const response = await prepareServerNarration();
    if (!response || response === 'client-fallback') return;
    await playAudioSegments(response.segments, 0);
  }, [
    narratorSettings.engine,
    playAudioSegments,
    prepareServerNarration,
    script.segments,
    speakClientSegments,
    status,
    stopPlayback,
  ]);

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

  const activeSegmentText =
    manifest?.segments[currentIndex]?.text ?? script.segments[currentIndex]?.text ?? lesson.title;
  const controlLabel =
    status === 'loading'
      ? loadingLabel
      : status === 'playing'
        ? pauseLabel
        : status === 'paused'
          ? resumeLabel
          : readLabel;
  const ControlIcon = status === 'playing' ? Pause : status === 'paused' ? Play : Volume2;
  const handlePrimaryAction = status === 'playing' ? handlePause : () => void handlePlay();

  if (!hasKangurLessonNarrationContent(script)) {
    return null;
  }

  return (
    <div
      data-kangur-tts-ignore='true'
      data-testid='lesson-narrator-shell'
      className={cn('w-full', className)}
    >
      <audio ref={audioRef} preload='none' className='hidden'>
        <track
          default
          kind='captions'
          label='Lesson narration transcript'
          src={buildInlineVttTrackSrc(activeSegmentText)}
          srcLang={script.locale}
        />
      </audio>
      <div className='flex flex-wrap items-center gap-3'>
        <KangurButton
          type='button'
          onClick={handlePrimaryAction}
          disabled={status === 'loading'}
          size='sm'
          variant={status === 'idle' ? 'ghost' : 'surface'}
          data-doc-id='lessons_narrator'
        >
          <ControlIcon className='size-4' /> {controlLabel}
        </KangurButton>
      </div>

      {errorMessage ? (
        <KangurSummaryPanel
          accent='rose'
          className='mt-4'
          description={errorMessage}
          padding='sm'
          tone='accent'
        />
      ) : null}
      {!errorMessage && fallbackMessage ? (
        <KangurSummaryPanel
          accent='amber'
          className='mt-4'
          description={fallbackMessage}
          padding='sm'
          tone='accent'
        />
      ) : null}
    </div>
  );
}
