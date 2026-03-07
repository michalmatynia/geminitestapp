'use client';

import { useEffect, useRef, useState } from 'react';
import { Gauge, Music2, RefreshCw, Sparkles, Target, Zap } from 'lucide-react';

import {
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
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
};

const LANE_STYLES = [
  {
    rail: 'border-amber-200/80 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-amber-700',
    button: 'border-amber-200/90 bg-white/95 text-amber-900 hover:bg-amber-50',
    glow: 'shadow-[0_18px_42px_-28px_rgba(245,158,11,0.55)]',
    active: 'border-amber-400 bg-amber-100/90 text-amber-950',
    success: 'border-emerald-400 bg-emerald-100/90 text-emerald-950',
    error: 'border-rose-400 bg-rose-100/90 text-rose-950',
  },
  {
    rail: 'border-sky-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-sky-700',
    button: 'border-sky-200/90 bg-white/95 text-sky-900 hover:bg-sky-50',
    glow: 'shadow-[0_18px_42px_-28px_rgba(14,165,233,0.48)]',
    active: 'border-sky-400 bg-sky-100/90 text-sky-950',
    success: 'border-emerald-400 bg-emerald-100/90 text-emerald-950',
    error: 'border-rose-400 bg-rose-100/90 text-rose-950',
  },
  {
    rail: 'border-violet-200/80 bg-[linear-gradient(180deg,rgba(245,243,255,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-violet-700',
    button: 'border-violet-200/90 bg-white/95 text-violet-900 hover:bg-violet-50',
    glow: 'shadow-[0_18px_42px_-28px_rgba(139,92,246,0.48)]',
    active: 'border-violet-400 bg-violet-100/90 text-violet-950',
    success: 'border-emerald-400 bg-emerald-100/90 text-emerald-950',
    error: 'border-rose-400 bg-rose-100/90 text-rose-950',
  },
  {
    rail: 'border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.98)_0%,rgba(255,255,255,0.92)_100%)]',
    label: 'text-rose-700',
    button: 'border-rose-200/90 bg-white/95 text-rose-900 hover:bg-rose-50',
    glow: 'shadow-[0_18px_42px_-28px_rgba(244,63,94,0.42)]',
    active: 'border-rose-400 bg-rose-100/90 text-rose-950',
    success: 'border-emerald-400 bg-emerald-100/90 text-emerald-950',
    error: 'border-rose-400 bg-rose-100/90 text-rose-950',
  },
] as const;

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
      description: `${note.left} + ${note.right} = ${note.answer}. Uderzyles dokladnie przy linii.`,
    };
  }

  if (kind === 'great') {
    return {
      title: 'Super timing',
      description: `${note.left} + ${note.right} = ${note.answer}. Dobra odpowiedz i dobry rytm.`,
    };
  }

  if (kind === 'good') {
    return {
      title: 'Dobra odpowiedz',
      description: `${note.left} + ${note.right} = ${note.answer}. Nastepnym razem sprobuj trafic blizej linii.`,
    };
  }

  if (kind === 'wrong') {
    return {
      title: 'To nie ten tor',
      description: `${note.left} + ${note.right} daje ${note.answer}, nie ${chosenValue ?? 'ten wynik'}.`,
    };
  }

  return {
    title: 'Nuta minela linie',
    description: `Poprawny wynik to ${note.answer}. Zlap kolejna note szybciej.`,
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

  const noteStartedAtRef = useRef<number | null>(null);
  const noteIntervalRef = useRef<number | null>(null);
  const noteDeadlineRef = useRef<number | null>(null);
  const noteAdvanceRef = useRef<number | null>(null);

  const currentNote = phase === 'playing' ? notes[currentIndex] ?? null : null;
  const currentStage = currentNote ? getAddingSynthesisStage(currentNote.stageId) : ADDING_SYNTHESIS_STAGES[0];
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

    setSummary({
      accuracy: Math.round((finalScore / Math.max(1, notes.length)) * 100),
      score: finalScore,
      totalNotes: notes.length,
      perfectHits: finalPerfectHits,
      bestStreak: finalBestStreak,
      xpEarned: reward.xp,
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

    const elapsedMs = noteStartedAtRef.current ? Date.now() - noteStartedAtRef.current : noteElapsedMs;
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

      setNoteElapsedMs(Math.min(Date.now() - noteStartedAtRef.current, ADDING_SYNTHESIS_NOTE_DURATION_MS));
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
      <div className='flex w-full max-w-[1040px] flex-col gap-4'>
        <KangurPanel
          className='overflow-hidden border-amber-200/70 bg-[radial-gradient(circle_at_top,rgba(254,243,199,0.9),rgba(255,255,255,0.94)_42%,rgba(238,242,255,0.9)_100%)]'
          padding='xl'
          variant='elevated'
        >
          <div className='flex flex-col gap-5'>
            <div className='flex flex-wrap items-center gap-2'>
              <KangurLessonChip accent='amber'>Nowa gra</KangurLessonChip>
              <KangurLessonChip accent='violet'>Synthesia-style</KangurLessonChip>
            </div>

            <div className='flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between'>
              <div className='max-w-2xl'>
                <h2 className='text-3xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-4xl'>
                  Synteza dodawania
                </h2>
                <p className='mt-3 text-base leading-7 text-slate-600'>
                  Licz w glowie, patrz jak dzialanie spada do linii i uderz w tor z poprawnym
                  wynikiem. Zaczynasz od prostych sum, potem przechodzisz przez 10 i konczysz na
                  dwoch cyfrach.
                </p>
              </div>
              <div className='rounded-[28px] border border-white/80 bg-white/88 px-5 py-4 shadow-[0_18px_44px_-34px_rgba(79,70,229,0.26)]'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700'>
                    <Music2 className='h-6 w-6' />
                  </div>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-violet-500'>
                      Rytm gry
                    </p>
                    <p className='text-sm font-semibold text-slate-700'>
                      12 nut • 4 tory • szybka informacja zwrotna
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className='grid gap-3 lg:grid-cols-3'>
              {ADDING_SYNTHESIS_STAGES.map((stage) => (
                <KangurLessonCallout
                  key={stage.id}
                  accent={stage.accent}
                  className='border-white/75 bg-white/84'
                  padding='lg'
                >
                  <div className='flex items-start gap-3'>
                    <div className='text-3xl leading-none'>{stage.icon}</div>
                    <div>
                      <p className='text-sm font-extrabold text-slate-900'>{stage.title}</p>
                      <p className='mt-1 text-sm leading-6 text-slate-600'>{stage.description}</p>
                    </div>
                  </div>
                </KangurLessonCallout>
              ))}
            </div>

            <KangurLessonCallout accent='slate' className='border-white/75 bg-white/88' padding='lg'>
              <div className='grid gap-3 sm:grid-cols-3'>
                <div className='flex items-center gap-3'>
                  <Target className='h-5 w-5 text-amber-500' />
                  <p className='text-sm text-slate-600'>Klikaj odpowiedni tor lub naciskaj 1, 2, 3, 4.</p>
                </div>
                <div className='flex items-center gap-3'>
                  <Gauge className='h-5 w-5 text-sky-500' />
                  <p className='text-sm text-slate-600'>Im blizej linii trafisz, tym lepszy rytm.</p>
                </div>
                <div className='flex items-center gap-3'>
                  <Zap className='h-5 w-5 text-violet-500' />
                  <p className='text-sm text-slate-600'>Po kazdym bledzie dostajesz szybka podpowiedz.</p>
                </div>
              </div>
            </KangurLessonCallout>

            <div className='flex flex-col gap-3 sm:flex-row'>
              <KangurButton
                type='button'
                size='lg'
                variant='primary'
                onClick={startSession}
                data-testid='adding-synthesis-start'
              >
                <Sparkles className='h-4 w-4' />
                Start synteze
              </KangurButton>
              <KangurButton type='button' size='lg' variant='secondary' onClick={onFinish}>
                Wroc do Dodawania
              </KangurButton>
            </div>
          </div>
        </KangurPanel>
      </div>
    );
  }

  if (phase === 'summary' && summary) {
    return (
      <div className='flex w-full max-w-[1040px] flex-col gap-4'>
        <KangurPanel
          className='border-emerald-200/70 bg-[radial-gradient(circle_at_top,rgba(209,250,229,0.85),rgba(255,255,255,0.95)_44%,rgba(238,242,255,0.92)_100%)]'
          padding='xl'
          variant='elevated'
          data-testid='adding-synthesis-summary'
        >
          <div className='flex flex-col gap-5'>
            <div className='flex flex-wrap items-center gap-2'>
              <KangurLessonChip accent='emerald'>Sesja zakonczona</KangurLessonChip>
              <KangurLessonChip accent='amber'>+{summary.xpEarned} XP</KangurLessonChip>
            </div>

            <div className='flex flex-col gap-2'>
              <h2 className='text-3xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-4xl'>
                Wynik {summary.score}/{summary.totalNotes}
              </h2>
              <p className='text-base leading-7 text-slate-600'>
                {summary.accuracy >= 85
                  ? 'Bardzo mocna sesja. Dodawanie trzyma rytm i tempo.'
                  : summary.accuracy >= 60
                    ? 'Dobry wynik. Jeszcze kilka rund i te sumy beda wchodzily automatycznie.'
                    : 'Masz juz baze. Powtorz sesje i skup sie na podpowiedziach przy trudniejszych nutach.'}
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-4'>
              <KangurLessonCallout accent='emerald' padding='md'>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/70'>
                  Skutecznosc
                </p>
                <p className='mt-2 text-3xl font-extrabold text-emerald-950'>{summary.accuracy}%</p>
              </KangurLessonCallout>
              <KangurLessonCallout accent='violet' padding='md'>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-violet-700/70'>
                  Idealne trafienia
                </p>
                <p className='mt-2 text-3xl font-extrabold text-violet-950'>{summary.perfectHits}</p>
              </KangurLessonCallout>
              <KangurLessonCallout accent='amber' padding='md'>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-amber-700/70'>
                  Najlepsza seria
                </p>
                <p className='mt-2 text-3xl font-extrabold text-amber-950'>{summary.bestStreak}</p>
              </KangurLessonCallout>
              <KangurLessonCallout accent='sky' padding='md'>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-sky-700/70'>
                  Runda
                </p>
                <p className='mt-2 text-3xl font-extrabold text-sky-950'>{summary.totalNotes}</p>
              </KangurLessonCallout>
            </div>

            <div className='flex flex-col gap-3 sm:flex-row'>
              <KangurButton type='button' size='lg' variant='primary' onClick={startSession}>
                <RefreshCw className='h-4 w-4' />
                Zagraj jeszcze raz
              </KangurButton>
              <KangurButton type='button' size='lg' variant='secondary' onClick={onFinish}>
                Wroc do Dodawania
              </KangurButton>
            </div>
          </div>
        </KangurPanel>
      </div>
    );
  }

  return (
    <div className='flex w-full max-w-[1040px] flex-col gap-4'>
      <KangurPanel className='border-white/75 bg-white/88' padding='lg' variant='soft'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <KangurLessonChip accent={currentStage.accent}>{currentStage.title}</KangurLessonChip>
            <KangurLessonChip accent='slate'>
              Nuta {currentIndex + 1}/{notes.length}
            </KangurLessonChip>
          </div>

          <div className='grid grid-cols-3 gap-2 sm:min-w-[320px]'>
            <div className='rounded-[20px] border border-amber-200/80 bg-amber-50/85 px-3 py-2 text-center'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600/75'>
                Seria
              </p>
              <p className='mt-1 text-xl font-extrabold text-amber-950'>{streak}</p>
            </div>
            <div className='rounded-[20px] border border-violet-200/80 bg-violet-50/85 px-3 py-2 text-center'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600/75'>
                Idealne
              </p>
              <p className='mt-1 text-xl font-extrabold text-violet-950'>{perfectHits}</p>
            </div>
            <div className='rounded-[20px] border border-sky-200/80 bg-sky-50/85 px-3 py-2 text-center'>
              <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600/75'>
                Trafione
              </p>
              <p className='mt-1 text-xl font-extrabold text-sky-950'>{score}</p>
            </div>
          </div>
        </div>
      </KangurPanel>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]'>
        <KangurPanel
          className='border-indigo-200/70 bg-[radial-gradient(circle_at_top,rgba(255,251,235,0.85),rgba(255,255,255,0.97)_42%,rgba(238,242,255,0.92)_100%)]'
          padding='lg'
          variant='elevated'
        >
          <div className='relative overflow-hidden rounded-[30px] border border-white/80 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(244,247,255,0.94)_58%,rgba(255,247,237,0.86)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-4'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.18),transparent_30%),radial-gradient(circle_at_100%_20%,rgba(129,140,248,0.18),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(45,212,191,0.16),transparent_36%)]' />

            <div className='pointer-events-none absolute left-4 right-4 top-4 flex justify-center gap-2'>
              {upcomingNotes.map((note, index) => (
                <div
                  key={note.id}
                  className='rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm'
                  style={{ transform: `translateY(${index * 10}px) scale(${1 - index * 0.04})` }}
                >
                  {note.left} + {note.right}
                </div>
              ))}
            </div>

            <div className='relative h-[420px]'>
              <div className='absolute inset-y-0 left-0 right-0 grid grid-cols-4 gap-3'>
                {LANE_STYLES.map((laneStyle, laneIndex) => (
                  <div
                    key={`lane-rail-${laneIndex}`}
                    className={cn(
                      'relative rounded-[26px] border px-2 pt-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
                      laneStyle.rail
                    )}
                  >
                    <div className='absolute left-0 right-0 top-3 text-center'>
                      <span className={cn('text-[11px] font-semibold uppercase tracking-[0.24em]', laneStyle.label)}>
                        Tor {laneIndex + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className='pointer-events-none absolute left-4 right-4 bottom-[110px] border-t-2 border-dashed border-amber-300/80' />

              {currentNote ? (
                <div
                  className='pointer-events-none absolute left-1/2 z-20 w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 transition-transform duration-75 ease-linear'
                  style={{
                    top: `${noteTop}px`,
                    transform: `translateX(-50%) scale(${noteScale})`,
                  }}
                  data-testid='adding-synthesis-note'
                >
                  <div className='rounded-[28px] border border-white/85 bg-white/94 px-5 py-4 shadow-[0_22px_60px_-34px_rgba(79,70,229,0.32)] backdrop-blur'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700'>
                        {currentStage.icon} {currentStage.title}
                      </span>
                      <span className='text-xs font-semibold text-slate-400'>
                        Linia przy {Math.round(ADDING_SYNTHESIS_HIT_LINE_RATIO * 100)}%
                      </span>
                    </div>
                    <div className='mt-3 text-center'>
                      <p className='text-sm font-semibold uppercase tracking-[0.22em] text-amber-500'>
                        Uderz we wlasciwy tor
                      </p>
                      <p className='mt-2 text-4xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-5xl'>
                        {currentNote.left} + {currentNote.right}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className='absolute inset-x-0 bottom-0 grid grid-cols-4 gap-3'>
                {currentNote?.choices.map((choice, laneIndex) => {
                  const laneStyle = LANE_STYLES[laneIndex] ?? LANE_STYLES[0];
                  const isCorrectLane = feedback?.correctLaneIndex === laneIndex;
                  const isChosenLane = feedback?.chosenLaneIndex === laneIndex;
                  const showErrorState =
                    Boolean(feedback) &&
                    ((feedback?.kind === 'wrong' && isChosenLane && !isCorrectLane) ||
                      (feedback?.kind === 'miss' && isChosenLane));
                  const showSuccessState = Boolean(feedback) && isCorrectLane;

                  return (
                    <button
                      key={`${currentNote.id}-${choice}`}
                      type='button'
                      onClick={() => resolveChoice(laneIndex)}
                      disabled={Boolean(feedback)}
                      className={cn(
                        'group flex min-h-[96px] cursor-pointer flex-col items-center justify-center rounded-[24px] border px-2 py-3 text-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-100',
                        laneStyle.button,
                        laneStyle.glow,
                        !feedback && 'hover:-translate-y-[2px] active:translate-y-[1px]',
                        isChosenLane && !feedback && 'scale-[0.985]',
                        showSuccessState && laneStyle.success,
                        showErrorState && laneStyle.error,
                        feedback && !showSuccessState && !showErrorState && isChosenLane && laneStyle.active
                      )}
                      aria-label={`Tor ${laneIndex + 1}: ${choice}`}
                      data-testid={`adding-synthesis-lane-${laneIndex}`}
                    >
                      <span className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400'>
                        {laneIndex + 1}
                      </span>
                      <span className='mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl'>
                        {choice}
                      </span>
                      <span className='mt-1 text-[11px] font-medium text-slate-400'>
                        Wybierz tor
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </KangurPanel>

        <div className='flex flex-col gap-4'>
          <KangurPanel className='border-white/80 bg-white/88' padding='lg' variant='soft'>
            <div className='flex flex-wrap items-center gap-2'>
              <KangurLessonChip accent={currentStage.accent}>{currentStage.title}</KangurLessonChip>
              <KangurLessonChip accent='slate'>Dokladnosc {accuracy}%</KangurLessonChip>
            </div>
            <p className='mt-3 text-sm leading-6 text-slate-600'>{currentStage.description}</p>
            <p className='mt-3 text-sm font-medium text-slate-700'>{currentStage.coachingTip}</p>
          </KangurPanel>

          <KangurLessonCallout
            accent={feedback ? getFeedbackAccent(feedback.kind) : currentStage.accent}
            className='border-white/75 bg-white/88'
            padding='lg'
            role='status'
          >
            {feedback ? (
              <>
                <p className='text-sm font-extrabold text-slate-900'>{feedback.title}</p>
                <p className='mt-2 text-sm leading-6 text-slate-700'>{feedback.description}</p>
                <p className='mt-2 text-xs leading-6 text-slate-500'>{feedback.hint}</p>
              </>
            ) : currentNote ? (
              <>
                <p className='text-sm font-extrabold text-slate-900'>Podpowiedz do tej nuty</p>
                <p className='mt-2 text-sm leading-6 text-slate-700'>{currentNote.focus}</p>
                <p className='mt-2 text-xs leading-6 text-slate-500'>
                  Jesli wolisz klawiature, nacisnij 1, 2, 3 lub 4.
                </p>
              </>
            ) : null}
          </KangurLessonCallout>

          <KangurPanel className='border-white/80 bg-white/88' padding='lg' variant='soft'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-semibold text-slate-500'>Postep sesji</span>
                <span className='text-sm font-bold text-slate-700'>
                  {currentIndex + 1}/{notes.length}
                </span>
              </div>
              <div className='h-3 overflow-hidden rounded-full bg-slate-100'>
                <div
                  className='h-full rounded-full bg-[linear-gradient(90deg,#f59e0b_0%,#fb7185_45%,#6366f1_100%)] transition-all duration-500'
                  style={{ width: `${((currentIndex + (feedback ? 1 : 0)) / Math.max(1, notes.length)) * 100}%` }}
                />
              </div>
            </div>

            <KangurButton type='button' size='sm' variant='ghost' className='mt-4' onClick={onFinish}>
              Zakoncz probe
            </KangurButton>
          </KangurPanel>
        </div>
      </div>
    </div>
  );
}
