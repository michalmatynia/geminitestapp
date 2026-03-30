'use client';

import { useTranslations } from 'next-intl';
import { RotateCcwIcon } from 'lucide-react';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurMusicSynthWaveform,
  KangurMusicSynthGlideMode,
  KangurMusicSynthOsc1Config,
  KangurMusicSynthOsc2Config,
} from './music-theory';
import {
  KANGUR_MUSIC_SYNTH_WAVEFORMS,
  KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS,
  KANGUR_MUSIC_SYNTH_GLIDE_MODES,
  KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS,
} from './music-theory';
import { KangurMusicWaveformIcon } from './music-waveform-icons';
import type { KangurMusicSynthEnvelope } from './useKangurMusicSynth';

type SynthEnvelopeControlId = 'attackMs' | 'decayMs' | 'sustainLevel' | 'releaseMs';

type SynthEnvelopeControl = {
  id: SynthEnvelopeControlId;
  label: string;
  max: number;
  min: number;
  step: number;
  testIdSuffix: 'attack' | 'decay' | 'sustain' | 'release';
  value: number;
  valueLabel: string;
};

type SynthControlPanelProps = {
  activeOscTab: 'osc1' | 'osc2';
  onActiveOscTabChange: (tab: 'osc1' | 'osc2') => void;
  onEnvelopeChange: (id: SynthEnvelopeControlId, val: number) => void;
  onEnvelopeReset: () => void;
  onGlideModeChange: (mode: KangurMusicSynthGlideMode) => void;
  onOscSettingsChange: (osc1: KangurMusicSynthOsc1Config, osc2: KangurMusicSynthOsc2Config) => void;
  onWaveformChange: (waveform: KangurMusicSynthWaveform) => void;
  osc1Config: KangurMusicSynthOsc1Config;
  osc2Config: KangurMusicSynthOsc2Config;
  resolvedSynthEnvelope: KangurMusicSynthEnvelope;
  synthEnvelopeControls: SynthEnvelopeControl[];
  synthGlideMode: KangurMusicSynthGlideMode;
  synthWaveform: KangurMusicSynthWaveform;
};

export function SynthControlPanel(props: SynthControlPanelProps) {
  const {
    onEnvelopeChange,
    onEnvelopeReset,
    onGlideModeChange,
    onWaveformChange,
    synthEnvelopeControls,
    synthGlideMode,
    synthWaveform,
  } = props;
  const translations = useTranslations('KangurMusicPianoRoll');
  
  return (
    <div className='flex flex-col gap-6'>
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-black uppercase tracking-[0.18em] text-slate-500'>
            {translations('synth.waveformsLabel')}
          </p>
        </div>
        <div className={KANGUR_SEGMENTED_CONTROL_CLASSNAME}>
          {KANGUR_MUSIC_SYNTH_WAVEFORMS.map((waveform) => (
            <KangurButton
              key={waveform}
              onClick={() => onWaveformChange(waveform)}
              size='sm'
              variant={synthWaveform === waveform ? 'segmentActive' : 'segment'}
              className='flex-1'
            >
              <div className='flex items-center gap-2'>
                <KangurMusicWaveformIcon className='h-3 w-5' waveform={waveform} />
                <span className='hidden sm:inline'>{KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[waveform]}</span>
              </div>
            </KangurButton>
          ))}
        </div>
      </div>

      <div className='space-y-4'>
        <p className='text-xs font-black uppercase tracking-[0.18em] text-slate-500'>
          {translations('synth.glideLabel')}
        </p>
        <div className={KANGUR_SEGMENTED_CONTROL_CLASSNAME}>
          {KANGUR_MUSIC_SYNTH_GLIDE_MODES.map((mode) => (
            <KangurButton
              key={mode}
              onClick={() => onGlideModeChange(mode)}
              size='sm'
              variant={synthGlideMode === mode ? 'segmentActive' : 'segment'}
              className='flex-1'
            >
              {KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[mode]}
            </KangurButton>
          ))}
        </div>
      </div>

      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <p className='text-xs font-black uppercase tracking-[0.18em] text-slate-500'>
            {translations('synth.envelopeLabel')}
          </p>
          <KangurButton onClick={onEnvelopeReset} size='sm' variant='ghost'>
            <RotateCcwIcon className='mr-1.5 h-3 w-3' />
            {translations('synth.resetButton')}
          </KangurButton>
        </div>
        <div className='grid gap-4 sm:grid-cols-2'>
          {synthEnvelopeControls.map((control) => (
            <div key={control.id} className='space-y-2'>
              <div className='flex justify-between text-[11px] font-bold text-slate-600'>
                <span>{control.label}</span>
                <span>{control.valueLabel}</span>
              </div>
              <input
                aria-label={control.label}
                className='h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500'
                max={control.max}
                min={control.min}
                onChange={(e) => onEnvelopeChange(control.id, Number(e.target.value))}
                step={control.step}
                type='range'
                value={control.value}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
