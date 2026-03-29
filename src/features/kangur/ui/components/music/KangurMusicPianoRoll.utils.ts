'use client';

import type {
  KangurMusicPointerType,
} from './KangurMusicPianoRoll.types';

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const nowMs = (): number => Date.now();

export const resolveSemitonePositionFromFrequency = (
  referenceFrequencyHz: number,
  frequencyHz: number
): number => 12 * Math.log2(frequencyHz / referenceFrequencyHz);

export const VIBRATO_DEAD_ZONE = 0.12;
export const VIBRATO_SMOOTHING_FACTOR = 0.72;
export const DEFAULT_VIBRATO_RATE_HZ = 5.2;
export const MIN_VIBRATO_RATE_HZ = 3.6;
export const MAX_VIBRATO_RATE_HZ = 7.0;
export const STEREO_PAN_DEAD_ZONE = 0.08;
export const MAX_STEREO_PAN = 0.72;
export const SYNTH_NOTE_HYSTERESIS_PX = 8;
export const TOUCH_SYNTH_NOTE_HYSTERESIS_PX = 14;

export const KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS = {
  engineClassName: 'kangur-piano-roll-engine',
  keyClassName: 'kangur-piano-roll-key',
  synthControlButtonClassName: 'kangur-piano-roll-synth-control-button',
} as const;

export const KANGUR_MUSIC_PIANO_ROLL_MOTION_CSS_VARIABLES = {
  keyActiveScale: '--kangur-piano-roll-key-active-scale',
  keyHoverLift: '--kangur-piano-roll-key-hover-lift',
  keyPressBrightness: '--kangur-piano-roll-key-press-brightness',
  keyPressSaturation: '--kangur-piano-roll-key-press-saturation',
  keyVisualLift: '--kangur-piano-roll-key-visual-lift',
  keyVisualScale: '--kangur-piano-roll-key-visual-scale',
} as const;

export const resolveVibratoDepth = (normalizedVerticalPosition: number): number => {
  const distanceFromCenter = Math.abs(normalizedVerticalPosition - 0.5) * 2;
  return Number(
    clamp((distanceFromCenter - VIBRATO_DEAD_ZONE) / (1 - VIBRATO_DEAD_ZONE), 0, 1).toFixed(2)
  );
};

export const resolveVibratoRateHz = (
  normalizedVerticalPosition: number,
  vibratoDepth: number
): number => {
  if (vibratoDepth <= 0.01) {
    return DEFAULT_VIBRATO_RATE_HZ;
  }

  const signedDistanceFromCenter = clamp((normalizedVerticalPosition - 0.5) * 2, -1, 1);
  const normalizedDirectionalOffset =
    ((Math.abs(signedDistanceFromCenter) - VIBRATO_DEAD_ZONE) / (1 - VIBRATO_DEAD_ZONE)) *
    Math.sign(signedDistanceFromCenter);

  return Number(
    clamp(
      DEFAULT_VIBRATO_RATE_HZ + normalizedDirectionalOffset * 1.8,
      MIN_VIBRATO_RATE_HZ,
      MAX_VIBRATO_RATE_HZ
    ).toFixed(1)
  );
};

export const resolveSmoothedVibratoDepth = (
  nextDepth: number,
  previousDepth?: number
): number => {
  if (nextDepth === 0 || previousDepth === undefined || previousDepth <= 0.02) {
    return nextDepth;
  }

  return Number(
    (
      previousDepth * (1 - VIBRATO_SMOOTHING_FACTOR) +
      nextDepth * VIBRATO_SMOOTHING_FACTOR
    ).toFixed(2)
  );
};

export const resolveStereoPan = (normalizedHorizontalPosition: number): number => {
  const signedOffset = clamp((normalizedHorizontalPosition - 0.5) * 2, -1, 1);
  const absoluteOffset = Math.abs(signedOffset);
  if (absoluteOffset <= STEREO_PAN_DEAD_ZONE) {
    return 0;
  }

  const normalizedPan =
    (absoluteOffset - STEREO_PAN_DEAD_ZONE) / (1 - STEREO_PAN_DEAD_ZONE);
  return Number((Math.sign(signedOffset) * normalizedPan * MAX_STEREO_PAN).toFixed(2));
};

export const formatPitchDetuneLabel = (pitchCentsFromKey: number): string =>
  pitchCentsFromKey === 0
    ? ''
    : ` ${pitchCentsFromKey > 0 ? '+' : ''}${pitchCentsFromKey}c`;

export const formatStereoPanLabel = (stereoPan: number): string =>
  Math.abs(stereoPan) <= 0.02
    ? 'Center'
    : `${stereoPan < 0 ? 'L' : 'R'}${Math.round(Math.abs(stereoPan) * 100)}`;

export const resolvePointerPressure = (
  pointerType: KangurMusicPointerType,
  pressure: number | undefined
): number | null => {
  if (pointerType !== 'touch' && pointerType !== 'pen') {
    return null;
  }

  if (!Number.isFinite(pressure) || pressure === undefined || pressure <= 0) {
    return null;
  }

  return clamp(pressure, 0, 1);
};
