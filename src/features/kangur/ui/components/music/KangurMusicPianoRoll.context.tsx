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
  KeyPulseState,
  ResolvedPianoRollStep,
  SynthPitchResolution,
  KangurMusicPianoKeyPressDetails,
  KangurMusicPressDynamics,
  KangurMusicSynthGestureDetails,
  KangurMusicPointerType,
} from './KangurMusicPianoRoll.types';

export type KangurMusicPianoRollContextValue = {
  activePressesRef: React.MutableRefObject<Map<string, ActiveKeyPressState>>;
  activeOscTab: 'osc1' | 'osc2';
  activeStepIndex: number | null;
  activeSynthGesture: ActiveSynthGestureState<string> | null;
  activeSynthGestureCount: number;
  activeSynthGestures: ActiveSynthGestureState<string>[];
  activeSynthGesturesRef: React.MutableRefObject<Map<number, ActiveSynthGestureState<string>>>;
  activeTransportStep: ResolvedPianoRollStep<string> | null;
  currentCursorStep: ResolvedPianoRollStep<string> | null;
  expectedStepIndex: number | null;
  expectedTransportStep: ResolvedPianoRollStep<string> | null;
  isCompactMobile: boolean;
  isCoarsePointer: boolean;
  isFreePlayMode: boolean;
  isInteractive: boolean;
  isSixYearOldVisualMode: boolean;
  isSynthEnvelopeDialogOpen: boolean;
  isSynthOscPanelOpen: boolean;
  keyButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  keyDefinitionById: Map<string, KangurMusicPianoKeyDefinition<string>>;
  keys: readonly KangurMusicPianoKeyDefinition<string>[];
  keyTestIdPrefix: string;
  laneKeys: readonly KangurMusicPianoKeyDefinition<string>[];
  measureCount: number;
  pressedNoteId: string | null;
  pressedVelocity: number | null;
  recentKeyPulses: Map<string, KeyPulseState>;
  resolvedCompletedCount: number;
  resolvedKeyboardMode: KangurMusicKeyboardMode;
  resolvedLaneHeightPx: number;
  resolvedMelody: ResolvedPianoRollStep<string>[];
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
  synthAxisAnchors: { key: KangurMusicPianoKeyDefinition<string>; normalizedPosition: number }[];
  onActiveOscTabChange: (tab: 'osc1' | 'osc2') => void;
  onClearPress: (noteId: string) => void;
  onEndSynthGesture: (gesture: ActiveSynthGestureState<string>, event: React.PointerEvent<HTMLButtonElement>) => void;
  onKeyboardModeChange: (mode: KangurMusicKeyboardMode) => void;
  onOpenSynthEnvelopeDialog: () => void;
  onCloseSynthEnvelopeDialog: () => void;
  onResolveGestureDynamics: (activePress: any) => KangurMusicPressDynamics;
  onResolveSynthGestureDetails: (input: any) => KangurMusicSynthGestureDetails<string>;
  onResolveSynthPitchAtPoint: (input: any) => SynthPitchResolution<string>;
  onResolveVerticalPosition: (clientY: number, rect: DOMRect) => number;
  onStartPress: (noteId: string, pointerType: KangurMusicPointerType, event?: React.PointerEvent<HTMLButtonElement>) => void;
  onSynthEnvelopeReset: () => void;
  onSynthEnvelopeSliderChange: (controlId: string, nextValue: number) => void;
  onSynthGestureChange: (details: KangurMusicSynthGestureDetails<string>) => void;
  onSynthGestureStart: (details: KangurMusicSynthGestureDetails<string>) => void;
  onSynthGlideModeChange: (glideMode: KangurMusicSynthGlideMode) => void;
  onSynthOscPanelToggle: () => void;
  onSynthOscSettingsChange: (
    nextOsc1: KangurMusicSynthOsc1Config,
    nextOsc2: KangurMusicSynthOsc2Config
  ) => void;
  onSynthWaveformChange: (waveform: KangurMusicSynthWaveform) => void;
  onTriggerKeyPulse: (noteId: string, energy: number, phase: any) => void;
  onTriggerPress: (noteId: string, options?: any) => KangurMusicPianoKeyPressDetails | null;
  onUpdatePressFromPointerEvent: (noteId: string, event: React.PointerEvent<HTMLButtonElement>) => any;
  syncActiveSynthGestures: () => void;
};

const KangurMusicPianoRollContext = createContext<KangurMusicPianoRollContextValue | null>(null);

export function KangurMusicPianoRollProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: KangurMusicPianoRollContextValue;
}) {
  return (
    <KangurMusicPianoRollContext.Provider value={value}>
      {children}
    </KangurMusicPianoRollContext.Provider>
  );
}

export function useKangurMusicPianoRollContext<NoteId extends string = string>(): KangurMusicPianoRollContextValue & {
  activeSynthGesture: ActiveSynthGestureState<NoteId> | null;
  activePressesRef: React.MutableRefObject<Map<NoteId, ActiveKeyPressState>>;
  activeSynthGestures: ActiveSynthGestureState<NoteId>[];
  activeTransportStep: ResolvedPianoRollStep<NoteId> | null;
  currentCursorStep: ResolvedPianoRollStep<NoteId> | null;
  expectedTransportStep: ResolvedPianoRollStep<NoteId> | null;
  isCoarsePointer: boolean;
  keyDefinitionById: Map<NoteId, KangurMusicPianoKeyDefinition<NoteId>>;
  keys: readonly KangurMusicPianoKeyDefinition<NoteId>[];
  laneKeys: readonly KangurMusicPianoKeyDefinition<NoteId>[];
  resolvedMelody: ResolvedPianoRollStep<NoteId>[];
} {
  const context = useContext(KangurMusicPianoRollContext);
  if (!context) {
    throw new Error('useKangurMusicPianoRollContext must be used within a KangurMusicPianoRollProvider');
  }
  return context as any;
}
