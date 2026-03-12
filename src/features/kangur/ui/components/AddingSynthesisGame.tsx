'use client';

import { Gauge, Music2, RefreshCw, Sparkles, Target, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import {
  KangurButton,
  KangurGlassPanel,
  KangurIconBadge,
  KangurInfoCard,
  KangurMetricCard,
  KangurProgressBar,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { type KangurAccent } from '@/features/kangur/ui/design/tokens';
import {
  ADDING_SYNTHESIS_FEEDBACK_PAUSE_MS,
  ADDING_SYNTHESIS_HIT_LINE_RATIO,
  ADDING_SYNTHESIS_NOTE_DURATION_MS,
  ADDING_SYNTHESIS_STAGES,
  createAddingSynthesisSequence,
  getAddingSynthesisStage,
  getAddingSynthesisTimingGrade,
  type AddingSynthesisNote,
  type AddingSynthesisTimingGrade,
} from '@/features/kangur/ui/services/adding-synthesis';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type AddingSynthesisGameProps = {
  onFinish: () => void;
};

type GamePhase = 'intro' | 'playing' | 'summary';
type FeedbackKind = AddingSynthesisTimingGrade | 'wrong' | 'miss';

type FeedbackState = {
  kind: FeedbackKind;
  title: string;
  description: string;
  hint: string;
  correctLaneIndex: number;
  chosenLaneIndex: number | null;
};

type GameSummary = {
  accuracy: number;
  score: number;
  totalNotes: number;
  perfectHits: number;
  bestStreak: number;
  xpEarned: number;
  breakdown: KangurRewardBreakdownEntry[];
};

const LANE_STYLES = [
  {
    accent: 'amber',
    rail: 'border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-amber-700',
  },
  {
    accent: 'sky',
    rail: 'border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-sky-700',
  },
  {
    accent: 'violet',
    rail: 'border-violet-200/80 bg-[linear-gradient(180deg,rgba(245,243,255,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-violet-700',
  },
  {
    accent: 'rose',
    rail: 'border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-rose-700',
  },
] as const satisfies ReadonlyArray<{
  accent: KangurAccent;
  rail: string;
  label: string;
}>;

const getFeedbackAccent = (kind: FeedbackKind): 'emerald' | 'amber' | 'rose' => {
  if (kind === 'wrong' || kind === 'miss') {
    return 'rose';
  }

  return kind === 'perfect' ? 'emerald' : 'amber';
};

const getFeedbackCopy = (
  kind: FeedbackKind,
  note: AddingSynthesisNote,
  chosenValue?: number | null
) => {
  if (kind === 'perfect') {
    return {
      title: 'Idealne trafienie',
      description: `${note.left} + ${note.right} = ${note.answer}. Uderzyłeś dokładnie przy linii.`,
    };
  }

  if (kind === 'great') {
    return {
      title: 'Super timing',
      description: `${note.left} + ${note.right} = ${note.answer}. Dobra odpowiedź i dobry rytm.`,
    };
  }

  if (kind === 'good') {
    return {
      title: 'Dobra odpowiedź',
      description: `${note.left} + ${note.right} = ${note.answer}. Następnym razem spróbuj trafić bliżej linii.`,
    };
  }

  if (kind === 'wrong') {
    return {
      title: 'To nie ten tor',
      description: `${note.left} + ${note.right} daje ${note.answer}, nie ${chosenValue ?? 'ten wynik'}.`,
    };
  }

  return {
    title: 'Nuta minęła linię',
    description: `Poprawny wynik to ${note.answer}. Złap kolejną nutę szybciej.`,
  };
};

export default function AddingSynthesisGame({
  onFinish,
}: AddingSynthesisGameProps): React.JSX.Element {
  const [phase, setPhase] = useState<GamePhase>('intro');
  const [notes, setNotes] = useState<AddingSynthesisNote[]>(() => createAddingSynthesisSequence());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [noteElapsedMs, setNoteElapsedMs] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [perfectHits, setPerfectHits] = useState(0);
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const handleFinishSession = (): void => {
    onFinish();
  };

  const noteStartedAtRef = useRef<number | null>(null);
  const noteIntervalRef = useRef<number | null>(null);
  const noteDeadlineRef = useRef<number | null>(null);
  const noteAdvanceRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef(Date.now());

  const currentNote = phase === 'playing' ? (notes[currentIndex] ?? null) : null;
  const currentStage = currentNote
    ? getAddingSynthesisStage(currentNote.stageId)
    : ADDING_SYNTHESIS_STAGES[0];
  const accuracy =
    currentIndex > 0 || feedback
      ? Math.round((score / Math.max(1, currentIndex + (feedback ? 1 : 0))) * 100)
      : 0;
  const noteProgress = Math.min(noteElapsedMs / ADDING_SYNTHESIS_NOTE_DURATION_MS, 1);
  const noteTop = 24 + noteProgress * 236;
  const noteScale = 0.95 + Math.min(noteProgress, 1) * 0.07;
  const upcomingNotes = currentNote ? notes.slice(currentIndex + 1, currentIndex + 4) : [];

  const stopCurrentNoteTimers = (): void => {
    if (noteIntervalRef.current !== null) {
      window.clearInterval(noteIntervalRef.current);
      noteIntervalRef.current = null;
    }

    if (noteDeadlineRef.current !== null) {
      window.clearTimeout(noteDeadlineRef.current);
      noteDeadlineRef.current = null;
    }
  };

  const clearAllTimers = (): void => {
    stopCurrentNoteTimers();

    if (noteAdvanceRef.current !== null) {
      window.clearTimeout(noteAdvanceRef.current);
      noteAdvanceRef.current = null;
    }
  };

  const resetSessionState = (nextNotes: AddingSynthesisNote[]): void => {
    clearAllTimers();
    noteStartedAtRef.current = null;
    setNotes(nextNotes);
    setCurrentIndex(0);
    setNoteElapsedMs(0);
    setFeedback(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setPerfectHits(0);
    setSummary(null);
    sessionStartedAtRef.current = Date.now();
  };

  const startSession = (): void => {
    const nextNotes = createAddingSynthesisSequence();
    resetSessionState(nextNotes);
    setPhase('playing');
  };

  const finishSession = (
    finalScore: number,
    finalPerfectHits: number,
    finalBestStreak: number
  ): void => {
    const progress = loadProgress();
    const reward = createLessonPracticeReward(progress, 'adding', finalScore, notes.length, 65);
    addXp(reward.xp, reward.progressUpdates);
    void persistKangurSessionScore({
      operation: 'addition',
      score: finalScore,
      totalQuestions: notes.length,
      correctAnswers: finalScore,
      timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
      xpEarned: reward.xp,
    });

    setSummary({
      accuracy: Math.round((finalScore / Math.max(1, notes.length)) * 100),
      score: finalScore,
      totalNotes: notes.length,
      perfectHits: finalPerfectHits,
      bestStreak: finalBestStreak,
      xpEarned: reward.xp,
      breakdown: reward.breakdown ?? [],
    });
    setPhase('summary');
  };

  const queueAdvance = (
    nextScore: number,
    nextPerfectHits: number,
    nextBestStreak: number
  ): void => {
    noteAdvanceRef.current = window.setTimeout(() => {
      setFeedback(null);
      setNoteElapsedMs(0);
      noteStartedAtRef.current = null;

      if (currentIndex + 1 >= notes.length) {
        finishSession(nextScore, nextPerfectHits, nextBestStreak);
        return;
      }

      setCurrentIndex((previousIndex) => previousIndex + 1);
    }, ADDING_SYNTHESIS_FEEDBACK_PAUSE_MS);
  };

  const resolveChoice = (laneIndex: number | null): void => {
    if (!currentNote || feedback) {
      return;
    }

    stopCurrentNoteTimers();

    const elapsedMs = noteStartedAtRef.current
      ? Date.now() - noteStartedAtRef.current
      : noteElapsedMs;
    const elapsedProgress = Math.min(elapsedMs / ADDING_SYNTHESIS_NOTE_DURATION_MS, 1);
    const correctLaneIndex = currentNote.choices.indexOf(currentNote.answer);
    const chosenLaneIndex = laneIndex;

    if (laneIndex !== null && laneIndex === correctLaneIndex) {
      const timingGrade = getAddingSynthesisTimingGrade(elapsedProgress);
      const nextScore = score + 1;
      const nextStreak = streak + 1;
      const nextBestStreak = Math.max(bestStreak, nextStreak);
      const nextPerfectHits = perfectHits + (timingGrade === 'perfect' ? 1 : 0);
      const copy = getFeedbackCopy(timingGrade, currentNote, currentNote.answer);

      setScore(nextScore);
      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      setPerfectHits(nextPerfectHits);
      setFeedback({
        kind: timingGrade,
        title: copy.title,
        description: copy.description,
        hint: currentNote.focus,
        correctLaneIndex,
        chosenLaneIndex,
      });
      queueAdvance(nextScore, nextPerfectHits, nextBestStreak);
      return;
    }

    const copy = getFeedbackCopy(
      laneIndex === null ? 'miss' : 'wrong',
      currentNote,
      laneIndex === null ? null : currentNote.choices[laneIndex]
    );

    setStreak(0);
    setFeedback({
      kind: laneIndex === null ? 'miss' : 'wrong',
      title: copy.title,
      description: copy.description,
      hint: currentNote.hint,
      correctLaneIndex,
      chosenLaneIndex,
    });
    queueAdvance(score, perfectHits, bestStreak);
  };

  useEffect(() => {
    if (phase !== 'playing' || !currentNote || feedback) {
      return undefined;
    }

    noteStartedAtRef.current = Date.now();
    setNoteElapsedMs(0);

    noteIntervalRef.current = window.setInterval(() => {
      if (!noteStartedAtRef.current) {
        return;
      }

      setNoteElapsedMs(
        Math.min(Date.now() - noteStartedAtRef.current, ADDING_SYNTHESIS_NOTE_DURATION_MS)
      );
    }, 40);

    noteDeadlineRef.current = window.setTimeout(() => {
      resolveChoice(null);
    }, ADDING_SYNTHESIS_NOTE_DURATION_MS);

    return () => {
      stopCurrentNoteTimers();
    };
  }, [currentIndex, currentNote, feedback, phase]);

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
  }, [currentNote, feedback, phase, noteElapsedMs, perfectHits, score, streak, bestStreak]);

  useEffect(() => () => clearAllTimers(), []);

  if (phase === 'intro') {
    return (
      <div className='flex w-full flex-col gap-4'>
        <KangurGlassPanel
          className='overflow-hidden'
          data-testid='adding-synthesis-intro-shell'
          padding='xl'
          surface='warmGlow'
          variant='elevated'
        >
          <div className='flex flex-col gap-5'>
            <div className='flex flex-wrap items-center gap-2'>
              <KangurStatusChip accent='amber'>Nowa gra</KangurStatusChip>
              <KangurStatusChip accent='violet'>Synthesia-style</KangurStatusChip>
            </div>

            <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
              <div className='max-w-2xl'>
                <h2 className='text-3xl font-extrabold tracking-[-0.03em] [color:var(--kangur-page-text)] sm:text-4xl'>
                  Synteza dodawania
                </h2>
                <p className='mt-3 text-base leading-7 [color:var(--kangur-page-muted-text)]'>
                  Licz w głowie, patrz jak działanie spada do linii i uderz w tor z poprawnym
                  wynikiem. Zaczynasz od prostych sum, potem przechodzisz przez 10 i kończysz na
                  dwóch cyfrach.
                </p>
              </div>
              <KangurInfoCard accent='violet' className='rounded-[28px]' padding='md' tone='accent'>
                <div className='flex items-center gap-3'>
                  <KangurIconBadge
                    accent='violet'
                    data-testid='adding-synthesis-intro-badge'
                    size='md'
                  >
                    <Music2 className='h-6 w-6' />
                  </KangurIconBadge>
                  <div>
                    <KangurStatusChip
                      accent='violet'
                      className='text-[11px] uppercase tracking-[0.18em]'
                      size='sm'
                    >
                      Rytm gry
                    </KangurStatusChip>
                    <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                      12 nut • 4 tory • szybka informacja zwrotna
                    </p>
                  </div>
                </div>
              </KangurInfoCard>
            </div>

            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
              {ADDING_SYNTHESIS_STAGES.map((stage) => (
                <KangurInfoCard
                  key={stage.id}
                  accent={stage.accent}
                  className='h-full'
                  padding='lg'
                  tone='accent'
                >
                  <div className='flex items-start gap-3'>
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

            <KangurSummaryPanel
              accent='slate'
              label='Jak grać'
              padding='lg'
            >
              <div className='grid gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3'>
                <div className='flex items-center gap-3'>
                  <Target className='h-5 w-5 text-amber-500' />
                  <p className='text-sm [color:var(--kangur-page-muted-text)]'>
                    Klikaj odpowiedni tor lub naciskaj 1, 2, 3, 4.
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <Gauge className='h-5 w-5 text-sky-500' />
                  <p className='text-sm [color:var(--kangur-page-muted-text)]'>
                    Im bliżej linii trafisz, tym lepszy rytm.
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <Zap className='h-5 w-5 text-violet-500' />
                  <p className='text-sm [color:var(--kangur-page-muted-text)]'>
                    Po każdym błędzie dostajesz szybką podpowiedź.
                  </p>
                </div>
              </div>
            </KangurSummaryPanel>

            <div className='flex flex-col gap-3 sm:flex-row'>
              <KangurButton
                type='button'
                size='lg'
                variant='primary'
                onClick={startSession}
                data-testid='adding-synthesis-start'
              >
                <Sparkles className='h-4 w-4' />
                Start syntezę
              </KangurButton>
              <KangurButton
                type='button'
                size='lg'
                variant='surface'
                onClick={handleFinishSession}
              >
                Wróć do Dodawania
              </KangurButton>
            </div>
          </div>
        </KangurGlassPanel>
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    return (
      <div className='flex w-full flex-col gap-4'>
        <KangurGlassPanel
          data-testid='adding-synthesis-summary'
          padding='xl'
          surface='successGlow'
          variant='elevated'
        >
          <div className='flex flex-col gap-5'>
            <div className='flex flex-wrap items-center gap-2'>
              <KangurStatusChip accent='emerald'>Sesja zakończona</KangurStatusChip>
              <KangurStatusChip accent='amber'>+{summary.xpEarned} XP</KangurStatusChip>
            </div>
            <KangurRewardBreakdownChips
              accent='slate'
              breakdown={summary.breakdown}
              dataTestId='adding-synthesis-summary-breakdown'
              itemDataTestIdPrefix='adding-synthesis-summary-breakdown'
            />

            <div className='flex flex-col gap-2'>
              <h2 className='text-3xl font-extrabold tracking-[-0.03em] [color:var(--kangur-page-text)] sm:text-4xl'>
                Wynik {summary.score}/{summary.totalNotes}
              </h2>
              <p className='text-base leading-7 [color:var(--kangur-page-muted-text)]'>
                {summary.accuracy >= 85
                  ? 'Bardzo mocna sesja. Dodawanie trzyma rytm i tempo.'
                  : summary.accuracy >= 60
                    ? 'Dobry wynik. Jeszcze kilka rund i te sumy będą wchodziły automatycznie.'
                    : 'Masz już bazę. Powtórz sesję i skup się na podpowiedziach przy trudniejszych nutach.'}
              </p>
            </div>

            <div className='grid gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4'>
              <KangurMetricCard accent='emerald' label='Skuteczność' value={`${summary.accuracy}%`} />
              <KangurMetricCard
                accent='violet'
                label='Idealne trafienia'
                value={summary.perfectHits}
              />
              <KangurMetricCard accent='amber' label='Najlepsza seria' value={summary.bestStreak} />
              <KangurMetricCard accent='sky' label='Runda' value={summary.totalNotes} />
            </div>

            <div className='flex flex-col gap-3 sm:flex-row'>
              <KangurButton type='button' size='lg' variant='primary' onClick={startSession}>
                <RefreshCw className='h-4 w-4' />
                Zagraj jeszcze raz
              </KangurButton>
              <KangurButton
                type='button'
                size='lg'
                variant='surface'
                onClick={handleFinishSession}
              >
                Wróć do Dodawania
              </KangurButton>
            </div>
          </div>
        </KangurGlassPanel>
      </div>
    );
  }

  return (
    <div className='flex w-full flex-col gap-4'>
      <KangurGlassPanel
        data-testid='adding-synthesis-hud'
        padding='lg'
        surface='frost'
        variant='soft'
      >
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <KangurStatusChip accent={currentStage.accent}>{currentStage.title}</KangurStatusChip>
            <KangurStatusChip accent='slate'>
              Nuta {currentIndex + 1}/{notes.length}
            </KangurStatusChip>
          </div>

          <div className='grid w-full grid-cols-1 gap-2 min-[360px]:grid-cols-3 lg:w-auto lg:min-w-[320px]'>
            <KangurMetricCard accent='amber' align='center' label='Seria' padding='sm' value={streak} valueClassName='text-xl' />
            <KangurMetricCard accent='violet' align='center' label='Idealne' padding='sm' value={perfectHits} valueClassName='text-xl' />
            <KangurMetricCard accent='sky' align='center' label='Trafione' padding='sm' value={score} valueClassName='text-xl' />
          </div>
        </div>
      </KangurGlassPanel>

      <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]'>
        <KangurGlassPanel
          data-testid='adding-synthesis-board-shell'
          padding='lg'
          surface='playGlow'
          variant='elevated'
        >
          <KangurGlassPanel
            className='relative overflow-hidden rounded-[26px] !p-2.5 min-[360px]:!p-3 sm:rounded-[30px] sm:!p-4'
            data-testid='adding-synthesis-stage-shell'
            surface='playField'
            variant='soft'
          >
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.18),transparent_30%),radial-gradient(circle_at_100%_20%,rgba(129,140,248,0.18),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(45,212,191,0.16),transparent_36%)]' />

            <div className='pointer-events-none absolute left-2 right-2 top-3 flex justify-center gap-1.5 sm:left-4 sm:right-4 sm:top-4 sm:gap-2'>
              {upcomingNotes.map((note, index) => (
                <KangurStatusChip
                  accent='slate'
                  key={note.id}
                  className={cn(
                    'shadow-sm text-[10px] min-[360px]:text-[11px] sm:text-xs',
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

            <div className='relative h-[420px]'>
              <div className='absolute inset-y-0 left-0 right-0 grid grid-cols-4 gap-1.5 sm:gap-3'>
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
                        Tor {laneIndex + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className='pointer-events-none absolute left-4 right-4 bottom-[110px] border-t-2 border-dashed border-amber-300/80' />

              {currentNote ? (
                <div
                  className='pointer-events-none absolute left-1/2 z-20 w-[calc(100%-0.75rem)] max-w-[460px] -translate-x-1/2 transition-transform duration-75 ease-linear min-[360px]:w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)]'
                  style={{
                    top: `${noteTop}px`,
                    transform: `translateX(-50%) scale(${noteScale})`,
                  }}
                  data-testid='adding-synthesis-note'
                >
                  <KangurGlassPanel
                    className='rounded-[24px] !p-3 shadow-[0_22px_60px_-34px_rgba(79,70,229,0.32)] backdrop-blur min-[360px]:!p-4 sm:rounded-[28px]'
                    data-testid='adding-synthesis-note-shell'
                    padding='md'
                    surface='solid'
                    variant='soft'
                  >
                    <div className='flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between'>
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
                        Linia przy {Math.round(ADDING_SYNTHESIS_HIT_LINE_RATIO * 100)}%
                      </KangurStatusChip>
                    </div>
                    <div className='mt-3 text-center'>
                      <p className='text-xs font-semibold uppercase tracking-[0.18em] text-amber-500 min-[360px]:text-sm min-[360px]:tracking-[0.22em]'>
                        Uderz we właściwy tor
                      </p>
                      <p className='mt-2 text-3xl font-extrabold tracking-[-0.04em] [color:var(--kangur-page-text)] min-[360px]:text-4xl sm:text-5xl'>
                        {currentNote.left} + {currentNote.right}
                      </p>
                    </div>
                  </KangurGlassPanel>
                </div>
              ) : null}

              <div className='absolute inset-x-0 bottom-0 grid grid-cols-4 gap-1.5 sm:gap-3'>
                {currentNote?.choices.map((choice, laneIndex) => {
                  const laneStyle = LANE_STYLES[laneIndex] ?? LANE_STYLES[0];
                  const isCorrectLane = feedback?.correctLaneIndex === laneIndex;
                  const isChosenLane = feedback?.chosenLaneIndex === laneIndex;
                  const showErrorState =
                    Boolean(feedback) &&
                    ((feedback?.kind === 'wrong' && isChosenLane && !isCorrectLane) ||
                      (feedback?.kind === 'miss' && isChosenLane));
                  const showSuccessState = Boolean(feedback) && isCorrectLane;
                  const laneAccent = showSuccessState
                    ? 'emerald'
                    : showErrorState
                      ? 'rose'
                      : laneStyle.accent;
                  const laneTextClassName = showSuccessState
                    ? 'text-emerald-700'
                    : showErrorState
                      ? 'text-rose-700'
                      : null;

                  return (
                    <KangurAnswerChoiceCard
                      accent={laneAccent}
                      aria-disabled={feedback ? 'true' : 'false'}
                      aria-label={`Tor ${laneIndex + 1}: ${choice}`}
                      buttonClassName={cn(
                        'min-h-[80px] flex-col justify-center rounded-[18px] px-1.5 py-2.5 text-center min-[360px]:min-h-[88px] min-[360px]:px-2 sm:min-h-[96px] sm:rounded-[24px] sm:py-3',
                        laneTextClassName
                      )}
                      data-testid={`adding-synthesis-lane-${laneIndex}`}
                      emphasis='accent'
                      interactive={!feedback}
                      key={`${currentNote.id}-${choice}`}
                      onClick={() => {
                        if (!feedback) {
                          resolveChoice(laneIndex);
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
                        Wybierz tor
                      </span>
                    </KangurAnswerChoiceCard>
                  );
                })}
              </div>
            </div>
          </KangurGlassPanel>
        </KangurGlassPanel>

        <div className='flex flex-col gap-4'>
          <KangurSummaryPanel accent={currentStage.accent} padding='lg' title={currentStage.title}>
            <div className='flex flex-wrap items-center gap-2'>
              <KangurStatusChip accent='slate'>Dokładność {accuracy}%</KangurStatusChip>
            </div>
            <p className='mt-3 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
              {currentStage.description}
            </p>
            <p className='mt-3 text-sm font-medium [color:var(--kangur-page-text)]'>
              {currentStage.coachingTip}
            </p>
          </KangurSummaryPanel>

          <KangurSummaryPanel
            accent={feedback ? getFeedbackAccent(feedback.kind) : currentStage.accent}
            padding='lg'
            role='status'
            title={feedback ? feedback.title : currentNote ? 'Podpowiedź do tej nuty' : undefined}
            description={feedback ? feedback.description : currentNote ? currentNote.focus : undefined}
            tone={feedback ? 'accent' : 'neutral'}
          >
            {feedback ? (
              <p className='mt-2 text-xs leading-6 [color:var(--kangur-page-muted-text)]'>
                {feedback.hint}
              </p>
            ) : currentNote ? (
              <p className='mt-2 text-xs leading-6 [color:var(--kangur-page-muted-text)]'>
                Jeśli wolisz klawiaturę, naciśnij 1, 2, 3 lub 4.
              </p>
            ) : null}
          </KangurSummaryPanel>

          <KangurSummaryPanel accent='slate' label='Postęp sesji' padding='lg'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-bold [color:var(--kangur-page-text)]'>
                  {currentIndex + 1}/{notes.length}
                </span>
              </div>
              <KangurProgressBar
                accent={currentStage.accent}
                data-testid='adding-synthesis-session-progress-bar'
                size='md'
                value={((currentIndex + (feedback ? 1 : 0)) / Math.max(1, notes.length)) * 100}
              />
            </div>

            <KangurButton
              type='button'
              size='sm'
              variant='ghost'
              className='mt-4'
              onClick={handleFinishSession}
            >
              Zakończ próbę
            </KangurButton>
          </KangurSummaryPanel>
        </div>
      </div>
    </div>
  );
}
