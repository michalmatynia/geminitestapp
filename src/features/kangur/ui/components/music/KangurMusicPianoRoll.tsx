'use client';

import { useEffect, useRef, useState } from 'react';
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
  MAX_SYNTH_GLIDE_SEMITONES,
  resolveGlideSemitoneOffsetForMode,
  resolveFrequencyWithSemitoneOffset,
  resolveSynthGlideSemitoneOffset,
} from './music-theory';
import { KangurMusicWaveformIcon } from './music-waveform-icons';

export type {
  KangurMusicKeyboardMode,
  KangurMusicSynthGlideMode,
  KangurMusicSynthWaveform,
} from './music-theory';

type KangurMusicPointerType = 'keyboard' | 'mouse' | 'pen' | 'touch';

export type KangurMusicPianoKeyPressDetails = {
  intervalMs: number | null;
  interactionId: string | null;
  keyboardMode: KangurMusicKeyboardMode;
  pointerType: KangurMusicPointerType;
  pressDurationMs: number | null;
  velocity: number;
};

export type KangurMusicSynthGestureDetails<NoteId extends string> = {
  frequencyHz: number;
  interactionId: string;
  keyboardMode: KangurMusicKeyboardMode;
  noteId: NoteId;
  normalizedVerticalPosition: number;
  pitchSemitoneOffset: number;
  pointerType: KangurMusicPointerType;
  velocity: number;
};

export type KangurMusicPianoRollStep<NoteId extends string> = {
  ariaLabel?: string;
  label?: ReactNode;
  noteId: NoteId;
  span?: number;
};

type ActiveKeyPressState = {
  pointerType: KangurMusicPointerType;
  startedAtMs: number;
};

type ActiveSynthGestureState<NoteId extends string> = {
  frequencyHz: number;
  interactionId: string;
  noteId: NoteId;
  normalizedVerticalPosition: number;
  pitchSemitoneOffset: number;
  pointerId: number;
  pointerType: KangurMusicPointerType;
  velocity: number;
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

// Quick taps and quick note-to-note motion should sound more energetic on touch devices.
const resolveVelocity = ({
  intervalMs,
  pointerType,
  pressDurationMs,
}: Pick<KangurMusicPianoKeyPressDetails, 'intervalMs' | 'pointerType' | 'pressDurationMs'>): number => {
  const normalizedDuration =
    pressDurationMs === null ? 0.58 : clamp((240 - pressDurationMs) / 180, 0, 1);
  const normalizedCadence =
    intervalMs === null ? 0.55 : clamp((320 - intervalMs) / 220, 0, 1);
  const isTouchLike = pointerType === 'touch' || pointerType === 'pen';
  const baseVelocity = isTouchLike ? 0.36 : pointerType === 'keyboard' ? 0.62 : 0.46;
  const durationWeight = isTouchLike ? 0.42 : 0.24;
  const cadenceWeight = isTouchLike ? 0.22 : 0.18;

  return Number(
    clamp(
      baseVelocity + normalizedDuration * durationWeight + normalizedCadence * cadenceWeight,
      0.24,
      1
    ).toFixed(2)
  );
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
  const activeSynthGestureCount = activeSynthGestures.length;

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

  const startPress = (noteId: NoteId, pointerType: KangurMusicPointerType): void => {
    activePressesRef.current.set(noteId, {
      pointerType,
      startedAtMs: nowMs(),
    });
  };

  const clearPress = (noteId: NoteId): void => {
    activePressesRef.current.delete(noteId);
  };

  const buildPressDetails = ({
    interactionId = null,
    noteId,
    pointerType,
  }: {
    interactionId?: string | null;
    noteId: NoteId;
    pointerType?: KangurMusicPointerType;
  }): KangurMusicPianoKeyPressDetails => {
    const triggeredAtMs = nowMs();
    const activePress = activePressesRef.current.get(noteId);
    const resolvedPointerType = pointerType ?? activePress?.pointerType ?? 'mouse';
    const details: KangurMusicPianoKeyPressDetails = {
      interactionId,
      intervalMs:
        lastTriggeredAtRef.current === null
          ? null
          : Math.max(0, triggeredAtMs - lastTriggeredAtRef.current),
      keyboardMode: resolvedKeyboardMode,
      pointerType: resolvedPointerType,
      pressDurationMs:
        activePress === undefined ? null : Math.max(24, triggeredAtMs - activePress.startedAtMs),
      velocity: 0,
    };
    details.velocity = resolveVelocity(details);
    lastTriggeredAtRef.current = triggeredAtMs;
    activePressesRef.current.delete(noteId);
    return details;
  };

  const triggerPress = (
    noteId: NoteId,
    options: {
      interactionId?: string | null;
      pointerType?: KangurMusicPointerType;
    } = {}
  ): KangurMusicPianoKeyPressDetails | null => {
    if (!isInteractive) {
      return null;
    }

    const details = buildPressDetails({
      interactionId: options.interactionId,
      noteId,
      pointerType: options.pointerType,
    });
    onKeyPress?.(noteId, details);
    return details;
  };

  const resolveSynthGestureDetails = ({
    baseFrequencyHz,
    interactionId,
    noteId,
    pointerType,
    velocity,
    normalizedVerticalPosition,
  }: {
    baseFrequencyHz: number;
    interactionId: string;
    noteId: NoteId;
    pointerType: KangurMusicPointerType;
    velocity: number;
    normalizedVerticalPosition: number;
  }): KangurMusicSynthGestureDetails<NoteId> => {
    const pitchSemitoneOffset = resolveGlideSemitoneOffsetForMode(
      resolveSynthGlideSemitoneOffset(normalizedVerticalPosition),
      resolvedSynthGlideMode
    );

    return {
      frequencyHz: resolveFrequencyWithSemitoneOffset(baseFrequencyHz, pitchSemitoneOffset),
      interactionId,
      keyboardMode: resolvedKeyboardMode,
      noteId,
      normalizedVerticalPosition,
      pitchSemitoneOffset,
      pointerType,
      velocity,
    };
  };

  const resolveVerticalPosition = (
    event: React.PointerEvent<HTMLButtonElement>
  ): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.height <= 0) {
      return 0.5;
    }

    return clamp((event.clientY - rect.top) / rect.height, 0, 1);
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
      frequencyHz: gesture.frequencyHz,
      interactionId: gesture.interactionId,
      keyboardMode: resolvedKeyboardMode,
      noteId: gesture.noteId,
      normalizedVerticalPosition: gesture.normalizedVerticalPosition,
      pitchSemitoneOffset: gesture.pitchSemitoneOffset,
      pointerType: gesture.pointerType,
      velocity: gesture.velocity,
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
                  {resolvedMelody.length} nut
                </div>
              </div>
              {activeTransportStep || expectedTransportStep ? (
                <div
                  className={cn(
                    'flex gap-2 px-2',
                    isCompactMobile
                      ? 'mb-2 overflow-x-auto pb-2 [scrollbar-width:none] snap-x snap-mandatory whitespace-nowrap [&::-webkit-scrollbar]:hidden'
                      : 'mb-2.5 flex-wrap'
                  )}
                  data-testid={`${stepTestIdPrefix}-transport-rail`}
                >
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
                  <div
                    className='shrink-0 rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600'
                    data-testid={`${stepTestIdPrefix}-transport-count`}
                  >
                    Krok {(activeStepIndex ?? expectedStepIndex ?? 0) + 1}/{resolvedMelody.length}
                  </div>
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
                      className='pointer-events-none z-[1] rounded-[20px] bg-white/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)] backdrop-blur-[1px]'
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
                          'relative z-[2] flex flex-col justify-between overflow-hidden border border-white/75 bg-gradient-to-br text-center shadow-[0_20px_40px_-30px_rgba(15,23,42,0.36)] transition duration-200',
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
                ? activeSynthGestures.filter((gesture) => gesture.noteId === note.id)
                : [];
            const activeSynthGestureForKey =
              activeSynthGesturesForKey[activeSynthGesturesForKey.length - 1] ?? null;
            const isActiveSynthKey = activeSynthGestureForKey !== null;
            const resolvedPressedVelocity = isPressed ? clamp(pressedVelocity ?? 0.72, 0.24, 1) : null;
            const velocityStyle = (
              isPressed && resolvedPressedVelocity !== null
                ? {
                    filter: `brightness(${(1 + resolvedPressedVelocity * 0.08).toFixed(2)}) saturate(${(
                      1 + resolvedPressedVelocity * 0.34
                    ).toFixed(2)})`,
                    transform: `translateY(-${(resolvedPressedVelocity * 2.4).toFixed(1)}px) scale(${(
                      1 +
                      resolvedPressedVelocity * 0.035
                    ).toFixed(3)})`,
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
                className={cn(
                  'group relative flex flex-col justify-between overflow-hidden border border-white/75 bg-gradient-to-br text-left shadow-[0_24px_64px_-42px_rgba(15,23,42,0.46)] transition duration-200',
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
                  isActiveSynthKey && 'ring-fuchsia-300/90 shadow-[0_30px_70px_-34px_rgba(192,38,211,0.45)]'
                )}
                data-note-id={note.id}
                data-active-glides={isActiveSynthKey ? activeSynthGesturesForKey.length : undefined}
                data-press-velocity={
                  isPressed && resolvedPressedVelocity !== null
                    ? resolvedPressedVelocity.toFixed(2)
                    : undefined
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
                  startPress(note.id, pointerType);

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
                    pointerType,
                  });
                  if (!pressDetails) {
                    return;
                  }

                  const synthDetails = resolveSynthGestureDetails({
                    baseFrequencyHz: note.frequencyHz,
                    interactionId,
                    normalizedVerticalPosition: resolveVerticalPosition(event),
                    noteId: note.id,
                    pointerType,
                    velocity: pressDetails.velocity,
                  });
                  const nextGesture: ActiveSynthGestureState<NoteId> = {
                    ...synthDetails,
                    pointerId: event.pointerId,
                  };
                  activeSynthGesturesRef.current.delete(event.pointerId);
                  activeSynthGesturesRef.current.set(event.pointerId, nextGesture);
                  syncActiveSynthGestures();
                  onSynthGestureStart?.(synthDetails);
                }}
                onPointerMove={(event) => {
                  if (resolvedKeyboardMode !== 'synth') {
                    return;
                  }

                  const gesture = activeSynthGesturesRef.current.get(event.pointerId);
                  if (!gesture) {
                    return;
                  }

                  event.preventDefault();
                  const synthDetails = resolveSynthGestureDetails({
                    baseFrequencyHz: note.frequencyHz,
                    interactionId: gesture.interactionId,
                    normalizedVerticalPosition: resolveVerticalPosition(event),
                    noteId: note.id,
                    pointerType: gesture.pointerType,
                    velocity: gesture.velocity,
                  });
                  const nextGesture: ActiveSynthGestureState<NoteId> = {
                    ...synthDetails,
                    pointerId: gesture.pointerId,
                  };
                  activeSynthGesturesRef.current.delete(event.pointerId);
                  activeSynthGesturesRef.current.set(event.pointerId, nextGesture);
                  syncActiveSynthGestures();
                  onSynthGestureChange?.(synthDetails);
                }}
                onPointerUp={(event) => {
                  if (resolvedKeyboardMode !== 'synth') {
                    return;
                  }

                  const gesture = activeSynthGesturesRef.current.get(event.pointerId);
                  if (gesture) {
                    endSynthGesture(gesture, event);
                  }
                }}
                style={keyStyle}
              >
                <div className='absolute inset-x-4 top-3 h-5 rounded-full bg-white/35 blur-md' />
                {resolvedKeyboardMode === 'synth' ? (
                  <div className='pointer-events-none absolute inset-y-3 right-3 flex items-center'>
                    <div
                      className={cn(
                        'relative rounded-full bg-white/30 shadow-[inset_0_1px_2px_rgba(15,23,42,0.16)]',
                        isCompactMobile ? 'h-[calc(100%-0.5rem)] w-2.5' : 'h-full w-3'
                      )}
                    >
                      {isActiveSynthKey ? (
                        <div className='absolute left-1/2 top-0 -translate-x-1/2 -translate-y-4 text-[8px] font-black uppercase tracking-[0.18em] text-slate-900/55'>
                          +{MAX_SYNTH_GLIDE_SEMITONES}
                        </div>
                      ) : null}
                      <div className='absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-slate-900/35' />
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
                          -{MAX_SYNTH_GLIDE_SEMITONES}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className='relative flex items-start justify-between gap-2'>
                  <span className={cn('font-black uppercase tracking-[0.28em] text-slate-50/85', isCompactMobile ? 'text-[10px]' : 'text-[11px]')}>
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
                  <div className={cn('font-black tracking-tight text-slate-950', isCompactMobile ? 'text-lg' : 'text-xl')}>
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
                  <div className={cn('font-medium text-slate-950/70', isCompactMobile ? 'text-[11px]' : 'text-xs')}>
                    {note.spokenLabel}
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
