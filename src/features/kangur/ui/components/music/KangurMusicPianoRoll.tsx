'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import { cn } from '@/features/kangur/shared/utils';
import { getMotionSafeScrollBehavior } from '@/shared/utils/motion-accessibility';

import type {
  KangurMusicSynthGlideMode,
  KangurMusicKeyboardMode,
  KangurMusicPianoKeyDefinition,
  KangurMusicSynthWaveform,
  KangurMusicSynthOsc1Config,
  KangurMusicSynthOsc2Config,
} from './music-theory';
import {
  KANGUR_MUSIC_SYNTH_DEFAULT_OSC1_CONFIG,
  KANGUR_MUSIC_SYNTH_DEFAULT_OSC2_CONFIG,
} from './music-theory';
import {
  KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE,
  normalizeKangurMusicSynthEnvelope,
  type KangurMusicSynthEnvelope,
} from './useKangurMusicSynth';
import type {
  ActiveKeyPressState,
  ActiveSynthGestureState,
  KangurMusicPianoKeyPressDetails,
  KangurMusicPianoRollStep,
  KangurMusicPointerType,
  KangurMusicPressDynamics,
  KangurMusicSynthGestureDetails,
  KeyPulsePhase,
  KeyPulseState,
  ResolvedPianoRollStep,
  SynthPitchResolution,
} from './KangurMusicPianoRoll.types';
import {
  clamp,
  KANGUR_PIANO_ROLL_ENGINE_CLASSNAME,
  nowMs,
  resolvePointerContactSpan,
  resolvePointerPressure,
  resolvePressDynamics,
  resolveSynthPitchAtPoint as resolveSynthPitchAtPointFromLayout,
  resolveVerticalPosition,
  resolveSmoothedVibratoDepth,
  resolveStereoPan,
  resolveVibratoDepth,
  resolveVibratoRateHz,
} from './KangurMusicPianoRoll.utils';
import { KangurMusicPianoRollControls } from './KangurMusicPianoRollControls';
import { KangurMusicPianoRollGrid } from './KangurMusicPianoRollGrid';
import { KangurMusicPianoRollKeyboardRail } from './KangurMusicPianoRollKeyboardRail';
import { KangurMusicPianoRollProvider } from './KangurMusicPianoRoll.context';

export type {
  KangurMusicKeyboardMode,
  KangurMusicSynthGlideMode,
  KangurMusicSynthWaveform,
  KangurMusicSynthOsc1Config,
  KangurMusicSynthOsc2Config,
} from './music-theory';
export {
  KANGUR_MUSIC_SYNTH_DEFAULT_OSC1_CONFIG,
  KANGUR_MUSIC_SYNTH_DEFAULT_OSC2_CONFIG,
} from './music-theory';
export type { KangurMusicSynthEnvelope } from './useKangurMusicSynth';
export { KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE } from './useKangurMusicSynth';
export {
  KANGUR_MUSIC_PIANO_ROLL_MOTION_CSS_VARIABLES,
  KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS,
} from './KangurMusicPianoRoll.utils';
export type {
  KangurMusicPianoKeyPressDetails,
  KangurMusicPianoRollStep,
  KangurMusicSynthGestureDetails,
} from './KangurMusicPianoRoll.types';

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
  onSynthEnvelopeChange?: (envelope: KangurMusicSynthEnvelope) => void;
  onSynthOscSettingsChange?: ((osc1: KangurMusicSynthOsc1Config, osc2: KangurMusicSynthOsc2Config) => void) | undefined;
  onSynthWaveformChange?: (waveform: KangurMusicSynthWaveform) => void;
  pressedNoteId?: NoteId | null;
  pressedVelocity?: number | null;
  shellTestId?: string;
  showSynthEnvelopeButton?: boolean;
  showKeyboardModeSwitch?: boolean;
  showSynthGlideModeSwitch?: boolean;
  showMeasureGuides?: boolean;
  showLaneLabels?: boolean;
  showSynthOscSettingsPanel?: boolean | undefined;
  synthEnvelope?: KangurMusicSynthEnvelope;
  showSynthWaveformSwitch?: boolean;
  synthGlideMode?: KangurMusicSynthGlideMode;
  stepTestIdPrefix?: string;
  synthOsc1Config?: KangurMusicSynthOsc1Config | undefined;
  synthOsc2Config?: KangurMusicSynthOsc2Config | undefined;
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
  onSynthEnvelopeChange,
  onSynthOscSettingsChange,
  onSynthWaveformChange,
  pressedNoteId = null,
  pressedVelocity = null,
  shellTestId,
  showSynthEnvelopeButton = false,
  showKeyboardModeSwitch = false,
  showSynthGlideModeSwitch = false,
  showMeasureGuides = true,
  showLaneLabels = true,
  showSynthOscSettingsPanel = false,
  synthEnvelope,
  showSynthWaveformSwitch = false,
  synthGlideMode,
  stepTestIdPrefix = 'kangur-music-piano-step',
  synthOsc1Config,
  synthOsc2Config,
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
  const [uncontrolledSynthEnvelope, setUncontrolledSynthEnvelope] =
    useState<KangurMusicSynthEnvelope>(KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE);
  const [isSynthEnvelopeDialogOpen, setSynthEnvelopeDialogOpen] = useState(false);
  const [isSynthOscPanelOpen, setSynthOscPanelOpen] = useState(false);
  const [activeOscTab, setActiveOscTab] = useState<'osc1' | 'osc2'>('osc1');
  const [uncontrolledOsc1Config, setUncontrolledOsc1Config] =
    useState<KangurMusicSynthOsc1Config>(KANGUR_MUSIC_SYNTH_DEFAULT_OSC1_CONFIG);
  const [uncontrolledOsc2Config, setUncontrolledOsc2Config] =
    useState<KangurMusicSynthOsc2Config>(KANGUR_MUSIC_SYNTH_DEFAULT_OSC2_CONFIG);
  const [activeSynthGestures, setActiveSynthGestures] =
    useState<ActiveSynthGestureState<NoteId>[]>([]);
  const [recentKeyPulses, setRecentKeyPulses] = useState<Map<NoteId, KeyPulseState>>(new Map());
  const isInteractive = interactive && !disabled && typeof onKeyPress === 'function';
  const isCompactMobile = isCoarsePointer || isMobileViewport;
  const resolvedKeyboardMode = keyboardMode ?? uncontrolledKeyboardMode;
  const resolvedSynthGlideMode = synthGlideMode ?? uncontrolledSynthGlideMode;
  const resolvedSynthWaveform = synthWaveform ?? uncontrolledSynthWaveform;
  const resolvedSynthEnvelope = normalizeKangurMusicSynthEnvelope(
    synthEnvelope ?? uncontrolledSynthEnvelope
  );
  const resolvedOsc1Config = synthOsc1Config ?? uncontrolledOsc1Config;
  const resolvedOsc2Config = synthOsc2Config ?? uncontrolledOsc2Config;
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

  useEffect(() => {
    if (resolvedKeyboardMode !== 'synth') {
      if (isSynthEnvelopeDialogOpen) setSynthEnvelopeDialogOpen(false);
      if (isSynthOscPanelOpen) setSynthOscPanelOpen(false);
    }
  }, [isSynthEnvelopeDialogOpen, isSynthOscPanelOpen, resolvedKeyboardMode]);

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

  const handleSynthOscSettingsChange = (
    nextOsc1: KangurMusicSynthOsc1Config,
    nextOsc2: KangurMusicSynthOsc2Config
  ): void => {
    if (synthOsc1Config === undefined) setUncontrolledOsc1Config(nextOsc1);
    if (synthOsc2Config === undefined) setUncontrolledOsc2Config(nextOsc2);
    onSynthOscSettingsChange?.(nextOsc1, nextOsc2);
  };

  const handleSynthEnvelopeChange = (
    nextEnvelope: Partial<KangurMusicSynthEnvelope>
  ): void => {
    const resolvedNextEnvelope = normalizeKangurMusicSynthEnvelope({
      ...resolvedSynthEnvelope,
      ...nextEnvelope,
    });
    if (synthEnvelope === undefined) {
      setUncontrolledSynthEnvelope(resolvedNextEnvelope);
    }
    onSynthEnvelopeChange?.(resolvedNextEnvelope);
  };

  const handleSynthEnvelopeReset = (): void => {
    handleSynthEnvelopeChange(KANGUR_DEFAULT_MUSIC_SYNTH_ENVELOPE);
  };

  const handleSynthEnvelopeSliderChange = (
    controlId: string,
    nextValue: number
  ): void => {
    switch (controlId) {
      case 'attackMs':
        handleSynthEnvelopeChange({ attackMs: nextValue });
        return;
      case 'decayMs':
        handleSynthEnvelopeChange({ decayMs: nextValue });
        return;
      case 'releaseMs':
        handleSynthEnvelopeChange({ releaseMs: nextValue });
        return;
      case 'sustainLevel':
        handleSynthEnvelopeChange({ sustainLevel: nextValue / 100 });
        return;
      default:
        return;
    }
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
    return resolveSynthPitchAtPointFromLayout({
      clientX,
      fallbackKey,
      fallbackRect,
      keyButtonRefs: keyButtonRefs.current,
      keyDefinitionById,
      pointerType,
      preferredNoteId,
      resolvedSynthGlideMode,
    });
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

  const providerValue = {
    activePressesRef: activePressesRef as any,
    activeOscTab,
    activeStepIndex,
    activeSynthGesture: activeSynthGesture as any,
    activeSynthGestureCount,
    activeSynthGestures: activeSynthGestures as any,
    activeSynthGesturesRef: activeSynthGesturesRef as any,
    activeTransportStep: activeTransportStep as any,
    currentCursorStep: currentCursorStep as any,
    expectedStepIndex,
    expectedTransportStep: expectedTransportStep as any,
    isCompactMobile,
    isCoarsePointer,
    isFreePlayMode,
    isInteractive,
    isSixYearOldVisualMode,
    isSynthEnvelopeDialogOpen,
    isSynthOscPanelOpen,
    keyButtonRefs: keyButtonRefs as any,
    keyDefinitionById: keyDefinitionById as any,
    keys: keys as any,
    keyTestIdPrefix,
    laneKeys: laneKeys as any,
    measureCount,
    pressedNoteId: pressedNoteId as any,
    pressedVelocity,
    recentKeyPulses: recentKeyPulses as any,
    resolvedCompletedCount,
    resolvedKeyboardMode,
    resolvedLaneHeightPx,
    resolvedMelody: resolvedMelody as any,
    resolvedMinStepWidthPx,
    resolvedOsc1Config,
    resolvedOsc2Config,
    resolvedShowLaneLabels,
    resolvedShowMeasureGuides,
    resolvedStepCount,
    resolvedSynthEnvelope,
    resolvedSynthGlideMode,
    resolvedSynthWaveform,
    resolvedUnitsPerMeasure,
    shouldShowTransportRail,
    showKeyboardModeSwitch,
    showSynthEnvelopeButton,
    showSynthGlideModeSwitch,
    showSynthOscSettingsPanel,
    showSynthWaveformSwitch,
    stepElementRefs: stepElementRefs as any,
    stepTestIdPrefix,
    synthAxisAnchors: synthAxisAnchors as any,
    onActiveOscTabChange: setActiveOscTab,
    onClearPress: clearPress as any,
    onEndSynthGesture: endSynthGesture as any,
    onKeyboardModeChange: handleKeyboardModeChange,
    onOpenSynthEnvelopeDialog: () => setSynthEnvelopeDialogOpen(true),
    onCloseSynthEnvelopeDialog: () => setSynthEnvelopeDialogOpen(false),
    onResolveGestureDynamics: resolveGestureDynamics as any,
    onResolveSynthGestureDetails: resolveSynthGestureDetails as any,
    onResolveSynthPitchAtPoint: resolveSynthPitchAtPoint as any,
    onResolveVerticalPosition: resolveVerticalPosition as any,
    onStartPress: startPress as any,
    onSynthEnvelopeReset: handleSynthEnvelopeReset,
    onSynthEnvelopeSliderChange: handleSynthEnvelopeSliderChange,
    onSynthGestureChange: onSynthGestureChange as any,
    onSynthGestureStart: onSynthGestureStart as any,
    onSynthGlideModeChange: handleSynthGlideModeChange,
    onSynthOscPanelToggle: () => setSynthOscPanelOpen((prev) => !prev),
    onSynthOscSettingsChange: handleSynthOscSettingsChange,
    onSynthWaveformChange: handleSynthWaveformChange,
    onTriggerKeyPulse: triggerKeyPulse as any,
    onTriggerPress: triggerPress as any,
    onUpdatePressFromPointerEvent: updatePressFromPointerEvent as any,
    syncActiveSynthGestures,
  };

  return (
    <div
      className={cn(
        KANGUR_PIANO_ROLL_ENGINE_CLASSNAME,
        'relative w-full overflow-hidden rounded-[32px] border border-sky-100/90 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(224,242,254,0.92)_55%,rgba(186,230,253,0.78)_100%)] shadow-[0_30px_80px_-44px_rgba(14,116,144,0.4)]',
        isCompactMobile ? 'p-3.5' : 'p-4 sm:p-5',
        className,
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
                  isCompactMobile ? 'line-clamp-2 text-xs' : 'text-sm',
                )}
              >
                {description}
              </div>
            ) : null}
          </div>
        ) : null}

        <KangurMusicPianoRollProvider value={providerValue as any}>
          <KangurMusicPianoRollControls />
          <KangurMusicPianoRollGrid />
          <KangurMusicPianoRollKeyboardRail />
        </KangurMusicPianoRollProvider>
      </div>
    </div>
  );
}
