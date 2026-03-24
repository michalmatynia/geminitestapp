'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type KangurMusicPlayableNote<NoteId extends string = string> = {
  brightness?: number;
  durationMs?: number;
  frequencyHz: number;
  gain?: number;
  id: NoteId;
  stereoPan?: number;
  velocity?: number;
  vibratoDepth?: number;
  vibratoRateHz?: number;
  waveform?: OscillatorType;
};

type KangurMusicSequenceCallbacks<NoteId extends string> = {
  gapMs?: number;
  onComplete?: (completed: boolean) => void;
  onStepStart?: (note: KangurMusicPlayableNote<NoteId>, index: number) => void;
};

type ActiveNode = {
  blendGainNode?: GainNode;
  blendGainNode3?: GainNode;
  context: AudioContext;
  filterNode?: BiquadFilterNode;
  gainNode: GainNode;
  lfoGainNode?: GainNode;
  lfoOscillator?: OscillatorNode;
  oscillator: OscillatorNode;
  oscillator2?: OscillatorNode;
  oscillator3?: OscillatorNode;
  reverbSendGainNode?: GainNode;
  stereoPannerNode?: StereoPannerNode;
  transientGainNode?: GainNode;
  transientOscillator?: OscillatorNode;
  waveShaperNode?: WaveShaperNode;
};

type SustainedNode<NoteId extends string = string> = ActiveNode & {
  currentFrequencyHz: number;
  id: NoteId;
  interactionId: string;
  stereoPan: number;
  vibratoDepth: number;
  vibratoRateHz: number;
};

const DEFAULT_DURATION_MS = 420;
const DEFAULT_GAIN = 0.20;
const DEFAULT_GAP_MS = 110;
const ATTACK_MS = 12;
const DEFAULT_VELOCITY = 0.72;
const DEFAULT_VIBRATO_RATE_HZ = 5.2;
const SUSTAINED_RELEASE_SECONDS = 0.06;
const MAX_TRANSIENT_POLYPHONY = 6;
const MAX_SUSTAINED_POLYPHONY = 4;
const VOICE_STEAL_RELEASE_SECONDS = 0.03;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const resolvePortamentoSeconds = (
  previousFrequencyHz: number,
  nextFrequencyHz: number
): number => {
  if (
    !Number.isFinite(previousFrequencyHz) ||
    !Number.isFinite(nextFrequencyHz) ||
    previousFrequencyHz <= 0 ||
    nextFrequencyHz <= 0
  ) {
    return 0.008;
  }

  const semitoneDelta = Math.abs(12 * Math.log2(nextFrequencyHz / previousFrequencyHz));
  return clamp(Number((0.008 + semitoneDelta * 0.005).toFixed(3)), 0.008, 0.04);
};

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
    activeNode.oscillator2?.stop();
    activeNode.oscillator3?.stop();
    activeNode.lfoOscillator?.stop();
    activeNode.transientOscillator?.stop();
  } catch {
    // Ignore double-stop attempts.
  }

  try {
    activeNode.oscillator.disconnect();
    activeNode.oscillator2?.disconnect();
    activeNode.oscillator3?.disconnect();
    activeNode.lfoOscillator?.disconnect();
    activeNode.transientOscillator?.disconnect();
    activeNode.gainNode.disconnect();
    activeNode.blendGainNode?.disconnect();
    activeNode.blendGainNode3?.disconnect();
    activeNode.filterNode?.disconnect();
    activeNode.lfoGainNode?.disconnect();
    activeNode.reverbSendGainNode?.disconnect();
    activeNode.stereoPannerNode?.disconnect();
    activeNode.transientGainNode?.disconnect();
    activeNode.waveShaperNode?.disconnect();
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

const resolveBrightness = (
  noteBrightness: number | undefined,
  velocity: number
): number => clamp(noteBrightness ?? 0.26 + velocity * 0.74, 0.18, 1);

const resolvePianoFilterProfile = (brightness: number): { attackHz: number; sustainHz: number; q: number } => ({
  attackHz: 3200 + brightness * 5600,
  sustainHz: 1500 + brightness * 2400,
  q: 0.45 + brightness * 1.1,
});

const resolveSustainedFilterHz = (brightness: number, velocity: number): number =>
  1400 + brightness * 2400 + velocity * 1000;

const resolveVibratoDepthHz = (frequencyHz: number, vibratoDepth = 0): number =>
  clamp(frequencyHz * clamp(vibratoDepth, 0, 1) * 0.0075, 0, 6.5);

const resolveLfoRateHz = (vibratoRateHz: number | undefined): number =>
  clamp(vibratoRateHz ?? DEFAULT_VIBRATO_RATE_HZ, 3.6, 7.0);

const resolveStereoPan = (stereoPan: number | undefined): number =>
  clamp(stereoPan ?? 0, -0.72, 0.72);

const resolveReverbSendGain = ({
  brightness,
  sustained = false,
  velocity,
}: {
  brightness: number;
  sustained?: boolean;
  velocity: number;
}): number =>
  clamp(
    (sustained ? 0.06 : 0.08) + brightness * (sustained ? 0.08 : 0.1) + velocity * 0.04,
    0.05,
    sustained ? 0.2 : 0.24
  );

const releaseActiveNode = (activeNode: ActiveNode, releaseSeconds = SUSTAINED_RELEASE_SECONDS): void => {
  const now = activeNode.context.currentTime;

  try {
    activeNode.gainNode.gain.cancelScheduledValues(now);
    const currentGain = Math.max(activeNode.gainNode.gain.value, 0.0001);
    activeNode.gainNode.gain.setValueAtTime(currentGain, now);
    activeNode.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseSeconds);
    activeNode.oscillator.stop(now + releaseSeconds + 0.01);
    activeNode.oscillator2?.stop(now + releaseSeconds + 0.01);
    activeNode.oscillator3?.stop(now + releaseSeconds + 0.01);
    activeNode.lfoOscillator?.stop(now + releaseSeconds + 0.01);
  } catch {
    stopActiveNode(activeNode);
  }
};

const trimTransientPolyphony = (
  activeNodesRef: { current: ActiveNode[] },
  limit = MAX_TRANSIENT_POLYPHONY
): void => {
  while (activeNodesRef.current.length > limit) {
    const stolenNode = activeNodesRef.current.shift();
    if (!stolenNode) {
      return;
    }

    releaseActiveNode(stolenNode, VOICE_STEAL_RELEASE_SECONDS);
  }
};

const trimSustainedPolyphony = <NoteId extends string>(
  sustainedNodesRef: { current: Map<string, SustainedNode<NoteId>> },
  limit = MAX_SUSTAINED_POLYPHONY
): void => {
  while (sustainedNodesRef.current.size > limit) {
    const oldestInteractionId = sustainedNodesRef.current.keys().next().value;
    if (!oldestInteractionId) {
      return;
    }

    const stolenNode = sustainedNodesRef.current.get(oldestInteractionId);
    sustainedNodesRef.current.delete(oldestInteractionId);
    if (stolenNode) {
      releaseActiveNode(stolenNode, VOICE_STEAL_RELEASE_SECONDS);
    }
  }
};

// Precomputed tanh soft-clip curve — adds 2nd/3rd harmonic warmth without audible distortion.
// Oversample '2x' is set on the node; computed once at module level to avoid per-note allocations.
// Float32Array.from() returns Float32Array<ArrayBuffer> which satisfies WaveShaperNode.curve.
const WAVE_SHAPER_CURVE: Float32Array<ArrayBuffer> = (() => {
  const samples = 256;
  const norm = Math.tanh(2.5);
  return Float32Array.from(
    { length: samples },
    (_, i) => Math.tanh(2.5 * ((i * 2) / samples - 1)) / norm
  );
})();

type ReverbChain = {
  convolver: ConvolverNode;
  outputGain: GainNode;
};

// Synthesizes a short exponentially-decaying stereo noise impulse response —
// approximates a small bright room without needing an external IR file.
const buildReverbImpulse = (context: AudioContext): AudioBuffer => {
  const length = Math.round(context.sampleRate * 1.1);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.0);
    }
  }
  return impulse;
};

const ensureReverbChain = (
  context: AudioContext,
  reverbRef: { current: ReverbChain | null },
  compressor: DynamicsCompressorNode
): ReverbChain => {
  if (reverbRef.current) {
    return reverbRef.current;
  }

  const convolver = context.createConvolver();
  convolver.buffer = buildReverbImpulse(context);
  convolver.normalize = true;
  const outputGain = context.createGain();
  outputGain.gain.value = 0.20;
  convolver.connect(outputGain);
  outputGain.connect(compressor);
  reverbRef.current = { convolver, outputGain };
  return reverbRef.current;
};

const ensureCompressorNode = (
  context: AudioContext,
  compressorRef: { current: DynamicsCompressorNode | null }
): DynamicsCompressorNode => {
  if (compressorRef.current) {
    return compressorRef.current;
  }

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 6;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.10;
  compressor.connect(context.destination);
  compressorRef.current = compressor;
  return compressor;
};

export function useKangurMusicSynth<NoteId extends string>() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const reverbChainRef = useRef<ReverbChain | null>(null);
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
      const brightness = resolveBrightness(note.brightness, velocity);
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

      const filterNode = context.createBiquadFilter();
      filterNode.type = 'lowpass';
      const pianoFilterProfile = resolvePianoFilterProfile(brightness);
      // Bright on attack, warm on sustain — now scaled by interaction brightness.
      filterNode.frequency.setValueAtTime(pianoFilterProfile.attackHz, now);
      filterNode.frequency.exponentialRampToValueAtTime(
        pianoFilterProfile.sustainHz,
        now + durationSeconds
      );
      filterNode.Q.value = pianoFilterProfile.q;

      // Second oscillator: detuned sine blended by brightness for harmonic richness / subtle beating.
      const oscillator2 = context.createOscillator();
      const blendGainNode = context.createGain();
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(note.frequencyHz, now);
      oscillator2.detune.value = 4;
      blendGainNode.gain.value = 0.22 + brightness * 0.24;

      // A short upper-partial transient gives the piano mode more definition on note onset.
      const transientOscillator = context.createOscillator();
      const transientGainNode = context.createGain();
      transientOscillator.type = brightness > 0.72 ? 'square' : 'triangle';
      transientOscillator.frequency.setValueAtTime(note.frequencyHz * 2, now);
      transientGainNode.gain.setValueAtTime(
        clamp(resolvedGain * (0.12 + brightness * 0.18), 0.0001, 0.12),
        now
      );
      transientGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      const waveShaperNode = context.createWaveShaper();
      waveShaperNode.curve = WAVE_SHAPER_CURVE;
      waveShaperNode.oversample = '2x';

      const compressor = ensureCompressorNode(context, compressorNodeRef);
      const reverbChain = ensureReverbChain(context, reverbChainRef, compressor);
      const reverbSendGainNode = context.createGain();
      reverbSendGainNode.gain.setValueAtTime(
        resolveReverbSendGain({ brightness, velocity }),
        now
      );

      oscillator.type = note.waveform ?? 'triangle';
      oscillator.frequency.setValueAtTime(note.frequencyHz, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(resolvedGain, now + attackSeconds);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, sustainUntil + releaseSeconds);

      oscillator.connect(gainNode);
      oscillator2.connect(blendGainNode);
      blendGainNode.connect(gainNode);
      transientOscillator.connect(transientGainNode);
      // Transient bypasses the waveshaper to keep its attack click clean and precise.
      transientGainNode.connect(filterNode);
      gainNode.connect(waveShaperNode);
      waveShaperNode.connect(filterNode);
      filterNode.connect(compressor);
      filterNode.connect(reverbSendGainNode);
      reverbSendGainNode.connect(reverbChain.convolver);

      const activeNode = {
        blendGainNode,
        context,
        filterNode,
        gainNode,
        oscillator,
        oscillator2,
        reverbSendGainNode,
        transientGainNode,
        transientOscillator,
        waveShaperNode,
      };
      activeNodesRef.current.push(activeNode);
      trimTransientPolyphony(activeNodesRef);

      oscillator.onended = (): void => {
        activeNodesRef.current = activeNodesRef.current.filter((candidate) => candidate !== activeNode);
        try {
          oscillator2.stop();
          transientOscillator.stop();
        } catch {
          // Ignore double-stop.
        }
        try {
          oscillator.disconnect();
          oscillator2.disconnect();
          blendGainNode.disconnect();
          gainNode.disconnect();
          reverbSendGainNode.disconnect();
          waveShaperNode.disconnect();
          filterNode.disconnect();
          transientOscillator.disconnect();
          transientGainNode.disconnect();
        } catch {
          // Ignore cleanup errors after playback ends.
        }
      };

      oscillator.start(now);
      oscillator2.start(now);
      transientOscillator.start(now);
      transientOscillator.stop(now + 0.045);
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
      return playTone(note, { stopPrevious: false });
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
      const oscillator2 = context.createOscillator();
      const blendGainNode = context.createGain();
      const gainNode = context.createGain();
      const now = context.currentTime;
      const velocity = clamp(note.velocity ?? DEFAULT_VELOCITY, 0.22, 1);
      const brightness = resolveBrightness(note.brightness, velocity);
      const stereoPan = resolveStereoPan(note.stereoPan);
      const vibratoDepth = clamp(note.vibratoDepth ?? 0, 0, 1);
      const vibratoRateHz = resolveLfoRateHz(note.vibratoRateHz);
      const { attackSeconds, gain } = resolveVelocityEnvelope({
        durationSeconds: 1,
        velocity,
      });
      const baseGain = clamp(note.gain ?? DEFAULT_GAIN, 0.04, 0.24);
      const resolvedGain = clamp(gain * (baseGain / DEFAULT_GAIN), 0.04, 0.38);

      // Low-pass filter: tames sawtooth upper harmonics for a warmer synth pad sound.
      const filterNode = context.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(resolveSustainedFilterHz(brightness, velocity) + 900, now);
      filterNode.frequency.linearRampToValueAtTime(
        resolveSustainedFilterHz(brightness, velocity),
        now + attackSeconds + 0.18
      );
      filterNode.Q.value = 0.7 + brightness * 0.9;

      // Vibrato LFO: fades in after attack so the onset is clean, then adds expression.
      const lfoOscillator = context.createOscillator();
      const lfoGainNode = context.createGain();
      lfoOscillator.type = 'sine';
      lfoOscillator.frequency.value = vibratoRateHz;
      lfoGainNode.gain.setValueAtTime(0, now);
      lfoGainNode.gain.linearRampToValueAtTime(
        resolveVibratoDepthHz(note.frequencyHz, vibratoDepth),
        now + attackSeconds + 0.15
      );

      // Third unison voice: sawtooth at +9 cents spreads the sound wide.
      const oscillator3 = context.createOscillator();
      const blend3GainNode = context.createGain();
      oscillator3.type = note.waveform ?? 'sawtooth';
      oscillator3.frequency.setValueAtTime(note.frequencyHz, now);
      oscillator3.detune.value = 9;
      blend3GainNode.gain.setValueAtTime(0.26 + brightness * 0.12, now);

      const compressor = ensureCompressorNode(context, compressorNodeRef);
      const reverbChain = ensureReverbChain(context, reverbChainRef, compressor);
      const reverbSendGainNode = context.createGain();
      const stereoPannerNode =
        typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
      reverbSendGainNode.gain.setValueAtTime(
        resolveReverbSendGain({ brightness, sustained: true, velocity }),
        now
      );
      stereoPannerNode?.pan.setValueAtTime(stereoPan, now);

      oscillator.type = note.waveform ?? 'sawtooth';
      oscillator.frequency.setValueAtTime(note.frequencyHz, now);
      oscillator2.type = note.waveform === 'square' ? 'triangle' : 'sine';
      oscillator2.frequency.setValueAtTime(note.frequencyHz, now);
      oscillator2.detune.value = -7;
      blendGainNode.gain.setValueAtTime(0.18 + brightness * 0.16, now);

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(resolvedGain, now + attackSeconds);

      lfoOscillator.connect(lfoGainNode);
      // LFO modulates all three oscillators so the unison voices move together.
      lfoGainNode.connect(oscillator.frequency);
      lfoGainNode.connect(oscillator2.frequency);
      lfoGainNode.connect(oscillator3.frequency);
      oscillator.connect(gainNode);
      oscillator2.connect(blendGainNode);
      blendGainNode.connect(gainNode);
      oscillator3.connect(blend3GainNode);
      blend3GainNode.connect(gainNode);
      gainNode.connect(filterNode);
      if (stereoPannerNode) {
        filterNode.connect(stereoPannerNode);
        stereoPannerNode.connect(compressor);
      } else {
        filterNode.connect(compressor);
      }
      filterNode.connect(reverbSendGainNode);
      reverbSendGainNode.connect(reverbChain.convolver);

      const sustainedNode: SustainedNode<NoteId> = {
        blendGainNode,
        blendGainNode3: blend3GainNode,
        context,
        currentFrequencyHz: note.frequencyHz,
        filterNode,
        gainNode,
        id: note.id,
        interactionId: options.interactionId,
        lfoGainNode,
        lfoOscillator,
        oscillator,
        oscillator2,
        oscillator3,
        reverbSendGainNode,
        stereoPan,
        stereoPannerNode: stereoPannerNode ?? undefined,
        vibratoDepth,
        vibratoRateHz,
      };
      sustainedNodesRef.current.set(options.interactionId, sustainedNode);
      trimSustainedPolyphony(sustainedNodesRef);

      oscillator.onended = (): void => {
        const activeNode = sustainedNodesRef.current.get(options.interactionId);
        if (activeNode === sustainedNode) {
          sustainedNodesRef.current.delete(options.interactionId);
        }
        try {
          lfoOscillator.stop();
          oscillator2.stop();
          oscillator3.stop();
          lfoOscillator.disconnect();
          lfoGainNode.disconnect();
          oscillator.disconnect();
          oscillator2.disconnect();
          blendGainNode.disconnect();
          oscillator3.disconnect();
          blend3GainNode.disconnect();
          gainNode.disconnect();
          reverbSendGainNode.disconnect();
          stereoPannerNode?.disconnect();
          filterNode.disconnect();
        } catch {
          // Ignore cleanup errors after playback ends.
        }
      };

      oscillator.start(now);
      oscillator2.start(now);
      oscillator3.start(now);
      lfoOscillator.start(now);
      return true;
    },
    [clearActivePlayback, ensureAudioContext, stopSustainedNote]
  );

  const updateSustainedNote = useCallback(
    ({
      brightness,
      frequencyHz,
      interactionId,
      stereoPan,
      velocity,
      vibratoDepth,
      vibratoRateHz,
    }: {
      brightness?: number;
      frequencyHz: number;
      interactionId: string;
      stereoPan?: number;
      velocity?: number;
      vibratoDepth?: number;
      vibratoRateHz?: number;
    }): boolean => {
      const activeNode = sustainedNodesRef.current.get(interactionId);
      if (!activeNode) {
        return false;
      }

      const now = activeNode.context.currentTime;
      const portamentoSeconds = resolvePortamentoSeconds(
        activeNode.currentFrequencyHz,
        frequencyHz
      );
      // cancelScheduledValues removes the previously-scheduled ramp but leaves the
      // AudioParam with no explicit start point — setValueAtTime pins the current
      // value so the next linearRamp has a well-defined origin and cannot glitch.
      activeNode.oscillator.frequency.cancelScheduledValues(now);
      activeNode.oscillator.frequency.setValueAtTime(activeNode.oscillator.frequency.value, now);
      activeNode.oscillator.frequency.linearRampToValueAtTime(
        frequencyHz,
        now + portamentoSeconds
      );
      activeNode.oscillator2?.frequency.cancelScheduledValues(now);
      activeNode.oscillator2?.frequency.setValueAtTime(
        activeNode.oscillator2.frequency.value,
        now
      );
      activeNode.oscillator2?.frequency.linearRampToValueAtTime(
        frequencyHz,
        now + portamentoSeconds
      );
      activeNode.oscillator3?.frequency.cancelScheduledValues(now);
      activeNode.oscillator3?.frequency.setValueAtTime(
        activeNode.oscillator3.frequency.value,
        now
      );
      activeNode.oscillator3?.frequency.linearRampToValueAtTime(
        frequencyHz,
        now + portamentoSeconds
      );
      activeNode.currentFrequencyHz = frequencyHz;
      const resolvedVibratoDepth = clamp(vibratoDepth ?? activeNode.vibratoDepth, 0, 1);
      activeNode.vibratoDepth = resolvedVibratoDepth;
      const resolvedVibratoRateHz = resolveLfoRateHz(vibratoRateHz ?? activeNode.vibratoRateHz);
      activeNode.vibratoRateHz = resolvedVibratoRateHz;
      const resolvedStereoPan = resolveStereoPan(stereoPan ?? activeNode.stereoPan);
      activeNode.stereoPan = resolvedStereoPan;
      activeNode.lfoOscillator?.frequency.cancelScheduledValues(now);
      activeNode.lfoOscillator?.frequency.setValueAtTime(
        activeNode.lfoOscillator.frequency.value,
        now
      );
      activeNode.lfoOscillator?.frequency.linearRampToValueAtTime(
        resolvedVibratoRateHz,
        now + 0.04
      );
      activeNode.lfoGainNode?.gain.cancelScheduledValues(now);
      activeNode.lfoGainNode?.gain.setValueAtTime(activeNode.lfoGainNode.gain.value, now);
      activeNode.lfoGainNode?.gain.linearRampToValueAtTime(
        resolveVibratoDepthHz(frequencyHz, resolvedVibratoDepth),
        now + 0.04
      );
      activeNode.stereoPannerNode?.pan.cancelScheduledValues(now);
      activeNode.stereoPannerNode?.pan.setValueAtTime(
        activeNode.stereoPannerNode.pan.value,
        now
      );
      activeNode.stereoPannerNode?.pan.linearRampToValueAtTime(
        resolvedStereoPan,
        now + 0.04
      );

      if (velocity !== undefined || brightness !== undefined) {
        const normalizedVelocity = clamp(velocity ?? DEFAULT_VELOCITY, 0.22, 1);
        const normalizedBrightness = resolveBrightness(brightness, normalizedVelocity);
        const { gain } = resolveVelocityEnvelope({
          durationSeconds: 1,
          velocity: normalizedVelocity,
        });
        activeNode.gainNode.gain.cancelScheduledValues(now);
        activeNode.gainNode.gain.setValueAtTime(activeNode.gainNode.gain.value, now);
        activeNode.gainNode.gain.linearRampToValueAtTime(gain, now + 0.012);
        activeNode.filterNode?.frequency.cancelScheduledValues(now);
        activeNode.filterNode?.frequency.setValueAtTime(activeNode.filterNode.frequency.value, now);
        activeNode.filterNode?.frequency.linearRampToValueAtTime(
          resolveSustainedFilterHz(normalizedBrightness, normalizedVelocity),
          now + 0.04
        );
        if (activeNode.filterNode) {
          activeNode.filterNode.Q.value = 0.7 + normalizedBrightness * 0.9;
        }
        activeNode.blendGainNode?.gain.cancelScheduledValues(now);
        activeNode.blendGainNode?.gain.setValueAtTime(activeNode.blendGainNode.gain.value, now);
        activeNode.blendGainNode?.gain.linearRampToValueAtTime(
          0.18 + normalizedBrightness * 0.16,
          now + 0.04
        );
        activeNode.blendGainNode3?.gain.cancelScheduledValues(now);
        activeNode.blendGainNode3?.gain.setValueAtTime(activeNode.blendGainNode3.gain.value, now);
        activeNode.blendGainNode3?.gain.linearRampToValueAtTime(
          0.26 + normalizedBrightness * 0.12,
          now + 0.04
        );
        activeNode.reverbSendGainNode?.gain.cancelScheduledValues(now);
        activeNode.reverbSendGainNode?.gain.setValueAtTime(
          activeNode.reverbSendGainNode.gain.value,
          now
        );
        activeNode.reverbSendGainNode?.gain.linearRampToValueAtTime(
          resolveReverbSendGain({
            brightness: normalizedBrightness,
            sustained: true,
            velocity: normalizedVelocity,
          }),
          now + 0.06
        );
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
      compressorNodeRef.current = null;
      reverbChainRef.current = null;
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
