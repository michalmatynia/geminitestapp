import {
  ActiveNode,
  ATTACK_MS,
  DEFAULT_GAIN,
  DEFAULT_VIBRATO_RATE_HZ,
  KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE,
  KangurMusicSynthEnvelope,
  MAX_SUSTAINED_POLYPHONY,
  MAX_TRANSIENT_POLYPHONY,
  SUSTAINED_RELEASE_SECONDS,
  SustainedNode,
  VOICE_STEAL_RELEASE_SECONDS,
} from './useKangurMusicSynth.types';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const normalizeKangurMusicSynthEnvelope = (
  envelope?: Partial<KangurMusicSynthEnvelope> | null
): KangurMusicSynthEnvelope => ({
  attackMs: Math.round(
    clamp(
      envelope?.attackMs ?? KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE.attackMs,
      0,
      1800
    )
  ),
  decayMs: Math.round(
    clamp(
      envelope?.decayMs ?? KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE.decayMs,
      0,
      2400
    )
  ),
  releaseMs: Math.round(
    clamp(
      envelope?.releaseMs ?? KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE.releaseMs,
      20,
      3200
    )
  ),
  sustainLevel: Number(
    clamp(
      envelope?.sustainLevel ?? KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE.sustainLevel,
      0,
      1
    ).toFixed(2)
  ),
});

export const resolvePortamentoSeconds = (
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

export const resolveAudioContextCtor = (): typeof AudioContext | null => {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  const root = globalThis as Record<string, unknown>;
  const ctor = root['AudioContext'] ?? root['webkitAudioContext'];
  return typeof ctor === 'function' ? (ctor as typeof AudioContext) : null;
};

export const stopActiveNode = (activeNode: ActiveNode): void => {
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
    activeNode.lfoFilterQGainNode?.disconnect();
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

export const resolveVelocityEnvelope = ({
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

export const resolveSustainedPeakGain = ({
  baseGain,
  velocity,
}: {
  baseGain: number;
  velocity: number;
}): number => {
  const { gain } = resolveVelocityEnvelope({
    durationSeconds: 1,
    velocity,
  });

  return clamp(gain * (baseGain / DEFAULT_GAIN), 0.04, 0.38);
};

export const resolveConfiguredAttackSeconds = (
  attackMs: number,
  velocity: number
): number =>
  clamp(
    Number((((attackMs * (1.14 - velocity * 0.26)) / 1000)).toFixed(3)),
    0.002,
    1.8
  );

export const resolveConfiguredDecaySeconds = (decayMs: number): number =>
  clamp(Number((decayMs / 1000).toFixed(3)), 0, 2.4);

export const resolveConfiguredReleaseSeconds = (releaseMs: number): number =>
  clamp(Number((releaseMs / 1000).toFixed(3)), 0.02, 3.2);

export const resolveSustainGain = (
  peakGain: number,
  sustainLevel: number
): number =>
  Number((Math.max(0.0001, peakGain * clamp(sustainLevel, 0, 1))).toFixed(4));

export const resolveBrightness = (
  noteBrightness: number | undefined,
  velocity: number
): number => clamp(noteBrightness ?? 0.26 + velocity * 0.74, 0.18, 1);

export const resolvePianoFilterProfile = (brightness: number): { attackHz: number; sustainHz: number; q: number } => ({
  attackHz: 3200 + brightness * 5600,
  sustainHz: 1500 + brightness * 2400,
  q: 0.45 + brightness * 1.1,
});

export const resolveSustainedFilterHz = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return 1400 + brightness * 2400 + velocity * 1000 + pitchTracking * 260;
};

export const resolveSustainedFilterAttackHz = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const sustainHz = resolveSustainedFilterHz(brightness, velocity, frequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const attackBoostHz = clamp(900 - pitchTracking * 180, 620, 1080);
  return sustainHz + attackBoostHz;
};

export const resolveSustainedFilterQ = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number((clamp(0.68 + brightness * 0.82 + velocity * 0.22 - pitchTracking * 0.08, 0.7, 1.9)).toFixed(2));
};

export const resolveSustainedFilterAttackQ = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const sustainQ = resolveSustainedFilterQ(brightness, velocity, frequencyHz);
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const attackBoostQ = clamp(0.34 - pitchTracking * 0.07, 0.18, 0.42);
  return Number(clamp(sustainQ + attackBoostQ, sustainQ, 2.15).toFixed(2));
};

export const resolveSustainedUnisonDetune = (
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

export const resolveSustainedUnisonAttackDetune = (
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

export const resolveSustainedUnisonBlendGains = (
  brightness: number,
  frequencyHz: number
): { lowerGain: number; upperGain: number } => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return {
    lowerGain: clamp(Number((0.18 + brightness * 0.16 - pitchTracking * 0.018).toFixed(3)), 0.16, 0.36),
    upperGain: clamp(Number((0.26 + brightness * 0.12 - pitchTracking * 0.024).toFixed(3)), 0.22, 0.4),
  };
};

export const resolveSustainedUnisonAttackBlendGains = (
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

export const resolveSustainedUnisonBlendAttackSeconds = (
  baseAttackSeconds: number,
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomSeconds =
    baseAttackSeconds <= 0.02
      ? baseAttackSeconds + 0.0035 - brightness * 0.003 - pitchTracking * 0.0015
      : baseAttackSeconds + clamp(0.01 - brightness * 0.003 - pitchTracking * 0.0015, 0.004, 0.018);
  return Number(clamp(bloomSeconds, 0.006, 1.82).toFixed(3));
};

export const resolveSustainedTransientGain = ({
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

export const resolveSustainedTransientWaveform = (
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

export const resolveSustainedTransientFrequencyHz = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const partialMultiplier = clamp(2.08 - pitchTracking * 0.14, 1.82, 2.2);
  return Number((frequencyHz * partialMultiplier).toFixed(2));
};

export const resolveSustainedTransientDurationSeconds = (
  brightness: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const brightnessTightening = clamp(brightness * 0.004, 0.001, 0.004);
  return Number(clamp(0.042 - pitchTracking * 0.007 - brightnessTightening, 0.028, 0.05).toFixed(3));
};

export const resolveSustainedAttackSeconds = (
  baseAttackSeconds: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const trackedAttackSeconds =
    baseAttackSeconds <= 0.02
      ? baseAttackSeconds - pitchTracking * 0.0025
      : baseAttackSeconds;
  return Number(clamp(trackedAttackSeconds, 0.002, 1.8).toFixed(3));
};

export const resolveSustainedFilterSettleSeconds = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(0.18 - pitchTracking * 0.03, 0.13, 0.21).toFixed(3));
};

export const resolveSustainedVibratoFadeInSeconds = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(0.15 - pitchTracking * 0.018, 0.12, 0.17).toFixed(3));
};

export const resolveSustainedVibratoUpdateSeconds = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(0.04 - pitchTracking * 0.006, 0.03, 0.046).toFixed(3));
};

export const resolveSustainedPanUpdateSeconds = (frequencyHz: number, wet = false): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const baseSeconds = wet ? 0.06 : 0.04;
  const pitchScale = wet ? 0.008 : 0.006;
  const minSeconds = wet ? 0.05 : 0.03;
  const maxSeconds = wet ? 0.07 : 0.046;
  return Number(clamp(baseSeconds - pitchTracking * pitchScale, minSeconds, maxSeconds).toFixed(3));
};

export const resolveSustainedGainUpdateSeconds = (frequencyHz: number): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return Number(clamp(0.012 - pitchTracking * 0.002, 0.009, 0.014).toFixed(3));
};

export const resolveSustainedTimbreUpdateSeconds = (
  portamentoSeconds: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const baseSeconds = clamp(0.04 - pitchTracking * 0.005, 0.032, 0.046);
  return Number(Math.max(portamentoSeconds, baseSeconds).toFixed(3));
};

export const resolveVibratoDepthHz = (frequencyHz: number, vibratoDepth = 0): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.12, 0.78, 1.12);
  return clamp(frequencyHz * clamp(vibratoDepth, 0, 1) * 0.0075 * depthScale, 0, 6.5);
};

export const resolveVibratoFilterDepthHz = (
  brightness: number,
  frequencyHz: number,
  vibratoDepth = 0
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.1, 0.8, 1.12);
  return clamp((48 + brightness * 132) * clamp(vibratoDepth, 0, 1) * depthScale, 0, 220);
};

export const resolveVibratoFilterQDepth = (
  brightness: number,
  frequencyHz: number,
  vibratoDepth = 0
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.08, 0.82, 1.08);
  return Number(
    clamp((0.03 + brightness * 0.18) * clamp(vibratoDepth, 0, 1) * depthScale, 0, 0.28).toFixed(3)
  );
};

export const resolveLfoRateHz = (vibratoRateHz: number | undefined): number =>
  clamp(vibratoRateHz ?? DEFAULT_VIBRATO_RATE_HZ, 3.6, 7.0);

export const resolveStereoPan = (stereoPan: number | undefined): number =>
  clamp(stereoPan ?? 0, -0.72, 0.72);

export const resolveSustainedAttackStereoPan = (
  stereoPan: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.76 - pitchTracking * 0.1, 0.46, 0.78);
  return Number((stereoPan * bloomScale).toFixed(2));
};

export const resolveSustainedAttackPanSeconds = (
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

export const resolveReverbStereoPan = (stereoPan: number): number =>
  Number((clamp(stereoPan * 0.38, -0.28, 0.28)).toFixed(2));

export const resolveReverbSendGain = ({
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

export const resolveSustainedVibratoReverbSendGain = ({
  brightness,
  frequencyHz,
  velocity,
  vibratoDepth = 0,
}: {
  brightness: number;
  frequencyHz: number;
  velocity: number;
  vibratoDepth?: number;
}): number => {
  const baseSendGain = resolveReverbSendGain({
    brightness,
    frequencyHz,
    sustained: true,
    velocity,
  });
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const depthScale = clamp(1 - pitchTracking * 0.06, 0.88, 1.08);
  const vibratoBoost = clamp(vibratoDepth, 0, 1) * (0.008 + brightness * 0.014) * depthScale;
  return clamp(Number((baseSendGain + vibratoBoost).toFixed(3)), 0.05, 0.22);
};

export const resolveSustainedAttackReverbSendGain = (
  brightness: number,
  velocity: number,
  frequencyHz: number,
  vibratoDepth = 0
): number => {
  const sustainSendGain = resolveSustainedVibratoReverbSendGain({
    brightness,
    frequencyHz,
    velocity,
    vibratoDepth,
  });
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  const bloomScale = clamp(0.72 - brightness * 0.08 - velocity * 0.04 - pitchTracking * 0.08, 0.44, 0.74);
  return Number((sustainSendGain * bloomScale).toFixed(3));
};

export const resolveSustainedAttackReverbSendSeconds = (
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

export const resolveSustainedReleaseSeconds = (
  brightness: number,
  velocity: number,
  frequencyHz: number
): number => {
  const pitchTracking = clamp(Math.log2(Math.max(frequencyHz, 55) / 261.63), -1, 1.5);
  return clamp(
    Number(
      (
        0.055 +
        (1 - velocity) * 0.05 +
        (1 - brightness) * 0.035 -
        pitchTracking * 0.012
      ).toFixed(3)
    ),
    0.05,
    0.15
  );
};

export const releaseActiveNode = (activeNode: ActiveNode, releaseSeconds = SUSTAINED_RELEASE_SECONDS): void => {
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
    activeNode.lfoFilterQGainNode?.gain.cancelScheduledValues(now);
    activeNode.lfoFilterQGainNode?.gain.setValueAtTime(
      activeNode.lfoFilterQGainNode.gain.value,
      now
    );
    activeNode.lfoFilterQGainNode?.gain.linearRampToValueAtTime(
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

export const trimTransientPolyphony = (
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

export const trimSustainedPolyphony = <NoteId extends string>(
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

export const WAVE_SHAPER_CURVE: Float32Array = (() => {
  const samples = 256;
  const norm = Math.tanh(2.5);
  return Float32Array.from(
    { length: samples },
    (_, i) => Math.tanh(2.5 * ((i * 2) / samples - 1)) / norm
  );
})();

export const buildReverbImpulse = (context: AudioContext): AudioBuffer => {
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
