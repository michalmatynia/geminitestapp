'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { cn } from '@/features/kangur/shared/utils';
import { getMotionSafeScrollBehavior } from '@/shared/utils/motion-accessibility';

import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';
import type {
  KangurMusicSynthGlideMode,
  KangurMusicKeyboardMode,
  KangurMusicPianoKeyDefinition,
  KangurMusicSynthWaveform,
} from './music-theory';
import {
  KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS,
  KANGUR_MUSIC_SYNTH_GLIDE_MODES,
  KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS,
  KANGUR_MUSIC_SYNTH_WAVEFORMS,
  resolveFrequencyWithSemitoneOffset,
} from './music-theory';
import { KangurMusicWaveformIcon } from './music-waveform-icons';

export type {
  KangurMusicKeyboardMode,
  KangurMusicSynthGlideMode,
  KangurMusicSynthWaveform,
} from './music-theory';

type KangurMusicPointerType = 'keyboard' | 'mouse' | 'pen' | 'touch';

export type KangurMusicPianoKeyPressDetails = {
  brightness: number;
  intervalMs: number | null;
  interactionId: string | null;
  keyboardMode: KangurMusicKeyboardMode;
  pointerType: KangurMusicPointerType;
  pressDurationMs: number | null;
  pressure: number | null;
  travelDistancePx: number;
  velocity: number;
};

export type KangurMusicSynthGestureDetails<NoteId extends string> = {
  brightness: number;
  frequencyHz: number;
  interactionId: string;
  keyboardMode: KangurMusicKeyboardMode;
  noteId: NoteId;
  normalizedHorizontalPosition: number;
  normalizedVerticalPosition: number;
  pitchCentsFromKey: number;
  pitchSemitoneOffset: number;
  pointerType: KangurMusicPointerType;
  stereoPan: number;
  velocity: number;
  vibratoDepth: number;
  vibratoRateHz: number;
};

export type KangurMusicPianoRollStep<NoteId extends string> = {
  ariaLabel?: string;
  label?: ReactNode;
  noteId: NoteId;
  span?: number;
};

type ActiveKeyPressState = {
  contactSpanPx: number | null;
  lastClientX: number | null;
  lastClientY: number | null;
  livePressure: number | null;
  lastSampledAtMs: number | null;
  movementSpeedPxPerSecond: number | null;
  peakPressure: number | null;
  pointerType: KangurMusicPointerType;
  startedAtMs: number;
  travelDistancePx: number;
};

type ActiveSynthGestureState<NoteId extends string> = {
  anchorSemitonePosition: number;
  brightness: number;
  frequencyHz: number;
  interactionId: string;
  // Rect captured at pointerdown — stays frozen so mid-animation getBoundingClientRect
  // jitter and zero-height fallbacks can never corrupt subsequent move calculations.
  keyRect: DOMRect;
  noteId: NoteId;
  normalizedHorizontalPosition: number;
  normalizedVerticalPosition: number;
  pitchCentsFromKey: number;
  pitchSemitoneOffset: number;
  pointerId: number;
  pointerType: KangurMusicPointerType;
  stereoPan: number;
  velocity: number;
  vibratoDepth: number;
  vibratoRateHz: number;
  visualNoteId: NoteId;
};

type KeyPulsePhase = 'glide' | 'press';

type KeyPulseState = {
  energy: number;
  phase: KeyPulsePhase;
};

type ResolvedPianoRollStep<NoteId extends string> = {
  ariaLabel: string;
  index: number;
  key: KangurMusicPianoKeyDefinition<NoteId>;
  label: ReactNode;
  laneIndex: number;
  noteId: NoteId;
  span: number;
  startUnit: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const nowMs = (): number => Date.now();

type SynthPitchCandidate<NoteId extends string> = {
  centerX: number;
  key: KangurMusicPianoKeyDefinition<NoteId>;
  keyRect: DOMRect;
  semitonePosition: number;
};

type SynthPitchResolution<NoteId extends string> = {
  displayKey: KangurMusicPianoKeyDefinition<NoteId>;
  displayKeyRect: DOMRect;
  frequencyHz: number;
  key: KangurMusicPianoKeyDefinition<NoteId>;
  keyRect: DOMRect;
  nearestSemitonePosition: number;
  normalizedHorizontalPosition: number;
  pitchSemitonePosition: number;
};

const resolveSemitonePositionFromFrequency = (
  referenceFrequencyHz: number,
  frequencyHz: number
): number => 12 * Math.log2(frequencyHz / referenceFrequencyHz);

const VIBRATO_DEAD_ZONE = 0.12;
const VIBRATO_SMOOTHING_FACTOR = 0.72;
const DEFAULT_VIBRATO_RATE_HZ = 5.2;
const MIN_VIBRATO_RATE_HZ = 3.6;
const MAX_VIBRATO_RATE_HZ = 7.0;
const STEREO_PAN_DEAD_ZONE = 0.08;
const MAX_STEREO_PAN = 0.72;
const SYNTH_NOTE_HYSTERESIS_PX = 8;
const TOUCH_SYNTH_NOTE_HYSTERESIS_PX = 14;

const resolveVibratoDepth = (normalizedVerticalPosition: number): number => {
  const distanceFromCenter = Math.abs(normalizedVerticalPosition - 0.5) * 2;
  return Number(
    clamp((distanceFromCenter - VIBRATO_DEAD_ZONE) / (1 - VIBRATO_DEAD_ZONE), 0, 1).toFixed(2)
  );
};

const resolveVibratoRateHz = (
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

const resolveSmoothedVibratoDepth = (
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

const resolveStereoPan = (normalizedHorizontalPosition: number): number => {
  const signedOffset = clamp((normalizedHorizontalPosition - 0.5) * 2, -1, 1);
  const absoluteOffset = Math.abs(signedOffset);
  if (absoluteOffset <= STEREO_PAN_DEAD_ZONE) {
    return 0;
  }

  const normalizedPan =
    (absoluteOffset - STEREO_PAN_DEAD_ZONE) / (1 - STEREO_PAN_DEAD_ZONE);
  return Number((Math.sign(signedOffset) * normalizedPan * MAX_STEREO_PAN).toFixed(2));
};

const formatPitchDetuneLabel = (pitchCentsFromKey: number): string =>
  pitchCentsFromKey === 0
    ? ''
    : ` ${pitchCentsFromKey > 0 ? '+' : ''}${pitchCentsFromKey}c`;

const formatStereoPanLabel = (stereoPan: number): string =>
  Math.abs(stereoPan) <= 0.02
    ? 'Center'
    : `${stereoPan < 0 ? 'L' : 'R'}${Math.round(Math.abs(stereoPan) * 100)}`;

type KangurMusicPressDynamics = {
  brightness: number;
  velocity: number;
};

type KangurMusicPressDynamicsInput = Pick<
  KangurMusicPianoKeyPressDetails,
  'intervalMs' | 'pointerType' | 'pressDurationMs' | 'pressure' | 'travelDistancePx'
> & {
  contactSpanPx?: number | null;
  movementSpeedPxPerSecond?: number | null;
};

const resolvePointerPressure = (
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

const resolvePointerContactSpan = (
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

// Quick taps should still feel energetic, but touch velocity needs stronger fallbacks than time alone.
const resolvePressDynamics = ({
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

type KangurMusicPianoRollProps<NoteId extends string> = {
  activeStepIndex?: number | null;
  className?: string;
  completedStepCount?: number;
  description?: ReactNode;
  disabled?: boolean;
  expectedStepIndex?: number | null;
  interactive?: boolean;
  keyTestIdPrefix?: string;
  keyboardMode?: KangurMusicKeyboardMode;
  keys: readonly KangurMusicPianoKeyDefinition<NoteId>[];
  melody: readonly (NoteId | KangurMusicPianoRollStep<NoteId>)[];
  autoFollowCursor?: boolean;
  minStepWidthPx?: number;
  onKeyboardModeChange?: (mode: KangurMusicKeyboardMode) => void;
  onKeyPress?: (noteId: NoteId, details: KangurMusicPianoKeyPressDetails) => void;
  onSynthGlideModeChange?: (glideMode: KangurMusicSynthGlideMode) => void;
  onSynthGestureChange?: (details: KangurMusicSynthGestureDetails<NoteId>) => void;
  onSynthGestureEnd?: (details: KangurMusicSynthGestureDetails<NoteId>) => void;
  onSynthGestureStart?: (details: KangurMusicSynthGestureDetails<NoteId>) => void;
  onSynthWaveformChange?: (waveform: KangurMusicSynthWaveform) => void;
  pressedNoteId?: NoteId | null;
  pressedVelocity?: number | null;
  shellTestId?: string;
  showKeyboardModeSwitch?: boolean;
  showSynthGlideModeSwitch?: boolean;
  showMeasureGuides?: boolean;
  showLaneLabels?: boolean;
  showSynthWaveformSwitch?: boolean;
  synthGlideMode?: KangurMusicSynthGlideMode;
  stepTestIdPrefix?: string;
  synthWaveform?: KangurMusicSynthWaveform;
  title?: ReactNode;
  unitsPerMeasure?: number;
  visualCueMode?: 'default' | 'six_year_old';
};

export default function KangurMusicPianoRoll<NoteId extends string>({
  activeStepIndex = null,
  className,
  completedStepCount = 0,
  description,
  disabled = false,
  expectedStepIndex = null,
  interactive = true,
  keyTestIdPrefix = 'kangur-music-piano-key',
  keyboardMode,
  keys,
  melody,
  autoFollowCursor = true,
  minStepWidthPx,
  onKeyboardModeChange,
  onKeyPress,
  onSynthGlideModeChange,
  onSynthGestureChange,
  onSynthGestureEnd,
  onSynthGestureStart,
  onSynthWaveformChange,
  pressedNoteId = null,
  pressedVelocity = null,
  shellTestId,
  showKeyboardModeSwitch = false,
  showSynthGlideModeSwitch = false,
  showMeasureGuides = true,
  showLaneLabels = true,
  showSynthWaveformSwitch = false,
  synthGlideMode,
  stepTestIdPrefix = 'kangur-music-piano-step',
  synthWaveform,
  title,
  unitsPerMeasure = 4,
  visualCueMode = 'default',
}: KangurMusicPianoRollProps<NoteId>): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const isMobileViewport = useKangurMobileBreakpoint();
  const activePressesRef = useRef<Map<NoteId, ActiveKeyPressState>>(new Map());
  const keyButtonRefs = useRef<Map<NoteId, HTMLButtonElement>>(new Map());
  const keyPulseTimeoutIdsRef = useRef<Map<NoteId, ReturnType<typeof setTimeout>>>(new Map());
  const lastTriggeredAtRef = useRef<number | null>(null);
  const stepElementRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const activeSynthGesturesRef = useRef<Map<number, ActiveSynthGestureState<NoteId>>>(new Map());
  const [uncontrolledKeyboardMode, setUncontrolledKeyboardMode] =
    useState<KangurMusicKeyboardMode>('piano');
  const [uncontrolledSynthGlideMode, setUncontrolledSynthGlideMode] =
    useState<KangurMusicSynthGlideMode>('continuous');
  const [uncontrolledSynthWaveform, setUncontrolledSynthWaveform] =
    useState<KangurMusicSynthWaveform>('sawtooth');
  const [activeSynthGestures, setActiveSynthGestures] =
    useState<ActiveSynthGestureState<NoteId>[]>([]);
  const [recentKeyPulses, setRecentKeyPulses] = useState<Map<NoteId, KeyPulseState>>(new Map());
  const isInteractive = interactive && !disabled && typeof onKeyPress === 'function';
  const isCompactMobile = isCoarsePointer || isMobileViewport;
  const resolvedKeyboardMode = keyboardMode ?? uncontrolledKeyboardMode;
  const resolvedSynthGlideMode = synthGlideMode ?? uncontrolledSynthGlideMode;
  const resolvedSynthWaveform = synthWaveform ?? uncontrolledSynthWaveform;
  const resolvedMinStepWidthPx = minStepWidthPx ?? (isCompactMobile ? 38 : 64);
  const resolvedUnitsPerMeasure = Math.max(1, Math.round(unitsPerMeasure));
  const isSixYearOldVisualMode = visualCueMode === 'six_year_old';
  const resolvedShowLaneLabels = showLaneLabels && !isCompactMobile;
  const resolvedShowMeasureGuides = showMeasureGuides && !isCompactMobile;
  const resolvedLaneHeightPx = isCompactMobile ? 24 : 46;
  const keyDefinitionById = new Map<NoteId, KangurMusicPianoKeyDefinition<NoteId>>(
    keys.map((key) => [key.id, key] as const)
  );
  const laneKeys = [...keys].reverse();
  const resolvedMelody = melody.reduce<ResolvedPianoRollStep<NoteId>[]>((steps, entry, index) => {
    const noteId = typeof entry === 'string' ? entry : entry.noteId;
    const key = keys.find((candidate) => candidate.id === noteId);
    if (!key) {
      return steps;
    }

    const span = Math.max(1, Math.round(typeof entry === 'string' ? 1 : entry.span ?? 1));
    const laneIndex = laneKeys.findIndex((lane) => lane.id === noteId);
    if (laneIndex < 0) {
      return steps;
    }

    const lastStep = steps[steps.length - 1];
    steps.push({
      ariaLabel:
        (typeof entry === 'string' ? undefined : entry.ariaLabel) ??
        `Krok ${index + 1}: ${key.ariaLabel}`,
      index,
      key,
      label: typeof entry === 'string' ? key.shortLabel : entry.label ?? key.shortLabel,
      laneIndex,
      noteId,
      span,
      startUnit: lastStep === undefined ? 1 : lastStep.startUnit + lastStep.span,
    });
    return steps;
  }, []);
  const resolvedStepCount = Math.max(
    4,
    resolvedMelody.reduce((count, step) => count + step.span, 0)
  );
  const resolvedCompletedCount = Math.max(0, Math.min(completedStepCount, resolvedMelody.length));
  const measureCount = Math.max(1, Math.ceil(resolvedStepCount / resolvedUnitsPerMeasure));
  const isFreePlayMode = resolvedMelody.length === 0;
  const currentCursorStep =
    activeStepIndex !== null
      ? resolvedMelody[activeStepIndex] ?? null
      : expectedStepIndex !== null
        ? resolvedMelody[expectedStepIndex] ?? null
        : null;
  const activeTransportStep =
    activeStepIndex !== null ? (resolvedMelody[activeStepIndex] ?? null) : null;
  const expectedTransportStep =
    expectedStepIndex !== null ? (resolvedMelody[expectedStepIndex] ?? null) : null;
  const activeSynthGesture = activeSynthGestures[activeSynthGestures.length - 1] ?? null;
  const synthAxisAnchors = useMemo(
    () =>
      keys.map((key, index) => ({
        key,
        normalizedPosition: keys.length <= 1 ? 0.5 : index / (keys.length - 1),
      })),
    [keys]
  );
  const activeSynthGestureCount = activeSynthGestures.length;
  const activeSynthPitchKey =
    activeSynthGesture === null ? null : (keyDefinitionById.get(activeSynthGesture.noteId) ?? null);
  const activeSynthPitchDetuneLabel =
    activeSynthGesture === null ? '' : formatPitchDetuneLabel(activeSynthGesture.pitchCentsFromKey);
  const activeSynthPitchPercent =
    activeSynthGesture === null
      ? null
      : Math.round(activeSynthGesture.normalizedHorizontalPosition * 100);
  const activeSynthPanLabel =
    activeSynthGesture === null ? null : formatStereoPanLabel(activeSynthGesture.stereoPan);
  const shouldShowTransportRail =
    isFreePlayMode ||
    activeTransportStep !== null ||
    expectedTransportStep !== null ||
    resolvedKeyboardMode === 'synth' ||
    activeSynthGestureCount > 0;

  useEffect(() => {
    if (!autoFollowCursor) {
      return;
    }

    const cursorIndex = activeStepIndex ?? expectedStepIndex;
    if (cursorIndex === null) {
      return;
    }

    const stepElement = stepElementRefs.current.get(cursorIndex);
    if (!stepElement || typeof stepElement.scrollIntoView !== 'function') {
      return;
    }

    stepElement.scrollIntoView({
      behavior: getMotionSafeScrollBehavior('smooth'),
      block: 'nearest',
      inline: 'center',
    });
  }, [activeStepIndex, autoFollowCursor, expectedStepIndex]);

  useEffect(() => {
    return () => {
      keyPulseTimeoutIdsRef.current.forEach((timeoutId) => {
        globalThis.clearTimeout(timeoutId);
      });
      keyPulseTimeoutIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (resolvedKeyboardMode === 'synth' || activeSynthGesturesRef.current.size === 0) {
      return;
    }

    activeSynthGesturesRef.current.clear();
    setActiveSynthGestures([]);
  }, [resolvedKeyboardMode]);

  const syncActiveSynthGestures = (): void => {
    setActiveSynthGestures([...activeSynthGesturesRef.current.values()]);
  };

  const handleKeyboardModeChange = (nextMode: KangurMusicKeyboardMode): void => {
    if (keyboardMode === undefined) {
      setUncontrolledKeyboardMode(nextMode);
    }
    activeSynthGesturesRef.current.clear();
    setActiveSynthGestures([]);
    onKeyboardModeChange?.(nextMode);
  };

  const handleSynthWaveformChange = (nextWaveform: KangurMusicSynthWaveform): void => {
    if (synthWaveform === undefined) {
      setUncontrolledSynthWaveform(nextWaveform);
    }
    onSynthWaveformChange?.(nextWaveform);
  };

  const handleSynthGlideModeChange = (nextGlideMode: KangurMusicSynthGlideMode): void => {
    if (synthGlideMode === undefined) {
      setUncontrolledSynthGlideMode(nextGlideMode);
    }
    onSynthGlideModeChange?.(nextGlideMode);
  };

  const startPress = (
    noteId: NoteId,
    pointerType: KangurMusicPointerType,
    event?: React.PointerEvent<HTMLButtonElement>
  ): void => {
    activePressesRef.current.set(noteId, {
      contactSpanPx: resolvePointerContactSpan(pointerType, event?.width, event?.height),
      lastClientX: event?.clientX ?? null,
      lastClientY: event?.clientY ?? null,
      livePressure: resolvePointerPressure(pointerType, event?.pressure),
      lastSampledAtMs: event ? nowMs() : null,
      movementSpeedPxPerSecond: null,
      peakPressure: resolvePointerPressure(pointerType, event?.pressure),
      pointerType,
      startedAtMs: nowMs(),
      travelDistancePx: 0,
    });
  };

  const clearPress = (noteId: NoteId): void => {
    activePressesRef.current.delete(noteId);
  };

  const resolveStableSynthDisplayCandidate = (
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

  const resolveSynthPitchAtPoint = ({
    clientX,
    fallbackKey,
    fallbackRect,
    pointerType,
    preferredNoteId,
  }: {
    clientX: number;
    fallbackKey: KangurMusicPianoKeyDefinition<NoteId>;
    fallbackRect: DOMRect;
    pointerType?: KangurMusicPointerType;
    preferredNoteId?: NoteId;
  }): SynthPitchResolution<NoteId> => {
    const resolvedCandidates = [...keyButtonRefs.current.entries()]
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
      .filter((candidate): candidate is Omit<SynthPitchCandidate<NoteId>, 'semitonePosition'> => candidate !== null)
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
        Math.abs(candidate.centerX - clientX) < Math.abs(nearest.centerX - clientX) ? candidate : nearest
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
          const segmentProgress = clamp(
            (clientX - leftCandidate.centerX) / segmentWidth,
            0,
            1
          );
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

  const updatePressFromPointerEvent = (
    noteId: NoteId,
    event: React.PointerEvent<HTMLButtonElement>
  ): ActiveKeyPressState | null => {
    const activePress = activePressesRef.current.get(noteId);
    if (!activePress) {
      return null;
    }

    const sampledAtMs = nowMs();
    const nextPressure = resolvePointerPressure(activePress.pointerType, event.pressure);
    const nextContactSpanPx = resolvePointerContactSpan(
      activePress.pointerType,
      event.width,
      event.height
    );
    const deltaX =
      activePress.lastClientX === null ? 0 : event.clientX - activePress.lastClientX;
    const deltaY =
      activePress.lastClientY === null ? 0 : event.clientY - activePress.lastClientY;
    const deltaDistancePx = Math.hypot(deltaX, deltaY);
    const nextTravelDistancePx =
      activePress.lastClientX === null && activePress.lastClientY === null
        ? activePress.travelDistancePx
        : activePress.travelDistancePx + deltaDistancePx;
    const elapsedSinceLastSampleMs =
      activePress.lastSampledAtMs === null
        ? null
        : Math.max(1, sampledAtMs - activePress.lastSampledAtMs);
    const instantaneousSpeedPxPerSecond =
      elapsedSinceLastSampleMs === null ||
      (activePress.lastClientX === null && activePress.lastClientY === null)
        ? null
        : (deltaDistancePx / elapsedSinceLastSampleMs) * 1000;

    const nextState: ActiveKeyPressState = {
      contactSpanPx: nextContactSpanPx ?? activePress.contactSpanPx,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      livePressure:
        nextPressure === null
          ? activePress.livePressure
          : activePress.livePressure === null
            ? nextPressure
            : Number((activePress.livePressure * 0.28 + nextPressure * 0.72).toFixed(2)),
      lastSampledAtMs: sampledAtMs,
      movementSpeedPxPerSecond:
        instantaneousSpeedPxPerSecond === null
          ? activePress.movementSpeedPxPerSecond
          : activePress.movementSpeedPxPerSecond === null
            ? instantaneousSpeedPxPerSecond
            : activePress.movementSpeedPxPerSecond * 0.38 + instantaneousSpeedPxPerSecond * 0.62,
      peakPressure:
        nextPressure === null
          ? activePress.peakPressure
          : activePress.peakPressure === null
            ? nextPressure
            : Math.max(activePress.peakPressure, nextPressure),
      pointerType: activePress.pointerType,
      startedAtMs: activePress.startedAtMs,
      travelDistancePx: nextTravelDistancePx,
    };

    activePressesRef.current.set(noteId, nextState);
    return nextState;
  };

  const triggerKeyPulse = (
    noteId: NoteId,
    energy: number,
    phase: KeyPulsePhase
  ): void => {
    const normalizedEnergy = Number(clamp(energy, 0.24, 1).toFixed(2));
    const existingTimeoutId = keyPulseTimeoutIdsRef.current.get(noteId);
    if (existingTimeoutId !== undefined) {
      globalThis.clearTimeout(existingTimeoutId);
    }

    setRecentKeyPulses((current) => {
      const next = new Map(current);
      next.set(noteId, { energy: normalizedEnergy, phase });
      return next;
    });

    const timeoutId = globalThis.setTimeout(() => {
      keyPulseTimeoutIdsRef.current.delete(noteId);
      setRecentKeyPulses((current) => {
        if (!current.has(noteId)) {
          return current;
        }

        const next = new Map(current);
        next.delete(noteId);
        return next;
      });
    }, phase === 'glide' ? 240 : 180);
    keyPulseTimeoutIdsRef.current.set(noteId, timeoutId);
  };

  const resolveGestureDynamics = (
    activePress: ActiveKeyPressState
  ): KangurMusicPressDynamics =>
    resolvePressDynamics({
      contactSpanPx: activePress.contactSpanPx,
      intervalMs: null,
      movementSpeedPxPerSecond: activePress.movementSpeedPxPerSecond,
      pointerType: activePress.pointerType,
      pressDurationMs: Math.max(24, nowMs() - activePress.startedAtMs),
      pressure: activePress.livePressure,
      travelDistancePx: activePress.travelDistancePx,
    });

  const buildPressDetails = ({
    interactionId = null,
    keepPressActive = false,
    noteId,
    pointerType,
  }: {
    interactionId?: string | null;
    keepPressActive?: boolean;
    noteId: NoteId;
    pointerType?: KangurMusicPointerType;
  }): KangurMusicPianoKeyPressDetails => {
    const triggeredAtMs = nowMs();
    const activePress = activePressesRef.current.get(noteId);
    const resolvedPointerType = pointerType ?? activePress?.pointerType ?? 'mouse';
    const details: KangurMusicPianoKeyPressDetails = {
      brightness: 0,
      interactionId,
      intervalMs:
        lastTriggeredAtRef.current === null
          ? null
          : Math.max(0, triggeredAtMs - lastTriggeredAtRef.current),
      keyboardMode: resolvedKeyboardMode,
      pointerType: resolvedPointerType,
      pressDurationMs:
        activePress === undefined ? null : Math.max(24, triggeredAtMs - activePress.startedAtMs),
      pressure: activePress?.peakPressure ?? null,
      travelDistancePx: Number((activePress?.travelDistancePx ?? 0).toFixed(1)),
      velocity: 0,
    };
    const dynamics = resolvePressDynamics({
      contactSpanPx: activePress?.contactSpanPx ?? null,
      intervalMs: details.intervalMs,
      movementSpeedPxPerSecond: activePress?.movementSpeedPxPerSecond ?? null,
      pointerType: details.pointerType,
      pressDurationMs: details.pressDurationMs,
      pressure: details.pressure,
      travelDistancePx: details.travelDistancePx,
    });
    details.brightness = dynamics.brightness;
    details.velocity = dynamics.velocity;
    lastTriggeredAtRef.current = triggeredAtMs;
    if (!keepPressActive) {
      activePressesRef.current.delete(noteId);
    }
    return details;
  };

  const triggerPress = (
    noteId: NoteId,
    options: {
      interactionId?: string | null;
      keepPressActive?: boolean;
      pointerType?: KangurMusicPointerType;
    } = {}
  ): KangurMusicPianoKeyPressDetails | null => {
    if (!isInteractive) {
      return null;
    }

    const details = buildPressDetails({
      interactionId: options.interactionId,
      keepPressActive: options.keepPressActive,
      noteId,
      pointerType: options.pointerType,
    });
    triggerKeyPulse(noteId, details.velocity * 0.68 + details.brightness * 0.32, 'press');
    onKeyPress?.(noteId, details);
    return details;
  };

  const resolveSynthGestureDetails = ({
    anchorSemitonePosition,
    frequencyHz,
    interactionId,
    nearestSemitonePosition,
    noteId,
    previousVibratoDepth,
    pointerType,
    brightness,
    normalizedHorizontalPosition,
    velocity,
    normalizedVerticalPosition,
    pitchSemitonePosition,
  }: {
    anchorSemitonePosition: number;
    brightness: number;
    frequencyHz: number;
    interactionId: string;
    nearestSemitonePosition: number;
    noteId: NoteId;
    normalizedHorizontalPosition: number;
    pitchSemitonePosition: number;
    previousVibratoDepth?: number;
    pointerType: KangurMusicPointerType;
    velocity: number;
    normalizedVerticalPosition: number;
  }): KangurMusicSynthGestureDetails<NoteId> => {
    const pitchCentsFromKey = Math.round(
      (pitchSemitonePosition - nearestSemitonePosition) * 100
    );
    const pitchSemitoneOffset = Number(
      (pitchSemitonePosition - anchorSemitonePosition).toFixed(2)
    );
    const vibratoDepth = resolveSmoothedVibratoDepth(
      resolveVibratoDepth(normalizedVerticalPosition),
      previousVibratoDepth
    );
    const vibratoRateHz = resolveVibratoRateHz(normalizedVerticalPosition, vibratoDepth);
    const stereoPan = resolveStereoPan(normalizedHorizontalPosition);

    return {
      brightness,
      frequencyHz,
      interactionId,
      keyboardMode: resolvedKeyboardMode,
      noteId,
      normalizedHorizontalPosition,
      normalizedVerticalPosition,
      pitchCentsFromKey,
      pitchSemitoneOffset,
      pointerType,
      stereoPan,
      velocity,
      vibratoDepth,
      vibratoRateHz,
    };
  };

  const resolveVerticalPosition = (clientY: number, rect: DOMRect): number => {
    if (rect.height <= 0) {
      return 0.5;
    }
    return clamp((clientY - rect.top) / rect.height, 0, 1);
  };

  const endSynthGesture = (
    gesture: ActiveSynthGestureState<NoteId>,
    event: React.PointerEvent<HTMLButtonElement>
  ): void => {
    activeSynthGesturesRef.current.delete(gesture.pointerId);
    syncActiveSynthGestures();
    try {
      event.currentTarget.releasePointerCapture?.(gesture.pointerId);
    } catch {
      // Some browsers throw if the pointer is already released.
    }
    onSynthGestureEnd?.({
      brightness: gesture.brightness,
      frequencyHz: gesture.frequencyHz,
      interactionId: gesture.interactionId,
      keyboardMode: resolvedKeyboardMode,
      noteId: gesture.noteId,
      normalizedHorizontalPosition: gesture.normalizedHorizontalPosition,
      normalizedVerticalPosition: gesture.normalizedVerticalPosition,
      pitchCentsFromKey: gesture.pitchCentsFromKey,
      pitchSemitoneOffset: gesture.pitchSemitoneOffset,
      pointerType: gesture.pointerType,
      stereoPan: gesture.stereoPan,
      velocity: gesture.velocity,
      vibratoDepth: gesture.vibratoDepth,
      vibratoRateHz: gesture.vibratoRateHz,
    });
  };

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-[32px] border border-sky-100/90 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(224,242,254,0.92)_55%,rgba(186,230,253,0.78)_100%)] shadow-[0_30px_80px_-44px_rgba(14,116,144,0.4)]',
        isCompactMobile ? 'p-3.5' : 'p-4 sm:p-5',
        className
      )}
      data-layout={isCompactMobile ? 'compact' : 'full'}
      data-testid={shellTestId}
    >
      <div className='pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-sky-300/35 blur-3xl' />
      <div className='pointer-events-none absolute -bottom-14 -left-10 h-32 w-32 rounded-full bg-violet-300/25 blur-3xl' />
      <div className={cn('relative flex w-full flex-col', isCompactMobile ? 'gap-4' : 'gap-4')}>
        {title || description ? (
          <div className='flex flex-col gap-1'>
            {title ? (
              <div className='text-sm font-black uppercase tracking-[0.24em] text-sky-700'>
                {title}
              </div>
            ) : null}
            {description ? (
              <div
                className={cn(
                  'leading-relaxed [color:var(--kangur-page-muted-text)]',
                  isCompactMobile ? 'line-clamp-2 text-xs' : 'text-sm'
                )}
              >
                {description}
              </div>
            ) : null}
          </div>
        ) : null}

        {showKeyboardModeSwitch ||
        (resolvedKeyboardMode === 'synth' &&
          (showSynthWaveformSwitch || showSynthGlideModeSwitch)) ? (
          <div
            className={cn(
              'flex gap-2 px-1',
              isCompactMobile
                ? 'gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden'
                : 'flex-wrap'
            )}
            data-testid={`${stepTestIdPrefix}-controls-rail`}
          >
            {showKeyboardModeSwitch ? (
              <div
                className={cn(
                  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
                  'bg-white/55 shadow-[0_16px_40px_-32px_rgba(14,116,144,0.34)]',
                  isCompactMobile ? 'w-max shrink-0 snap-start' : 'w-full sm:w-auto'
                )}
                data-testid={`${stepTestIdPrefix}-keyboard-mode-switch`}
              >
                <KangurButton
                  aria-pressed={resolvedKeyboardMode === 'piano'}
                  data-testid={`${stepTestIdPrefix}-keyboard-mode-piano`}
                  onClick={() => handleKeyboardModeChange('piano')}
                  size='sm'
                  type='button'
                  variant={resolvedKeyboardMode === 'piano' ? 'segmentActive' : 'segment'}
                >
                  {isSixYearOldVisualMode ? (
                    <KangurVisualCueContent
                      icon='🎹'
                      iconTestId={`${stepTestIdPrefix}-keyboard-mode-icon-piano`}
                      label='Piano'
                    />
                  ) : (
                    'Piano'
                  )}
                </KangurButton>
                <KangurButton
                  aria-pressed={resolvedKeyboardMode === 'synth'}
                  data-testid={`${stepTestIdPrefix}-keyboard-mode-synth`}
                  onClick={() => handleKeyboardModeChange('synth')}
                  size='sm'
                  type='button'
                  variant={resolvedKeyboardMode === 'synth' ? 'segmentActive' : 'segment'}
                >
                  {isSixYearOldVisualMode ? (
                    <KangurVisualCueContent
                      icon='✨'
                      iconTestId={`${stepTestIdPrefix}-keyboard-mode-icon-synth`}
                      label='Synth'
                    />
                  ) : (
                    'Synth'
                  )}
                </KangurButton>
              </div>
            ) : null}

            {resolvedKeyboardMode === 'synth' && showSynthWaveformSwitch ? (
              <div
                className={cn(
                  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
                  'bg-white/55 shadow-[0_16px_40px_-32px_rgba(14,116,144,0.34)]',
                  isCompactMobile ? 'w-max shrink-0 snap-start' : 'w-full'
                )}
                data-testid={`${stepTestIdPrefix}-synth-waveform-switch`}
              >
                {KANGUR_MUSIC_SYNTH_WAVEFORMS.map((waveform) => (
                  <KangurButton
                    key={waveform}
                    aria-label={`Brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[waveform]}`}
                    aria-pressed={resolvedSynthWaveform === waveform}
                    className='min-w-[3rem] px-3'
                    data-testid={`${stepTestIdPrefix}-synth-waveform-${waveform}`}
                    onClick={() => handleSynthWaveformChange(waveform)}
                    size='sm'
                    type='button'
                    variant={resolvedSynthWaveform === waveform ? 'segmentActive' : 'segment'}
                  >
                    <KangurMusicWaveformIcon
                      className='h-4 w-7'
                      data-testid={`${stepTestIdPrefix}-synth-waveform-icon-${waveform}`}
                      waveform={waveform}
                    />
                  </KangurButton>
                ))}
              </div>
            ) : null}

            {resolvedKeyboardMode === 'synth' && showSynthGlideModeSwitch ? (
              <div
                className={cn(
                  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
                  'bg-white/55 shadow-[0_16px_40px_-32px_rgba(14,116,144,0.34)]',
                  isCompactMobile ? 'w-max shrink-0 snap-start' : 'w-full'
                )}
                data-testid={`${stepTestIdPrefix}-synth-glide-mode-switch`}
              >
                {KANGUR_MUSIC_SYNTH_GLIDE_MODES.map((glideMode) => (
                  <KangurButton
                    key={glideMode}
                    aria-label={`Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[glideMode]}`}
                    aria-pressed={resolvedSynthGlideMode === glideMode}
                    data-testid={`${stepTestIdPrefix}-synth-glide-mode-${glideMode}`}
                    onClick={() => handleSynthGlideModeChange(glideMode)}
                    size='sm'
                    type='button'
                    variant={resolvedSynthGlideMode === glideMode ? 'segmentActive' : 'segment'}
                  >
                    {isSixYearOldVisualMode ? (
                      <KangurVisualCueContent
                        detail={glideMode === 'continuous' ? '∿' : '#'}
                        detailTestId={`${stepTestIdPrefix}-synth-glide-mode-detail-${glideMode}`}
                        icon='↕'
                        iconTestId={`${stepTestIdPrefix}-synth-glide-mode-icon-${glideMode}`}
                        label={`Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[glideMode]}`}
                      />
                    ) : (
                      KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[glideMode]
                    )}
                  </KangurButton>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className={cn(
            'relative overflow-hidden border border-slate-200/80 bg-slate-950/[0.05]',
            isCompactMobile ? 'rounded-[24px] p-3' : 'rounded-[28px] p-3.5 sm:p-4'
          )}
        >
          <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_30%,rgba(15,23,42,0.02)_31%,rgba(15,23,42,0.02)_32%,transparent_33%,transparent_63%,rgba(15,23,42,0.03)_64%,rgba(15,23,42,0.03)_65%,transparent_66%)]' />
          <div className={cn('relative flex items-stretch', isCompactMobile ? 'gap-1' : 'gap-2 sm:gap-3')}>
            {resolvedShowLaneLabels ? (
              <div
                className='flex w-12 shrink-0 flex-col gap-2 pt-7 sm:w-14 sm:gap-3 sm:pt-8'
                data-testid={`${stepTestIdPrefix}-lane-labels`}
              >
                {laneKeys.map((note) => (
                  <div
                    key={`lane-label-${note.id}`}
                    className='flex min-h-[46px] items-center justify-center rounded-[18px] border border-white/70 bg-white/80 text-[11px] font-black uppercase tracking-[0.22em] text-sky-700 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.38)] sm:min-h-[52px]'
                  >
                    {note.shortLabel}
                  </div>
                ))}
              </div>
            ) : null}

            <div className='min-w-0 flex-1'>
              <div
                className={cn(
                  'flex items-center justify-between gap-3 px-1.5',
                  isCompactMobile ? 'mb-2' : 'mb-2.5'
                )}
              >
                <div className='text-[10px] font-black uppercase tracking-[0.3em] text-sky-700/80'>
                  Pitch / Time
                </div>
                <div className='text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500'>
                  {isFreePlayMode ? 'Swobodnie' : `${resolvedMelody.length} nut`}
                </div>
              </div>
              {shouldShowTransportRail ? (
                <div
                  className={cn(
                    'flex gap-2 px-2',
                    isCompactMobile
                      ? 'mb-2 overflow-x-auto pb-2 [scrollbar-width:none] snap-x snap-mandatory whitespace-nowrap [&::-webkit-scrollbar]:hidden'
                      : 'mb-2.5 flex-wrap'
                  )}
                  data-testid={`${stepTestIdPrefix}-transport-rail`}
                >
                  {isFreePlayMode ? (
                    <div
                      className='shrink-0 rounded-full bg-emerald-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-800'
                      data-testid={`${stepTestIdPrefix}-transport-freeplay`}
                    >
                      Swobodna gra
                    </div>
                  ) : null}
                  {activeTransportStep ? (
                    <div
                      className='shrink-0 rounded-full bg-sky-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-800'
                      data-testid={`${stepTestIdPrefix}-transport-active`}
                    >
                      Teraz: {activeTransportStep.key.shortLabel}
                    </div>
                  ) : null}
                  {expectedTransportStep ? (
                    <div
                      className='shrink-0 rounded-full bg-violet-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-violet-800'
                      data-testid={`${stepTestIdPrefix}-transport-expected`}
                    >
                      Dalej: {expectedTransportStep.key.shortLabel}
                    </div>
                  ) : null}
                  {!isFreePlayMode ? (
                    <div
                      className='shrink-0 rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600'
                      data-testid={`${stepTestIdPrefix}-transport-count`}
                    >
                      Krok {(activeStepIndex ?? expectedStepIndex ?? 0) + 1}/{resolvedMelody.length}
                    </div>
                  ) : null}
                  {resolvedKeyboardMode === 'synth' ? (
                    <div
                      aria-label={`Tryb: ${resolvedKeyboardMode}`}
                      className='shrink-0 rounded-full bg-fuchsia-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-800'
                      data-testid={`${stepTestIdPrefix}-transport-mode`}
                    >
                      {isSixYearOldVisualMode ? (
                        <KangurVisualCueContent
                          icon='✨'
                          iconTestId={`${stepTestIdPrefix}-transport-mode-icon`}
                          label={`Tryb: ${resolvedKeyboardMode}`}
                        />
                      ) : (
                        'Synth'
                      )}
                    </div>
                  ) : null}
                  {resolvedKeyboardMode === 'synth' ? (
                    <div
                      aria-label={`Brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[resolvedSynthWaveform]}`}
                      className='shrink-0 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-700'
                      data-testid={`${stepTestIdPrefix}-transport-waveform`}
                    >
                      {isSixYearOldVisualMode ? (
                        <KangurVisualCueContent
                          detail={
                            <KangurMusicWaveformIcon
                              className='h-3.5 w-6'
                              data-testid={`${stepTestIdPrefix}-transport-waveform-icon`}
                              waveform={resolvedSynthWaveform}
                            />
                          }
                          icon='👂'
                          iconTestId={`${stepTestIdPrefix}-transport-waveform-cue`}
                          label={`Brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[resolvedSynthWaveform]}`}
                        />
                      ) : (
                        <>Brzmienie: {KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[resolvedSynthWaveform]}</>
                      )}
                    </div>
                  ) : null}
                  {resolvedKeyboardMode === 'synth' ? (
                    <div
                      aria-label={`Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[resolvedSynthGlideMode]}`}
                      className='shrink-0 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-700'
                      data-testid={`${stepTestIdPrefix}-transport-glide-mode`}
                    >
                      {isSixYearOldVisualMode ? (
                        <KangurVisualCueContent
                          detail={resolvedSynthGlideMode === 'continuous' ? '∿' : '#'}
                          detailTestId={`${stepTestIdPrefix}-transport-glide-mode-detail`}
                          icon='↕'
                          iconTestId={`${stepTestIdPrefix}-transport-glide-mode-icon`}
                          label={`Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[resolvedSynthGlideMode]}`}
                        />
                      ) : (
                        <>Ruch: {KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[resolvedSynthGlideMode]}</>
                      )}
                    </div>
                  ) : null}
                  {activeSynthGestureCount > 0 ? (
                    <div
                      className='shrink-0 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700'
                      data-testid={`${stepTestIdPrefix}-transport-fingers`}
                    >
                      Glides: {activeSynthGestureCount}
                    </div>
                  ) : null}
                  {activeSynthGesture ? (
                    <div
                      className='shrink-0 rounded-full bg-indigo-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-800'
                      data-testid={`${stepTestIdPrefix}-transport-glide`}
                    >
                      Glide: {activeSynthGesture.pitchSemitoneOffset >= 0 ? '+' : ''}
                      {activeSynthGesture.pitchSemitoneOffset.toFixed(1)} st
                    </div>
                  ) : null}
                  {resolvedKeyboardMode === 'synth' ? (
                    <div
                      className='shrink-0 rounded-full bg-slate-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700'
                      data-testid={`${stepTestIdPrefix}-transport-axis-map`}
                    >
                      X: Pitch · Y: Vibrato
                    </div>
                  ) : null}
                  {activeSynthGesture ? (
                    <div
                      className='shrink-0 rounded-full bg-sky-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-800'
                      data-testid={`${stepTestIdPrefix}-transport-pitch`}
                    >
                      Pitch: {activeSynthPitchKey?.shortLabel ?? activeSynthGesture.noteId}
                      {activeSynthPitchDetuneLabel} · {activeSynthPitchPercent ?? 0}%
                    </div>
                  ) : null}
                  {activeSynthGesture ? (
                    <div
                      className='shrink-0 rounded-full bg-indigo-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-800'
                      data-testid={`${stepTestIdPrefix}-transport-pan`}
                    >
                      Pan: {activeSynthPanLabel}
                    </div>
                  ) : null}
                  {activeSynthGesture ? (
                    <div
                      className='shrink-0 rounded-full bg-fuchsia-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-800'
                      data-testid={`${stepTestIdPrefix}-transport-vibrato`}
                    >
                      Vibrato: {Math.round(activeSynthGesture.vibratoDepth * 100)}%
                      {activeSynthGesture.vibratoDepth > 0
                        ? ` · ${activeSynthGesture.vibratoRateHz.toFixed(1)}Hz`
                        : ''}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className='relative overflow-x-auto px-1.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                <div className='pointer-events-none absolute inset-y-0 left-0 z-[3] w-5 bg-gradient-to-r from-white/90 via-white/50 to-transparent' />
                <div className='pointer-events-none absolute inset-y-0 right-0 z-[3] w-5 bg-gradient-to-l from-white/90 via-white/50 to-transparent' />
                {resolvedShowMeasureGuides ? (
                  <div
                    className={cn(
                      'relative grid',
                      isCompactMobile ? 'mb-2 gap-1.5' : 'mb-2.5 gap-2 sm:gap-3'
                    )}
                    style={{
                      gridTemplateColumns: `repeat(${resolvedStepCount}, minmax(0, 1fr))`,
                      width: `max(100%, ${resolvedStepCount * resolvedMinStepWidthPx}px)`,
                    }}
                  >
                    {Array.from({ length: measureCount }, (_, index) => {
                      const remainingUnits = resolvedStepCount - index * resolvedUnitsPerMeasure;
                      const span = Math.max(1, Math.min(resolvedUnitsPerMeasure, remainingUnits));

                      return (
                        <div
                          key={`measure-${index + 1}`}
                          className='flex items-center justify-between rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-800 shadow-[0_14px_30px_-24px_rgba(14,116,144,0.34)]'
                          data-testid={`${stepTestIdPrefix}-measure-${index + 1}`}
                          style={{
                            gridColumn: `${index * resolvedUnitsPerMeasure + 1} / span ${span}`,
                          }}
                        >
                          <span>Takt {index + 1}</span>
                          <span>{span}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <div
                  className={cn('relative grid', isCompactMobile ? 'gap-2' : 'gap-2 sm:gap-3')}
                  style={{
                    gridTemplateColumns: `repeat(${resolvedStepCount}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${laneKeys.length}, minmax(${resolvedLaneHeightPx}px, 1fr))`,
                    width: `max(100%, ${resolvedStepCount * resolvedMinStepWidthPx}px)`,
                  }}
                >
                  {laneKeys.map((note, laneIndex) => (
                    <div
                      key={`lane-${note.id}`}
                      className='pointer-events-none rounded-[20px] border border-white/55 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]'
                      data-lane-id={note.id}
                      style={{
                        gridColumn: `1 / span ${resolvedStepCount}`,
                        gridRow: laneIndex + 1,
                      }}
                    />
                  ))}

                  {Array.from({ length: Math.max(0, resolvedStepCount - 1) }, (_, index) => {
                    const column = index + 1;
                    const isMeasureBoundary = column % resolvedUnitsPerMeasure === 0;

                    return (
                      <div
                        key={`marker-${column}`}
                        className={cn(
                          'pointer-events-none border-r',
                          isMeasureBoundary ? 'border-sky-300/85' : 'border-white/45'
                        )}
                        data-testid={
                          isMeasureBoundary ? `${stepTestIdPrefix}-measure-boundary-${column}` : undefined
                        }
                        style={{
                          gridColumn: column,
                          gridRow: `1 / span ${laneKeys.length}`,
                        }}
                      />
                    );
                  })}

                  {currentCursorStep ? (
                    <div
                      className='pointer-events-none z-[1] rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.16))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.82),0_18px_34px_-28px_rgba(56,189,248,0.4)] backdrop-blur-[2px]'
                      data-testid={`${stepTestIdPrefix}-cursor`}
                      style={{
                        gridColumn: `${currentCursorStep.startUnit} / span ${currentCursorStep.span}`,
                        gridRow: `1 / span ${laneKeys.length}`,
                      }}
                    />
                  ) : null}

                  {resolvedMelody.map((step) => {
                    const isPlayed = step.index < resolvedCompletedCount;
                    const isActive = activeStepIndex === step.index;
                    const isExpected = expectedStepIndex === step.index;

                    return (
                      <div
                        key={`${String(step.noteId)}-${step.index}`}
                        aria-label={step.ariaLabel}
                        ref={(element) => {
                          if (element) {
                            stepElementRefs.current.set(step.index, element);
                            return;
                          }
                          stepElementRefs.current.delete(step.index);
                        }}
                        className={cn(
                          'relative z-[2] flex flex-col justify-between overflow-hidden border border-white/75 bg-gradient-to-br text-center shadow-[0_20px_40px_-30px_rgba(15,23,42,0.36)] transition duration-75',
                          isCompactMobile
                            ? 'min-h-[24px] rounded-[12px] px-1.5 py-1'
                            : 'min-h-[46px] rounded-[18px] px-2 py-2 sm:min-h-[52px] sm:px-3',
                          step.key.blockClassName,
                          isPlayed && 'opacity-100 saturate-110',
                          !isPlayed && !isActive && !isExpected && 'opacity-72 saturate-75',
                          isActive &&
                            'scale-[1.02] ring-4 ring-white/80 shadow-[0_26px_54px_-30px_rgba(15,23,42,0.42)]',
                          isExpected && !isActive && 'ring-2 ring-sky-200/95',
                          !isPlayed && !isActive && !isExpected && 'translate-y-0.5'
                        )}
                        data-lane-id={step.noteId}
                        data-span={step.span}
                        data-state={
                          isActive ? 'active' : isExpected ? 'expected' : isPlayed ? 'played' : 'upcoming'
                        }
                        data-testid={`${stepTestIdPrefix}-${step.index}`}
                        style={{
                          gridColumn: `${step.startUnit} / span ${step.span}`,
                          gridRow: step.laneIndex + 1,
                        }}
                      >
                        <div className='flex items-center justify-between gap-1.5'>
                          <div className={cn('font-black tracking-[0.28em] text-slate-50/80', isCompactMobile ? 'text-[8px]' : 'text-[10px]')}>
                            {step.index + 1}
                          </div>
                          {step.span > 1 && !isCompactMobile ? (
                            <div className='rounded-full bg-white/35 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-900/75'>
                              x{step.span}
                            </div>
                          ) : null}
                        </div>
                        <div className={cn('font-black uppercase tracking-[0.18em] text-slate-950', isCompactMobile ? 'text-[11px]' : 'text-sm sm:text-base')}>
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {resolvedShowMeasureGuides ? (
                  <div
                    className='mt-4 grid gap-2'
                    style={{
                      gridTemplateColumns: `repeat(${measureCount}, minmax(0, 1fr))`,
                      width: `max(100%, ${resolvedStepCount * resolvedMinStepWidthPx}px)`,
                    }}
                  >
                    {Array.from({ length: measureCount }, (_, index) => {
                      const measureStart = index * resolvedUnitsPerMeasure + 1;
                      const measureEnd = Math.min(
                        resolvedStepCount,
                        measureStart + resolvedUnitsPerMeasure - 1
                      );
                      const cursorStart = currentCursorStep?.startUnit ?? null;
                      const isCurrentMeasure =
                        cursorStart !== null &&
                        cursorStart >= measureStart &&
                        cursorStart <= measureEnd;

                      return (
                        <div
                          key={`measure-summary-${index + 1}`}
                          className={cn(
                            'rounded-[16px] border px-3 py-2 text-[10px] uppercase tracking-[0.22em] transition',
                            isCurrentMeasure
                              ? 'border-sky-300 bg-sky-100/90 text-sky-800 shadow-[0_16px_32px_-24px_rgba(14,116,144,0.4)]'
                              : 'border-white/70 bg-white/75 text-slate-500'
                          )}
                          data-testid={`${stepTestIdPrefix}-measure-summary-${index + 1}`}
                        >
                          <div className='font-black'>Takt {index + 1}</div>
                          <div className='mt-1 font-semibold'>Jednostki {measureStart}-{measureEnd}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          className={cn(
            isCompactMobile
              ? 'overflow-x-auto px-1.5 pb-2 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden'
              : ''
          )}
          data-testid={`${stepTestIdPrefix}-keyboard-rail`}
        >
          {resolvedKeyboardMode === 'synth' ? (
            <div
              className={cn(
                'mb-3 rounded-[18px] border border-white/80 bg-white/75 px-3 py-2 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.28)]',
                isCompactMobile ? 'min-w-max' : undefined
              )}
              data-testid={`${stepTestIdPrefix}-synth-axis-guide-shell`}
            >
              <div className='flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700'>
                <span data-testid={`${stepTestIdPrefix}-synth-axis-guide-x`}>X = Pitch</span>
                <span data-testid={`${stepTestIdPrefix}-synth-axis-guide-y`}>Y = Vibrato</span>
              </div>
              <div
                className='relative mt-2 h-2 overflow-hidden rounded-full bg-slate-900/10'
                data-pan={activeSynthGesture ? activeSynthGesture.stereoPan.toFixed(2) : undefined}
                data-pitch-cents={
                  activeSynthGesture ? String(activeSynthGesture.pitchCentsFromKey) : undefined
                }
                data-pitch-position={
                  activeSynthGesture
                    ? activeSynthGesture.normalizedHorizontalPosition.toFixed(2)
                    : undefined
                }
                data-testid={`${stepTestIdPrefix}-synth-pitch-guide`}
              >
                <div className='absolute inset-0 bg-gradient-to-r from-sky-200 via-fuchsia-200 to-amber-200' />
                {synthAxisAnchors.map(({ key, normalizedPosition }) => (
                  <div
                    key={`synth-axis-anchor-${String(key.id)}`}
                    className='absolute inset-y-0'
                    data-active-anchor={
                      activeSynthGesture?.visualNoteId === key.id ? 'true' : undefined
                    }
                    data-note-id={key.id}
                    data-testid={`${stepTestIdPrefix}-synth-axis-anchor-${key.id}`}
                    style={{
                      left: `calc(${(normalizedPosition * 100).toFixed(1)}% - 1px)`,
                    }}
                  >
                    <div
                      className={cn(
                        'absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/25 transition',
                        activeSynthGesture?.visualNoteId === key.id && 'h-4 bg-slate-950/70'
                      )}
                    />
                  </div>
                ))}
                <div className='absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/80' />
                <div
                  className='absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border border-white/80 bg-slate-950/85 shadow-[0_10px_20px_-14px_rgba(15,23,42,0.8)]'
                  style={{
                    left: `calc(${(
                      (activeSynthGesture?.normalizedHorizontalPosition ?? 0.5) * 100
                    ).toFixed(1)}% - 8px)`,
                  }}
                />
              </div>
              <div className='mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.22em] text-slate-500'>
                {synthAxisAnchors.map(({ key }) => (
                  <span
                    key={`synth-axis-anchor-label-${String(key.id)}`}
                    className={cn(
                      'transition',
                      activeSynthGesture?.visualNoteId === key.id && 'text-slate-900'
                    )}
                  >
                    {key.shortLabel}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div
            className={cn(
              isCompactMobile
                ? 'flex min-w-max gap-3'
                : 'grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8'
            )}
          >
            {keys.map((note) => {
              const isPressed = pressedNoteId === note.id;
              const isExpectedKey = expectedTransportStep?.noteId === note.id;
              const isActiveKey = activeTransportStep?.noteId === note.id;
              const activeSynthGesturesForKey =
                resolvedKeyboardMode === 'synth'
                  ? activeSynthGestures.filter((gesture) => gesture.visualNoteId === note.id)
                  : [];
              const activeSynthGestureForKey =
                activeSynthGesturesForKey[activeSynthGesturesForKey.length - 1] ?? null;
              const isActiveSynthKey = activeSynthGestureForKey !== null;
              const activeSynthVibratoOffset = isActiveSynthKey
                ? Number(
                    (((activeSynthGestureForKey?.normalizedVerticalPosition ?? 0.5) - 0.5) * 2).toFixed(
                      2
                    )
                  )
                : 0;
              const activeSynthVibratoDirection = !isActiveSynthKey
                ? 'idle'
                : (activeSynthGestureForKey?.vibratoDepth ?? 0) <= 0.01
                  ? 'neutral'
                  : activeSynthVibratoOffset < 0
                    ? 'up'
                    : 'down';
              const activeSynthVibratoFillExtent = Math.max(
                6,
                (activeSynthGestureForKey?.vibratoDepth ?? 0) * 50
              );
              const resolvedPressedVelocity = isPressed
                ? clamp(pressedVelocity ?? 0.72, 0.24, 1)
                : null;
              const visualVelocity = isActiveSynthKey
                ? activeSynthGestureForKey.velocity
                : resolvedPressedVelocity;
              const visualBrightness = isActiveSynthKey
                ? activeSynthGestureForKey.brightness
                : resolvedPressedVelocity === null
                  ? null
                  : Number(clamp(0.34 + resolvedPressedVelocity * 0.58, 0.28, 1).toFixed(2));
              const visualEnergy =
                visualVelocity === null
                  ? null
                  : Number(
                      clamp(
                        visualVelocity * 0.68 + (visualBrightness ?? visualVelocity) * 0.32,
                        0.24,
                        1
                      ).toFixed(2)
                    );
              const keyState = isActiveSynthKey
                ? 'gliding'
                : isPressed
                  ? 'pressed'
                  : isActiveKey
                    ? 'active'
                    : isExpectedKey
                      ? 'expected'
                      : 'idle';
              const keyPulse = recentKeyPulses.get(note.id) ?? null;
              const pulseEnergy = keyPulse?.energy ?? 0;
              const visualMeterValue =
                visualEnergy ?? (isActiveKey ? 0.44 : isExpectedKey ? 0.34 : 0.18);
              const velocityStyle = (
                visualEnergy !== null
                  ? {
                      filter: `brightness(${(1 + visualEnergy * 0.16).toFixed(2)}) saturate(${(
                        1 + (visualBrightness ?? visualEnergy) * 0.56
                      ).toFixed(2)})`,
                      transform: `translateY(-${(visualEnergy * (isActiveSynthKey ? 4.8 : 3.6)).toFixed(
                        1
                      )}px) scale(${(1 + visualEnergy * 0.06).toFixed(3)})`,
                    }
                  : undefined
              ) as CSSProperties | undefined;
              const keyStyle = {
                ...(velocityStyle ?? {}),
                touchAction: resolvedKeyboardMode === 'synth' ? 'none' : undefined,
              } as CSSProperties;

              return (
                <button
                  key={note.id}
                  type='button'
                  disabled={!isInteractive}
                  aria-label={note.ariaLabel}
                  aria-pressed={isPressed || isExpectedKey || isActiveKey}
                  ref={(element) => {
                    if (element) {
                      keyButtonRefs.current.set(note.id, element);
                      return;
                    }
                    keyButtonRefs.current.delete(note.id);
                  }}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden border border-white/75 bg-gradient-to-br text-left shadow-[0_24px_64px_-42px_rgba(15,23,42,0.46)] transition duration-75',
                    note.buttonClassName,
                    isCompactMobile
                      ? cn(
                          'w-[72px] min-h-[64px] min-w-[72px] shrink-0 rounded-[22px] px-2 py-2 text-[13px]',
                          isCoarsePointer && 'select-none',
                          isCoarsePointer &&
                            (resolvedKeyboardMode === 'synth' ? 'touch-none' : 'touch-manipulation')
                        )
                      : cn(
                          'w-full min-h-[88px] rounded-[28px] px-3 py-3 hover:-translate-y-0.5',
                          isCoarsePointer &&
                            cn(
                              'select-none',
                              resolvedKeyboardMode === 'synth'
                                ? 'touch-none'
                                : 'touch-manipulation'
                            )
                        ),
                    isCompactMobile && 'snap-start',
                    isInteractive ? 'cursor-pointer' : 'cursor-default opacity-90',
                    (isPressed || isExpectedKey || isActiveKey) &&
                      cn('ring-4 shadow-[0_26px_60px_-30px_rgba(15,23,42,0.46)]', note.glowClassName),
                    isExpectedKey && 'outline outline-2 outline-offset-2 outline-white/70',
                    isActiveKey && 'scale-[1.01]',
                    isActiveSynthKey &&
                      'ring-fuchsia-300/90 shadow-[0_30px_70px_-34px_rgba(192,38,211,0.45)]'
                  )}
                  data-active-glides={isActiveSynthKey ? activeSynthGesturesForKey.length : undefined}
                  data-hit-energy={keyPulse ? pulseEnergy.toFixed(2) : undefined}
                  data-hit-pulse={keyPulse?.phase}
                  data-key-state={keyState}
                  data-note-id={note.id}
                  data-press-brightness={
                    visualBrightness !== null ? visualBrightness.toFixed(2) : undefined
                  }
                  data-press-velocity={
                    visualVelocity !== null ? visualVelocity.toFixed(2) : undefined
                  }
                  data-testid={`${keyTestIdPrefix}-${note.id}`}
                  onBlur={() => clearPress(note.id)}
                  onClick={(event) => {
                    if (resolvedKeyboardMode === 'synth' && event.detail !== 0) {
                      return;
                    }
                    triggerPress(note.id);
                  }}
                  onKeyDown={(event) => {
                    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
                      startPress(note.id, 'keyboard');
                    }
                  }}
                  onPointerCancel={(event) => {
                    clearPress(note.id);
                    const gesture = activeSynthGesturesRef.current.get(event.pointerId);
                    if (gesture) {
                      endSynthGesture(gesture, event);
                    }
                  }}
                  onPointerDown={(event) => {
                    const pointerType = (event.pointerType as KangurMusicPointerType) || 'mouse';
                    startPress(note.id, pointerType, event);

                    if (resolvedKeyboardMode !== 'synth' || !isInteractive) {
                      return;
                    }

                    event.preventDefault();
                    try {
                      event.currentTarget.setPointerCapture?.(event.pointerId);
                    } catch {
                      // Pointer capture is a progressive enhancement.
                    }
                    const interactionId = `synth-${event.pointerId}-${String(note.id)}`;
                    const pressDetails = triggerPress(note.id, {
                      interactionId,
                      keepPressActive: true,
                      pointerType,
                    });
                    if (!pressDetails) {
                      return;
                    }

                    const pitchResolution = resolveSynthPitchAtPoint({
                      clientX: event.clientX,
                      fallbackKey: note,
                      fallbackRect: event.currentTarget.getBoundingClientRect(),
                      pointerType,
                    });
                    const keyRect = pitchResolution.keyRect;
                    const synthDetails = resolveSynthGestureDetails({
                      anchorSemitonePosition: pitchResolution.pitchSemitonePosition,
                      brightness: pressDetails.brightness,
                      frequencyHz: pitchResolution.frequencyHz,
                      interactionId,
                      nearestSemitonePosition: pitchResolution.nearestSemitonePosition,
                      normalizedHorizontalPosition: pitchResolution.normalizedHorizontalPosition,
                      normalizedVerticalPosition: resolveVerticalPosition(event.clientY, keyRect),
                      noteId: pitchResolution.key.id,
                      pitchSemitonePosition: pitchResolution.pitchSemitonePosition,
                      previousVibratoDepth: undefined,
                      pointerType,
                      velocity: pressDetails.velocity,
                    });
                    const nextGesture: ActiveSynthGestureState<NoteId> = {
                      anchorSemitonePosition: pitchResolution.pitchSemitonePosition,
                      ...synthDetails,
                      keyRect,
                      pointerId: event.pointerId,
                      visualNoteId: pitchResolution.displayKey.id,
                    };
                    activeSynthGesturesRef.current.delete(event.pointerId);
                    activeSynthGesturesRef.current.set(event.pointerId, nextGesture);
                    syncActiveSynthGestures();
                    onSynthGestureStart?.(synthDetails);
                  }}
                  onPointerMove={(event) => {
                    const updatedPress = activePressesRef.current.has(note.id)
                      ? updatePressFromPointerEvent(note.id, event)
                      : null;
                    if (resolvedKeyboardMode !== 'synth') {
                      return;
                    }

                    const gesture = activeSynthGesturesRef.current.get(event.pointerId);
                    if (!gesture) {
                      return;
                    }

                    event.preventDefault();
                    const liveDynamics =
                      updatedPress === null
                        ? { brightness: gesture.brightness, velocity: gesture.velocity }
                        : resolveGestureDynamics(updatedPress);
                    const fallbackKey = keyDefinitionById.get(gesture.noteId) ?? note;
                    const pitchResolution = resolveSynthPitchAtPoint({
                      clientX: event.clientX,
                      fallbackKey,
                      fallbackRect: gesture.keyRect,
                      pointerType: gesture.pointerType,
                      preferredNoteId: gesture.visualNoteId,
                    });
                    const targetKey = pitchResolution.key;
                    const targetKeyRect = pitchResolution.keyRect;
                    const displayKey = pitchResolution.displayKey;
                    const synthDetails = resolveSynthGestureDetails({
                      anchorSemitonePosition: gesture.anchorSemitonePosition,
                      brightness: Number(
                        clamp(
                          gesture.brightness * 0.34 + liveDynamics.brightness * 0.66,
                          0.28,
                          1
                        ).toFixed(2)
                      ),
                      frequencyHz: pitchResolution.frequencyHz,
                      interactionId: gesture.interactionId,
                      nearestSemitonePosition: pitchResolution.nearestSemitonePosition,
                      normalizedHorizontalPosition: pitchResolution.normalizedHorizontalPosition,
                      normalizedVerticalPosition: resolveVerticalPosition(
                        event.clientY,
                        targetKeyRect
                      ),
                      noteId: targetKey.id,
                      pitchSemitonePosition: pitchResolution.pitchSemitonePosition,
                      previousVibratoDepth: gesture.vibratoDepth,
                      pointerType: gesture.pointerType,
                      velocity: Number(
                        clamp(gesture.velocity * 0.42 + liveDynamics.velocity * 0.58, 0.24, 1).toFixed(
                          2
                        )
                      ),
                    });
                    const nextGesture: ActiveSynthGestureState<NoteId> = {
                      anchorSemitonePosition: gesture.anchorSemitonePosition,
                      ...synthDetails,
                      keyRect: targetKeyRect,
                      pointerId: gesture.pointerId,
                      visualNoteId: displayKey.id,
                    };
                    if (displayKey.id !== gesture.visualNoteId) {
                      triggerKeyPulse(
                        displayKey.id,
                        synthDetails.velocity * 0.58 + synthDetails.brightness * 0.42,
                        'glide'
                      );
                    }
                    activeSynthGesturesRef.current.delete(event.pointerId);
                    activeSynthGesturesRef.current.set(event.pointerId, nextGesture);
                    syncActiveSynthGestures();
                    onSynthGestureChange?.(synthDetails);
                  }}
                  onPointerUp={(event) => {
                    const updatedPress = updatePressFromPointerEvent(note.id, event);
                    if (resolvedKeyboardMode !== 'synth') {
                      return;
                    }

                    const gesture = activeSynthGesturesRef.current.get(event.pointerId);
                    if (gesture) {
                      const fallbackKey = keyDefinitionById.get(gesture.noteId) ?? note;
                      const pitchResolution = resolveSynthPitchAtPoint({
                        clientX: event.clientX,
                        fallbackKey,
                        fallbackRect: gesture.keyRect,
                        pointerType: gesture.pointerType,
                        preferredNoteId: gesture.visualNoteId,
                      });
                      const targetKey = pitchResolution.key;
                      const targetKeyRect = pitchResolution.keyRect;
                      const liveDynamics =
                        updatedPress === null
                          ? { brightness: gesture.brightness, velocity: gesture.velocity }
                          : resolveGestureDynamics(updatedPress);
                      const finalGesture: ActiveSynthGestureState<NoteId> = {
                        anchorSemitonePosition: gesture.anchorSemitonePosition,
                        ...resolveSynthGestureDetails({
                          anchorSemitonePosition: gesture.anchorSemitonePosition,
                          brightness: Number(
                            clamp(
                              gesture.brightness * 0.28 + liveDynamics.brightness * 0.72,
                              0.28,
                              1
                            ).toFixed(2)
                          ),
                          frequencyHz: pitchResolution.frequencyHz,
                          interactionId: gesture.interactionId,
                          nearestSemitonePosition: pitchResolution.nearestSemitonePosition,
                          normalizedHorizontalPosition: pitchResolution.normalizedHorizontalPosition,
                          normalizedVerticalPosition: resolveVerticalPosition(
                            event.clientY,
                            targetKeyRect
                          ),
                          noteId: targetKey.id,
                          pitchSemitonePosition: pitchResolution.pitchSemitonePosition,
                          previousVibratoDepth: gesture.vibratoDepth,
                          pointerType: gesture.pointerType,
                          velocity: Number(
                            clamp(
                              gesture.velocity * 0.34 + liveDynamics.velocity * 0.66,
                              0.24,
                              1
                            ).toFixed(2)
                          ),
                        }),
                        keyRect: targetKeyRect,
                        pointerId: gesture.pointerId,
                        visualNoteId: pitchResolution.displayKey.id,
                      };
                      activeSynthGesturesRef.current.delete(event.pointerId);
                      activeSynthGesturesRef.current.set(event.pointerId, finalGesture);
                      syncActiveSynthGestures();
                      endSynthGesture(finalGesture, event);
                    }
                    clearPress(note.id);
                  }}
                  style={keyStyle}
                >
                  <div
                    className='pointer-events-none absolute inset-0 rounded-[inherit] transition duration-100'
                    style={{
                      background: `radial-gradient(circle at 50% 22%, rgba(255,255,255,${(
                        0.14 + visualMeterValue * 0.22
                      ).toFixed(2)}), transparent 48%), linear-gradient(180deg, rgba(255,255,255,${(
                        0.08 + visualMeterValue * 0.14
                      ).toFixed(2)}) 0%, rgba(255,255,255,0) 42%)`,
                    }}
                  />
                  {keyPulse ? (
                    <div
                      className='pointer-events-none absolute inset-0 rounded-[inherit] transition duration-200'
                      style={{
                        background:
                          keyPulse.phase === 'glide'
                            ? `radial-gradient(circle at 50% 50%, rgba(244,114,182,${(
                                0.16 + pulseEnergy * 0.2
                              ).toFixed(2)}), rgba(255,255,255,${(
                                0.08 + pulseEnergy * 0.12
                              ).toFixed(2)}) 34%, rgba(255,255,255,0) 68%)`
                            : `radial-gradient(circle at 50% 62%, rgba(255,255,255,${(
                                0.18 + pulseEnergy * 0.24
                              ).toFixed(2)}), rgba(56,189,248,${(
                                0.08 + pulseEnergy * 0.18
                              ).toFixed(2)}) 32%, rgba(56,189,248,0) 70%)`,
                        opacity: (0.48 + pulseEnergy * 0.32).toFixed(2),
                        transform: `scale(${(
                          keyPulse.phase === 'glide'
                            ? 1.02 + pulseEnergy * 0.04
                            : 0.98 + pulseEnergy * 0.08
                        ).toFixed(3)})`,
                      }}
                    />
                  ) : null}
                  <div className='absolute inset-x-4 top-3 h-5 rounded-full bg-white/35 blur-md' />
                  {resolvedKeyboardMode === 'synth' ? (
                    <div className='pointer-events-none absolute inset-y-3 right-3 flex items-center'>
                      <div
                        className={cn(
                          'relative rounded-full bg-white/30 shadow-[inset_0_1px_2px_rgba(15,23,42,0.16)]',
                          isCompactMobile ? 'h-[calc(100%-0.5rem)] w-2.5' : 'h-full w-3'
                        )}
                        data-vibrato-direction={isActiveSynthKey ? activeSynthVibratoDirection : undefined}
                        data-vibrato-rate={
                          isActiveSynthKey
                            ? activeSynthGestureForKey?.vibratoRateHz.toFixed(1)
                            : undefined
                        }
                        data-vibrato-depth={
                          isActiveSynthKey
                            ? (activeSynthGestureForKey?.vibratoDepth ?? 0).toFixed(2)
                            : undefined
                        }
                      >
                        {isActiveSynthKey ? (
                          <div className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-4 text-[8px] font-black uppercase tracking-[0.18em] text-slate-900/55'>
                            Vib
                          </div>
                        ) : null}
                        <div
                          className='absolute left-[15%] right-[15%] rounded-full border border-white/35 bg-white/24 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]'
                          data-vibrato-neutral-zone={VIBRATO_DEAD_ZONE.toFixed(2)}
                          style={{
                            height: `${(VIBRATO_DEAD_ZONE * 100).toFixed(1)}%`,
                            top: `${((0.5 - VIBRATO_DEAD_ZONE / 2) * 100).toFixed(1)}%`,
                          }}
                        />
                        <div className='absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-900/35' />
                        {isActiveSynthKey ? (
                          <div
                            className={cn(
                              'absolute left-0 right-0 rounded-full',
                              activeSynthVibratoDirection === 'up'
                                ? 'bg-sky-300/60'
                                : activeSynthVibratoDirection === 'down'
                                  ? 'bg-fuchsia-300/60'
                                  : 'bg-slate-300/45'
                            )}
                            style={{
                              height: `${activeSynthVibratoFillExtent}%`,
                              top:
                                activeSynthVibratoDirection === 'up'
                                  ? `calc(50% - ${activeSynthVibratoFillExtent}%)`
                                  : activeSynthVibratoDirection === 'down'
                                    ? '50%'
                                    : `calc(50% - ${activeSynthVibratoFillExtent / 2}%)`,
                            }}
                          />
                        ) : null}
                        {isActiveSynthKey ? (
                          <div
                            className='absolute left-1/2 h-5 w-5 -translate-x-1/2 rounded-full border border-white/80 bg-white/90 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.75)]'
                            style={{
                              top: `calc(${(activeSynthGestureForKey?.normalizedVerticalPosition ?? 0.5) * 100}% - 10px)`,
                            }}
                          />
                        ) : null}
                        {isActiveSynthKey ? (
                          <div className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-[8px] font-black uppercase tracking-[0.18em] text-slate-900/55'>
                            {Math.round((activeSynthGestureForKey?.vibratoDepth ?? 0) * 100)}%
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className='relative flex items-start justify-between gap-2'>
                    <span
                      className={cn(
                        'font-black uppercase tracking-[0.28em] text-slate-50/85',
                        isCompactMobile ? 'text-[10px]' : 'text-[11px]'
                      )}
                    >
                      {note.shortLabel}
                    </span>
                    <span
                      className={cn(
                        'rounded-full bg-white/35 font-bold uppercase tracking-[0.2em] text-slate-900/80',
                        isCompactMobile ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
                      )}
                    >
                      {note.label}
                    </span>
                  </div>
                  <div className='relative mt-auto'>
                    <div
                      className={cn(
                        'font-black tracking-tight text-slate-950',
                        isCompactMobile ? 'text-lg' : 'text-xl'
                      )}
                    >
                      {note.label}
                    </div>
                    {isActiveSynthKey ? (
                      <div
                        className={cn(
                          'inline-flex rounded-full bg-slate-950/10 font-black uppercase tracking-[0.18em] text-slate-900/70',
                          isCompactMobile ? 'mt-1 px-1.5 py-0.5 text-[9px]' : 'mt-2 px-2 py-1 text-[10px]'
                        )}
                      >
                        {activeSynthGestureForKey.pitchSemitoneOffset >= 0 ? '+' : ''}
                        {activeSynthGestureForKey.pitchSemitoneOffset.toFixed(1)} st
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'font-medium text-slate-950/70',
                        isCompactMobile ? 'text-[11px]' : 'text-xs'
                      )}
                    >
                      {note.spokenLabel}
                    </div>
                    <div className='pointer-events-none mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950/12 shadow-[inset_0_1px_2px_rgba(15,23,42,0.12)]'>
                      <div
                        className='h-full rounded-full bg-white/85 transition-[width,opacity,transform] duration-100'
                        style={{
                          opacity: isPressed || isActiveSynthKey ? 0.94 : isExpectedKey || isActiveKey ? 0.56 : 0.28,
                          transform: `translateZ(0) scaleY(${(0.92 + visualMeterValue * 0.16).toFixed(3)})`,
                          width: `${Math.round(visualMeterValue * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
