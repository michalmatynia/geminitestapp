'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { resolveAudioContextCtor } from '../useKangurMusicSynth.utils';
import type { ReverbChain } from '../useKangurMusicSynth.types';

export function useKangurMusicSynthAudioContext() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const reverbChainRef = useRef<ReverbChain | null>(null);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const isAudioSupported = useMemo(() => resolveAudioContextCtor() !== null, []);

  const ensureAudioContext = useCallback(async (): Promise<AudioContext | null> => {
    const AudioContextCtor = resolveAudioContextCtor();
    if (!AudioContextCtor) {
      setIsAudioBlocked(false);
      return null;
    }

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
    const context = audioContextRef.current;
    if (context && context.state !== 'closed') {
      await context.close().catch(() => undefined);
    }
    audioContextRef.current = null;
    compressorNodeRef.current = null;
    reverbChainRef.current = null;
  }, []);

  return {
    audioContextRef,
    compressorNodeRef,
    reverbChainRef,
    isAudioBlocked,
    setIsAudioBlocked,
    isAudioSupported,
    ensureAudioContext,
    closeAudioContext,
  };
}
