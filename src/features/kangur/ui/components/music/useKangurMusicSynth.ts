'use client';

import { useCallback, useEffect } from 'react';
import type { KangurMusicSynthOsc2Config } from './music-theory';
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
    ensureAudioContext,
    closeAudioContext,
  } = audioContext;

  const playback = useKangurMusicSynthPlayback();
  const {
    activeNodesRef,
    playbackTokenRef,
    isPlayingSequence,
    setIsPlayingSequence,
    clearActivePlayback,
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
    stopSustainedNote,
    stopAllSustainedNotes,
    startSustainedNote,
    updateSustainedNote,
  } = sustained;

  const stop = useCallback((): void => {
    playbackTokenRef.current += 1;
    clearActivePlayback();
    stopAllSustainedNotes({ immediate: true });
    setIsPlayingSequence(false);
  }, [clearActivePlayback, stopAllSustainedNotes, setIsPlayingSequence, playbackTokenRef]);

  const playNote = useCallback(
    async (note: KangurMusicPlayableNote<NoteId>): Promise<boolean> => {
      playbackTokenRef.current += 1;
      setIsPlayingSequence(false);
      return playTone(note, { stopPrevious: false });
    },
    [playTone, setIsPlayingSequence, playbackTokenRef]
  );

  const playSequence = useCallback(
    async (
      notes: readonly KangurMusicPlayableNote<NoteId>[],
      callbacks: KangurMusicSequenceCallbacks<NoteId> = {}
    ): Promise<boolean> => {
      const nextToken = playbackTokenRef.current + 1;
      playbackTokenRef.current = nextToken;
      clearActivePlayback();

      if (notes.length === 0) {
        callbacks.onComplete?.(true);
        return true;
      }

      setIsPlayingSequence(true);

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

        callbacks.onStepStart?.(note, index);
        const started = await playTone(note);
        if (!started) {
          setIsPlayingSequence(false);
          callbacks.onComplete?.(false);
          return false;
        }

        const keepGoing = await waitForPlaybackWindow(
          nextToken,
          Math.max(120, Math.round(note.durationMs ?? DEFAULT_DURATION_MS)) +
            Math.max(0, Math.round(callbacks.gapMs ?? DEFAULT_GAP_MS))
        );
        if (!keepGoing) {
          setIsPlayingSequence(false);
          callbacks.onComplete?.(false);
          return false;
        }
      }

      setIsPlayingSequence(false);
      callbacks.onComplete?.(true);
      return true;
    },
    [clearActivePlayback, playTone, waitForPlaybackWindow, setIsPlayingSequence, playbackTokenRef]
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
