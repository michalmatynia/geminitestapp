'use client';

import { useCallback, useEffect } from 'react';
import {
  DEFAULT_DURATION_MS,
  DEFAULT_GAP_MS,
  KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE,
  type KangurMusicPlayableNote,
  type KangurMusicSequenceCallbacks,
  type KangurMusicSynthEnvelope,
} from './useKangurMusicSynth.types';
import { normalizeKangurMusicSynthEnvelope } from './useKangurMusicSynth.utils';
import { useKangurMusicSynthAudioContext } from './synth/useKangurMusicSynthAudioContext';
import { useKangurMusicSynthPlayback } from './synth/useKangurMusicSynthPlayback';
import { useKangurMusicSynthSustainedEngine } from './synth/useKangurMusicSynthSustainedEngine';
import { useKangurMusicSynthTransient } from './synth/useKangurMusicSynthTransient';

export function useKangurMusicSynth<NoteId extends string>() {
  const audioContext = useKangurMusicSynthAudioContext();
  const {
    audioContextRef,
    compressorNodeRef,
    reverbChainRef,
    isAudioBlocked,
    isAudioSupported,
    scheduleAudioContextIdleSuspend,
    ensureAudioContext,
    closeAudioContext,
  } = audioContext;

  const playback = useKangurMusicSynthPlayback();
  const {
    activeNodesRef,
    isPlayingSequenceRef,
    playbackTokenRef,
    isPlayingSequence,
    setIsPlayingSequence,
    clearActivePlayback,
    schedulePlaybackTimeout,
    waitForPlaybackWindow,
  } = playback;

  const transient = useKangurMusicSynthTransient(
    audioContextRef,
    compressorNodeRef,
    reverbChainRef,
    activeNodesRef,
    ensureAudioContext,
    clearActivePlayback
  );
  const { playTone } = transient;

  const sustained = useKangurMusicSynthSustainedEngine<NoteId>(
    audioContextRef,
    compressorNodeRef,
    reverbChainRef,
    ensureAudioContext,
    clearActivePlayback
  );
  const {
    sustainedNodesRef,
    stopSustainedNote: stopSustainedNoteInternal,
    stopAllSustainedNotes: stopAllSustainedNotesInternal,
    startSustainedNote: startSustainedNoteInternal,
    updateSustainedNote: updateSustainedNoteInternal,
  } = sustained;

  const refreshAudioContextIdleSuspend = useCallback((): void => {
    scheduleAudioContextIdleSuspend(
      () =>
        activeNodesRef.current.length > 0 ||
        sustainedNodesRef.current.size > 0 ||
        isPlayingSequenceRef.current
    );
  }, [activeNodesRef, isPlayingSequenceRef, scheduleAudioContextIdleSuspend, sustainedNodesRef]);

  const stop = useCallback((): void => {
    playbackTokenRef.current += 1;
    clearActivePlayback();
    stopAllSustainedNotesInternal({ immediate: true });
    setIsPlayingSequence(false);
    refreshAudioContextIdleSuspend();
  }, [
    clearActivePlayback,
    stopAllSustainedNotesInternal,
    setIsPlayingSequence,
    playbackTokenRef,
    refreshAudioContextIdleSuspend,
  ]);

  const playNote = useCallback(
    async (note: KangurMusicPlayableNote<NoteId>): Promise<boolean> => {
      playbackTokenRef.current += 1;
      setIsPlayingSequence(false);
      const started = await playTone(note, { stopPrevious: false });
      if (started) {
        refreshAudioContextIdleSuspend();
      }
      return started;
    },
    [playTone, setIsPlayingSequence, playbackTokenRef, refreshAudioContextIdleSuspend]
  );

  const playSequence = useCallback(
    async (
      notes: readonly KangurMusicPlayableNote<NoteId>[],
      callbacks: KangurMusicSequenceCallbacks<NoteId> = {}
    ): Promise<boolean> => {
      setIsPlayingSequence(true);
      const context = await ensureAudioContext();
      if (!context) {
        setIsPlayingSequence(false);
        callbacks.onComplete?.(false);
        return false;
      }

      const nextToken = playbackTokenRef.current + 1;
      playbackTokenRef.current = nextToken;
      clearActivePlayback();

      if (notes.length === 0) {
        setIsPlayingSequence(false);
        callbacks.onComplete?.(true);
        return true;
      }

      const gapMs = Math.max(0, Math.round(callbacks.gapMs ?? DEFAULT_GAP_MS));
      const sequenceStartTimeSeconds = context.currentTime;
      let elapsedSequenceMs = 0;

      for (let index = 0; index < notes.length; index += 1) {
        if (playbackTokenRef.current !== nextToken) {
          setIsPlayingSequence(false);
          callbacks.onComplete?.(false);
          return false;
        }

        const note = notes[index];
        if (!note) {
          continue;
        }

        schedulePlaybackTimeout(() => {
          if (playbackTokenRef.current !== nextToken) {
            return;
          }
          callbacks.onStepStart?.(note, index);
        }, elapsedSequenceMs);
        const started = await playTone(note, {
          polyphonyLimit: Math.max(notes.length, 1),
          startAtTimeSeconds: sequenceStartTimeSeconds + elapsedSequenceMs / 1000,
          stopPrevious: false,
        });
        if (!started) {
          setIsPlayingSequence(false);
          callbacks.onComplete?.(false);
          return false;
        }
        refreshAudioContextIdleSuspend();

        elapsedSequenceMs += Math.max(120, Math.round(note.durationMs ?? DEFAULT_DURATION_MS)) + gapMs;
      }

      const keepGoing = await waitForPlaybackWindow(
        nextToken,
        elapsedSequenceMs
      );
      if (!keepGoing) {
        setIsPlayingSequence(false);
        callbacks.onComplete?.(false);
        return false;
      }

      setIsPlayingSequence(false);
      refreshAudioContextIdleSuspend();
      callbacks.onComplete?.(true);
      return true;
    },
    [
      clearActivePlayback,
      playTone,
      ensureAudioContext,
      schedulePlaybackTimeout,
      waitForPlaybackWindow,
      setIsPlayingSequence,
      playbackTokenRef,
      refreshAudioContextIdleSuspend,
    ]
  );

  const startSustainedNote = useCallback(
    async (
      note: KangurMusicPlayableNote<NoteId>,
      options: Parameters<typeof startSustainedNoteInternal>[1]
    ): Promise<boolean> => {
      const started = await startSustainedNoteInternal(note, options);
      if (started) {
        refreshAudioContextIdleSuspend();
      }
      return started;
    },
    [refreshAudioContextIdleSuspend, startSustainedNoteInternal]
  );

  const stopSustainedNote = useCallback(
    (...args: Parameters<typeof stopSustainedNoteInternal>): void => {
      stopSustainedNoteInternal(...args);
      refreshAudioContextIdleSuspend();
    },
    [refreshAudioContextIdleSuspend, stopSustainedNoteInternal]
  );

  const stopAllSustainedNotes = useCallback(
    (...args: Parameters<typeof stopAllSustainedNotesInternal>): void => {
      stopAllSustainedNotesInternal(...args);
      refreshAudioContextIdleSuspend();
    },
    [refreshAudioContextIdleSuspend, stopAllSustainedNotesInternal]
  );

  const updateSustainedNote = useCallback(
    (...args: Parameters<typeof updateSustainedNoteInternal>): boolean => {
      const updated = updateSustainedNoteInternal(...args);
      if (updated) {
        refreshAudioContextIdleSuspend();
      }
      return updated;
    },
    [refreshAudioContextIdleSuspend, updateSustainedNoteInternal]
  );

  useEffect(() => {
    return () => {
      stop();
      void closeAudioContext();
    };
  }, [stop, closeAudioContext]);

  return {
    isAudioBlocked,
    isAudioSupported,
    isPlayingSequence,
    playNote,
    playSequence,
    startSustainedNote,
    stop,
    stopAllSustainedNotes,
    stopSustainedNote,
    updateSustainedNote,
  };
}

export type { KangurMusicPlayableNote, KangurMusicSequenceCallbacks };
export { KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE, normalizeKangurMusicSynthEnvelope };
export type { KangurMusicSynthEnvelope };
