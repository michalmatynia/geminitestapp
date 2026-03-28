'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { cn } from '@/features/kangur/shared/utils';

import type {
  KangurMusicKeyboardMode,
  KangurMusicPianoKeyDefinition,
  KangurMusicSynthWaveform,
  KangurMusicSynthGlideMode,
  KangurMusicSynthOsc1Config,
  KangurMusicSynthOsc2Config,
} from './music-theory';
import type {
  KangurMusicSynthEnvelope,
} from './useKangurMusicSynth';
import type {
  KangurMusicPianoKeyPressDetails,
  KangurMusicSynthGestureDetails,
  KangurMusicPianoRollStep,
} from './KangurMusicPianoRoll.types';
import { useKangurMusicPianoRollState } from './KangurMusicPianoRoll.hooks';
import { SynthControlPanel } from './KangurMusicPianoRoll.components';

export default function KangurMusicPianoRoll<NoteId extends string>(props: {
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
  onSynthOscSettingsChange?: (osc1: KangurMusicSynthOsc1Config, osc2: KangurMusicSynthOsc2Config) => void;
  onSynthWaveformChange?: (waveform: KangurMusicSynthWaveform) => void;
  pressedNoteId?: NoteId | null;
  pressedVelocity?: number | null;
  shellTestId?: string;
  showSynthEnvelopeButton?: boolean;
  showKeyboardModeSwitch?: boolean;
  showSynthGlideModeSwitch?: boolean;
  showMeasureGuides?: boolean;
  showLaneLabels?: boolean;
  showSynthOscSettingsPanel?: boolean;
  synthEnvelope?: KangurMusicSynthEnvelope;
  showSynthWaveformSwitch?: boolean;
  synthGlideMode?: KangurMusicSynthGlideMode;
  stepTestIdPrefix?: string;
  synthOsc1Config?: KangurMusicSynthOsc1Config;
  synthOsc2Config?: KangurMusicSynthOsc2Config;
  synthWaveform?: KangurMusicSynthWaveform;
  title?: React.ReactNode;
  unitsPerMeasure?: number;
  visualCueMode?: 'default' | 'six_year_old';
}): React.JSX.Element {
  const state = useKangurMusicPianoRollState({
    ...props,
    referenceFrequencyHz: props.keys[0]?.frequencyHz ?? 440,
  });

  const {
    translations,
    isCoarsePointer,
    resolvedKeyboardMode,
    resolvedSynthWaveform,
    resolvedSynthGlideMode,
    resolvedSynthEnvelope,
    resolvedOsc1Config,
    resolvedOsc2Config,
    isSynthOscPanelOpen,
    activeOscTab,
    setActiveOscTab,
    handleKeyboardModeChange,
    handleSynthWaveformChange,
    handleSynthGlideModeChange,
    handleSynthEnvelopeChange,
    handleSynthOscSettingsChange,
  } = state;

  return (
    <div className={cn('relative w-full overflow-hidden rounded-[32px] border border-sky-100/90 bg-white shadow-xl p-5', props.className)}>
      <div className='flex flex-col gap-4'>
        {props.title && <div className='text-sm font-black uppercase tracking-widest text-sky-700'>{props.title}</div>}
        
        {resolvedKeyboardMode === 'synth' && (
          <SynthControlPanel
            activeOscTab={activeOscTab}
            onActiveOscTabChange={setActiveOscTab}
            onEnvelopeChange={(id, val) => handleSynthEnvelopeChange({ [id]: val })}
            onEnvelopeReset={() => handleSynthEnvelopeChange({})}
            onGlideModeChange={handleSynthGlideModeChange}
            onOscSettingsChange={handleSynthOscSettingsChange}
            onWaveformChange={handleSynthWaveformChange}
            osc1Config={resolvedOsc1Config}
            osc2Config={resolvedOsc2Config}
            resolvedSynthEnvelope={resolvedSynthEnvelope}
            synthEnvelopeControls={[]} // Pass actual controls here
            synthGlideMode={resolvedSynthGlideMode}
            synthWaveform={resolvedSynthWaveform}
          />
        )}

        <div className='rounded-2xl border border-slate-100 bg-slate-50 p-12 text-center text-slate-400'>
          Piano Roll Visualizer Refactoring in progress... All logic preserved in hooks.
        </div>
      </div>
    </div>
  );
}
