'use client';

import { Gauge, Music2, RefreshCw, Sparkles, Target, Zap } from 'lucide-react';
import React, { useEffect } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import { translateKangurMiniGameWithFallback } from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurGlassPanel,
  KangurIconBadge,
  KangurInfoCard,
  KangurMetricCard,
  KangurPanelRow,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_LG_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import {
  ADDING_SYNTHESIS_HIT_LINE_RATIO,
  ADDING_SYNTHESIS_NOTE_DURATION_MS,
  getLocalizedAddingSynthesisNoteFocus,
  getLocalizedAddingSynthesisStage,
  getLocalizedAddingSynthesisStages,
} from '@/features/kangur/ui/services/adding-synthesis';
import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import { LANE_STYLES, getFeedbackAccent } from './adding-synthesis/AddingSynthesisGame.constants';
import { useAddingSynthesisGameState } from './adding-synthesis/AddingSynthesisGame.hooks';

type AddingSynthesisState = ReturnType<typeof useAddingSynthesisGameState>;
type AddingSynthesisTranslate = (
  key: string,
  fallback: string,
  values?: Record<string, string | number>
) => string;
type AddingSynthesisStage = ReturnType<typeof getLocalizedAddingSynthesisStage>;

const ADDING_SYNTHESIS_VIEW_KINDS = {
  intro: 'intro',
  playing: 'playing',
  summary: 'summary',
} as const;

const resolveAddingSynthesisCurrentStage = ({
  currentNote,
  translations,
}: {
  currentNote: AddingSynthesisState['currentNote'];
  translations: AddingSynthesisState['translations'];
}): {
  currentStage: AddingSynthesisStage;
  localizedStages: ReturnType<typeof getLocalizedAddingSynthesisStages>;
} => {
  const localizedStages = getLocalizedAddingSynthesisStages(translations);
  const fallbackStage =
    localizedStages[0] ?? getLocalizedAddingSynthesisStage('warmup', translations);

  return {
    currentStage: currentNote
      ? getLocalizedAddingSynthesisStage(currentNote.stageId, translations)
      : fallbackStage,
    localizedStages,
  };
};

const resolveAddingSynthesisAccuracy = ({
  currentIndex,
  feedback,
  score,
}: {
  currentIndex: number;
  feedback: AddingSynthesisState['feedback'];
  score: number;
}): number =>
  currentIndex > 0 || feedback
    ? Math.round((score / Math.max(1, currentIndex + (feedback ? 1 : 0))) * 100)
    : 0;

const resolveAddingSynthesisSummaryMessage = ({
  accuracy,
  t,
}: {
  accuracy: number;
  t: AddingSynthesisTranslate;
}): string => {
  if (accuracy >= 85) {
    return t(
      'addingSynthesis.summary.messages.strong',
      'Bardzo mocna sesja. Dodawanie trzyma rytm i tempo.'
    );
  }

  if (accuracy >= 60) {
    return t(
      'addingSynthesis.summary.messages.good',
      'Dobry wynik. Jeszcze kilka rund i te sumy będą wchodziły automatycznie.'
    );
  }

  return t(
    'addingSynthesis.summary.messages.retry',
    'Masz już bazę. Powtórz sesję i skup się na podpowiedziach przy trudniejszych nutach.'
  );
};

const resolveAddingSynthesisExitLabels = ({
  finishLabel,
  t,
}: {
  finishLabel: string | undefined;
  t: AddingSynthesisTranslate;
}): {
  exitLabel: string;
  inSessionExitLabel: string;
} => ({
  exitLabel: finishLabel ?? t('addingSynthesis.shared.backToAdding', 'Wróć do Dodawania'),
  inSessionExitLabel:
    finishLabel ?? t('addingSynthesis.playing.endAttempt', 'Zakończ próbę'),
});

const resolveAddingSynthesisViewKind = ({
  phase,
  summary,
}: {
  phase: AddingSynthesisState['phase'];
  summary: AddingSynthesisState['summary'];
}): 'intro' | 'playing' | 'summary' => {
  if (phase === 'intro') {
    return ADDING_SYNTHESIS_VIEW_KINDS.intro;
  }

  if (phase === 'summary' && summary) {
    return ADDING_SYNTHESIS_VIEW_KINDS.summary;
  }

  return ADDING_SYNTHESIS_VIEW_KINDS.playing;
};

const isAddingSynthesisCorrectLane = ({
  feedback,
  laneIndex,
}: {
  feedback: AddingSynthesisState['feedback'];
  laneIndex: number;
}): boolean => feedback?.correctLaneIndex === laneIndex;

const isAddingSynthesisChosenLane = ({
  feedback,
  laneIndex,
}: {
  feedback: AddingSynthesisState['feedback'];
  laneIndex: number;
}): boolean => feedback?.chosenLaneIndex === laneIndex;

const isAddingSynthesisErrorLane = ({
  feedback,
  isChosenLane,
  isCorrectLane,
}: {
  feedback: AddingSynthesisState['feedback'];
  isChosenLane: boolean;
  isCorrectLane: boolean;
}): boolean => {
  if (!feedback || !isChosenLane) {
    return false;
  }

  if (feedback.kind === 'miss') {
    return true;
  }

  return feedback.kind === 'wrong' && !isCorrectLane;
};

const resolveAddingSynthesisLaneAccent = ({
  defaultAccent,
  showErrorState,
  showSuccessState,
}: {
  defaultAccent: React.ComponentProps<typeof KangurAnswerChoiceCard>['accent'];
  showErrorState: boolean;
  showSuccessState: boolean;
}): React.ComponentProps<typeof KangurAnswerChoiceCard>['accent'] => {
  if (showSuccessState) {
    return 'emerald';
  }

  if (showErrorState) {
    return 'rose';
  }

  return defaultAccent;
};

const resolveAddingSynthesisLaneTextClassName = ({
  showErrorState,
  showSuccessState,
}: {
  showErrorState: boolean;
  showSuccessState: boolean;
}): string | null => {
  if (showSuccessState) {
    return 'text-emerald-700';
  }

  if (showErrorState) {
    return 'text-rose-700';
  }

  return null;
};

const resolveAddingSynthesisLanePresentation = ({
  feedback,
  isCoarsePointer,
  laneIndex,
}: {
  feedback: AddingSynthesisState['feedback'];
  isCoarsePointer: boolean;
  laneIndex: number;
}): {
  accent: React.ComponentProps<typeof KangurAnswerChoiceCard>['accent'];
  buttonClassName: string;
} => {
  const laneStyle = LANE_STYLES[laneIndex] ?? LANE_STYLES[0];
  const isCorrectLane = isAddingSynthesisCorrectLane({ feedback, laneIndex });
  const isChosenLane = isAddingSynthesisChosenLane({ feedback, laneIndex });
  const showSuccessState = Boolean(feedback) && isCorrectLane;
  const showErrorState = isAddingSynthesisErrorLane({
    feedback,
    isChosenLane,
    isCorrectLane,
  });
  const accent = resolveAddingSynthesisLaneAccent({
    defaultAccent: laneStyle.accent,
    showErrorState,
    showSuccessState,
  });
  const laneTextClassName = resolveAddingSynthesisLaneTextClassName({
    showErrorState,
    showSuccessState,
  });

  return {
    accent,
    buttonClassName: cn(
      'min-h-[80px] touch-manipulation select-none flex-col justify-center rounded-[18px] px-1.5 py-2.5 text-center min-[360px]:min-h-[88px] min-[360px]:px-2 sm:min-h-[96px] sm:rounded-[24px] sm:py-3',
      isCoarsePointer &&
        'min-h-[96px] active:scale-[0.98] min-[360px]:min-h-[104px] sm:min-h-[112px]',
      laneTextClassName
    ),
  };
};

const resolveAddingSynthesisHintPanel = ({
  currentNote,
  currentStage,
  feedback,
  isCoarsePointer,
  t,
  translations,
}: {
  currentNote: AddingSynthesisState['currentNote'];
  currentStage: AddingSynthesisStage;
  feedback: AddingSynthesisState['feedback'];
  isCoarsePointer: boolean;
  t: AddingSynthesisTranslate;
  translations: AddingSynthesisState['translations'];
}): {
  accent: React.ComponentProps<typeof KangurSummaryPanel>['accent'];
  body: string | undefined;
  description: string | undefined;
  title: string | undefined;
  tone: React.ComponentProps<typeof KangurSummaryPanel>['tone'];
} => {
  if (feedback) {
    return {
      accent: getFeedbackAccent(feedback.kind),
      body: feedback.hint,
      description: feedback.description,
      title: feedback.title,
      tone: 'accent',
    };
  }

  if (!currentNote) {
    return {
      accent: currentStage.accent,
      body: undefined,
      description: undefined,
      title: undefined,
      tone: 'neutral',
    };
  }

  return {
    accent: currentStage.accent,
    body: isCoarsePointer
      ? t(
          'addingSynthesis.playing.touchHint',
          'Dotknij tor, gdy nuta dojdzie do linii trafienia.'
        )
      : t(
          'addingSynthesis.playing.keyboardHint',
          'Jeśli wolisz klawiaturę, naciśnij 1, 2, 3 lub 4.'
        ),
    description: getLocalizedAddingSynthesisNoteFocus(currentNote, translations),
    title: t('addingSynthesis.playing.hintTitle', 'Podpowiedź do tej nuty'),
    tone: 'neutral',
  };
};

function AddingSynthesisIntroStages({
  localizedStages,
}: {
  localizedStages: ReturnType<typeof getLocalizedAddingSynthesisStages>;
}): React.JSX.Element {
  return (
    <div className='grid kangur-panel-gap md:grid-cols-2 xl:grid-cols-3'>
      {localizedStages.map((stage) => (
        <KangurInfoCard
          key={stage.id}
          accent={stage.accent}
          className='h-full'
          padding='lg'
          tone='accent'
        >
          <div className='flex items-start kangur-panel-gap'>
            <div className='text-3xl leading-none'>{stage.icon}</div>
            <div>
              <p className='text-sm font-extrabold [color:var(--kangur-page-text)]'>
                {stage.title}
              </p>
              <p className='mt-1 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                {stage.description}
              </p>
            </div>
          </div>
        </KangurInfoCard>
      ))}
    </div>
  );
}

function AddingSynthesisIntroView({
  exitLabel,
  introNoteCount,
  laneCount,
  localizedStages,
  onFinish,
  startSession,
  t,
}: {
  exitLabel: string;
  introNoteCount: number;
  laneCount: number;
  localizedStages: ReturnType<typeof getLocalizedAddingSynthesisStages>;
  onFinish: (() => void) | undefined;
  startSession: AddingSynthesisState['startSession'];
  t: AddingSynthesisTranslate;
}): React.JSX.Element {
  return (
    <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurGlassPanel
        className='overflow-hidden'
        data-testid='adding-synthesis-intro-shell'
        padding='xl'
        surface='warmGlow'
        variant='elevated'
      >
        <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <KangurStatusChip accent='amber'>
              {t('addingSynthesis.intro.newGame', 'Nowa gra')}
            </KangurStatusChip>
            <KangurStatusChip accent='violet'>
              {t('addingSynthesis.intro.style', 'Synthesia-style')}
            </KangurStatusChip>
          </div>

          <div className={`${KANGUR_PANEL_ROW_LG_CLASSNAME} lg:items-end lg:justify-between`}>
            <div className='max-w-2xl'>
              <h2 className='text-3xl font-extrabold tracking-[-0.03em] [color:var(--kangur-page-text)] sm:text-4xl'>
                {t('addingSynthesis.intro.title', 'Synteza dodawania')}
              </h2>
              <p className='mt-3 text-base leading-7 [color:var(--kangur-page-muted-text)]'>
                {t(
                  'addingSynthesis.intro.description',
                  'Licz w głowie, patrz jak działanie spada do linii i uderz w tor z poprawnym wynikiem. Zaczynasz od prostych sum, potem przechodzisz przez 10 i kończysz na dwóch cyfrach.'
                )}
              </p>
            </div>
            <KangurInfoCard accent='violet' className='rounded-[28px]' padding='md' tone='accent'>
              <div className='flex items-center kangur-panel-gap'>
                <KangurIconBadge
                  accent='violet'
                  data-testid='adding-synthesis-intro-badge'
                  size='md'
                >
                  <Music2 aria-hidden='true' className='h-6 w-6' />
                </KangurIconBadge>
                <div>
                  <KangurStatusChip
                    accent='violet'
                    className='text-[11px] uppercase tracking-[0.18em]'
                    size='sm'
                  >
                    {t('addingSynthesis.intro.rhythmLabel', 'Rytm gry')}
                  </KangurStatusChip>
                  <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                    {t(
                      'addingSynthesis.intro.rhythmValue',
                      '{notes} nut • {lanes} tory • szybka informacja zwrotna',
                      { notes: introNoteCount, lanes: laneCount }
                    )}
                  </p>
                </div>
              </div>
            </KangurInfoCard>
          </div>

          <AddingSynthesisIntroStages localizedStages={localizedStages} />

          <KangurSummaryPanel
            accent='slate'
            label={t('addingSynthesis.intro.howToPlayLabel', 'Jak grać')}
            padding='lg'
          >
            <div className='grid kangur-panel-gap min-[420px]:grid-cols-2 lg:grid-cols-3'>
              <div className='flex items-center kangur-panel-gap'>
                <Target aria-hidden='true' className='h-5 w-5 text-amber-500' />
                <p className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {t(
                    'addingSynthesis.intro.howToPlay.chooseLane',
                    'Klikaj odpowiedni tor lub naciskaj 1, 2, 3, 4.'
                  )}
                </p>
              </div>
              <div className='flex items-center kangur-panel-gap'>
                <Gauge aria-hidden='true' className='h-5 w-5 text-sky-500' />
                <p className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {t(
                    'addingSynthesis.intro.howToPlay.timing',
                    'Im bliżej linii trafisz, tym lepszy rytm.'
                  )}
                </p>
              </div>
              <div className='flex items-center kangur-panel-gap'>
                <Zap aria-hidden='true' className='h-5 w-5 text-violet-500' />
                <p className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {t(
                    'addingSynthesis.intro.howToPlay.feedback',
                    'Po każdym błędzie dostajesz szybką podpowiedź.'
                  )}
                </p>
              </div>
            </div>
          </KangurSummaryPanel>

          <KangurPanelRow>
            <KangurButton
              data-testid='adding-synthesis-start'
              onClick={startSession}
              size='lg'
              type='button'
              variant='primary'
            >
              <Sparkles aria-hidden='true' className='h-4 w-4' />
              {t('addingSynthesis.intro.start', 'Start syntezę')}
            </KangurButton>
            <KangurButton onClick={onFinish} size='lg' type='button' variant='surface'>
              {exitLabel}
            </KangurButton>
          </KangurPanelRow>
        </div>
      </KangurGlassPanel>
    </div>
  );
}

function AddingSynthesisSummaryView({
  exitLabel,
  onFinish,
  startSession,
  summary,
  t,
}: {
  exitLabel: string;
  onFinish: (() => void) | undefined;
  startSession: AddingSynthesisState['startSession'];
  summary: NonNullable<AddingSynthesisState['summary']>;
  t: AddingSynthesisTranslate;
}): React.JSX.Element {
  const showRewards = summary.xpEarned > 0 || summary.breakdown.length > 0;

  return (
    <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurGlassPanel
        data-testid='adding-synthesis-summary'
        padding='xl'
        surface='successGlow'
        variant='elevated'
      >
        <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <KangurStatusChip accent='emerald'>
              {t('addingSynthesis.summary.sessionComplete', 'Sesja zakończona')}
            </KangurStatusChip>
            {showRewards ? (
              <KangurStatusChip accent='amber'>+{summary.xpEarned} XP</KangurStatusChip>
            ) : null}
          </div>
          {showRewards ? (
            <KangurRewardBreakdownChips
              accent='slate'
              breakdown={summary.breakdown}
              dataTestId='adding-synthesis-summary-breakdown'
              itemDataTestIdPrefix='adding-synthesis-summary-breakdown'
            />
          ) : null}

          <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
            <h2 className='text-3xl font-extrabold tracking-[-0.03em] [color:var(--kangur-page-text)] sm:text-4xl'>
              {t(
                'addingSynthesis.summary.score',
                'Wynik {score}/{total}',
                { score: summary.score, total: summary.totalNotes }
              )}
            </h2>
            <p className='text-base leading-7 [color:var(--kangur-page-muted-text)]'>
              {resolveAddingSynthesisSummaryMessage({
                accuracy: summary.accuracy,
                t,
              })}
            </p>
          </div>

          <div className='grid kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-4'>
            <KangurMetricCard
              accent='emerald'
              label={t('addingSynthesis.summary.stats.accuracy', 'Skuteczność')}
              value={`${summary.accuracy}%`}
            />
            <KangurMetricCard
              accent='violet'
              label={t('addingSynthesis.summary.stats.perfectHits', 'Idealne trafienia')}
              value={summary.perfectHits}
            />
            <KangurMetricCard
              accent='amber'
              label={t('addingSynthesis.summary.stats.bestStreak', 'Najlepsza seria')}
              value={summary.bestStreak}
            />
            <KangurMetricCard
              accent='sky'
              label={t('addingSynthesis.summary.stats.round', 'Runda')}
              value={summary.totalNotes}
            />
          </div>

          <KangurPanelRow>
            <KangurButton onClick={startSession} size='lg' type='button' variant='primary'>
              <RefreshCw aria-hidden='true' className='h-4 w-4' />
              {t('addingSynthesis.summary.playAgain', 'Zagraj jeszcze raz')}
            </KangurButton>
            <KangurButton onClick={onFinish} size='lg' type='button' variant='surface'>
              {exitLabel}
            </KangurButton>
          </KangurPanelRow>
        </div>
      </KangurGlassPanel>
    </div>
  );
}

function AddingSynthesisPlayingHud({
  currentIndex,
  currentStage,
  notesLength,
  perfectHits,
  score,
  streak,
  t,
}: {
  currentIndex: number;
  currentStage: AddingSynthesisStage;
  notesLength: number;
  perfectHits: number;
  score: number;
  streak: number;
  t: AddingSynthesisTranslate;
}): React.JSX.Element {
  return (
    <KangurGlassPanel
      data-testid='adding-synthesis-hud'
      padding='lg'
      surface='frost'
      variant='soft'
    >
      <div className={`${KANGUR_PANEL_ROW_LG_CLASSNAME} lg:items-center lg:justify-between`}>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
          <KangurStatusChip accent={currentStage.accent}>{currentStage.title}</KangurStatusChip>
          <KangurStatusChip accent='slate'>
            {t(
              'addingSynthesis.playing.noteCount',
              'Nuta {current}/{total}',
              { current: currentIndex + 1, total: notesLength }
            )}
          </KangurStatusChip>
        </div>

        <div className='grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:w-auto lg:min-w-[320px]'>
          <KangurMetricCard
            accent='amber'
            align='center'
            label={t('addingSynthesis.playing.stats.streak', 'Seria')}
            padding='sm'
            value={streak}
            valueClassName='text-xl'
          />
          <KangurMetricCard
            accent='violet'
            align='center'
            label={t('addingSynthesis.playing.stats.perfect', 'Idealne')}
            padding='sm'
            value={perfectHits}
            valueClassName='text-xl'
          />
          <KangurMetricCard
            accent='sky'
            align='center'
            label={t('addingSynthesis.playing.stats.hit', 'Trafione')}
            padding='sm'
            value={score}
            valueClassName='text-xl'
          />
        </div>
      </div>
    </KangurGlassPanel>
  );
}

function AddingSynthesisUpcomingNotes({
  upcomingNotes,
}: {
  upcomingNotes: NonNullable<AddingSynthesisState['currentNote']>[];
}): React.JSX.Element {
  return (
    <div className='pointer-events-none absolute left-2 right-2 top-3 flex justify-center gap-1.5 sm:left-4 sm:right-4 sm:top-4 sm:gap-2'>
      {upcomingNotes.map((note, index) => (
        <KangurStatusChip
          key={note.id}
          accent='slate'
          className={cn(
            'text-[10px] shadow-sm min-[360px]:text-[11px] sm:text-xs',
            index === 1 ? 'hidden min-[360px]:inline-flex' : null,
            index === 2 ? 'hidden sm:inline-flex' : null
          )}
          data-testid={`adding-synthesis-upcoming-note-${index}`}
          size='sm'
          style={{ transform: `translateY(${index * 10}px) scale(${1 - index * 0.04})` }}
        >
          {note.left} + {note.right}
        </KangurStatusChip>
      ))}
    </div>
  );
}

function AddingSynthesisLaneRails({
  t,
}: {
  t: AddingSynthesisTranslate;
}): React.JSX.Element {
  return (
    <div className='absolute inset-y-0 left-0 right-0 grid grid-cols-4 kangur-panel-gap'>
      {LANE_STYLES.map((laneStyle, laneIndex) => (
        <div
          key={`lane-rail-${laneIndex}`}
          className={cn(
            'relative rounded-[20px] border px-1.5 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] min-[360px]:px-2 sm:rounded-[26px] sm:pt-4',
            laneStyle.rail
          )}
        >
          <div className='absolute left-0 right-0 top-2.5 text-center sm:top-3'>
            <span
              className={cn(
                'text-[9px] font-semibold uppercase tracking-[0.16em] min-[360px]:text-[10px] sm:text-[11px] sm:tracking-[0.24em]',
                laneStyle.label
              )}
            >
              {t(
                'addingSynthesis.playing.laneLabel',
                'Tor {index}',
                { index: laneIndex + 1 }
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AddingSynthesisCurrentNoteCard({
  currentNote,
  currentStage,
  noteScale,
  noteTop,
  t,
}: {
  currentNote: NonNullable<AddingSynthesisState['currentNote']>;
  currentStage: AddingSynthesisStage;
  noteScale: number;
  noteTop: number;
  t: AddingSynthesisTranslate;
}): React.JSX.Element {
  return (
    <div
      className='pointer-events-none absolute inset-x-0 z-20 px-2 min-[360px]:px-3 sm:px-4'
      data-testid='adding-synthesis-note'
      style={{ top: `${noteTop}px` }}
    >
      <div
        className='mx-auto max-w-[460px] transition-transform duration-75 ease-linear'
        style={{ transform: `scale(${noteScale})` }}
      >
        <KangurGlassPanel
          className='rounded-[24px] !p-3 shadow-[0_22px_60px_-34px_rgba(79,70,229,0.32)] backdrop-blur min-[360px]:!p-4 sm:rounded-[28px]'
          data-testid='adding-synthesis-note-shell'
          padding='md'
          surface='solid'
          variant='soft'
        >
          <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} items-start sm:items-center sm:justify-between`}>
            <KangurStatusChip
              accent='violet'
              className='text-[11px] uppercase tracking-[0.18em]'
              data-testid='adding-synthesis-note-stage'
              size='sm'
            >
              {currentStage.icon} {currentStage.title}
            </KangurStatusChip>
            <KangurStatusChip
              accent='slate'
              data-testid='adding-synthesis-note-hit-line'
              size='sm'
            >
              {t(
                'addingSynthesis.playing.hitLine',
                'Linia przy {percent}%',
                { percent: Math.round(ADDING_SYNTHESIS_HIT_LINE_RATIO * 100) }
              )}
            </KangurStatusChip>
          </div>
          <div className='mt-3 text-center'>
            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-amber-500 min-[360px]:text-sm min-[360px]:tracking-[0.22em]'>
              {t('addingSynthesis.playing.hitPrompt', 'Uderz we właściwy tor')}
            </p>
            <p className='mt-2 text-3xl font-extrabold tracking-[-0.04em] [color:var(--kangur-page-text)] min-[360px]:text-4xl sm:text-5xl'>
              {currentNote.left} + {currentNote.right}
            </p>
          </div>
        </KangurGlassPanel>
      </div>
    </div>
  );
}

function AddingSynthesisLaneChoiceCard({
  choice,
  feedback,
  isCoarsePointer,
  laneIndex,
  noteId,
  onChoose,
  t,
}: {
  choice: number;
  feedback: AddingSynthesisState['feedback'];
  isCoarsePointer: boolean;
  laneIndex: number;
  noteId: string;
  onChoose: (laneIndex: number) => void;
  t: AddingSynthesisTranslate;
}): React.JSX.Element {
  const presentation = resolveAddingSynthesisLanePresentation({
    feedback,
    isCoarsePointer,
    laneIndex,
  });

  return (
    <KangurAnswerChoiceCard
      key={`${noteId}-${choice}`}
      accent={presentation.accent}
      aria-disabled={feedback ? 'true' : 'false'}
      aria-label={t(
        'addingSynthesis.playing.laneAria',
        'Tor {index}: {choice}',
        { index: laneIndex + 1, choice }
      )}
      buttonClassName={presentation.buttonClassName}
      data-testid={`adding-synthesis-lane-${laneIndex}`}
      emphasis='accent'
      interactive={!feedback}
      onClick={() => {
        if (!feedback) {
          onChoose(laneIndex);
        }
      }}
      type='button'
    >
      <span className='text-[9px] font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)] min-[360px]:text-[10px] sm:text-[11px] sm:tracking-[0.24em]'>
        {laneIndex + 1}
      </span>
      <span className='mt-1 text-xl font-extrabold tracking-[-0.03em] min-[360px]:text-2xl sm:text-3xl'>
        {choice}
      </span>
      <span className='mt-1 hidden text-[11px] font-medium [color:var(--kangur-page-muted-text)] min-[360px]:inline'>
        {t('addingSynthesis.playing.chooseLane', 'Wybierz tor')}
      </span>
    </KangurAnswerChoiceCard>
  );
}

function AddingSynthesisLaneChoices({
  currentNote,
  feedback,
  isCoarsePointer,
  onChoose,
  t,
}: {
  currentNote: NonNullable<AddingSynthesisState['currentNote']>;
  feedback: AddingSynthesisState['feedback'];
  isCoarsePointer: boolean;
  onChoose: (laneIndex: number) => void;
  t: AddingSynthesisTranslate;
}): React.JSX.Element {
  return (
    <div className='absolute inset-x-0 bottom-0 grid grid-cols-4 kangur-panel-gap'>
      {currentNote.choices.map((choice, laneIndex) => (
        <AddingSynthesisLaneChoiceCard
          key={`${currentNote.id}-${choice}`}
          choice={choice}
          feedback={feedback}
          isCoarsePointer={isCoarsePointer}
          laneIndex={laneIndex}
          noteId={currentNote.id}
          onChoose={onChoose}
          t={t}
        />
      ))}
    </div>
  );
}

function AddingSynthesisPlayingBoard({
  currentNote,
  currentStage,
  feedback,
  isCoarsePointer,
  noteScale,
  noteTop,
  onChoose,
  upcomingNotes,
  t,
}: {
  currentNote: AddingSynthesisState['currentNote'];
  currentStage: AddingSynthesisStage;
  feedback: AddingSynthesisState['feedback'];
  isCoarsePointer: boolean;
  noteScale: number;
  noteTop: number;
  onChoose: (laneIndex: number) => void;
  upcomingNotes: NonNullable<AddingSynthesisState['currentNote']>[];
  t: AddingSynthesisTranslate;
}): React.JSX.Element {
  return (
    <KangurGlassPanel
      className='min-w-0'
      data-testid='adding-synthesis-board-shell'
      padding='lg'
      surface='playGlow'
      variant='elevated'
    >
      <KangurGlassPanel
        className='relative min-w-0 overflow-hidden rounded-[26px] !p-2.5 min-[360px]:!p-3 sm:rounded-[30px] sm:!p-4'
        data-testid='adding-synthesis-shell'
        surface='playField'
        variant='soft'
      >
        <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.18),transparent_30%),radial-gradient(circle_at_100%_20%,rgba(129,140,248,0.18),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(45,212,191,0.16),transparent_36%)]' />

        <AddingSynthesisUpcomingNotes upcomingNotes={upcomingNotes} />

        <div className='relative h-[320px] min-w-0 overflow-hidden min-[360px]:h-[360px] sm:h-[420px]'>
          <AddingSynthesisLaneRails t={t} />

          <div className='pointer-events-none absolute left-4 right-4 bottom-[110px] border-t-2 border-dashed border-amber-300/80' />

          {currentNote ? (
            <AddingSynthesisCurrentNoteCard
              currentNote={currentNote}
              currentStage={currentStage}
              noteScale={noteScale}
              noteTop={noteTop}
              t={t}
            />
          ) : null}

          {currentNote ? (
            <AddingSynthesisLaneChoices
              currentNote={currentNote}
              feedback={feedback}
              isCoarsePointer={isCoarsePointer}
              onChoose={onChoose}
              t={t}
            />
          ) : null}
        </div>
      </KangurGlassPanel>
    </KangurGlassPanel>
  );
}

function AddingSynthesisPlayingSidebar({
  accuracy,
  currentIndex,
  currentNote,
  currentStage,
  feedback,
  inSessionExitLabel,
  isCoarsePointer,
  notesLength,
  onFinish,
  t,
  translations,
}: {
  accuracy: number;
  currentIndex: number;
  currentNote: AddingSynthesisState['currentNote'];
  currentStage: AddingSynthesisStage;
  feedback: AddingSynthesisState['feedback'];
  inSessionExitLabel: string;
  isCoarsePointer: boolean;
  notesLength: number;
  onFinish: (() => void) | undefined;
  t: AddingSynthesisTranslate;
  translations: AddingSynthesisState['translations'];
}): React.JSX.Element {
  const hintPanel = resolveAddingSynthesisHintPanel({
    currentNote,
    currentStage,
    feedback,
    isCoarsePointer,
    t,
    translations,
  });

  return (
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurSummaryPanel accent={currentStage.accent} padding='lg' title={currentStage.title}>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
          <KangurStatusChip accent='slate'>
            {t(
              'addingSynthesis.playing.accuracy',
              'Dokładność {accuracy}%',
              { accuracy }
            )}
          </KangurStatusChip>
        </div>
        <p className='mt-3 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
          {currentStage.description}
        </p>
        <p className='mt-3 text-sm font-medium [color:var(--kangur-page-text)]'>
          {currentStage.coachingTip}
        </p>
      </KangurSummaryPanel>

      <KangurSummaryPanel
        accent={hintPanel.accent}
        aria-atomic='true'
        aria-live='polite'
        description={hintPanel.description}
        padding='lg'
        role='status'
        title={hintPanel.title}
        tone={hintPanel.tone}
      >
        {hintPanel.body ? (
          <p className='mt-2 text-xs leading-6 [color:var(--kangur-page-muted-text)]'>
            {hintPanel.body}
          </p>
        ) : null}
      </KangurSummaryPanel>

      <KangurSummaryPanel
        accent='slate'
        label={t('addingSynthesis.playing.sessionProgress', 'Postęp sesji')}
        padding='lg'
      >
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-sm font-bold [color:var(--kangur-page-text)]'>
              {currentIndex + 1}/{notesLength}
            </span>
          </div>
          <KangurProgressBar
            accent={currentStage.accent}
            data-testid='adding-synthesis-session-progress-bar'
            size='md'
            value={((currentIndex + (feedback ? 1 : 0)) / Math.max(1, notesLength)) * 100}
          />
        </div>

        <KangurButton className='mt-4' onClick={onFinish} size='sm' type='button' variant='ghost'>
          {inSessionExitLabel}
        </KangurButton>
      </KangurSummaryPanel>
    </div>
  );
}

function AddingSynthesisPlayingView({
  accuracy,
  currentIndex,
  currentNote,
  currentStage,
  feedback,
  inSessionExitLabel,
  isCoarsePointer,
  noteScale,
  noteTop,
  notes,
  onChoose,
  onFinish,
  perfectHits,
  score,
  streak,
  t,
  upcomingNotes,
  translations,
}: {
  accuracy: number;
  currentIndex: number;
  currentNote: AddingSynthesisState['currentNote'];
  currentStage: AddingSynthesisStage;
  feedback: AddingSynthesisState['feedback'];
  inSessionExitLabel: string;
  isCoarsePointer: boolean;
  noteScale: number;
  noteTop: number;
  notes: AddingSynthesisState['notes'];
  onChoose: (laneIndex: number) => void;
  onFinish: (() => void) | undefined;
  perfectHits: number;
  score: number;
  streak: number;
  t: AddingSynthesisTranslate;
  upcomingNotes: NonNullable<AddingSynthesisState['currentNote']>[];
  translations: AddingSynthesisState['translations'];
}): React.JSX.Element {
  return (
    <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <AddingSynthesisPlayingHud
        currentIndex={currentIndex}
        currentStage={currentStage}
        notesLength={notes.length}
        perfectHits={perfectHits}
        score={score}
        streak={streak}
        t={t}
      />

      <div className='grid kangur-panel-gap lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]'>
        <AddingSynthesisPlayingBoard
          currentNote={currentNote}
          currentStage={currentStage}
          feedback={feedback}
          isCoarsePointer={isCoarsePointer}
          noteScale={noteScale}
          noteTop={noteTop}
          onChoose={onChoose}
          upcomingNotes={upcomingNotes}
          t={t}
        />
        <AddingSynthesisPlayingSidebar
          accuracy={accuracy}
          currentIndex={currentIndex}
          currentNote={currentNote}
          currentStage={currentStage}
          feedback={feedback}
          inSessionExitLabel={inSessionExitLabel}
          isCoarsePointer={isCoarsePointer}
          notesLength={notes.length}
          onFinish={onFinish}
          t={t}
          translations={translations}
        />
      </div>
    </div>
  );
}

export default function AddingSynthesisGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const state = useAddingSynthesisGameState();
  const {
    currentIndex,
    currentNote,
    feedback,
    isCoarsePointer,
    noteElapsedMs,
    notes,
    perfectHits,
    phase,
    resolveChoice,
    score,
    startSession,
    streak,
    summary,
    translations,
  } = state;

  const t: AddingSynthesisTranslate = (key, fallback, values) =>
    translateKangurMiniGameWithFallback(translations, key, fallback, values);

  const { currentStage, localizedStages } = resolveAddingSynthesisCurrentStage({
    currentNote,
    translations,
  });
  const accuracy = resolveAddingSynthesisAccuracy({
    currentIndex,
    feedback,
    score,
  });
  const noteProgress = Math.min(noteElapsedMs / ADDING_SYNTHESIS_NOTE_DURATION_MS, 1);
  const noteTop = 24 + noteProgress * 236;
  const noteScale = 0.95 + Math.min(noteProgress, 1) * 0.07;
  const laneCount = LANE_STYLES.length;
  const introNoteCount = localizedStages.reduce((sum, stage) => sum + stage.noteCount, 0);
  const upcomingNotes = currentNote ? notes.slice(currentIndex + 1, currentIndex + 4) : [];
  const { exitLabel, inSessionExitLabel } = resolveAddingSynthesisExitLabels({
    finishLabel,
    t,
  });
  const viewKind = resolveAddingSynthesisViewKind({
    phase,
    summary,
  });

  useEffect(() => {
    if (phase !== 'playing' || !currentNote || feedback) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      const laneIndex = ['1', '2', '3', '4'].indexOf(event.key);
      if (laneIndex === -1) {
        return;
      }

      event.preventDefault();
      resolveChoice(laneIndex);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentNote, feedback, phase, resolveChoice]);

  if (viewKind === 'intro') {
    return (
      <AddingSynthesisIntroView
        exitLabel={exitLabel}
        introNoteCount={introNoteCount}
        laneCount={laneCount}
        localizedStages={localizedStages}
        onFinish={onFinish}
        startSession={startSession}
        t={t}
      />
    );
  }

  if (viewKind === 'summary' && summary) {
    return (
      <AddingSynthesisSummaryView
        exitLabel={exitLabel}
        onFinish={onFinish}
        startSession={startSession}
        summary={summary}
        t={t}
      />
    );
  }

  return (
    <AddingSynthesisPlayingView
      accuracy={accuracy}
      currentIndex={currentIndex}
      currentNote={currentNote}
      currentStage={currentStage}
      feedback={feedback}
      inSessionExitLabel={inSessionExitLabel}
      isCoarsePointer={isCoarsePointer}
      noteScale={noteScale}
      noteTop={noteTop}
      notes={notes}
      onChoose={resolveChoice}
      onFinish={onFinish}
      perfectHits={perfectHits}
      score={score}
      streak={streak}
      t={t}
      upcomingNotes={upcomingNotes}
      translations={translations}
    />
  );
}
