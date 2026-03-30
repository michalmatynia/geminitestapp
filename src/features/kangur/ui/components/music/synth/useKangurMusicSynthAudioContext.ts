'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveAudioContextCtor } from '../useKangurMusicSynth.utils';
import type { ReverbChain } from '../useKangurMusicSynth.types';

const KANGUR_MUSIC_SYNTH_IDLE_SUSPEND_MS = 30_000;

export function useKangurMusicSynthAudioContext() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const idleSuspendTimeoutRef = useRef<number | null>(null);
  const reverbChainRef = useRef<ReverbChain | null>(null);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const isAudioSupported = useMemo(() => resolveAudioContextCtor() !== null, []);

  const clearAudioContextIdleSuspend = useCallback((): void => {
    if (idleSuspendTimeoutRef.current === null) {
      return;
    }
    window.clearTimeout(idleSuspendTimeoutRef.current);
    idleSuspendTimeoutRef.current = null;
  }, []);

  const scheduleAudioContextIdleSuspend = useCallback(
    (shouldDeferSuspend?: () => boolean): void => {
      clearAudioContextIdleSuspend();
      idleSuspendTimeoutRef.current = window.setTimeout(() => {
        idleSuspendTimeoutRef.current = null;

        const context = audioContextRef.current;
        if (context?.state !== 'running') {
          return;
        }

        if (shouldDeferSuspend?.()) {
          scheduleAudioContextIdleSuspend(shouldDeferSuspend);
          return;
        }

        void context.suspend().catch(() => undefined);
      }, KANGUR_MUSIC_SYNTH_IDLE_SUSPEND_MS);
    },
    [clearAudioContextIdleSuspend]
  );

  const ensureAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    const AudioContextCtor = resolveAudioContextCtor();
    if (!AudioContextCtor) {
      setIsAudioBlocked(false);
      return null;
    }

    clearAudioContextIdleSuspend();

    let context = audioContextRef.current;
    if (!context || context.state === 'closed') {
      context = new AudioContextCtor();
      audioContextRef.current = context;
      compressorNodeRef.current = null;
      reverbChainRef.current = null;
    }

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch {
        // The browser may still require another gesture.
      }
    }

    if (context.state !== 'running') {
      setIsAudioBlocked(true);
      return null;
    }

    setIsAudioBlocked(false);
    return context;
  }, []);

  const closeAudioContext = useCallback(async () => {
    clearAudioContextIdleSuspend();
    const context = audioContextRef.current;
    if (context && context.state !== 'closed') {
      await context.close().catch(() => undefined);
    }
    audioContextRef.current = null;
    compressorNodeRef.current = null;
    reverbChainRef.current = null;
  }, [clearAudioContextIdleSuspend]);

  return {
    audioContextRef,
    compressorNodeRef,
    reverbChainRef,
    isAudioBlocked,
    setIsAudioBlocked,
    isAudioSupported,
    ensureAudioContext,
    clearAudioContextIdleSuspend,
    scheduleAudioContextIdleSuspend,
    closeAudioContext,
  };
}
