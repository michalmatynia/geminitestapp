'use client';

import type {
  SynthPitchCandidate,
  SynthPitchResolution,
  KangurMusicPressDynamics,
  KangurMusicPressDynamicsInput,
  KangurMusicPointerType,
} from './KangurMusicPianoRoll.types';
import type {
  KangurMusicPianoKeyDefinition,
  KangurMusicSynthGlideMode,
} from './music-theory';
import { resolveFrequencyWithSemitoneOffset } from './music-theory';

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

export const KANGUR_PIANO_ROLL_ENGINE_CLASSNAME =
  KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.engineClassName;
export const KANGUR_PIANO_ROLL_KEY_CLASSNAME =
  KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.keyClassName;
export const KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME =
  KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName;

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

export const resolvePointerContactSpan = (
  pointerType: KangurMusicPointerType,
  width: number | undefined,
  height: number | undefined
): number | null => {
  if (pointerType !== 'touch' && pointerType !== 'pen') {
    return null;
  }

  const dimensions = [width, height].filter(
    (value): value is number => Number.isFinite(value) && value !== undefined && value > 0
  );
  if (dimensions.length === 0) {
    return null;
  }

  return dimensions.reduce((sum, value) => sum + value, 0) / dimensions.length;
};

export const resolvePressDynamics = ({
  contactSpanPx = null,
  intervalMs,
  movementSpeedPxPerSecond = null,
  pointerType,
  pressDurationMs,
  pressure,
  travelDistancePx,
}: KangurMusicPressDynamicsInput): KangurMusicPressDynamics => {
  const normalizedDuration =
    pressDurationMs === null ? 0.58 : clamp((220 - pressDurationMs) / 170, 0, 1);
  const normalizedCadence =
    intervalMs === null ? 0.52 : clamp((320 - intervalMs) / 230, 0, 1);
  const isTouchLike = pointerType === 'touch' || pointerType === 'pen';
  const normalizedPressure =
    pressure === null ? null : clamp((pressure - 0.12) / 0.76, 0, 1);
  const normalizedTravel = clamp(travelDistancePx / (isTouchLike ? 52 : 44), 0, 1);
  const normalizedMotion =
    movementSpeedPxPerSecond === null
      ? travelDistancePx > 0
        ? clamp(travelDistancePx / (isTouchLike ? 56 : 70), 0, 1)
        : 0.36
      : clamp(movementSpeedPxPerSecond / (isTouchLike ? 1050 : 1350), 0, 1);
  const normalizedContact =
    contactSpanPx === null ? 0.35 : clamp((contactSpanPx - 8) / 28, 0, 1);
  const expressiveForce =
    normalizedPressure === null
      ? normalizedMotion * 0.58 + normalizedContact * 0.42
      : normalizedPressure * 0.76 + normalizedMotion * 0.16 + normalizedContact * 0.08;
  const baseVelocity = isTouchLike ? 0.28 : pointerType === 'keyboard' ? 0.62 : 0.46;
  const velocity = Number(
    clamp(
      baseVelocity +
        normalizedDuration * (isTouchLike ? 0.24 : 0.2) +
        normalizedCadence * (isTouchLike ? 0.12 : 0.16) +
        expressiveForce * (isTouchLike ? 0.24 : 0.08) +
        normalizedMotion * (isTouchLike ? 0.16 : 0.08) +
        normalizedTravel * (isTouchLike ? 0.1 : 0.04),
      0.24,
      1
    ).toFixed(2)
  );
  const brightness = Number(
    clamp(
      0.32 +
        velocity * 0.5 +
        expressiveForce * (isTouchLike ? 0.14 : 0.08) +
        normalizedMotion * 0.08,
      0.28,
      1
    ).toFixed(2)
  );

  return { brightness, velocity };
};

export const resolveStableSynthDisplayCandidate = <NoteId extends string>(
  candidates: SynthPitchCandidate<NoteId>[],
  nearestCandidate: SynthPitchCandidate<NoteId>,
  clientX: number,
  preferredNoteId?: NoteId,
  pointerType?: KangurMusicPointerType
): SynthPitchCandidate<NoteId> => {
  if (!preferredNoteId || nearestCandidate.key.id === preferredNoteId) {
    return nearestCandidate;
  }

  const preferredIndex = candidates.findIndex((candidate) => candidate.key.id === preferredNoteId);
  if (preferredIndex === -1) {
    return nearestCandidate;
  }

  const preferredCandidate = candidates[preferredIndex];
  if (!preferredCandidate) {
    return nearestCandidate;
  }

  const previousCandidate = preferredIndex > 0 ? (candidates[preferredIndex - 1] ?? null) : null;
  const nextCandidate =
    preferredIndex < candidates.length - 1 ? (candidates[preferredIndex + 1] ?? null) : null;
  const hysteresisPx =
    pointerType === 'touch' || pointerType === 'pen'
      ? TOUCH_SYNTH_NOTE_HYSTERESIS_PX
      : SYNTH_NOTE_HYSTERESIS_PX;
  const leftBoundary =
    previousCandidate === null
      ? Number.NEGATIVE_INFINITY
      : (previousCandidate.centerX + preferredCandidate.centerX) / 2 - hysteresisPx;
  const rightBoundary =
    nextCandidate === null
      ? Number.POSITIVE_INFINITY
      : (preferredCandidate.centerX + nextCandidate.centerX) / 2 + hysteresisPx;

  return clientX >= leftBoundary && clientX <= rightBoundary
    ? preferredCandidate
    : nearestCandidate;
};

export const resolveSynthPitchAtPoint = <NoteId extends string>({
  clientX,
  fallbackKey,
  fallbackRect,
  keyButtonRefs,
  keyDefinitionById,
  pointerType,
  preferredNoteId,
  resolvedSynthGlideMode,
}: {
  clientX: number;
  fallbackKey: KangurMusicPianoKeyDefinition<NoteId>;
  fallbackRect: DOMRect;
  keyButtonRefs: Map<NoteId, HTMLButtonElement>;
  keyDefinitionById: Map<NoteId, KangurMusicPianoKeyDefinition<NoteId>>;
  pointerType?: KangurMusicPointerType;
  preferredNoteId?: NoteId;
  resolvedSynthGlideMode: KangurMusicSynthGlideMode;
}): SynthPitchResolution<NoteId> => {
  const resolvedCandidates = [...keyButtonRefs.entries()]
    .map(([candidateNoteId, button]) => {
      const candidateKey = keyDefinitionById.get(candidateNoteId);
      if (!candidateKey) {
        return null;
      }

      const candidateRect = button.getBoundingClientRect();
      if (candidateRect.width <= 0 || candidateRect.height <= 0) {
        return null;
      }

      return {
        centerX: candidateRect.left + candidateRect.width / 2,
        key: candidateKey,
        keyRect: candidateRect,
      };
    })
    .filter(
      (
        candidate
      ): candidate is Omit<SynthPitchCandidate<NoteId>, 'semitonePosition'> => candidate !== null
    )
    .sort((left, right) => left.centerX - right.centerX);

  if (resolvedCandidates.length === 0) {
    return {
      displayKey: fallbackKey,
      displayKeyRect: fallbackRect,
      frequencyHz: fallbackKey.frequencyHz,
      key: fallbackKey,
      keyRect: fallbackRect,
      nearestSemitonePosition: 0,
      normalizedHorizontalPosition: 0.5,
      pitchSemitonePosition: 0,
    };
  }

  const firstResolvedCandidate = resolvedCandidates[0];
  if (!firstResolvedCandidate) {
    return {
      displayKey: fallbackKey,
      displayKeyRect: fallbackRect,
      frequencyHz: fallbackKey.frequencyHz,
      key: fallbackKey,
      keyRect: fallbackRect,
      nearestSemitonePosition: 0,
      normalizedHorizontalPosition: 0.5,
      pitchSemitonePosition: 0,
    };
  }

  const referenceFrequencyHz = firstResolvedCandidate.key.frequencyHz;
  const candidates = resolvedCandidates.map((candidate) => ({
    ...candidate,
    semitonePosition: resolveSemitonePositionFromFrequency(
      referenceFrequencyHz,
      candidate.key.frequencyHz
    ),
  }));
  const firstCandidate = candidates[0] ?? {
    centerX: fallbackRect.left + fallbackRect.width / 2,
    key: fallbackKey,
    keyRect: fallbackRect,
    semitonePosition: 0,
  };
  const lastCandidate = candidates[candidates.length - 1] ?? firstCandidate;
  const keyboardWidth = Math.max(1, lastCandidate.keyRect.right - firstCandidate.keyRect.left);
  const normalizedHorizontalPosition = Number(
    clamp((clientX - firstCandidate.keyRect.left) / keyboardWidth, 0, 1).toFixed(3)
  );
  const nearestCandidate =
    candidates.reduce((nearest, candidate) =>
      Math.abs(candidate.centerX - clientX) < Math.abs(nearest.centerX - clientX)
        ? candidate
        : nearest
    ) ?? firstCandidate;
  const displayCandidate = resolveStableSynthDisplayCandidate(
    candidates,
    nearestCandidate,
    clientX,
    preferredNoteId,
    pointerType
  );

  let rawPitchSemitonePosition = firstCandidate.semitonePosition;
  if (clientX <= firstCandidate.centerX) {
    rawPitchSemitonePosition = firstCandidate.semitonePosition;
  } else if (clientX >= lastCandidate.centerX) {
    rawPitchSemitonePosition = lastCandidate.semitonePosition;
  } else {
    for (let index = 0; index < candidates.length - 1; index += 1) {
      const leftCandidate = candidates[index];
      const rightCandidate = candidates[index + 1];
      if (!leftCandidate || !rightCandidate) {
        continue;
      }

      if (clientX >= leftCandidate.centerX && clientX <= rightCandidate.centerX) {
        const segmentWidth = Math.max(1, rightCandidate.centerX - leftCandidate.centerX);
        const segmentProgress = clamp((clientX - leftCandidate.centerX) / segmentWidth, 0, 1);
        rawPitchSemitonePosition =
          leftCandidate.semitonePosition +
          (rightCandidate.semitonePosition - leftCandidate.semitonePosition) * segmentProgress;
        break;
      }
    }
  }

  const pitchSemitonePosition = Number(
    (
      resolvedSynthGlideMode === 'semitone'
        ? Math.round(rawPitchSemitonePosition)
        : rawPitchSemitonePosition
    ).toFixed(2)
  );

  return {
    displayKey: displayCandidate.key,
    displayKeyRect: displayCandidate.keyRect,
    frequencyHz: resolveFrequencyWithSemitoneOffset(referenceFrequencyHz, pitchSemitonePosition),
    key: nearestCandidate.key,
    keyRect: nearestCandidate.keyRect,
    nearestSemitonePosition: nearestCandidate.semitonePosition,
    normalizedHorizontalPosition,
    pitchSemitonePosition,
  };
};

export const resolveVerticalPosition = (clientY: number, rect: DOMRect): number => {
  if (rect.height <= 0) {
    return 0.5;
  }
  return clamp((clientY - rect.top) / rect.height, 0, 1);
};
