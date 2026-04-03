'use client';

import { cn } from '@/features/kangur/shared/utils';
import KangurVisualCueContent from '@/features/kangur/ui/components/KangurVisualCueContent';

import type {
  KangurMusicSynthGlideMode,
  KangurMusicSynthWaveform,
} from './music-theory';
import { KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS, KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS } from './music-theory';
import { KangurMusicWaveformIcon } from './music-waveform-icons';
import { useKangurMusicPianoRollContext } from './KangurMusicPianoRoll.context';

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

const renderMusicTransportWaveformCue = ({
  cueTestId,
  iconTestId,
  label,
  waveform,
}: {
  cueTestId: string;
  iconTestId: string;
  label: string;
  waveform: KangurMusicSynthWaveform;
}): React.JSX.Element => (
  <KangurVisualCueContent
    detail={
      <KangurMusicWaveformIcon
        className='h-3.5 w-6'
        data-testid={iconTestId}
        waveform={waveform}
      />
    }
    icon='👂'
    iconTestId={cueTestId}
    label={label}
  />
);

export function KangurMusicPianoRollGrid(): React.JSX.Element {
  const {
    activeStepIndex,
    activeSynthGesture,
    activeSynthGestureCount,
    activeTransportStep,
    currentCursorStep,
    expectedStepIndex,
    expectedTransportStep,
    isCompactMobile,
    isFreePlayMode,
    isSixYearOldVisualMode,
    laneKeys,
    measureCount,
    resolvedCompletedCount,
    resolvedKeyboardMode,
    resolvedLaneHeightPx,
    resolvedMelody,
    resolvedMinStepWidthPx,
    resolvedShowLaneLabels,
    resolvedShowMeasureGuides,
    resolvedStepCount,
    resolvedSynthGlideMode,
    resolvedSynthWaveform,
    resolvedUnitsPerMeasure,
    shouldShowTransportRail,
    stepElementRefs,
    stepTestIdPrefix,
  } = useKangurMusicPianoRollContext();

  const activeSynthPanLabel = activeSynthGesture ? (activeSynthGesture.stereoPan === 0 ? 'C' : activeSynthGesture.stereoPan < 0 ? `L${Math.round(Math.abs(activeSynthGesture.stereoPan) * 100)}` : `R${Math.round(activeSynthGesture.stereoPan * 100)}`) : null;
  const activeSynthPitchDetuneLabel = activeSynthGesture ? (activeSynthGesture.pitchCentsFromKey === 0 ? '' : activeSynthGesture.pitchCentsFromKey > 0 ? `+${activeSynthGesture.pitchCentsFromKey}c` : `${activeSynthGesture.pitchCentsFromKey}c`) : '';
  const activeSynthPitchKey = activeSynthGesture ? (laneKeys.find(k => k.id === activeSynthGesture.noteId) ?? null) : null;
  const activeSynthPitchPercent = activeSynthGesture ? Math.round(activeSynthGesture.normalizedHorizontalPosition * 100) : null;

  const transportModeIconTestId = `${stepTestIdPrefix}-transport-mode-icon`;
  const transportGlideModeDetailTestId = `${stepTestIdPrefix}-transport-glide-mode-detail`;
  const transportGlideModeIconTestId = `${stepTestIdPrefix}-transport-glide-mode-icon`;

  return (
    <div
      className={cn(
        'relative overflow-hidden border border-slate-200/80 bg-slate-950/[0.05]',
        isCompactMobile ? 'rounded-[24px] p-3' : 'rounded-[28px] p-3.5 sm:p-4',
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
              isCompactMobile ? 'mb-2' : 'mb-2.5',
            )}
          >
            <div className='text-[10px] font-black uppercase tracking-[0.3em] text-sky-700/80'>
              Pitch / Time
            </div>
            <div className='text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500'>
              {isFreePlayMode ? 'Swobodnie' : `${resolvedMelody.length} nut`}
            </div>
          </div>
          {shouldShowTransportRail ? (
            <div
              className={cn(
                'flex gap-2 px-2',
                isCompactMobile
                  ? 'mb-2 overflow-x-auto pb-2 [scrollbar-width:none] snap-x snap-mandatory whitespace-nowrap [&::-webkit-scrollbar]:hidden'
                  : 'mb-2.5 flex-wrap',
              )}
              data-testid={`${stepTestIdPrefix}-transport-rail`}
            >
              {isFreePlayMode ? (
                <div
                  className='shrink-0 rounded-full bg-emerald-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-800'
                  data-testid={`${stepTestIdPrefix}-transport-freeplay`}
                >
                  Swobodna gra
                </div>
              ) : null}
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
              {!isFreePlayMode ? (
                <div
                  className='shrink-0 rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600'
                  data-testid={`${stepTestIdPrefix}-transport-count`}
                >
                  Krok {(activeStepIndex ?? expectedStepIndex ?? 0) + 1}/{resolvedMelody.length}
                </div>
              ) : null}
              {resolvedKeyboardMode === 'synth' ? (
                <div
                  aria-label={`Tryb: ${resolvedKeyboardMode}`}
                  className='shrink-0 rounded-full bg-fuchsia-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-800'
                  data-testid={`${stepTestIdPrefix}-transport-mode`}
                >
                  {isSixYearOldVisualMode
                    ? renderMusicKeyboardModeCue({
                        icon: '✨',
                        iconTestId: transportModeIconTestId,
                        label: `Tryb: ${resolvedKeyboardMode}`,
                      })
                    : 'Synth'}
                </div>
              ) : null}
              {resolvedKeyboardMode === 'synth' ? (
                <div
                  aria-label={`Brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[resolvedSynthWaveform]}`}
                  className='shrink-0 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-700'
                  data-testid={`${stepTestIdPrefix}-transport-waveform`}
                >
                  {isSixYearOldVisualMode
                    ? renderMusicTransportWaveformCue({
                        cueTestId: `${stepTestIdPrefix}-transport-waveform-cue`,
                        iconTestId: `${stepTestIdPrefix}-transport-waveform-icon`,
                        label: `Brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[resolvedSynthWaveform]}`,
                        waveform: resolvedSynthWaveform,
                      })
                    : `Brzmienie: ${KANGUR_MUSIC_SYNTH_WAVEFORM_LABELS[resolvedSynthWaveform]}`}
                </div>
              ) : null}
              {resolvedKeyboardMode === 'synth' ? (
                <div
                  aria-label={`Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[resolvedSynthGlideMode]}`}
                  className='shrink-0 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-700'
                  data-testid={`${stepTestIdPrefix}-transport-glide-mode`}
                >
                  {isSixYearOldVisualMode
                    ? renderMusicGlideModeCue({
                        detailTestId: transportGlideModeDetailTestId,
                        glideMode: resolvedSynthGlideMode,
                        iconTestId: transportGlideModeIconTestId,
                        label: `Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[resolvedSynthGlideMode]}`,
                      })
                    : `Ruch: ${KANGUR_MUSIC_SYNTH_GLIDE_MODE_LABELS[resolvedSynthGlideMode]}`}
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
              {resolvedKeyboardMode === 'synth' ? (
                <div
                  className='shrink-0 rounded-full bg-slate-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700'
                  data-testid={`${stepTestIdPrefix}-transport-axis-map`}
                >
                  X: Pitch · Y: Vibrato
                </div>
              ) : null}
              {activeSynthGesture ? (
                <div
                  className='shrink-0 rounded-full bg-sky-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-sky-800'
                  data-testid={`${stepTestIdPrefix}-transport-pitch`}
                >
                  Pitch: {activeSynthPitchKey?.shortLabel ?? activeSynthGesture.noteId}
                  {activeSynthPitchDetuneLabel} · {activeSynthPitchPercent ?? 0}%
                </div>
              ) : null}
              {activeSynthGesture ? (
                <div
                  className='shrink-0 rounded-full bg-indigo-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-indigo-800'
                  data-testid={`${stepTestIdPrefix}-transport-pan`}
                >
                  Pan: {activeSynthPanLabel}
                </div>
              ) : null}
              {activeSynthGesture ? (
                <div
                  className='shrink-0 rounded-full bg-fuchsia-100/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-fuchsia-800'
                  data-testid={`${stepTestIdPrefix}-transport-vibrato`}
                >
                  Vibrato: {Math.round(activeSynthGesture.vibratoDepth * 100)}%
                  {activeSynthGesture.vibratoDepth > 0
                    ? ` · ${activeSynthGesture.vibratoRateHz.toFixed(1)}Hz`
                    : ''}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className='relative overflow-x-auto px-1.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            <div className='pointer-events-none absolute inset-y-0 left-0 z-[3] w-5 bg-gradient-to-r from-white/90 via-white/50 to-transparent' />
            <div className='pointer-events-none absolute inset-y-0 right-0 z-[3] w-5 bg-gradient-to-l from-white/90 via-white/50 to-transparent' />
            {resolvedShowMeasureGuides ? (
              <div
                className={cn('relative grid', isCompactMobile ? 'mb-2 gap-1.5' : 'mb-2.5 gap-2 sm:gap-3')}
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
                      isMeasureBoundary ? 'border-sky-300/85' : 'border-white/45',
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
                  className='pointer-events-none z-[1] rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.16))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.82),0_18px_34px_-28px_rgba(56,189,248,0.4)] backdrop-blur-[2px]'
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
                      'relative z-[2] flex flex-col justify-between overflow-hidden border border-white/75 bg-gradient-to-br text-center shadow-[0_20px_40px_-30px_rgba(15,23,42,0.36)] transition duration-75',
                      isCompactMobile
                        ? 'min-h-[24px] rounded-[12px] px-1.5 py-1'
                        : 'min-h-[46px] rounded-[18px] px-2 py-2 sm:min-h-[52px] sm:px-3',
                      step.key.blockClassName,
                      isPlayed && 'opacity-100 saturate-110',
                      !isPlayed && !isActive && !isExpected && 'opacity-72 saturate-75',
                      isActive &&
                        'scale-[1.02] ring-4 ring-white/80 shadow-[0_26px_54px_-30px_rgba(15,23,42,0.42)]',
                      isExpected && !isActive && 'ring-2 ring-sky-200/95',
                      !isPlayed && !isActive && !isExpected && 'translate-y-0.5',
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
                    measureStart + resolvedUnitsPerMeasure - 1,
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
                          : 'border-white/70 bg-white/75 text-slate-500',
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
  );
}
