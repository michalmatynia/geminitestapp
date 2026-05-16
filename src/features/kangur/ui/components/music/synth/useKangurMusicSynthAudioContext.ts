'use client';

// Hook for managing Web Audio API context in Kangur music synthesizer
// Handles audio context lifecycle, idle suspension, and audio processing chain setup
import { useCallback, useMemo, useRef, useState } from 'react';
import { safeClearTimeout, safeSetTimeout, type SafeTimerId } from '@/shared/lib/timers';
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

type AudioContextRefs = {
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  compressorNodeRef: React.MutableRefObject<DynamicsCompressorNode | null>;
  idleSuspendTimeoutRef: React.MutableRefObject<SafeTimerId | null>;
  reverbChainRef: React.MutableRefObject<ReverbChain | null>;
};

const useAudioContextIdleSuspend = ({
  audioContextRef,
  idleSuspendTimeoutRef,
}: Pick<AudioContextRefs, 'audioContextRef' | 'idleSuspendTimeoutRef'>): {
  clearAudioContextIdleSuspend: () => void;
  scheduleAudioContextIdleSuspend: (shouldDeferSuspend?: () => boolean) => void;
} => {
  const audioContext = audioContextRef;
  const idleSuspendTimeout = idleSuspendTimeoutRef;
  const clearAudioContextIdleSuspend = useCallback((): void => {
    if (idleSuspendTimeout.current === null) {
      return;
    }
    safeClearTimeout(idleSuspendTimeout.current);
    idleSuspendTimeout.current = null;
  }, [idleSuspendTimeout]);

  const scheduleAudioContextIdleSuspend = useCallback(
    (shouldDeferSuspend?: () => boolean): void => {
      clearAudioContextIdleSuspend();
      idleSuspendTimeout.current = safeSetTimeout(() => {
        idleSuspendTimeout.current = null;

        const context = audioContext.current;
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
    [audioContext, clearAudioContextIdleSuspend, idleSuspendTimeout]
  );

  return { clearAudioContextIdleSuspend, scheduleAudioContextIdleSuspend };
};

const useEnsureAudioContext = ({
  audioContextRef,
  clearAudioContextIdleSuspend,
  compressorNodeRef,
  reverbChainRef,
  setIsAudioBlocked,
}: Omit<AudioContextRefs, 'idleSuspendTimeoutRef'> & {
  clearAudioContextIdleSuspend: () => void;
  setIsAudioBlocked: React.Dispatch<React.SetStateAction<boolean>>;
}): (() => Promise<AudioContext | null>) => {
  const audioContext = audioContextRef;
  const compressorNode = compressorNodeRef;
  const reverbChain = reverbChainRef;
  return useCallback(async (): Promise<AudioContext | null> => {
    const AudioContextCtor = resolveAudioContextCtor();
    if (AudioContextCtor === null) {
      setIsAudioBlocked(false);
      return null;
    }

    clearAudioContextIdleSuspend();

    let context = audioContext.current;
    if (context === null || context.state === 'closed') {
      context = new AudioContextCtor();
      audioContext.current = context;
      compressorNode.current = null;
      reverbChain.current = null;
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
  }, [
    audioContext,
    clearAudioContextIdleSuspend,
    compressorNode,
    reverbChain,
    setIsAudioBlocked,
  ]);
};

const useCloseAudioContext = ({
  audioContextRef,
  clearAudioContextIdleSuspend,
  compressorNodeRef,
  reverbChainRef,
}: Omit<AudioContextRefs, 'idleSuspendTimeoutRef'> & {
  clearAudioContextIdleSuspend: () => void;
}): (() => Promise<void>) => {
  const audioContext = audioContextRef;
  const compressorNode = compressorNodeRef;
  const reverbChain = reverbChainRef;
  return useCallback(async (): Promise<void> => {
    clearAudioContextIdleSuspend();
    const context = audioContext.current;
    audioContext.current = null;
    compressorNode.current = null;
    reverbChain.current = null;
    if (context !== null && context.state !== 'closed') {
      await context.close().catch(() => undefined);
    }
  }, [audioContext, clearAudioContextIdleSuspend, compressorNode, reverbChain]);
};

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
  const idleSuspendTimeoutRef = useRef<SafeTimerId | null>(null);
  const reverbChainRef = useRef<ReverbChain | null>(null);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const isAudioSupported = useMemo(() => resolveAudioContextCtor() !== null, []);
  const { clearAudioContextIdleSuspend, scheduleAudioContextIdleSuspend } =
    useAudioContextIdleSuspend({ audioContextRef, idleSuspendTimeoutRef });
  const ensureAudioContext = useEnsureAudioContext({
    audioContextRef,
    clearAudioContextIdleSuspend,
    compressorNodeRef,
    reverbChainRef,
    setIsAudioBlocked,
  });
  const closeAudioContext = useCloseAudioContext({
    audioContextRef,
    clearAudioContextIdleSuspend,
    compressorNodeRef,
    reverbChainRef,
  });

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
