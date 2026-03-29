'use client';

import { Gauge, Music2, RefreshCw, Sparkles, Target, Zap } from 'lucide-react';
import React, { useEffect } from 'react';

import { translateKangurMiniGameWithFallback } from '@/features/kangur/ui/constants/mini-game-i18n';
import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import {
  KangurButton,
  KangurGlassPanel,
  KangurIconBadge,
  KangurInfoCard,
  KangurMetricCard,
  KangurPanelRow,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_LG_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  ADDING_SYNTHESIS_HIT_LINE_RATIO,
  getLocalizedAddingSynthesisStages,
  getLocalizedAddingSynthesisStage,
  ADDING_SYNTHESIS_NOTE_DURATION_MS,
} from '@/features/kangur/ui/services/adding-synthesis';
import type {
  KangurMiniGameFinishActionProps,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import { LANE_STYLES, getFeedbackAccent } from './adding-synthesis/AddingSynthesisGame.constants';
import { useAddingSynthesisGameState } from './adding-synthesis/AddingSynthesisGame.hooks';

export default function AddingSynthesisGame({
  onFinish,
}: KangurMiniGameFinishActionProps): React.JSX.Element {
  const state = useAddingSynthesisGameState();
  const {
    translations,
    phase,
    currentIndex,
    noteElapsedMs,
    feedback,
    score,
    streak,
    summary,
    currentNote,
    startSession,
    resolveChoice,
  } = state;

  const t = (key: string, fallback: string, values?: Record<string, string | number>): string =>
    translateKangurMiniGameWithFallback(translations, key, fallback, values);

  const localizedStages = getLocalizedAddingSynthesisStages(translations);
  const laneCount = LANE_STYLES.length;
  const introNoteCount = localizedStages.reduce((sum, stage) => sum + stage.noteCount, 0);

  useEffect(() => {
    if (phase !== 'playing' || !currentNote || feedback) return;
    const handleKeyDown = (event: KeyboardEvent): void => {
      const laneIndex = ['1', '2', '3', '4'].indexOf(event.key);
      if (laneIndex === -1) return;
      event.preventDefault();
      resolveChoice(laneIndex);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNote, feedback, phase, resolveChoice]);

  if (phase === 'intro') {
    return (
      <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <KangurGlassPanel className='overflow-hidden' data-testid='adding-synthesis-intro-shell' padding='xl' surface='warmGlow' variant='elevated'>
          <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurStatusChip accent='amber'>{t('addingSynthesis.intro.newGame', 'Nowa gra')}</KangurStatusChip>
              <KangurStatusChip accent='violet'>{t('addingSynthesis.intro.style', 'Synthesia-style')}</KangurStatusChip>
            </div>
            <div className={`${KANGUR_PANEL_ROW_LG_CLASSNAME} lg:items-end lg:justify-between`}>
              <div className='max-w-2xl'>
                <h2 className='text-3xl font-extrabold tracking-[-0.03em] [color:var(--kangur-page-text)] sm:text-4xl'>{t('addingSynthesis.intro.title', 'Synteza dodawania')}</h2>
                <p className='mt-3 text-base leading-7 [color:var(--kangur-page-muted-text)]'>{t('addingSynthesis.intro.description', 'Licz w głowie, patrz jak działanie spada do linii i uderz w tor z poprawnym wynikiem.')}</p>
              </div>
              <KangurInfoCard accent='violet' className='rounded-[28px]' padding='md' tone='accent'>
                <div className='flex items-center kangur-panel-gap'>
                  <KangurIconBadge accent='violet' size='md'><Music2 className='h-6 w-6' /></KangurIconBadge>
                  <div>
                    <KangurStatusChip accent='violet' className='text-[11px] uppercase tracking-[0.18em]' size='sm'>{t('addingSynthesis.intro.rhythmLabel', 'Rytm gry')}</KangurStatusChip>
                    <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>{t('addingSynthesis.intro.rhythmValue', '{notes} nut • {lanes} tory', { notes: introNoteCount, lanes: laneCount })}</p>
                  </div>
                </div>
              </KangurInfoCard>
            </div>
            <div className='grid kangur-panel-gap md:grid-cols-2 xl:grid-cols-3'>
              {localizedStages.map((stage) => (
                <KangurInfoCard key={stage.id} accent={stage.accent} className='h-full' padding='lg' tone='accent'>
                  <div className='flex items-start kangur-panel-gap'>
                    <div className='text-3xl leading-none'>{stage.icon}</div>
                    <div><p className='text-sm font-extrabold [color:var(--kangur-page-text)]'>{stage.title}</p><p className='mt-1 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>{stage.description}</p></div>
                  </div>
                </KangurInfoCard>
              ))}
            </div>
            <KangurSummaryPanel accent='slate' label={t('addingSynthesis.intro.howToPlayLabel', 'Jak grać')} padding='lg'>
              <div className='grid kangur-panel-gap min-[420px]:grid-cols-2 lg:grid-cols-3'>
                <div className='flex items-center kangur-panel-gap'><Target className='h-5 w-5 text-amber-500' /><p className='text-sm [color:var(--kangur-page-muted-text)]'>{t('addingSynthesis.intro.howToPlay.chooseLane', 'Klikaj odpowiedni tor lub naciskaj 1, 2, 3, 4.')}</p></div>
                <div className='flex items-center kangur-panel-gap'><Gauge className='h-5 w-5 text-sky-500' /><p className='text-sm [color:var(--kangur-page-muted-text)]'>{t('addingSynthesis.intro.howToPlay.timing', 'Im bliżej linii trafisz, tym lepszy rytm.')}</p></div>
                <div className='flex items-center kangur-panel-gap'><Zap className='h-5 w-5 text-violet-500' /><p className='text-sm [color:var(--kangur-page-muted-text)]'>{t('addingSynthesis.intro.howToPlay.feedback', 'Po każdym błędzie dostajesz szybką podpowiedź.')}</p></div>
              </div>
            </KangurSummaryPanel>
            <KangurPanelRow>
              <KangurButton type='button' size='lg' variant='primary' onClick={startSession} data-testid='adding-synthesis-start'><Sparkles className='h-4 w-4' />{t('addingSynthesis.intro.start', 'Start syntezę')}</KangurButton>
              <KangurButton type='button' size='lg' variant='surface' onClick={onFinish}>{t('addingSynthesis.shared.backToAdding', 'Wróć do Dodawania')}</KangurButton>
            </KangurPanelRow>
          </div>
        </KangurGlassPanel>
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    const showRewards = summary.xpEarned > 0 || summary.breakdown.length > 0;
    return (
      <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <KangurGlassPanel data-testid='adding-synthesis-summary' padding='xl' surface='successGlow' variant='elevated'>
          <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurStatusChip accent='emerald'>{t('addingSynthesis.summary.sessionComplete', 'Sesja zakończona')}</KangurStatusChip>
              {showRewards && <KangurStatusChip accent='amber'>+{summary.xpEarned} XP</KangurStatusChip>}
            </div>
            {showRewards && <KangurRewardBreakdownChips accent='slate' breakdown={summary.breakdown} />}
            <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
              <h2 className='text-3xl font-extrabold tracking-[-0.03em] [color:var(--kangur-page-text)] sm:text-4xl'>{t('addingSynthesis.summary.score', 'Wynik {score}/{total}', { score: summary.score, total: summary.totalNotes })}</h2>
              <p className='text-base leading-7 [color:var(--kangur-page-muted-text)]'>{summary.accuracy >= 85 ? t('addingSynthesis.summary.messages.strong', 'Bardzo mocna sesja.') : t('addingSynthesis.summary.messages.retry', 'Masz już bazę.')}</p>
            </div>
            <div className='grid kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-4'>
              <KangurMetricCard accent='emerald' label={t('addingSynthesis.summary.stats.accuracy', 'Skuteczność')} value={`${summary.accuracy}%`} />
              <KangurMetricCard accent='violet' label={t('addingSynthesis.summary.stats.perfectHits', 'Idealne trafienia')} value={summary.perfectHits} />
              <KangurMetricCard accent='amber' label={t('addingSynthesis.summary.stats.bestStreak', 'Najlepsza seria')} value={summary.bestStreak} />
              <KangurMetricCard accent='sky' label={t('addingSynthesis.summary.stats.round', 'Runda')} value={summary.totalNotes} />
            </div>
            <KangurPanelRow>
              <KangurButton type='button' size='lg' variant='primary' onClick={startSession}><RefreshCw className='h-4 w-4' />{t('addingSynthesis.summary.playAgain', 'Zagraj jeszcze raz')}</KangurButton>
              <KangurButton type='button' size='lg' variant='surface' onClick={onFinish}>{t('addingSynthesis.shared.backToAdding', 'Wróć do Dodawania')}</KangurButton>
            </KangurPanelRow>
          </div>
        </KangurGlassPanel>
      </div>
    );
  }

  const noteProgress = Math.min(noteElapsedMs / ADDING_SYNTHESIS_NOTE_DURATION_MS, 1);
  const noteTop = 24 + noteProgress * 236;
  const currentStage = currentNote ? getLocalizedAddingSynthesisStage(currentNote.stageId, translations) : localizedStages[0]!;
  const answeredCount = currentIndex + (feedback ? 1 : 0);
  const accuracy = Math.round((score / Math.max(1, answeredCount)) * 100);
  const currentPrompt = currentNote ? `${currentNote.left} + ${currentNote.right}` : '?';

  return (
    <div className='flex w-full flex-col kangur-panel-gap'>
      <KangurGlassPanel className='relative overflow-hidden' surface='playField' variant='soft'>
        <div className='relative h-[320px] w-full overflow-hidden bg-slate-900/5'>
          {/* Hit line */}
          <div className='absolute inset-x-0 z-10 h-px bg-slate-200 opacity-40' style={{ top: `${ADDING_SYNTHESIS_HIT_LINE_RATIO * 100}%` }} />
          
          <div className='relative flex h-full items-stretch'>
            {LANE_STYLES.map((lane, idx) => {
              const isCorrect = feedback?.correctLaneIndex === idx;
              const isChosen = feedback?.chosenLaneIndex === idx;
              return (
                <div key={idx} onClick={() => resolveChoice(idx)} className={cn('relative flex-1 border-r border-slate-200/40 last:border-r-0 transition-colors cursor-pointer', lane.rail, isChosen && (isCorrect ? 'bg-emerald-500/10' : 'bg-rose-500/10'))}>
                  <div className='absolute inset-x-0 bottom-4 text-center'><span className={cn('text-[10px] font-black uppercase tracking-widest opacity-40', lane.label)}>{idx + 1}</span></div>
                  {currentNote?.choices[idx] !== undefined && !feedback && (
                    <div className='absolute inset-x-0 flex justify-center' style={{ top: `${noteTop}px`, transition: 'top 40ms linear' }}>
                      <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg border-2 border-slate-100 text-lg font-black text-slate-900'>{currentNote.choices[idx]}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

          <div className='border-t border-slate-200/60 p-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              <div className='text-3xl'>{currentStage.icon}</div>
              <div><div className='text-xs font-black uppercase tracking-widest text-slate-400'>{currentStage.title}</div><div className='text-sm font-bold text-slate-900'>{currentPrompt} = ?</div></div>
            </div>
            <div className='flex items-center gap-6'>
              <div className='text-right'><div className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Skuteczność</div><div className='text-sm font-bold text-slate-900'>{accuracy}%</div></div>
              <div className='text-right'><div className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Seria</div><div className='text-sm font-bold text-slate-900'>{streak}</div></div>
            </div>
          </div>
        </div>
      </KangurGlassPanel>

      {feedback && (
        <KangurInfoCard accent={getFeedbackAccent(feedback.kind)} tone='accent' padding='md'>
          <div className='flex items-center justify-between'>
            <div><div className='text-sm font-black text-slate-900'>{feedback.title}</div><div className='text-xs font-semibold text-slate-600'>{feedback.description}</div></div>
            <div className='text-right'><div className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Wskazówka</div><div className='text-xs font-bold text-slate-900'>{feedback.hint}</div></div>
          </div>
        </KangurInfoCard>
      )}
    </div>
  );
}
