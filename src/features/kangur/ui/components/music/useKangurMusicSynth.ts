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
  lfoFilterGainNode?: GainNode;
  lfoGainNode?: GainNode;
  lfoOscillator?: OscillatorNode;
  oscillator: OscillatorNode;
  oscillator2?: OscillatorNode;
  oscillator3?: OscillatorNode;
  reverbSendGainNode?: GainNode;
  reverbStereoPannerNode?: StereoPannerNode;
  stereoPannerNode?: StereoPannerNode;
  transientGainNode?: GainNode;
  transientOscillator?: OscillatorNode;
  waveShaperNode?: WaveShaperNode;
};

type SustainedNode<NoteId extends string = string> = ActiveNode & {
  baseGain: number;
  brightness: number;
  currentFrequencyHz: number;
  id: NoteId;
  interactionId: string;
  stereoPan: number;
  velocity: number;
  vibratoDepth: number;
  vibratoRateHz: number;
};

type StopSustainedNoteOptions = {
  brightness?: number;
  immediate?: boolean;
  releaseSeconds?: number;
  velocity?: number;
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
  const averageFrequencyHz = Math.sqrt(previousFrequencyHz * nextFrequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(averageFrequencyHz, 55) / 261.63), -1, 1.5);
  const pitchScale = clamp(1 - pitchTracking * 0.08, 0.88, 1.1);
  return clamp(Number(((0.008 + semitoneDelta * 0.005) * pitchScale).toFixed(3)), 0.008, 0.04);
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
    activeNode.lfoFilterGainNode?.disconnect();
    activeNode.lfoGainNode?.disconnect();
    activeNode.reverbSendGainNode?.disconnect();
    activeNode.reverbStereoPannerNode?.disconnect();
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

const resolveSustainedFilterHz = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return 1400 + brightness * 2400 + velocity * 1000 + pitchTracking * 260;
};

const resolveSustainedFilterAttackHz = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const sustainHz = resolveSustainedFilterHz(brightness, velocity, frequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const attackBoostHz = clamp(900 - pitchTracking * 180, 620, 1080);
  return sustainHz + attackBoostHz;
};

const resolveSustainedFilterQ = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number((clamp(0.68 + brightness * 0.82 + velocity * 0.22 - pitchTracking * 0.08, 0.7, 1.9)).toFixed(2));
};

const resolveSustainedFilterAttackQ = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const sustainQ = resolveSustainedFilterQ(brightness, velocity, frequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const attackBoostQ = clamp(0.34 - pitchTracking * 0.07, 0.18, 0.42);
  return Number(clamp(sustainQ + attackBoostQ, sustainQ, 2.15).toFixed(2));
};

const resolveSustainedUnisonDetune = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): { lowerCents: number; upperCents: number } => {
  const expressiveWidth = clamp(brightness * 0.58 + velocity * 0.42, 0, 1);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const widthScale = clamp(1 - pitchTracking * 0.12, 0.82, 1.12);
  return {
    lowerCents: Number(((-4.5 - expressiveWidth * 3.5) * widthScale).toFixed(1)),
    upperCents: Number(((6.5 + expressiveWidth * 4.5) * widthScale).toFixed(1)),
  };
};

const resolveSustainedUnisonAttackDetune = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): { lowerCents: number; upperCents: number } => {
  const sustainDetune = resolveSustainedUnisonDetune(brightness, velocity, frequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.7 - brightness * 0.07 - velocity * 0.05 - pitchTracking * 0.08, 0.42, 0.72);

  return {
    lowerCents: Number((sustainDetune.lowerCents * bloomScale).toFixed(1)),
    upperCents: Number((sustainDetune.upperCents * bloomScale).toFixed(1)),
  };
};

const resolveSustainedUnisonBlendGains = (
  brightness: number,
  frequencyHz: number
): { lowerGain: number; upperGain: number } => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return {
    lowerGain: clamp(Number((0.18 + brightness * 0.16 - pitchTracking * 0.018).toFixed(3)), 0.16, 0.36),
    upperGain: clamp(Number((0.26 + brightness * 0.12 - pitchTracking * 0.024).toFixed(3)), 0.22, 0.4),
  };
};

const resolveSustainedUnisonAttackBlendGains = (
  brightness: number,
  frequencyHz: number
): { lowerGain: number; upperGain: number } => {
  const sustainGains = resolveSustainedUnisonBlendGains(brightness, frequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.72 - brightness * 0.08 - pitchTracking * 0.09, 0.42, 0.74);

  return {
    lowerGain: Number((sustainGains.lowerGain * bloomScale).toFixed(3)),
    upperGain: Number((sustainGains.upperGain * bloomScale).toFixed(3)),
  };
};

const resolveSustainedUnisonBlendAttackSeconds = (
  baseAttackSeconds: number,
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomSeconds = baseAttackSeconds + 0.0035 - brightness * 0.003 - pitchTracking * 0.0015;
  return Number(clamp(bloomSeconds, 0.006, 0.018).toFixed(3));
};

const resolveSustainedTransientGain = ({
  brightness,
  frequencyHz,
  resolvedGain,
  velocity,
}: {
  brightness: number;
  frequencyHz: number;
  resolvedGain: number;
  velocity: number;
}): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const pitchScale = clamp(1 - pitchTracking * 0.14, 0.72, 1.14);
  return clamp(
    resolvedGain * (0.08 + brightness * 0.1 + velocity * 0.06) * pitchScale,
    0.0001,
    0.12
  );
};

const resolveSustainedTransientWaveform = (
  waveform: OscillatorType | undefined,
  brightness: number,
  frequencyHz: number
): OscillatorType => {
  if (waveform === 'square') {
    return 'triangle';
  }

  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return brightness > 0.7 && pitchTracking < 0.7 ? 'square' : 'triangle';
};

const resolveSustainedTransientFrequencyHz = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const partialMultiplier = clamp(2.08 - pitchTracking * 0.14, 1.82, 2.2);
  return Number((frequencyHz * partialMultiplier).toFixed(2));
};

const resolveSustainedTransientDurationSeconds = (
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const brightnessTightening = clamp(brightness * 0.004, 0.001, 0.004);
  return Number(clamp(0.042 - pitchTracking * 0.007 - brightnessTightening, 0.028, 0.05).toFixed(3));
};

const resolveSustainedAttackSeconds = (
  baseAttackSeconds: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(baseAttackSeconds - pitchTracking * 0.0025, 0.006, 0.016).toFixed(3));
};

const resolveSustainedFilterSettleSeconds = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(0.18 - pitchTracking * 0.03, 0.13, 0.21).toFixed(3));
};

const resolveSustainedVibratoFadeInSeconds = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(0.15 - pitchTracking * 0.018, 0.12, 0.17).toFixed(3));
};

const resolveSustainedVibratoUpdateSeconds = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(0.04 - pitchTracking * 0.006, 0.03, 0.046).toFixed(3));
};

const resolveSustainedPanUpdateSeconds = (frequencyHz: number, wet = false): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const baseSeconds = wet ? 0.06 : 0.04;
  const pitchScale = wet ? 0.008 : 0.006;
  const minSeconds = wet ? 0.05 : 0.03;
  const maxSeconds = wet ? 0.07 : 0.046;
  return Number(clamp(baseSeconds - pitchTracking * pitchScale, minSeconds, maxSeconds).toFixed(3));
};

const resolveSustainedGainUpdateSeconds = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(0.012 - pitchTracking * 0.002, 0.009, 0.014).toFixed(3));
};

const resolveSustainedTimbreUpdateSeconds = (
  portamentoSeconds: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const baseSeconds = clamp(0.04 - pitchTracking * 0.005, 0.032, 0.046);
  return Number(Math.max(portamentoSeconds, baseSeconds).toFixed(3));
};

const resolveVibratoDepthHz = (frequencyHz: number, vibratoDepth = 0): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.12, 0.78, 1.12);
  return clamp(frequencyHz * clamp(vibratoDepth, 0, 1) * 0.0075 * depthScale, 0, 6.5);
};

const resolveVibratoFilterDepthHz = (
  brightness: number,
  frequencyHz: number,
  vibratoDepth = 0
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.1, 0.8, 1.12);
  return clamp((48 + brightness * 132) * clamp(vibratoDepth, 0, 1) * depthScale, 0, 220);
};

const resolveLfoRateHz = (vibratoRateHz: number | undefined): number =>
  clamp(vibratoRateHz ?? DEFAULT_VIBRATO_RATE_HZ, 3.6, 7.0);

const resolveStereoPan = (stereoPan: number | undefined): number =>
  clamp(stereoPan ?? 0, -0.72, 0.72);

const resolveSustainedAttackStereoPan = (
  stereoPan: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.76 - pitchTracking * 0.1, 0.46, 0.78);
  return Number((stereoPan * bloomScale).toFixed(2));
};

const resolveSustainedAttackPanSeconds = (
  baseAttackSeconds: number,
  frequencyHz: number,
  stereoPan: number,
  wet = false
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const wetLagSeconds = wet ? clamp(0.01 - pitchTracking * 0.0015, 0.007, 0.011) : 0;
  const spreadLagSeconds = Math.abs(stereoPan) * (wet ? 0.006 : 0.004);
  return Number(clamp(baseAttackSeconds + wetLagSeconds + spreadLagSeconds, 0.006, 0.03).toFixed(3));
};

const resolveReverbStereoPan = (stereoPan: number): number =>
  Number((clamp(stereoPan * 0.38, -0.28, 0.28)).toFixed(2));

const resolveReverbSendGain = ({
  brightness,
  frequencyHz,
  sustained = false,
  velocity,
}: {
  brightness: number;
  frequencyHz?: number;
  sustained?: boolean;
  velocity: number;
}): number => {
  const pitchTracking =
    sustained && Number.isFinite(frequencyHz)
      ? clamp(Math.log2(Math.max(frequencyHz ?? 261.63, 55) / 261.63), -1, 1.5)
      : 0;
  return clamp(
    (sustained ? 0.06 : 0.08) +
      brightness * (sustained ? 0.08 : 0.1) +
      velocity * 0.04 -
      pitchTracking * (sustained ? 0.012 : 0),
    0.05,
    sustained ? 0.2 : 0.24
  );
};

const resolveSustainedAttackReverbSendGain = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const sustainSendGain = resolveReverbSendGain({
    brightness,
    frequencyHz,
    sustained: true,
    velocity,
  });
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.72 - brightness * 0.08 - velocity * 0.04 - pitchTracking * 0.08, 0.44, 0.74);
  return Number((sustainSendGain * bloomScale).toFixed(3));
};

const resolveSustainedAttackReverbSendSeconds = (
  baseAttackSeconds: number,
  brightness: number,
  frequencyHz: number,
  stereoPan: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const wetLagSeconds = clamp(0.01 - brightness * 0.003 - pitchTracking * 0.0015, 0.006, 0.011);
  const spreadLagSeconds = Math.abs(stereoPan) * 0.006;
  return Number(clamp(baseAttackSeconds + wetLagSeconds + spreadLagSeconds, 0.012, 0.03).toFixed(3));
};

const resolveSustainedReleaseSeconds = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return clamp(
    Number((0.055 + (1 - velocity) * 0.05 + (1 - brightness) * 0.035 - pitchTracking * 0.012).toFixed(3)),
    0.05,
    0.15
  );
};

const releaseActiveNode = (activeNode: ActiveNode, releaseSeconds = SUSTAINED_RELEASE_SECONDS): void => {
  const now = activeNode.context.currentTime;

  try {
    activeNode.lfoFilterGainNode?.gain.cancelScheduledValues(now);
    activeNode.lfoFilterGainNode?.gain.setValueAtTime(
      activeNode.lfoFilterGainNode.gain.value,
      now
    );
    activeNode.lfoFilterGainNode?.gain.linearRampToValueAtTime(
      0,
      now + Math.max(0.02, releaseSeconds * 0.72)
    );
    activeNode.lfoGainNode?.gain.cancelScheduledValues(now);
    activeNode.lfoGainNode?.gain.setValueAtTime(activeNode.lfoGainNode.gain.value, now);
    activeNode.lfoGainNode?.gain.linearRampToValueAtTime(
      0,
      now + Math.max(0.02, releaseSeconds * 0.72)
    );
    if (activeNode.filterNode) {
      const currentFilterHz = Math.max(activeNode.filterNode.frequency.value, 520);
      const releaseFilterHz = clamp(currentFilterHz * 0.58, 520, currentFilterHz);
      const currentFilterQ = Math.max(activeNode.filterNode.Q.value, 0.55);
      const releaseFilterQ = clamp(currentFilterQ * 0.72, 0.55, currentFilterQ);

      activeNode.filterNode.frequency.cancelScheduledValues(now);
      activeNode.filterNode.frequency.setValueAtTime(currentFilterHz, now);
      activeNode.filterNode.frequency.linearRampToValueAtTime(
        releaseFilterHz,
        now + Math.max(0.025, releaseSeconds * 0.84)
      );
      activeNode.filterNode.Q.cancelScheduledValues(now);
      activeNode.filterNode.Q.setValueAtTime(currentFilterQ, now);
      activeNode.filterNode.Q.linearRampToValueAtTime(
        releaseFilterQ,
        now + Math.max(0.025, releaseSeconds * 0.84)
      );
    }
    if (activeNode.oscillator2) {
      const currentLowerDetune = activeNode.oscillator2.detune.value;
      activeNode.oscillator2.detune.cancelScheduledValues(now);
      activeNode.oscillator2.detune.setValueAtTime(currentLowerDetune, now);
      activeNode.oscillator2.detune.linearRampToValueAtTime(
        Number((currentLowerDetune * 0.62).toFixed(2)),
        now + Math.max(0.025, releaseSeconds * 0.8)
      );
    }
    if (activeNode.oscillator3) {
      const currentUpperDetune = activeNode.oscillator3.detune.value;
      activeNode.oscillator3.detune.cancelScheduledValues(now);
      activeNode.oscillator3.detune.setValueAtTime(currentUpperDetune, now);
      activeNode.oscillator3.detune.linearRampToValueAtTime(
        Number((currentUpperDetune * 0.62).toFixed(2)),
        now + Math.max(0.025, releaseSeconds * 0.8)
      );
    }
    if (activeNode.blendGainNode) {
      const currentLowerBlend = Math.max(activeNode.blendGainNode.gain.value, 0.05);
      activeNode.blendGainNode.gain.cancelScheduledValues(now);
      activeNode.blendGainNode.gain.setValueAtTime(currentLowerBlend, now);
      activeNode.blendGainNode.gain.linearRampToValueAtTime(
        clamp(Number((currentLowerBlend * 0.58).toFixed(3)), 0.05, currentLowerBlend),
        now + Math.max(0.025, releaseSeconds * 0.8)
      );
    }
    if (activeNode.blendGainNode3) {
      const currentUpperBlend = Math.max(activeNode.blendGainNode3.gain.value, 0.06);
      activeNode.blendGainNode3.gain.cancelScheduledValues(now);
      activeNode.blendGainNode3.gain.setValueAtTime(currentUpperBlend, now);
      activeNode.blendGainNode3.gain.linearRampToValueAtTime(
        clamp(Number((currentUpperBlend * 0.6).toFixed(3)), 0.06, currentUpperBlend),
        now + Math.max(0.025, releaseSeconds * 0.82)
      );
    }
    if (activeNode.stereoPannerNode) {
      const currentPan = activeNode.stereoPannerNode.pan.value;
      activeNode.stereoPannerNode.pan.cancelScheduledValues(now);
      activeNode.stereoPannerNode.pan.setValueAtTime(currentPan, now);
      activeNode.stereoPannerNode.pan.linearRampToValueAtTime(
        Number((currentPan * 0.38).toFixed(2)),
        now + Math.max(0.025, releaseSeconds * 0.82)
      );
    }
    if (activeNode.reverbStereoPannerNode) {
      const currentReverbPan = activeNode.reverbStereoPannerNode.pan.value;
      activeNode.reverbStereoPannerNode.pan.cancelScheduledValues(now);
      activeNode.reverbStereoPannerNode.pan.setValueAtTime(currentReverbPan, now);
      activeNode.reverbStereoPannerNode.pan.linearRampToValueAtTime(
        Number((currentReverbPan * 0.22).toFixed(2)),
        now + Math.max(0.025, releaseSeconds * 0.88)
      );
    }
    if (activeNode.reverbSendGainNode) {
      const currentReverbSend = Math.max(activeNode.reverbSendGainNode.gain.value, 0.02);
      activeNode.reverbSendGainNode.gain.cancelScheduledValues(now);
      activeNode.reverbSendGainNode.gain.setValueAtTime(currentReverbSend, now);
      activeNode.reverbSendGainNode.gain.linearRampToValueAtTime(
        clamp(Number((currentReverbSend * 0.42).toFixed(3)), 0.02, currentReverbSend),
        now + Math.max(0.025, releaseSeconds * 0.78)
      );
    }
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
    (interactionId: string, options: StopSustainedNoteOptions = {}): void => {
      const activeNode = sustainedNodesRef.current.get(interactionId);
      if (!activeNode) {
        return;
      }

      sustainedNodesRef.current.delete(interactionId);
      if (options.immediate) {
        stopActiveNode(activeNode);
        return;
      }

      const resolvedReleaseSeconds =
        options.releaseSeconds ??
        resolveSustainedReleaseSeconds(
          options.brightness ?? activeNode.brightness,
          options.velocity ?? activeNode.velocity,
          activeNode.currentFrequencyHz
        );
      releaseActiveNode(activeNode, resolvedReleaseSeconds);
    },
    []
  );

  const stopAllSustainedNotes = useCallback(
    (options: StopSustainedNoteOptions = {}): void => {
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
      const sustainedAttackSeconds = resolveSustainedAttackSeconds(attackSeconds, note.frequencyHz);
      const sustainedUnisonAttackSeconds = resolveSustainedUnisonBlendAttackSeconds(
        sustainedAttackSeconds,
        brightness,
        note.frequencyHz
      );
      const sustainedFilterSettleSeconds = resolveSustainedFilterSettleSeconds(note.frequencyHz);
      const sustainedVibratoFadeInSeconds = resolveSustainedVibratoFadeInSeconds(
        note.frequencyHz
      );
      const baseGain = clamp(note.gain ?? DEFAULT_GAIN, 0.04, 0.24);
      const resolvedGain = clamp(gain * (baseGain / DEFAULT_GAIN), 0.04, 0.38);
      const unisonDetune = resolveSustainedUnisonDetune(brightness, velocity, note.frequencyHz);
      const unisonAttackDetune = resolveSustainedUnisonAttackDetune(
        brightness,
        velocity,
        note.frequencyHz
      );
      const unisonBlendGains = resolveSustainedUnisonBlendGains(brightness, note.frequencyHz);
      const unisonAttackBlendGains = resolveSustainedUnisonAttackBlendGains(
        brightness,
        note.frequencyHz
      );

      // Low-pass filter: tames sawtooth upper harmonics for a warmer synth pad sound.
      const filterNode = context.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(
        resolveSustainedFilterAttackHz(brightness, velocity, note.frequencyHz),
        now
      );
      filterNode.frequency.linearRampToValueAtTime(
        resolveSustainedFilterHz(brightness, velocity, note.frequencyHz),
        now + sustainedAttackSeconds + sustainedFilterSettleSeconds
      );
      filterNode.Q.setValueAtTime(
        resolveSustainedFilterAttackQ(brightness, velocity, note.frequencyHz),
        now
      );
      filterNode.Q.linearRampToValueAtTime(
        resolveSustainedFilterQ(brightness, velocity, note.frequencyHz),
        now + sustainedAttackSeconds + sustainedFilterSettleSeconds
      );

      // Vibrato LFO: fades in after attack so the onset is clean, then adds expression.
      const lfoOscillator = context.createOscillator();
      const lfoGainNode = context.createGain();
      const lfoFilterGainNode = context.createGain();
      lfoOscillator.type = 'sine';
      lfoOscillator.frequency.value = vibratoRateHz;
      lfoGainNode.gain.setValueAtTime(0, now);
      lfoGainNode.gain.linearRampToValueAtTime(
        resolveVibratoDepthHz(note.frequencyHz, vibratoDepth),
        now + sustainedAttackSeconds + sustainedVibratoFadeInSeconds
      );
      lfoFilterGainNode.gain.setValueAtTime(0, now);
      lfoFilterGainNode.gain.linearRampToValueAtTime(
        resolveVibratoFilterDepthHz(brightness, note.frequencyHz, vibratoDepth),
        now + sustainedAttackSeconds + sustainedVibratoFadeInSeconds
      );

      // Third unison voice: sawtooth at +9 cents spreads the sound wide.
      const oscillator3 = context.createOscillator();
      const blend3GainNode = context.createGain();
      oscillator3.type = note.waveform ?? 'sawtooth';
      oscillator3.frequency.setValueAtTime(note.frequencyHz, now);
      oscillator3.detune.setValueAtTime(unisonAttackDetune.upperCents, now);
      oscillator3.detune.linearRampToValueAtTime(
        unisonDetune.upperCents,
        now + sustainedUnisonAttackSeconds
      );
      blend3GainNode.gain.setValueAtTime(unisonAttackBlendGains.upperGain, now);
      blend3GainNode.gain.linearRampToValueAtTime(
        unisonBlendGains.upperGain,
        now + sustainedUnisonAttackSeconds
      );

      // A short upper-partial transient helps touch starts speak before the sustained body blooms.
      const transientOscillator = context.createOscillator();
      const transientGainNode = context.createGain();
      const transientDurationSeconds = resolveSustainedTransientDurationSeconds(
        brightness,
        note.frequencyHz
      );
      transientOscillator.type = resolveSustainedTransientWaveform(
        note.waveform,
        brightness,
        note.frequencyHz
      );
      transientOscillator.frequency.setValueAtTime(
        resolveSustainedTransientFrequencyHz(note.frequencyHz),
        now
      );
      transientGainNode.gain.setValueAtTime(
        resolveSustainedTransientGain({
          brightness,
          frequencyHz: note.frequencyHz,
          resolvedGain,
          velocity,
        }),
        now
      );
      transientGainNode.gain.exponentialRampToValueAtTime(
        0.0001,
        now + transientDurationSeconds
      );

      const compressor = ensureCompressorNode(context, compressorNodeRef);
      const reverbChain = ensureReverbChain(context, reverbChainRef, compressor);
      const reverbSendGainNode = context.createGain();
      const stereoPannerNode =
        typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
      const reverbStereoPannerNode =
        typeof context.createStereoPanner === 'function' ? context.createStereoPanner() : null;
      const sustainedReverbSendGain = resolveReverbSendGain({
        brightness,
        frequencyHz: note.frequencyHz,
        sustained: true,
        velocity,
      });
      reverbSendGainNode.gain.setValueAtTime(
        resolveSustainedAttackReverbSendGain(brightness, velocity, note.frequencyHz),
        now
      );
      const sustainedAttackReverbSendSeconds = resolveSustainedAttackReverbSendSeconds(
        sustainedUnisonAttackSeconds,
        brightness,
        note.frequencyHz,
        stereoPan
      );
      reverbSendGainNode.gain.linearRampToValueAtTime(
        sustainedReverbSendGain,
        now + sustainedAttackReverbSendSeconds
      );
      const sustainedAttackStereoPan = resolveSustainedAttackStereoPan(
        stereoPan,
        note.frequencyHz
      );
      const sustainedAttackDryPanSeconds = resolveSustainedAttackPanSeconds(
        sustainedUnisonAttackSeconds,
        note.frequencyHz,
        stereoPan
      );
      const sustainedAttackWetPanSeconds = resolveSustainedAttackPanSeconds(
        sustainedUnisonAttackSeconds,
        note.frequencyHz,
        stereoPan,
        true
      );
      stereoPannerNode?.pan.setValueAtTime(sustainedAttackStereoPan, now);
      stereoPannerNode?.pan.linearRampToValueAtTime(
        stereoPan,
        now + sustainedAttackDryPanSeconds
      );
      reverbStereoPannerNode?.pan.setValueAtTime(
        resolveReverbStereoPan(sustainedAttackStereoPan),
        now
      );
      reverbStereoPannerNode?.pan.linearRampToValueAtTime(
        resolveReverbStereoPan(stereoPan),
        now + sustainedAttackWetPanSeconds
      );

      oscillator.type = note.waveform ?? 'sawtooth';
      oscillator.frequency.setValueAtTime(note.frequencyHz, now);
      oscillator2.type = note.waveform === 'square' ? 'triangle' : 'sine';
      oscillator2.frequency.setValueAtTime(note.frequencyHz, now);
      oscillator2.detune.setValueAtTime(unisonAttackDetune.lowerCents, now);
      oscillator2.detune.linearRampToValueAtTime(
        unisonDetune.lowerCents,
        now + sustainedUnisonAttackSeconds
      );
      blendGainNode.gain.setValueAtTime(unisonAttackBlendGains.lowerGain, now);
      blendGainNode.gain.linearRampToValueAtTime(
        unisonBlendGains.lowerGain,
        now + sustainedUnisonAttackSeconds
      );

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(resolvedGain, now + sustainedAttackSeconds);

      lfoOscillator.connect(lfoGainNode);
      // LFO modulates all three oscillators so the unison voices move together.
      lfoGainNode.connect(oscillator.frequency);
      lfoGainNode.connect(oscillator2.frequency);
      lfoGainNode.connect(oscillator3.frequency);
      lfoOscillator.connect(lfoFilterGainNode);
      lfoFilterGainNode.connect(filterNode.frequency);
      oscillator.connect(gainNode);
      oscillator2.connect(blendGainNode);
      blendGainNode.connect(gainNode);
      oscillator3.connect(blend3GainNode);
      blend3GainNode.connect(gainNode);
      transientOscillator.connect(transientGainNode);
      transientGainNode.connect(filterNode);
      gainNode.connect(filterNode);
      if (stereoPannerNode) {
        filterNode.connect(stereoPannerNode);
        stereoPannerNode.connect(compressor);
      } else {
        filterNode.connect(compressor);
      }
      filterNode.connect(reverbSendGainNode);
      if (reverbStereoPannerNode) {
        reverbSendGainNode.connect(reverbStereoPannerNode);
        reverbStereoPannerNode.connect(reverbChain.convolver);
      } else {
        reverbSendGainNode.connect(reverbChain.convolver);
      }

      const sustainedNode: SustainedNode<NoteId> = {
        baseGain,
        blendGainNode,
        blendGainNode3: blend3GainNode,
        brightness,
        context,
        currentFrequencyHz: note.frequencyHz,
        filterNode,
        gainNode,
        id: note.id,
        interactionId: options.interactionId,
        lfoFilterGainNode,
        lfoGainNode,
        lfoOscillator,
        oscillator,
        oscillator2,
        oscillator3,
        reverbSendGainNode,
        reverbStereoPannerNode: reverbStereoPannerNode ?? undefined,
        stereoPan,
        stereoPannerNode: stereoPannerNode ?? undefined,
        transientGainNode,
        transientOscillator,
        velocity,
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
          transientOscillator.stop();
          lfoOscillator.disconnect();
          lfoFilterGainNode.disconnect();
          lfoGainNode.disconnect();
          oscillator.disconnect();
          oscillator2.disconnect();
          blendGainNode.disconnect();
          oscillator3.disconnect();
          blend3GainNode.disconnect();
          transientOscillator.disconnect();
          transientGainNode.disconnect();
          gainNode.disconnect();
          reverbSendGainNode.disconnect();
          reverbStereoPannerNode?.disconnect();
          stereoPannerNode?.disconnect();
          filterNode.disconnect();
        } catch {
          // Ignore cleanup errors after playback ends.
        }
      };

      oscillator.start(now);
      oscillator2.start(now);
      oscillator3.start(now);
      transientOscillator.start(now);
      transientOscillator.stop(now + transientDurationSeconds + 0.005);
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
      const vibratoUpdateSeconds = resolveSustainedVibratoUpdateSeconds(frequencyHz);
      const dryPanUpdateSeconds = resolveSustainedPanUpdateSeconds(frequencyHz);
      const wetPanUpdateSeconds = resolveSustainedPanUpdateSeconds(frequencyHz, true);
      const gainUpdateSeconds = resolveSustainedGainUpdateSeconds(frequencyHz);
      const timbreUpdateSeconds = resolveSustainedTimbreUpdateSeconds(
        portamentoSeconds,
        frequencyHz
      );
      const resolvedVibratoDepth = clamp(vibratoDepth ?? activeNode.vibratoDepth, 0, 1);
      activeNode.vibratoDepth = resolvedVibratoDepth;
      const resolvedVibratoRateHz = resolveLfoRateHz(vibratoRateHz ?? activeNode.vibratoRateHz);
      activeNode.vibratoRateHz = resolvedVibratoRateHz;
      const resolvedStereoPan = resolveStereoPan(stereoPan ?? activeNode.stereoPan);
      activeNode.stereoPan = resolvedStereoPan;
      const resolvedVelocityForTimbre =
        velocity !== undefined ? clamp(velocity, 0.22, 1) : activeNode.velocity;
      const resolvedBrightnessForTimbre =
        brightness !== undefined
          ? resolveBrightness(brightness, resolvedVelocityForTimbre)
          : activeNode.brightness;
      const filterVibratoUpdateSeconds = Math.max(vibratoUpdateSeconds, timbreUpdateSeconds);
      activeNode.lfoOscillator?.frequency.cancelScheduledValues(now);
      activeNode.lfoOscillator?.frequency.setValueAtTime(
        activeNode.lfoOscillator.frequency.value,
        now
      );
      activeNode.lfoOscillator?.frequency.linearRampToValueAtTime(
        resolvedVibratoRateHz,
        now + vibratoUpdateSeconds
      );
      activeNode.lfoGainNode?.gain.cancelScheduledValues(now);
      activeNode.lfoGainNode?.gain.setValueAtTime(activeNode.lfoGainNode.gain.value, now);
      activeNode.lfoGainNode?.gain.linearRampToValueAtTime(
        resolveVibratoDepthHz(frequencyHz, resolvedVibratoDepth),
        now + vibratoUpdateSeconds
      );
      activeNode.lfoFilterGainNode?.gain.cancelScheduledValues(now);
      activeNode.lfoFilterGainNode?.gain.setValueAtTime(
        activeNode.lfoFilterGainNode.gain.value,
        now
      );
      activeNode.lfoFilterGainNode?.gain.linearRampToValueAtTime(
        resolveVibratoFilterDepthHz(
          resolvedBrightnessForTimbre,
          frequencyHz,
          resolvedVibratoDepth
        ),
        now + filterVibratoUpdateSeconds
      );
      activeNode.stereoPannerNode?.pan.cancelScheduledValues(now);
      activeNode.stereoPannerNode?.pan.setValueAtTime(
        activeNode.stereoPannerNode.pan.value,
        now
      );
      activeNode.stereoPannerNode?.pan.linearRampToValueAtTime(
        resolvedStereoPan,
        now + dryPanUpdateSeconds
      );
      activeNode.reverbStereoPannerNode?.pan.cancelScheduledValues(now);
      activeNode.reverbStereoPannerNode?.pan.setValueAtTime(
        activeNode.reverbStereoPannerNode.pan.value,
        now
      );
      activeNode.reverbStereoPannerNode?.pan.linearRampToValueAtTime(
        resolveReverbStereoPan(resolvedStereoPan),
        now + wetPanUpdateSeconds
      );
      const resolvedUnisonBlendGains = resolveSustainedUnisonBlendGains(
        resolvedBrightnessForTimbre,
        frequencyHz
      );
      const resolvedUnisonDetune = resolveSustainedUnisonDetune(
        resolvedBrightnessForTimbre,
        resolvedVelocityForTimbre,
        frequencyHz
      );
      activeNode.filterNode?.frequency.cancelScheduledValues(now);
      activeNode.filterNode?.frequency.setValueAtTime(activeNode.filterNode.frequency.value, now);
      activeNode.filterNode?.frequency.linearRampToValueAtTime(
        resolveSustainedFilterHz(
          resolvedBrightnessForTimbre,
          resolvedVelocityForTimbre,
          frequencyHz
        ),
        now + timbreUpdateSeconds
      );
      activeNode.filterNode?.Q.cancelScheduledValues(now);
      activeNode.filterNode?.Q.setValueAtTime(activeNode.filterNode.Q.value, now);
      activeNode.filterNode?.Q.linearRampToValueAtTime(
        resolveSustainedFilterQ(
          resolvedBrightnessForTimbre,
          resolvedVelocityForTimbre,
          frequencyHz
        ),
        now + timbreUpdateSeconds
      );
      activeNode.blendGainNode?.gain.cancelScheduledValues(now);
      activeNode.blendGainNode?.gain.setValueAtTime(activeNode.blendGainNode.gain.value, now);
      activeNode.blendGainNode?.gain.linearRampToValueAtTime(
        resolvedUnisonBlendGains.lowerGain,
        now + timbreUpdateSeconds
      );
      activeNode.blendGainNode3?.gain.cancelScheduledValues(now);
      activeNode.blendGainNode3?.gain.setValueAtTime(activeNode.blendGainNode3.gain.value, now);
      activeNode.blendGainNode3?.gain.linearRampToValueAtTime(
        resolvedUnisonBlendGains.upperGain,
        now + timbreUpdateSeconds
      );
      if (activeNode.oscillator2) {
        activeNode.oscillator2.detune.cancelScheduledValues(now);
        activeNode.oscillator2.detune.setValueAtTime(activeNode.oscillator2.detune.value, now);
        activeNode.oscillator2.detune.linearRampToValueAtTime(
          resolvedUnisonDetune.lowerCents,
          now + timbreUpdateSeconds
        );
      }
      if (activeNode.oscillator3) {
        activeNode.oscillator3.detune.cancelScheduledValues(now);
        activeNode.oscillator3.detune.setValueAtTime(activeNode.oscillator3.detune.value, now);
        activeNode.oscillator3.detune.linearRampToValueAtTime(
          resolvedUnisonDetune.upperCents,
          now + timbreUpdateSeconds
        );
      }
      activeNode.reverbSendGainNode?.gain.cancelScheduledValues(now);
      activeNode.reverbSendGainNode?.gain.setValueAtTime(
        activeNode.reverbSendGainNode.gain.value,
        now
      );
      activeNode.reverbSendGainNode?.gain.linearRampToValueAtTime(
        resolveReverbSendGain({
          brightness: resolvedBrightnessForTimbre,
          frequencyHz,
          sustained: true,
          velocity: resolvedVelocityForTimbre,
        }),
        now + timbreUpdateSeconds
      );

      if (velocity !== undefined || brightness !== undefined) {
        const normalizedVelocity = clamp(velocity ?? DEFAULT_VELOCITY, 0.22, 1);
        const normalizedBrightness = resolveBrightness(brightness, normalizedVelocity);
        activeNode.velocity = normalizedVelocity;
        activeNode.brightness = normalizedBrightness;
        const { gain } = resolveVelocityEnvelope({
          durationSeconds: 1,
          velocity: normalizedVelocity,
        });
        const resolvedGain = clamp(
          gain * (activeNode.baseGain / DEFAULT_GAIN),
          0.04,
          0.38
        );
        activeNode.gainNode.gain.cancelScheduledValues(now);
        activeNode.gainNode.gain.setValueAtTime(activeNode.gainNode.gain.value, now);
        activeNode.gainNode.gain.linearRampToValueAtTime(resolvedGain, now + gainUpdateSeconds);
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
