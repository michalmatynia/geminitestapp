'use client';

import React, { createContext, useContext } from 'react';
import type {
  KangurMusicSynthGlideMode,
  KangurMusicKeyboardMode,
  KangurMusicPianoKeyDefinition,
  KangurMusicSynthWaveform,
  KangurMusicSynthOsc1Config,
  KangurMusicSynthOsc2Config,
} from './music-theory';
import type { KangurMusicSynthEnvelope } from './useKangurMusicSynth';
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
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';

export type KangurMusicPianoRollProps<NoteId extends string> = {
  activeStepIndex?: number | null;
  className?: string;
  completedStepCount?: number;
  description?: React.ReactNode;
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
  onSynthOscSettingsReset?: () => void;
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
  title?: React.ReactNode;
  unitsPerMeasure?: number;
  visualCueMode?: 'default' | 'six_year_old';
};

export type KangurMusicPianoRollContextValue<NoteId extends string = string> = {
  state: {
    activeOscTab: 'osc1' | 'osc2';
    isCompactMobile: boolean;
    isSixYearOldVisualMode: boolean;
    isSynthEnvelopeDialogOpen: boolean;
    isSynthOscPanelOpen: boolean;
    resolvedKeyboardMode: KangurMusicKeyboardMode;
    resolvedOsc1Config: KangurMusicSynthOsc1Config;
    resolvedOsc2Config: KangurMusicSynthOsc2Config;
    resolvedSynthEnvelope: KangurMusicSynthEnvelope;
    resolvedSynthGlideMode: KangurMusicSynthGlideMode;
    resolvedSynthWaveform: KangurMusicSynthWaveform;
    showKeyboardModeSwitch: boolean;
    showSynthEnvelopeButton: boolean;
    showSynthGlideModeSwitch: boolean;
    showSynthOscSettingsPanel: boolean;
    showSynthWaveformSwitch: boolean;
    stepTestIdPrefix: string;
    activeStepIndex: number | null;
    completedStepCount: number;
    expectedStepIndex: number | null;
    keys: readonly KangurMusicPianoKeyDefinition<NoteId>[];
    melody: readonly (NoteId | KangurMusicPianoRollStep<NoteId>)[];
    activeSynthGesture: ActiveSynthGestureState<NoteId> | null;
    activeSynthGestureCount: number;
    activeSynthPanLabel: string | null;
    activeSynthPitchDetuneLabel: string;
    activeSynthPitchKey: KangurMusicPianoKeyDefinition<NoteId> | null;
    activeSynthPitchPercent: number | null;
    activeTransportStep: ResolvedPianoRollStep<NoteId> | null;
    currentCursorStep: ResolvedPianoRollStep<NoteId> | null;
    expectedTransportStep: ResolvedPianoRollStep<NoteId> | null;
    isFreePlayMode: boolean;
    laneKeys: KangurMusicPianoKeyDefinition<NoteId>[];
    measureCount: number;
    resolvedCompletedCount: number;
    resolvedLaneHeightPx: number;
    resolvedMelody: ResolvedPianoRollStep<NoteId>[];
    resolvedMinStepWidthPx: number;
    resolvedShowLaneLabels: boolean;
    resolvedShowMeasureGuides: boolean;
    resolvedStepCount: number;
    resolvedUnitsPerMeasure: number;
    shouldShowTransportRail: boolean;
    activeSynthGestures: ActiveSynthGestureState<NoteId>[];
    recentKeyPulses: Map<NoteId, KeyPulseState>;
    isInteractive: boolean;
    keyTestIdPrefix: string;
    pressedNoteId: NoteId | null;
    pressedVelocity: number | null;
    synthAxisAnchors: { key: KangurMusicPianoKeyDefinition<NoteId>; normalizedPosition: number }[];
    translations: KangurIntlTranslate;
  };
  refs: {
    activePressesRef: React.MutableRefObject<Map<NoteId, ActiveKeyPressState>>;
    keyButtonRefs: React.MutableRefObject<Map<NoteId, HTMLButtonElement>>;
    keyPulseTimeoutIdsRef: React.MutableRefObject<Map<NoteId, ReturnType<typeof setTimeout>>>;
    stepElementRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
    activeSynthGesturesRef: React.MutableRefObject<Map<number, ActiveSynthGestureState<NoteId>>>;
  };
  actions: {
    onActiveOscTabChange: (tab: 'osc1' | 'osc2') => void;
    onKeyboardModeChange: (mode: KangurMusicKeyboardMode) => void;
    onOpenSynthEnvelopeDialog: () => void;
    onCloseSynthEnvelopeDialog: () => void;
    onSynthEnvelopeReset: () => void;
    onSynthEnvelopeSliderChange: (controlId: string, nextValue: number) => void;
    onSynthGlideModeChange: (glideMode: KangurMusicSynthGlideMode) => void;
    onSynthOscPanelToggle: () => void;
    onSynthOscSettingsChange: (
      nextOsc1: KangurMusicSynthOsc1Config,
      nextOsc2: KangurMusicSynthOsc2Config
    ) => void;
    onSynthWaveformChange: (waveform: KangurMusicSynthWaveform) => void;
    onClearPress: (noteId: NoteId) => void;
    onEndSynthGesture: (gesture: ActiveSynthGestureState<NoteId>, event: React.PointerEvent<HTMLButtonElement>) => void;
    onResolveGestureDynamics: (activePress: ActiveKeyPressState) => KangurMusicPressDynamics;
    onResolveSynthGestureDetails: (input: {
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
    }) => KangurMusicSynthGestureDetails<NoteId>;
    onResolveSynthPitchAtPoint: (input: {
      clientX: number;
      fallbackKey: KangurMusicPianoKeyDefinition<NoteId>;
      fallbackRect: DOMRect;
      pointerType?: KangurMusicPointerType;
      preferredNoteId?: NoteId;
    }) => SynthPitchResolution<NoteId>;
    onResolveVerticalPosition: (clientY: number, rect: DOMRect) => number;
    onStartPress: (noteId: NoteId, pointerType: KangurMusicPointerType, event?: React.PointerEvent<HTMLButtonElement>) => void;
    onSynthGestureChange: (details: KangurMusicSynthGestureDetails<NoteId>) => void;
    onSynthGestureStart: (details: KangurMusicSynthGestureDetails<NoteId>) => void;
    onTriggerKeyPulse: (noteId: NoteId, energy: number, phase: KeyPulsePhase) => void;
    onTriggerPress: (noteId: NoteId, options?: {
      interactionId?: string | null;
      keepPressActive?: boolean;
      pointerType?: KangurMusicPointerType;
    }) => KangurMusicPianoKeyPressDetails | null;
    onUpdatePressFromPointerEvent: (noteId: NoteId, event: React.PointerEvent<HTMLButtonElement>) => ActiveKeyPressState | null;
    syncActiveSynthGestures: () => void;
  };
  props: KangurMusicPianoRollProps<NoteId>;
};

const KangurMusicPianoRollContext = createContext<KangurMusicPianoRollContextValue<any> | null>(null);

export function KangurMusicPianoRollProvider<NoteId extends string>({
  children,
  value,
}: {
  children: React.ReactNode;
  value: KangurMusicPianoRollContextValue<NoteId>;
}) {
  return (
    <KangurMusicPianoRollContext.Provider value={value}>
      {children}
    </KangurMusicPianoRollContext.Provider>
  );
}

export function useKangurMusicPianoRollContext<NoteId extends string = string>(): KangurMusicPianoRollContextValue<NoteId> {
  const context = useContext(KangurMusicPianoRollContext);
  if (!context) {
    throw new Error('useKangurMusicPianoRollContext must be used within a KangurMusicPianoRollProvider');
  }
  return context as KangurMusicPianoRollContextValue<NoteId>;
}
