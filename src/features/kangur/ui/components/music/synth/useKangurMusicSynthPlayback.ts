'use client';

import { useCallback, useRef, useState } from 'react';
import { stopActiveNode } from '../useKangurMusicSynth.utils';
import type { ActiveNode } from '../useKangurMusicSynth.types';

export function useKangurMusicSynthPlayback() {
  const activeNodesRef = useRef<ActiveNode[]>([]);
  const isPlayingSequenceRef = useRef(false);
  const playbackTokenRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);
  const [isPlayingSequence, setIsPlayingSequenceState] = useState(false);

  const setIsPlayingSequence = useCallback((value: boolean): void => {
    isPlayingSequenceRef.current = value;
    setIsPlayingSequenceState(value);
  }, []);

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

  const schedulePlaybackTimeout = useCallback(
    (callback: () => void, ms: number): number => {
      const timeoutId = window.setTimeout(() => {
        timeoutIdsRef.current = timeoutIdsRef.current.filter((candidate) => candidate !== timeoutId);
        callback();
      }, Math.max(0, ms));
      timeoutIdsRef.current.push(timeoutId);
      return timeoutId;
    },
    []
  );

  const waitForPlaybackWindow = useCallback(
    (token: number, ms: number): Promise<boolean> =>
      new Promise((resolve) => {
        schedulePlaybackTimeout(() => {
          resolve(playbackTokenRef.current === token);
        }, ms);
      }),
    [schedulePlaybackTimeout]
  );

  return {
    activeNodesRef,
    isPlayingSequenceRef,
    playbackTokenRef,
    timeoutIdsRef,
    isPlayingSequence,
    setIsPlayingSequence,
    clearScheduledTimeouts,
    clearActivePlayback,
    schedulePlaybackTimeout,
    waitForPlaybackWindow,
  };
}
