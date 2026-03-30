'use client';

import { useCallback, useRef, useState } from 'react';
import { stopActiveNode } from '../useKangurMusicSynth.utils';
import type { ActiveNode } from '../useKangurMusicSynth.types';

export function useKangurMusicSynthPlayback() {
  const activeNodesRef = useRef<ActiveNode[]>([]);
  const playbackTokenRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);

  const clearScheduledTimeouts = useCallback((): void => {
    timeoutIdsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    timeoutIdsRef.current = [];
  }, []);

  const clearActivePlayback = useCallback((): void => {
    clearScheduledTimeouts();
    activeNodesRef.current.forEach(stopActiveNode);
    activeNodesRef.current = [];
  }, [clearScheduledTimeouts]);

  const waitForPlaybackWindow = useCallback(
    (token: number, ms: number): Promise<boolean> =>
      new Promise((resolve) => {
        const timeoutId = window.setTimeout(() => {
          timeoutIdsRef.current = timeoutIdsRef.current.filter((candidate) => candidate !== timeoutId);
          resolve(playbackTokenRef.current === token);
        }, ms);
        timeoutIdsRef.current.push(timeoutId);
      }),
    []
  );

  return {
    activeNodesRef,
    playbackTokenRef,
    timeoutIdsRef,
    isPlayingSequence,
    setIsPlayingSequence,
    clearScheduledTimeouts,
    clearActivePlayback,
    waitForPlaybackWindow,
  };
}
