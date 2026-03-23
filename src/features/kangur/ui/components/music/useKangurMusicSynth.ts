'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type KangurMusicPlayableNote<NoteId extends string = string> = {
  durationMs?: number;
  frequencyHz: number;
  gain?: number;
  id: NoteId;
  velocity?: number;
  waveform?: OscillatorType;
};

type KangurMusicSequenceCallbacks<NoteId extends string> = {
  gapMs?: number;
  onComplete?: (completed: boolean) => void;
  onStepStart?: (note: KangurMusicPlayableNote<NoteId>, index: number) => void;
};

type ActiveNode = {
  context: AudioContext;
  gainNode: GainNode;
  oscillator: OscillatorNode;
};

type SustainedNode<NoteId extends string = string> = ActiveNode & {
  id: NoteId;
  interactionId: string;
};

const DEFAULT_DURATION_MS = 420;
const DEFAULT_GAIN = 0.16;
const DEFAULT_GAP_MS = 110;
const ATTACK_MS = 18;
const DEFAULT_VELOCITY = 0.72;
const SUSTAINED_RELEASE_SECONDS = 0.08;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const resolveAudioContextCtor = (): typeof AudioContext | null => {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  const root = globalThis as Record<string, unknown>;
  const ctor = root['AudioContext'] ?? root['webkitAudioContext'];
  return typeof ctor === 'function' ? (ctor as typeof AudioContext) : null;
};

const stopActiveNode = (activeNode: ActiveNode): void => {
  try {
    activeNode.oscillator.stop();
  } catch {
    // Ignore double-stop attempts.
  }

  try {
    activeNode.oscillator.disconnect();
    activeNode.gainNode.disconnect();
  } catch {
    // Ignore teardown errors from closed contexts.
  }
};

const resolveVelocityEnvelope = ({
  durationSeconds,
  velocity,
}: {
  durationSeconds: number;
  velocity: number;
}): {
  attackSeconds: number;
  gain: number;
  releaseSeconds: number;
} => {
  const attackSeconds = Math.max(0.008, (ATTACK_MS * (1.16 - velocity * 0.48)) / 1000);
  const releaseSeconds = Math.min(0.14, durationSeconds * (0.3 + (1 - velocity) * 0.14));
  const gain = clamp(DEFAULT_GAIN * (0.72 + velocity * 0.92), 0.04, 0.38);

  return { attackSeconds, gain, releaseSeconds };
};

const releaseActiveNode = (activeNode: ActiveNode, releaseSeconds = SUSTAINED_RELEASE_SECONDS): void => {
  const now = activeNode.context.currentTime;

  try {
    activeNode.gainNode.gain.cancelScheduledValues(now);
    const currentGain = Math.max(activeNode.gainNode.gain.value, 0.0001);
    activeNode.gainNode.gain.setValueAtTime(currentGain, now);
    activeNode.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseSeconds);
    activeNode.oscillator.stop(now + releaseSeconds + 0.01);
  } catch {
    stopActiveNode(activeNode);
  }
};

export function useKangurMusicSynth<NoteId extends string>() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<ActiveNode[]>([]);
  const sustainedNodesRef = useRef<Map<string, SustainedNode<NoteId>>>(new Map());
  const playbackTokenRef = useRef(0);
  const timeoutIdsRef = useRef<number[]>([]);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const isAudioSupported = useMemo(() => resolveAudioContextCtor() !== null, []);

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

  const stopSustainedNote = useCallback(
    (interactionId: string, options: { immediate?: boolean } = {}): void => {
      const activeNode = sustainedNodesRef.current.get(interactionId);
      if (!activeNode) {
        return;
      }

      sustainedNodesRef.current.delete(interactionId);
      if (options.immediate) {
        stopActiveNode(activeNode);
        return;
      }

      releaseActiveNode(activeNode);
    },
    []
  );

  const stopAllSustainedNotes = useCallback(
    (options: { immediate?: boolean } = {}): void => {
      const interactionIds = [...sustainedNodesRef.current.keys()];
      interactionIds.forEach((interactionId) => {
        stopSustainedNote(interactionId, options);
      });
    },
    [stopSustainedNote]
  );

  const stop = useCallback((): void => {
    playbackTokenRef.current += 1;
    clearActivePlayback();
    stopAllSustainedNotes({ immediate: true });
    setIsPlayingSequence(false);
  }, [clearActivePlayback, stopAllSustainedNotes]);

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

  const playTone = useCallback(
    async (
      note: KangurMusicPlayableNote<NoteId>,
      options: { stopPrevious?: boolean } = {}
    ): Promise<boolean> => {
      if (options.stopPrevious !== false) {
        clearActivePlayback();
      }

      const context = await ensureAudioContext();
      if (!context) {
        return false;
      }

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const durationMs = Math.max(120, Math.round(note.durationMs ?? DEFAULT_DURATION_MS));
      const durationSeconds = durationMs / 1000;
      const now = context.currentTime;
      const velocity = clamp(note.velocity ?? DEFAULT_VELOCITY, 0.22, 1);
      const { attackSeconds, gain, releaseSeconds } = resolveVelocityEnvelope({
        durationSeconds,
        velocity,
      });
      const sustainUntil = Math.max(
        now + attackSeconds + 0.02,
        now + durationSeconds - releaseSeconds
      );
      const baseGain = clamp(note.gain ?? DEFAULT_GAIN, 0.04, 0.24);
      const resolvedGain = clamp(gain * (baseGain / DEFAULT_GAIN), 0.04, 0.38);

      oscillator.type = note.waveform ?? 'triangle';
      oscillator.frequency.setValueAtTime(note.frequencyHz, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(resolvedGain, now + attackSeconds);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, sustainUntil + releaseSeconds);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      const activeNode = { context, oscillator, gainNode };
      activeNodesRef.current.push(activeNode);

      oscillator.onended = (): void => {
        activeNodesRef.current = activeNodesRef.current.filter((candidate) => candidate !== activeNode);
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch {
          // Ignore cleanup errors after playback ends.
        }
      };

      oscillator.start(now);
      oscillator.stop(now + durationSeconds);

      return true;
    },
    [clearActivePlayback, ensureAudioContext]
  );

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

  const playNote = useCallback(
    async (note: KangurMusicPlayableNote<NoteId>): Promise<boolean> => {
      playbackTokenRef.current += 1;
      setIsPlayingSequence(false);
      return playTone(note);
    },
    [playTone]
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
    [clearActivePlayback, playTone, waitForPlaybackWindow]
  );

  const startSustainedNote = useCallback(
    async (
      note: KangurMusicPlayableNote<NoteId>,
      options: { interactionId: string }
    ): Promise<boolean> => {
      playbackTokenRef.current += 1;
      clearActivePlayback();
      setIsPlayingSequence(false);

      const context = await ensureAudioContext();
      if (!context) {
        return false;
      }

      stopSustainedNote(options.interactionId, { immediate: true });

      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const now = context.currentTime;
      const velocity = clamp(note.velocity ?? DEFAULT_VELOCITY, 0.22, 1);
      const { attackSeconds, gain } = resolveVelocityEnvelope({
        durationSeconds: 1,
        velocity,
      });
      const baseGain = clamp(note.gain ?? DEFAULT_GAIN, 0.04, 0.24);
      const resolvedGain = clamp(gain * (baseGain / DEFAULT_GAIN), 0.04, 0.38);

      oscillator.type = note.waveform ?? 'sawtooth';
      oscillator.frequency.setValueAtTime(note.frequencyHz, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(resolvedGain, now + attackSeconds);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      const sustainedNode: SustainedNode<NoteId> = {
        context,
        gainNode,
        id: note.id,
        interactionId: options.interactionId,
        oscillator,
      };
      sustainedNodesRef.current.set(options.interactionId, sustainedNode);

      oscillator.onended = (): void => {
        const activeNode = sustainedNodesRef.current.get(options.interactionId);
        if (activeNode === sustainedNode) {
          sustainedNodesRef.current.delete(options.interactionId);
        }
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch {
          // Ignore cleanup errors after playback ends.
        }
      };

      oscillator.start(now);
      return true;
    },
    [clearActivePlayback, ensureAudioContext, stopSustainedNote]
  );

  const updateSustainedNote = useCallback(
    ({
      frequencyHz,
      interactionId,
      velocity,
    }: {
      frequencyHz: number;
      interactionId: string;
      velocity?: number;
    }): boolean => {
      const activeNode = sustainedNodesRef.current.get(interactionId);
      if (!activeNode) {
        return false;
      }

      const now = activeNode.context.currentTime;
      activeNode.oscillator.frequency.cancelScheduledValues(now);
      activeNode.oscillator.frequency.linearRampToValueAtTime(frequencyHz, now + 0.03);

      if (velocity !== undefined) {
        const normalizedVelocity = clamp(velocity, 0.22, 1);
        const { gain } = resolveVelocityEnvelope({
          durationSeconds: 1,
          velocity: normalizedVelocity,
        });
        activeNode.gainNode.gain.cancelScheduledValues(now);
        activeNode.gainNode.gain.linearRampToValueAtTime(gain, now + 0.04);
      }

      return true;
    },
    []
  );

  useEffect(() => {
    return () => {
      stop();
      const context = audioContextRef.current;
      if (context && context.state !== 'closed') {
        void context.close().catch(() => undefined);
      }
      audioContextRef.current = null;
    };
  }, [stop]);

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
