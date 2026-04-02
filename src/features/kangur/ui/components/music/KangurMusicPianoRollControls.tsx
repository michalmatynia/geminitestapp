'use client';

import { useTranslations } from 'next-intl';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogCloseButton } from '@/features/kangur/ui/components/KangurDialogCloseButton';
import { KangurDialogMeta } from '@/features/kangur/ui/components/KangurDialogMeta';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';

import type {
  KangurMusicSynthGlideMode,
  KangurMusicSynthWaveform,
} from './music-theory';
import {
  KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS,
  KANGUR_MUSIC_SYNTH_GLIDE_MODES,
  KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS,
  KANGUR_MUSIC_SYNTH_WAVEFORMS,
} from './music-theory';
import { KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME } from './KangurMusicPianoRoll.utils';
import { KangurMusicWaveformIcon } from './music-waveform-icons';
import { useKangurMusicPianoRollContext } from './KangurMusicPianoRoll.context';

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

const renderMusicKeyboardModeCue = ({
  icon,
  iconTestId,
  label,
}: {
  icon: string;
  iconTestId: string;
  label: string;
}): React.JSX.Element => (
  <KangurVisualCueContent icon={icon} iconTestId={iconTestId} label={label} />
);

const renderMusicWaveformSwitchIcon = ({
  testId,
  waveform,
}: {
  testId: string;
  waveform: KangurMusicSynthWaveform;
}): React.JSX.Element => (
  <KangurMusicWaveformIcon className='h-4 w-7' data-testid={testId} waveform={waveform} />
);

const renderMusicGlideModeCue = ({
  detailTestId,
  glideMode,
  iconTestId,
  label,
}: {
  detailTestId: string;
  glideMode: KangurMusicSynthGlideMode;
  iconTestId: string;
  label: string;
}): React.JSX.Element => (
  <KangurVisualCueContent
    detail={glideMode === 'continuous' ? '∿' : '#'}
    detailTestId={detailTestId}
    icon='↕'
    iconTestId={iconTestId}
    label={label}
  />
);

export function KangurMusicPianoRollControls(): React.JSX.Element {
  const {
    activeOscTab,
    isCompactMobile,
    isSixYearOldVisualMode,
    isSynthEnvelopeDialogOpen,
    isSynthOscPanelOpen,
    resolvedKeyboardMode,
    resolvedOsc1Config,
    resolvedOsc2Config,
    resolvedSynthEnvelope,
    resolvedSynthGlideMode,
    resolvedSynthWaveform,
    showKeyboardModeSwitch,
    showSynthEnvelopeButton,
    showSynthGlideModeSwitch,
    showSynthOscSettingsPanel,
    showSynthWaveformSwitch,
    stepTestIdPrefix,
    onActiveOscTabChange,
    onKeyboardModeChange,
    onOpenSynthEnvelopeDialog,
    onCloseSynthEnvelopeDialog,
    onSynthEnvelopeReset,
    onSynthEnvelopeSliderChange,
    onSynthGlideModeChange,
    onSynthOscPanelToggle,
    onSynthOscSettingsChange,
    onSynthWaveformChange,
  } = useKangurMusicPianoRollContext();

  const adsrTranslations = useTranslations('KangurMiniGames.musicPianoRoll.adsr');
  const keyboardModePianoTestId = `${stepTestIdPrefix}-keyboard-mode-piano`;
  const synthEnvelopeDialogContentProps = {
    'data-testid': `${stepTestIdPrefix}-synth-envelope-modal`,
  } as const;
  const resolvedSustainPercent = Math.round(resolvedSynthEnvelope.sustainLevel * 100);
  const synthEnvelopeSummary = adsrTranslations('summary', {
    attackMs: resolvedSynthEnvelope.attackMs,
    decayMs: resolvedSynthEnvelope.decayMs,
    releaseMs: resolvedSynthEnvelope.releaseMs,
    sustainPercent: resolvedSustainPercent,
  });
  const synthEnvelopeControls: SynthEnvelopeControl[] = [
    {
      id: 'attackMs',
      label: adsrTranslations('attack'),
      max: 1800,
      min: 0,
      step: 5,
      testIdSuffix: 'attack',
      value: resolvedSynthEnvelope.attackMs,
      valueLabel: `${resolvedSynthEnvelope.attackMs} ms`,
    },
    {
      id: 'decayMs',
      label: adsrTranslations('decay'),
      max: 2400,
      min: 0,
      step: 5,
      testIdSuffix: 'decay',
      value: resolvedSynthEnvelope.decayMs,
      valueLabel: `${resolvedSynthEnvelope.decayMs} ms`,
    },
    {
      id: 'sustainLevel',
      label: adsrTranslations('sustain'),
      max: 100,
      min: 0,
      step: 1,
      testIdSuffix: 'sustain',
      value: resolvedSustainPercent,
      valueLabel: `${resolvedSustainPercent}%`,
    },
    {
      id: 'releaseMs',
      label: adsrTranslations('release'),
      max: 3200,
      min: 20,
      step: 5,
      testIdSuffix: 'release',
      value: resolvedSynthEnvelope.releaseMs,
      valueLabel: `${resolvedSynthEnvelope.releaseMs} ms`,
    },
  ];

  return (
    <>
      {showKeyboardModeSwitch ||
      (resolvedKeyboardMode === 'synth' &&
        (showSynthWaveformSwitch ||
          showSynthGlideModeSwitch ||
          showSynthEnvelopeButton ||
          showSynthOscSettingsPanel)) ? (
        <div
          className={[
            'flex gap-2 px-1',
            isCompactMobile
              ? 'gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden'
              : 'flex-wrap',
          ].join(' ')}
          data-testid={`${stepTestIdPrefix}-controls-rail`}
        >
          {showKeyboardModeSwitch ? (
            <div
              className={[
                KANGUR_SEGMENTED_CONTROL_CLASSNAME,
                'bg-white/55 shadow-[0_16px_40px_-32px_rgba(14,116,144,0.34)]',
                isCompactMobile ? 'w-max shrink-0 snap-start' : 'w-full sm:w-auto',
              ].join(' ')}
              data-testid={`${stepTestIdPrefix}-keyboard-mode-switch`}
            >
              <KangurButton
                aria-pressed={resolvedKeyboardMode === 'piano'}
                className={KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME}
                data-testid={keyboardModePianoTestId}
                onClick={() => onKeyboardModeChange('piano')}
                size='sm'
                type='button'
                variant={resolvedKeyboardMode === 'piano' ? 'segmentActive' : 'segment'}
              >
                {isSixYearOldVisualMode
                  ? renderMusicKeyboardModeCue({
                      icon: '🎹',
                      iconTestId: `${stepTestIdPrefix}-keyboard-mode-icon-piano`,
                      label: 'Piano',
                    })
                  : 'Piano'}
              </KangurButton>
              <KangurButton
                aria-pressed={resolvedKeyboardMode === 'synth'}
                className={KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME}
                data-testid={`${stepTestIdPrefix}-keyboard-mode-synth`}
                onClick={() => onKeyboardModeChange('synth')}
                size='sm'
                type='button'
                variant={resolvedKeyboardMode === 'synth' ? 'segmentActive' : 'segment'}
              >
                {isSixYearOldVisualMode
                  ? renderMusicKeyboardModeCue({
                      icon: '✨',
                      iconTestId: `${stepTestIdPrefix}-keyboard-mode-icon-synth`,
                      label: 'Synth',
                    })
                  : 'Synth'}
              </KangurButton>
            </div>
          ) : null}

          {resolvedKeyboardMode === 'synth' && showSynthWaveformSwitch ? (
            <div
              className={[
                KANGUR_SEGMENTED_CONTROL_CLASSNAME,
                'bg-white/55 shadow-[0_16px_40px_-32px_rgba(14,116,144,0.34)]',
                isCompactMobile ? 'w-max shrink-0 snap-start' : 'w-full',
              ].join(' ')}
              data-testid={`${stepTestIdPrefix}-synth-waveform-switch`}
            >
              {KANGUR_MUSIC_SYNTH_WAVEFORMS.map((waveform) => (
                <KangurButton
                  key={waveform}
                  aria-label={`Brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[waveform]}`}
                  aria-pressed={resolvedSynthWaveform === waveform}
                  className={`${KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME} min-w-[3rem] px-3`}
                  data-testid={`${stepTestIdPrefix}-synth-waveform-${waveform}`}
                  onClick={() => onSynthWaveformChange(waveform)}
                  size='sm'
                  type='button'
                  variant={resolvedSynthWaveform === waveform ? 'segmentActive' : 'segment'}
                >
                  {renderMusicWaveformSwitchIcon({
                    testId: `${stepTestIdPrefix}-synth-waveform-icon-${waveform}`,
                    waveform,
                  })}
                </KangurButton>
              ))}
            </div>
          ) : null}

          {resolvedKeyboardMode === 'synth' && showSynthGlideModeSwitch ? (
            <div
              className={[
                KANGUR_SEGMENTED_CONTROL_CLASSNAME,
                'bg-white/55 shadow-[0_16px_40px_-32px_rgba(14,116,144,0.34)]',
                isCompactMobile ? 'w-max shrink-0 snap-start' : 'w-full',
              ].join(' ')}
              data-testid={`${stepTestIdPrefix}-synth-glide-mode-switch`}
            >
              {KANGUR_MUSIC_SYNTH_GLIDE_MODES.map((glideMode) => (
                <KangurButton
                  key={glideMode}
                  aria-label={`Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[glideMode]}`}
                  aria-pressed={resolvedSynthGlideMode === glideMode}
                  className={KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME}
                  data-testid={`${stepTestIdPrefix}-synth-glide-mode-${glideMode}`}
                  onClick={() => onSynthGlideModeChange(glideMode)}
                  size='sm'
                  type='button'
                  variant={resolvedSynthGlideMode === glideMode ? 'segmentActive' : 'segment'}
                >
                  {isSixYearOldVisualMode
                    ? renderMusicGlideModeCue({
                        detailTestId: `${stepTestIdPrefix}-synth-glide-mode-detail-${glideMode}`,
                        glideMode,
                        iconTestId: `${stepTestIdPrefix}-synth-glide-mode-icon-${glideMode}`,
                        label: `Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[glideMode]}`,
                      })
                    : KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[glideMode]}
                </KangurButton>
              ))}
            </div>
          ) : null}

          {resolvedKeyboardMode === 'synth' && showSynthEnvelopeButton ? (
            <div
              className={[
                'rounded-full border border-white/70 bg-white/55 shadow-[0_16px_40px_-32px_rgba(14,116,144,0.34)]',
                isCompactMobile ? 'w-max shrink-0 snap-start' : 'w-full sm:w-auto',
              ].join(' ')}
            >
              <KangurButton
                aria-expanded={isSynthEnvelopeDialogOpen}
                aria-label={adsrTranslations('buttonAriaLabel', {
                  summary: synthEnvelopeSummary,
                })}
                className={`${KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME} px-4`}
                data-testid={`${stepTestIdPrefix}-synth-envelope-button`}
                onClick={onOpenSynthEnvelopeDialog}
                size='sm'
                type='button'
                variant='surface'
              >
                {adsrTranslations('button')}
              </KangurButton>
            </div>
          ) : null}

          {resolvedKeyboardMode === 'synth' && showSynthOscSettingsPanel ? (
            <div
              className={[
                'rounded-full border border-white/70 bg-white/55 shadow-[0_16px_40px_-32px_rgba(14,116,144,0.34)]',
                isCompactMobile ? 'w-max shrink-0 snap-start' : 'w-full sm:w-auto',
              ].join(' ')}
            >
              <KangurButton
                aria-expanded={isSynthOscPanelOpen}
                aria-label='Ustawienia oscylatorow synthu'
                className={[
                  KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME,
                  'px-4',
                  isSynthOscPanelOpen ? 'ring-2 ring-sky-400' : '',
                ].join(' ')}
                data-testid={`${stepTestIdPrefix}-synth-osc-settings-button`}
                onClick={onSynthOscPanelToggle}
                size='sm'
                type='button'
                variant={isSynthOscPanelOpen ? 'segmentActive' : 'surface'}
              >
                Synth ⚙
              </KangurButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {resolvedKeyboardMode === 'synth' && showSynthOscSettingsPanel && isSynthOscPanelOpen ? (
        <div
          className='rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.2)]'
          data-testid={`${stepTestIdPrefix}-synth-osc-panel`}
        >
          <div
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} mb-4 border-sky-100 bg-sky-50/80`}
            data-testid={`${stepTestIdPrefix}-synth-osc-tabs`}
          >
            <KangurButton
              aria-pressed={activeOscTab === 'osc1'}
              className={KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME}
              data-testid={`${stepTestIdPrefix}-synth-osc-tab-osc1`}
              onClick={() => onActiveOscTabChange('osc1')}
              size='sm'
              type='button'
              variant={activeOscTab === 'osc1' ? 'segmentActive' : 'segment'}
            >
              OSC 1
            </KangurButton>
            <KangurButton
              aria-pressed={activeOscTab === 'osc2'}
              className={KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME}
              data-testid={`${stepTestIdPrefix}-synth-osc-tab-osc2`}
              onClick={() => onActiveOscTabChange('osc2')}
              size='sm'
              type='button'
              variant={activeOscTab === 'osc2' ? 'segmentActive' : 'segment'}
            >
              OSC 2
            </KangurButton>
          </div>

          {activeOscTab === 'osc1' ? (
            <div className='grid gap-3' data-testid={`${stepTestIdPrefix}-synth-osc1-panel`}>
              <div
                className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} border-slate-200/80 bg-white/60`}
              >
                {KANGUR_MUSIC_SYNTH_WAVEFORMS.map((waveform) => (
                  <KangurButton
                    key={waveform}
                    aria-label={`OSC 1 brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[waveform]}`}
                    aria-pressed={resolvedOsc1Config.waveform === waveform}
                    className={`${KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME} min-w-[3rem] px-3`}
                    data-testid={`${stepTestIdPrefix}-synth-osc1-waveform-${waveform}`}
                    onClick={() =>
                      onSynthOscSettingsChange(
                        { ...resolvedOsc1Config, waveform },
                        resolvedOsc2Config,
                      )
                    }
                    size='sm'
                    type='button'
                    variant={resolvedOsc1Config.waveform === waveform ? 'segmentActive' : 'segment'}
                  >
                    <KangurMusicWaveformIcon className='h-4 w-7' waveform={waveform} />
                  </KangurButton>
                ))}
              </div>

              <label className='rounded-[22px] border border-slate-200/80 bg-slate-50/85 px-4 py-3'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-sm font-bold text-slate-900'>Glososc</span>
                  <span
                    className='rounded-full bg-white px-2.5 py-1 text-xs font-black text-sky-700 shadow-[0_12px_30px_-24px_rgba(14,116,144,0.45)]'
                    data-testid={`${stepTestIdPrefix}-synth-osc1-volume-value`}
                  >
                    {Math.round(resolvedOsc1Config.volume * 100)}%
                  </span>
                </div>
                <input
                  aria-label='Glososc OSC 1'
                  className='mt-3 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500'
                  data-testid={`${stepTestIdPrefix}-synth-osc1-volume`}
                  max={100}
                  min={0}
                  onChange={(event) =>
                    onSynthOscSettingsChange(
                      { ...resolvedOsc1Config, volume: Number(event.target.value) / 100 },
                      resolvedOsc2Config,
                    )
                  }
                  step={1}
                  type='range'
                  value={Math.round(resolvedOsc1Config.volume * 100)}
                />
              </label>
            </div>
          ) : (
            <div className='grid gap-3' data-testid={`${stepTestIdPrefix}-synth-osc2-panel`}>
              <label className='flex items-center justify-between rounded-[22px] border border-slate-200/80 bg-slate-50/85 px-4 py-3'>
                <span className='text-sm font-bold text-slate-900'>Aktywny</span>
                <input
                  aria-label='Aktywny OSC 2'
                  checked={resolvedOsc2Config.enabled}
                  className='h-4 w-4 accent-sky-500'
                  data-testid={`${stepTestIdPrefix}-synth-osc2-enabled`}
                  onChange={(event) =>
                    onSynthOscSettingsChange(resolvedOsc1Config, {
                      ...resolvedOsc2Config,
                      enabled: event.target.checked,
                    })
                  }
                  type='checkbox'
                />
              </label>

              {resolvedOsc2Config.enabled ? (
                <>
                  <div
                    className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} border-slate-200/80 bg-white/60`}
                  >
                    {KANGUR_MUSIC_SYNTH_WAVEFORMS.map((waveform) => (
                      <KangurButton
                        key={waveform}
                        aria-label={`OSC 2 brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[waveform]}`}
                        aria-pressed={resolvedOsc2Config.waveform === waveform}
                        className={`${KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME} min-w-[3rem] px-3`}
                        data-testid={`${stepTestIdPrefix}-synth-osc2-waveform-${waveform}`}
                        onClick={() =>
                          onSynthOscSettingsChange(resolvedOsc1Config, {
                            ...resolvedOsc2Config,
                            waveform,
                          })
                        }
                        size='sm'
                        type='button'
                        variant={resolvedOsc2Config.waveform === waveform ? 'segmentActive' : 'segment'}
                      >
                        <KangurMusicWaveformIcon className='h-4 w-7' waveform={waveform} />
                      </KangurButton>
                    ))}
                  </div>

                  <label className='rounded-[22px] border border-slate-200/80 bg-slate-50/85 px-4 py-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-sm font-bold text-slate-900'>Detune</span>
                      <span
                        className='rounded-full bg-white px-2.5 py-1 text-xs font-black text-sky-700 shadow-[0_12px_30px_-24px_rgba(14,116,144,0.45)]'
                        data-testid={`${stepTestIdPrefix}-synth-osc2-detune-value`}
                      >
                        {resolvedOsc2Config.detuneCents === 0
                          ? 'Auto'
                          : `${resolvedOsc2Config.detuneCents > 0 ? '+' : ''}${resolvedOsc2Config.detuneCents}c`}
                      </span>
                    </div>
                    <input
                      aria-label='Detune OSC 2'
                      className='mt-3 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500'
                      data-testid={`${stepTestIdPrefix}-synth-osc2-detune`}
                      max={50}
                      min={-50}
                      onChange={(event) =>
                        onSynthOscSettingsChange(resolvedOsc1Config, {
                          ...resolvedOsc2Config,
                          detuneCents: Number(event.target.value),
                        })
                      }
                      step={1}
                      type='range'
                      value={resolvedOsc2Config.detuneCents}
                    />
                  </label>

                  <label className='rounded-[22px] border border-slate-200/80 bg-slate-50/85 px-4 py-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-sm font-bold text-slate-900'>Mieszanie</span>
                      <span
                        className='rounded-full bg-white px-2.5 py-1 text-xs font-black text-sky-700 shadow-[0_12px_30px_-24px_rgba(14,116,144,0.45)]'
                        data-testid={`${stepTestIdPrefix}-synth-osc2-blend-value`}
                      >
                        {Math.round(resolvedOsc2Config.blend * 100)}%
                      </span>
                    </div>
                    <input
                      aria-label='Mieszanie OSC 2'
                      className='mt-3 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500'
                      data-testid={`${stepTestIdPrefix}-synth-osc2-blend`}
                      max={100}
                      min={0}
                      onChange={(event) =>
                        onSynthOscSettingsChange(resolvedOsc1Config, {
                          ...resolvedOsc2Config,
                          blend: Number(event.target.value) / 100,
                        })
                      }
                      step={1}
                      type='range'
                      value={Math.round(resolvedOsc2Config.blend * 100)}
                    />
                  </label>
                </>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      <KangurDialog
        contentSize='sm'
        contentProps={synthEnvelopeDialogContentProps}
        onOpenChange={(open) => {
          if (open) {
            onOpenSynthEnvelopeDialog();
            return;
          }
          onCloseSynthEnvelopeDialog();
        }}
        open={isSynthEnvelopeDialogOpen}
        overlayVariant='standard'
      >
        <>
          <KangurDialogMeta
            title={adsrTranslations('title')}
            description={adsrTranslations('description')}
          />
          <KangurDialogCloseButton
            aria-label={adsrTranslations('closeAriaLabel')}
            label={adsrTranslations('close')}
          />
        </>

        <div className='rounded-[30px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.28)] sm:p-5'>
          <div className='rounded-[20px] border border-sky-100 bg-sky-50/80 px-4 py-3 text-xs font-semibold text-sky-900'>
            {synthEnvelopeSummary}
          </div>

          <div className='mt-4 grid gap-3'>
            {synthEnvelopeControls.map((control) => (
              <label
                key={control.id}
                className='rounded-[22px] border border-slate-200/80 bg-slate-50/85 px-4 py-3'
              >
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-sm font-bold text-slate-900'>{control.label}</span>
                  <span
                    className='rounded-full bg-white px-2.5 py-1 text-xs font-black text-sky-700 shadow-[0_12px_30px_-24px_rgba(14,116,144,0.45)]'
                    data-testid={`${stepTestIdPrefix}-synth-envelope-${control.testIdSuffix}-value`}
                  >
                    {control.valueLabel}
                  </span>
                </div>
                <input
                  aria-label={control.label}
                  className='mt-3 h-2.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500'
                  data-testid={`${stepTestIdPrefix}-synth-envelope-${control.testIdSuffix}`}
                  max={control.max}
                  min={control.min}
                  onChange={(event) =>
                    onSynthEnvelopeSliderChange(control.id, Number(event.target.value))
                  }
                  step={control.step}
                  type='range'
                  value={control.value}
                />
              </label>
            ))}
          </div>

          <div className='mt-4 flex flex-wrap justify-between gap-2'>
            <KangurButton
              className={KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME}
              data-testid={`${stepTestIdPrefix}-synth-envelope-reset`}
              onClick={onSynthEnvelopeReset}
              size='sm'
              type='button'
              variant='ghost'
            >
              {adsrTranslations('reset')}
            </KangurButton>
            <KangurButton
              className={KANGUR_PIANO_ROLL_SYNTH_CONTROL_BUTTON_CLASSNAME}
              data-testid={`${stepTestIdPrefix}-synth-envelope-close`}
              onClick={onCloseSynthEnvelopeDialog}
              size='sm'
              type='button'
              variant='surface'
            >
              {adsrTranslations('close')}
            </KangurButton>
          </div>
        </div>
      </KangurDialog>
    </>
  );
}
