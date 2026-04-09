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
  KeyPulsePhase,
  KeyPulseState,
  ResolvedPianoRollStep,
  SynthPitchResolution,
  KangurMusicPianoKeyPressDetails,
  KangurMusicPressDynamics,
  KangurMusicSynthGestureDetails,
  KangurMusicPointerType,
} from './KangurMusicPianoRoll.types';

type KangurMusicTriggerPressOptions = {
  interactionId?: string | null;
  keepPressActive?: boolean;
  pointerType?: KangurMusicPointerType;
};

type KangurMusicSynthGestureInput<NoteId extends string> = {
  anchorSemitonePosition: number;
  brightness: number;
  frequencyHz: number;
  interactionId: string;
  nearestSemitonePosition: number;
  normalizedHorizontalPosition: number;
  normalizedVerticalPosition: number;
  noteId: NoteId;
  pitchSemitonePosition: number;
  previousVibratoDepth?: number;
  pointerType: KangurMusicPointerType;
  velocity: number;
};

type KangurMusicSynthPitchAtPointInput<NoteId extends string> = {
  clientX: number;
  fallbackKey: KangurMusicPianoKeyDefinition<NoteId>;
  fallbackRect: DOMRect;
  pointerType?: KangurMusicPointerType;
  preferredNoteId?: NoteId;
};

export type KangurMusicPianoRollContextValue<NoteId extends string = string> = {
  activePressesRef: React.MutableRefObject<Map<NoteId, ActiveKeyPressState>>;
  activeOscTab: 'osc1' | 'osc2';
  activeStepIndex: number | null;
  activeSynthGesture: ActiveSynthGestureState<NoteId> | null;
  activeSynthGestureCount: number;
  activeSynthGestures: ActiveSynthGestureState<NoteId>[];
  activeSynthGesturesRef: React.MutableRefObject<Map<number, ActiveSynthGestureState<NoteId>>>;
  activeTransportStep: ResolvedPianoRollStep<NoteId> | null;
  currentCursorStep: ResolvedPianoRollStep<NoteId> | null;
  expectedStepIndex: number | null;
  expectedTransportStep: ResolvedPianoRollStep<NoteId> | null;
  isCompactMobile: boolean;
  isCoarsePointer: boolean;
  isFreePlayMode: boolean;
  isInteractive: boolean;
  isSixYearOldVisualMode: boolean;
  isSynthEnvelopeDialogOpen: boolean;
  isSynthOscPanelOpen: boolean;
  keyButtonRefs: React.MutableRefObject<Map<NoteId, HTMLButtonElement>>;
  keyDefinitionById: Map<NoteId, KangurMusicPianoKeyDefinition<NoteId>>;
  keys: readonly KangurMusicPianoKeyDefinition<NoteId>[];
  keyTestIdPrefix: string;
  laneKeys: readonly KangurMusicPianoKeyDefinition<NoteId>[];
  measureCount: number;
  pressedNoteId: NoteId | null;
  pressedVelocity: number | null;
  recentKeyPulses: Map<NoteId, KeyPulseState>;
  resolvedCompletedCount: number;
  resolvedKeyboardMode: KangurMusicKeyboardMode;
  resolvedLaneHeightPx: number;
  resolvedMelody: ResolvedPianoRollStep<NoteId>[];
  resolvedMinStepWidthPx: number;
  resolvedOsc1Config: KangurMusicSynthOsc1Config;
  resolvedOsc2Config: KangurMusicSynthOsc2Config;
  resolvedShowLaneLabels: boolean;
  resolvedShowMeasureGuides: boolean;
  resolvedStepCount: number;
  resolvedSynthEnvelope: KangurMusicSynthEnvelope;
  resolvedSynthGlideMode: KangurMusicSynthGlideMode;
  resolvedSynthWaveform: KangurMusicSynthWaveform;
  resolvedUnitsPerMeasure: number;
  shouldShowTransportRail: boolean;
  showKeyboardModeSwitch: boolean;
  showSynthEnvelopeButton: boolean;
  showSynthGlideModeSwitch: boolean;
  showSynthOscSettingsPanel: boolean;
  showSynthWaveformSwitch: boolean;
  stepElementRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;
  stepTestIdPrefix: string;
  synthAxisAnchors: { key: KangurMusicPianoKeyDefinition<NoteId>; normalizedPosition: number }[];
  onActiveOscTabChange: (tab: 'osc1' | 'osc2') => void;
  onClearPress: (noteId: NoteId) => void;
  onEndSynthGesture: (
    gesture: ActiveSynthGestureState<NoteId>,
    event: React.PointerEvent<HTMLButtonElement>
  ) => void;
  onKeyboardModeChange: (mode: KangurMusicKeyboardMode) => void;
  onOpenSynthEnvelopeDialog: () => void;
  onCloseSynthEnvelopeDialog: () => void;
  onResolveGestureDynamics: (activePress: ActiveKeyPressState) => KangurMusicPressDynamics;
  onResolveSynthGestureDetails: (
    input: KangurMusicSynthGestureInput<NoteId>
  ) => KangurMusicSynthGestureDetails<NoteId>;
  onResolveSynthPitchAtPoint: (
    input: KangurMusicSynthPitchAtPointInput<NoteId>
  ) => SynthPitchResolution<NoteId>;
  onResolveVerticalPosition: (clientY: number, rect: DOMRect) => number;
  onStartPress: (
    noteId: NoteId,
    pointerType: KangurMusicPointerType,
    event?: React.PointerEvent<HTMLButtonElement>
  ) => void;
  onSynthEnvelopeReset: () => void;
  onSynthEnvelopeSliderChange: (controlId: string, nextValue: number) => void;
  onSynthGestureChange?: (details: KangurMusicSynthGestureDetails<NoteId>) => void;
  onSynthGestureStart?: (details: KangurMusicSynthGestureDetails<NoteId>) => void;
  onSynthGlideModeChange: (glideMode: KangurMusicSynthGlideMode) => void;
  onSynthOscPanelToggle: () => void;
  onSynthOscSettingsChange: (
    nextOsc1: KangurMusicSynthOsc1Config,
    nextOsc2: KangurMusicSynthOsc2Config
  ) => void;
  onSynthWaveformChange: (waveform: KangurMusicSynthWaveform) => void;
  onTriggerKeyPulse: (noteId: NoteId, energy: number, phase: KeyPulsePhase) => void;
  onTriggerPress: (
    noteId: NoteId,
    options?: KangurMusicTriggerPressOptions
  ) => KangurMusicPianoKeyPressDetails | null;
  onUpdatePressFromPointerEvent: (
    noteId: NoteId,
    event: React.PointerEvent<HTMLButtonElement>
  ) => ActiveKeyPressState | null;
  syncActiveSynthGestures: () => void;
};

const KangurMusicPianoRollContext = createContext<KangurMusicPianoRollContextValue<string> | null>(
  null
);

export function KangurMusicPianoRollProvider<NoteId extends string>({
  children,
  value,
}: {
  children: React.ReactNode;
  value: KangurMusicPianoRollContextValue<NoteId>;
}) {
  return (
    <KangurMusicPianoRollContext.Provider
      value={value}
    >
      {children}
    </KangurMusicPianoRollContext.Provider>
  );
}

import { internalError } from '@/shared/errors/app-error';

export function useKangurMusicPianoRollContext<NoteId extends string = string>(): KangurMusicPianoRollContextValue<NoteId> {
  const context = useContext(KangurMusicPianoRollContext);
  if (!context) {
    throw internalError('useKangurMusicPianoRollContext must be used within a KangurMusicPianoRollProvider');
  }
  return context;
}
