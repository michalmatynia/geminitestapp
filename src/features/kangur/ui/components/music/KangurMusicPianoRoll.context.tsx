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
  KangurMusicPianoKeyPressDetails,
  KangurMusicPianoRollStep,
} from './KangurMusicPianoRoll.types';

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
  onSynthGestureChange?: (details: unknown) => void;
  onSynthGestureEnd?: (details: unknown) => void;
  onSynthGestureStart?: (details: unknown) => void;
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

export type KangurMusicPianoRollContextValue = {
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

export function useKangurMusicPianoRollContext(): KangurMusicPianoRollContextValue {
  const context = useContext(KangurMusicPianoRollContext);
  if (!context) {
    throw new Error('useKangurMusicPianoRollContext must be used within a KangurMusicPianoRollProvider');
  }
  return context;
}
