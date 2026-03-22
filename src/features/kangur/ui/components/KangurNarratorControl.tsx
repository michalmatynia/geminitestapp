'use client';

import { Loader2, Pause, Play, Volume2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { KangurNarratorEngine } from '@/features/kangur/settings';
import { buildInlineVttTrackSrc } from '@/features/kangur/tts/captions';
import { buildKangurLessonTtsEnvelopeSignature } from '@/features/kangur/tts/context-registry/instructions';
import type {
  KangurLessonNarrationScript,
  KangurLessonTtsAudioResponse,
  KangurLessonTtsResponse,
  KangurLessonTtsVoice,
} from '@/features/kangur/tts/contracts';
import { hasKangurLessonNarrationContent } from '@/features/kangur/tts/script';
import { KangurButton, KangurSummaryPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { api } from '@/shared/lib/api-client';
import { cn } from '@/features/kangur/shared/utils';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';


type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type PlaybackTransport = 'server' | 'client' | 'client-fallback' | null;

const DEFAULT_PLAYBACK_RATE = 1;
const SERVER_MODE_FALLBACK_HINT =
  'Switch Kangur narrator settings to Client narrator if you want browser speech instead.';
const GENERIC_SERVER_MODE_FAILURE_MESSAGE = 'Narration is not available right now.';

type KangurNarratorControlProps = {
  script: KangurLessonNarrationScript;
  engine: KangurNarratorEngine;
  voice: KangurLessonTtsVoice;
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
  className?: string;
  displayMode?: 'button' | 'icon';
  diagnosticsVisible?: boolean;
  loadingLabel?: string;
  pauseLabel?: string;
  readLabel?: string;
  resumeLabel?: string;
  renderWhenEmpty?: boolean;
  showFeedback?: boolean;
  shellTestId?: string;
  docId?: string;
};

export function KangurNarratorControl({
  script,
  engine,
  voice,
  contextRegistry = null,
  className,
  displayMode = 'button',
  diagnosticsVisible = false,
  loadingLabel,
  pauseLabel = 'Pause',
  readLabel = 'Read',
  resumeLabel = 'Resume',
  renderWhenEmpty = false,
  showFeedback,
  shellTestId,
  docId,
}: KangurNarratorControlProps): React.JSX.Element | null {
  const isIconMode = displayMode === 'icon';
  const isCoarsePointer = useKangurCoarsePointer();
  const shouldShowFeedback = showFeedback ?? !isIconMode;
  const narratorDocId = docId;
  const contextRegistrySignature = useMemo(
    () => buildKangurLessonTtsEnvelopeSignature(contextRegistry),
    [contextRegistry]
  );
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

  const scriptCacheKey = useMemo(
    () =>
      JSON.stringify({
        lessonId: script.lessonId,
        engine,
        voice,
        locale: script.locale,
        contextRegistrySignature,
        segments: script.segments.map((segment) => segment.text),
      }),
    [contextRegistrySignature, engine, script, voice]
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
        setErrorMessage(diagnosticsVisible ? 'Client narration failed to start.' : null);
      };
      window.speechSynthesis.speak(utterance);
    },
    [diagnosticsVisible, script.locale]
  );

  const playAudioSegments = useCallback(
    async (segments: KangurLessonTtsAudioResponse['segments'], startIndex: number = 0) => {
      const audio = audioRef.current;
      const nextSegment = segments[startIndex];
      if (!audio || !nextSegment) {
        setStatus('error');
        setErrorMessage('The narrator could not start audio playback.');
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

      await withKangurClientError(
        {
          source: 'kangur-narrator',
          action: 'play-audio-segment',
          description: 'Start playback for a narration audio segment.',
        },
        async () => {
          await audio.play();
          setStatus('playing');
        },
        {
          fallback: undefined,
          onError: () => {
            setStatus('error');
            setErrorMessage('The browser blocked audio playback. Try the play button again.');
          },
        }
      );
    },
    []
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

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
      void audio.play().catch((error) => {
        void ErrorSystem.captureException(error);
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
      setErrorMessage('There is not enough visible text to read aloud yet.');
      return null;
    }

    const cached = responseCacheRef.current.get(scriptCacheKey);
    if (cached) {
      setManifest(cached);
      return cached;
    }

    setStatus('loading');
    setErrorMessage(null);

    return withKangurClientError(
      {
        source: 'kangur-narrator',
        action: 'prepare-server-narration',
        description: 'Prepare server-side narration for a lesson script.',
        context: {
          scriptId: script.lessonId,
        },
      },
      async () => {
        const response = await api.post<KangurLessonTtsResponse>('/api/kangur/tts', {
          script,
          voice,
          forceRegenerate: false,
          ...(contextRegistry ? { contextRegistry } : {}),
        });

        if (response.mode !== 'audio') {
          setManifest(null);
          const canUseBrowserFallback =
            typeof window !== 'undefined' && Boolean(window.speechSynthesis);
          const combinedMessage = diagnosticsVisible
            ? `${response.message} ${SERVER_MODE_FALLBACK_HINT}`
            : GENERIC_SERVER_MODE_FAILURE_MESSAGE;

          if (canUseBrowserFallback && response.segments.length > 0) {
            setFallbackMessage(diagnosticsVisible ? combinedMessage : null);
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
      },
      {
        fallback: null,
        onError: (error) => {
          setStatus('error');
          setErrorMessage(error instanceof Error ? error.message : 'Failed to prepare narration.');
        },
      }
    );
  }, [
    contextRegistry,
    diagnosticsVisible,
    script,
    scriptCacheKey,
    speakClientSegments,
    voice,
  ]);

  const handlePlay = useCallback(async () => {
    if (status === 'paused') {
      const audio = audioRef.current;
      if (audioQueueRef.current.length > 0 && audio) {
        await withKangurClientError(
          {
            source: 'kangur-narrator',
            action: 'resume-audio',
            description: 'Resume narrator audio playback.',
          },
          async () => {
            audio.playbackRate = DEFAULT_PLAYBACK_RATE;
            await audio.play();
            setStatus('playing');
          },
          {
            fallback: undefined,
            onError: () => {
              setStatus('error');
              setErrorMessage('Audio playback could not resume.');
            },
          }
        );
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

    if (engine === 'client') {
      stopPlayback();
      speakClientSegments(script.segments, 0, 'client');
      return;
    }

    const response = await prepareServerNarration();
    if (!response || response === 'client-fallback') {
      return;
    }

    await playAudioSegments(response.segments, 0);
  }, [engine, playAudioSegments, prepareServerNarration, script.segments, speakClientSegments, status, stopPlayback]);

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
    manifest?.segments[currentIndex]?.text ?? script.segments[currentIndex]?.text ?? script.title;
  const controlButtonMinWidth = useMemo(() => {
    if (isIconMode) {
      return undefined;
    }
    return `calc(${Math.max(readLabel.length, pauseLabel.length, resumeLabel.length, loadingLabel?.length ?? 0, 6)}ch + 2.75rem)`;
  }, [isIconMode, loadingLabel, pauseLabel, readLabel, resumeLabel]);
  const controlLabel =
    status === 'loading'
      ? loadingLabel ?? readLabel
      : status === 'playing'
        ? pauseLabel
        : status === 'paused'
          ? resumeLabel
          : readLabel;
  const ControlIcon =
    status === 'loading'
      ? Loader2
      : status === 'playing'
        ? Pause
        : status === 'paused'
          ? Play
          : Volume2;
  const handlePrimaryAction = status === 'playing' ? handlePause : () => void handlePlay();
  const controlTouchClassName = isCoarsePointer
    ? isIconMode
      ? 'min-h-11 min-w-11 touch-manipulation select-none active:scale-[0.97]'
      : 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
    : null;

  const hasNarration = hasKangurLessonNarrationContent(script);
  if (!hasNarration && !renderWhenEmpty) {
    return null;
  }

  const isControlDisabled = status === 'loading' || !hasNarration;

  return (
    <div
      data-kangur-tts-ignore='true'
      data-testid={shellTestId}
      className={cn(isIconMode ? 'w-auto' : 'w-full', className)}
    >
      <audio ref={audioRef} preload='none' className='hidden' aria-label='Narration audio'>
        <track
          default
          kind='captions'
          label='Narration transcript'
          src={buildInlineVttTrackSrc(activeSegmentText)}
          srcLang={script.locale}
        />
      </audio>
      <div className={cn('flex items-center', isIconMode ? 'gap-0' : 'flex-wrap kangur-panel-gap')}>
        <KangurButton
          type='button'
          onClick={handlePrimaryAction}
          disabled={isControlDisabled}
          aria-label={isIconMode ? controlLabel : undefined}
          title={isIconMode ? controlLabel : undefined}
          className={cn(
            isIconMode ? 'h-6 w-6 rounded-full p-0' : 'justify-center',
            controlTouchClassName,
            status === 'loading' ? 'cursor-wait' : null
          )}
          size='sm'
          style={controlButtonMinWidth ? { minWidth: controlButtonMinWidth } : undefined}
          variant={isIconMode ? 'ghost' : 'surface'}
          {...(narratorDocId ? { 'data-doc-id': narratorDocId } : {})}
        >
          <ControlIcon
            aria-hidden='true'
            className={cn(
              isIconMode ? 'size-3.5' : 'size-4',
              status === 'loading' ? 'animate-spin' : undefined
            )}
          />
          {!isIconMode ? ` ${controlLabel}` : null}
        </KangurButton>
      </div>

      {shouldShowFeedback && errorMessage ? (
        <KangurSummaryPanel
          accent='rose'
          className='mt-4'
          description={errorMessage}
          padding='sm'
          tone='accent'
        />
      ) : null}
      {shouldShowFeedback && !errorMessage && fallbackMessage ? (
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
