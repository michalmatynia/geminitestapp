'use client';

import React, { createContext, useContext } from 'react';
import type {
  KangurMusicKeyboardMode,
  KangurMusicSynthGlideMode,
  KangurMusicSynthWaveform,
  KangurMusicSynthOsc1Config,
  KangurMusicSynthOsc2Config,
} from './music-theory';
import type { KangurMusicSynthEnvelope } from './useKangurMusicSynth';

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
