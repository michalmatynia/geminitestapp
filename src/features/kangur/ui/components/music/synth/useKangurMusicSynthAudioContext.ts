'use client';

// Hook for managing Web Audio API context in Kangur music synthesizer
// Handles audio context lifecycle, idle suspension, and audio processing chain setup
import { useCallback, useMemo, useRef, useState } from 'react';
import { safeClearTimeout, safeSetTimeout } from '@/shared/lib/timers';
import { resolveAudioContextCtor } from '../useKangurMusicSynth.utils';
import type { ReverbChain } from '../useKangurMusicSynth.types';

// Auto-suspend audio context after 30 seconds of inactivity to save resources
const KANGUR_MUSIC_SYNTH_IDLE_SUSPEND_MS = 30_000;

type UseKangurMusicSynthAudioContextResult = {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  compressorNodeRef: React.MutableRefObject<DynamicsCompressorNode | null>;
  reverbChainRef: React.MutableRefObject<ReverbChain | null>;
  isAudioBlocked: boolean; // Tracks if audio is blocked by browser autoplay policy
  setIsAudioBlocked: React.Dispatch<React.SetStateAction<boolean>>;
  isAudioSupported: boolean; // Checks if Web Audio API is available
  ensureAudioContext: () => Promise<AudioContext | null>; // Lazy initialization of audio context
  clearAudioContextIdleSuspend: () => void; // Cancel scheduled suspension
  scheduleAudioContextIdleSuspend: (shouldDeferSuspend?: () => boolean) => void; // Schedule context suspension
  closeAudioContext: () => Promise<void>; // Clean shutdown of audio context
};

/* eslint-disable max-lines-per-function */
/**
 * Custom hook for managing Web Audio API context in the Kangur music synthesizer.
 * 
 * Provides:
 * - Lazy audio context initialization with browser compatibility
 * - Automatic idle suspension to conserve resources
 * - Audio processing chain setup (compressor, reverb)
 * - Autoplay policy handling
 */
export function useKangurMusicSynthAudioContext(): UseKangurMusicSynthAudioContextResult {
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
    safeClearTimeout(idleSuspendTimeoutRef.current);
    idleSuspendTimeoutRef.current = null;
  }, []);

  const scheduleAudioContextIdleSuspend = useCallback(
    (shouldDeferSuspend?: () => boolean): void => {
      clearAudioContextIdleSuspend();
      idleSuspendTimeoutRef.current = safeSetTimeout(() => {
        idleSuspendTimeoutRef.current = null;

        const context = audioContextRef.current;
        if (context?.state !== 'running') {
          return;
        }

        const shouldDefer = shouldDeferSuspend?.();
        if (shouldDefer === true) {
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

  const closeAudioContext = useCallback(async (): Promise<void> => {
    clearAudioContextIdleSuspend();
    const context = audioContextRef.current;
    audioContextRef.current = null;
    compressorNodeRef.current = null;
    reverbChainRef.current = null;
    if (context && context.state !== 'closed') {
      await context.close().catch(() => undefined);
    }
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
/* eslint-enable max-lines-per-function */
