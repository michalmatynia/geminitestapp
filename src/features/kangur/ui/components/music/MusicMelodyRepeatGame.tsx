'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  KangurPracticeGameProgress,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  KangurButton,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurMobileBreakpoint } from '@/features/kangur/ui/hooks/useKangurMobileBreakpoint';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFinishActionProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import KangurVisualCueContent, {
  KangurVisualCueDots,
} from '@/features/kangur/ui/components/KangurVisualCueContent';
import { cn } from '@/features/kangur/shared/utils';

import KangurMusicPianoRoll, {
  type KangurMusicSynthGlideMode,
  type KangurMusicKeyboardMode,
  type KangurMusicPianoKeyPressDetails,
  type KangurMusicSynthWaveform,
  type KangurMusicSynthGestureDetails,
} from './KangurMusicPianoRoll';
import { MUSIC_MELODY_REPEAT_ROUNDS } from './MusicMelodyRepeatGame.data';
import {
  DIATONIC_PIANO_KEYS,
  DIATONIC_PIANO_KEYS_BY_ID,
  type DiatonicNoteId,
} from './music-theory';
import { useKangurMusicSynth } from './useKangurMusicSynth';

type MusicRoundFeedback = {
  accent: KangurAccent;
  message: string;
};
type MusicRoundOutcome = 'success' | 'error' | null;

const LESSON_KEY = 'music_diatonic_scale';
const TOTAL_ROUNDS = MUSIC_MELODY_REPEAT_ROUNDS.length;
const PLAYBACK_DURATION_MS = 420;

const buildRoundStartMessage = (): string =>
  'Nacisnij przycisk play, aby uslyszec melodie.';

const resolveExpectedNoteMessage = (noteId: DiatonicNoteId): string =>
  `Teraz dotknij dzwieku ${DIATONIC_PIANO_KEYS_BY_ID[noteId].spokenLabel}.`;

export default function MusicMelodyRepeatGame({
  onFinish,
}: KangurMiniGameFinishActionProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const isCoarsePointer = useKangurCoarsePointer();
  const isMobileViewport = useKangurMobileBreakpoint();
  const isCompactMobile = isCoarsePointer || isMobileViewport;
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartedAtRef = useRef(Date.now());
  const {
    isAudioBlocked,
    isAudioSupported,
    isPlayingSequence,
    playNote,
    playSequence,
    startSustainedNote,
    stop,
    stopAllSustainedNotes,
    stopSustainedNote,
    updateSustainedNote,
  } = useKangurMusicSynth<DiatonicNoteId>();

  const [roundIndex, setRoundIndex] = useState(0);
  const [enteredNotes, setEnteredNotes] = useState<DiatonicNoteId[]>([]);
  const [keyboardMode, setKeyboardMode] = useState<KangurMusicKeyboardMode>('piano');
  const [synthGlideMode, setSynthGlideMode] =
    useState<KangurMusicSynthGlideMode>('continuous');
  const [synthWaveform, setSynthWaveform] = useState<KangurMusicSynthWaveform>('sawtooth');
  const [pressedNoteId, setPressedNoteId] = useState<DiatonicNoteId | null>(null);
  const [pressedVelocity, setPressedVelocity] = useState<number | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<'listen' | 'repeat' | 'summary'>('listen');
  const [perfectRounds, setPerfectRounds] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [attemptOutcome, setAttemptOutcome] = useState<MusicRoundOutcome>(null);
  const [errorCountInCurrentRound, setErrorCountInCurrentRound] = useState(0);
  const [firstTrySuccesses, setFirstTrySuccesses] = useState(0);
  const [isSlowMode, setIsSlowMode] = useState(false);
  const [feedback, setFeedback] = useState<MusicRoundFeedback>({
    accent: 'sky',
    message: buildRoundStartMessage(),
  });
  const replayButtonClassName = cn(
    'shrink-0 whitespace-nowrap',
    isCoarsePointer ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]' : undefined
  );
  const outcomeShellClassName =
    attemptOutcome === 'success'
      ? 'border-emerald-200/80 bg-emerald-50/55 shadow-[0_28px_68px_-42px_rgba(16,185,129,0.34)]'
      : attemptOutcome === 'error'
        ? 'border-rose-200/80 bg-rose-50/55 shadow-[0_28px_68px_-42px_rgba(244,63,94,0.3)]'
        : 'border-transparent bg-transparent shadow-none';

  const round = MUSIC_MELODY_REPEAT_ROUNDS[roundIndex] ?? MUSIC_MELODY_REPEAT_ROUNDS[0];
  const melodyPlayback = useMemo(
    () =>
      (round?.notes ?? []).map((noteId) => ({
        ...DIATONIC_PIANO_KEYS_BY_ID[noteId],
        durationMs: PLAYBACK_DURATION_MS,
        id: noteId,
      })),
    [round]
  );

  const clearTransientTimeouts = useCallback((): void => {
    if (feedbackTimeoutRef.current !== null) {
      globalThis.clearTimeout(feedbackTimeoutRef.current);
      feedbackTimeoutRef.current = null;
    }
    if (pressedResetTimeoutRef.current !== null) {
      globalThis.clearTimeout(pressedResetTimeoutRef.current);
      pressedResetTimeoutRef.current = null;
    }
  }, []);

  const resetRoundAttempt = useCallback(
    (nextMessage?: string): void => {
      clearTransientTimeouts();
      stop();
      setPhase('listen');
      setActiveStepIndex(null);
      setEnteredNotes([]);
      setPressedNoteId(null);
      setPressedVelocity(null);
      setAttemptOutcome(null);
      setErrorCountInCurrentRound(0);
      setFeedback({
        accent: round?.accent ?? 'sky',
        message: nextMessage ?? buildRoundStartMessage(),
      });
    },
    [clearTransientTimeouts, round?.accent, stop]
  );

  useEffect(() => {
    resetRoundAttempt();
    return () => {
      clearTransientTimeouts();
      stop();
    };
  }, [clearTransientTimeouts, resetRoundAttempt, roundIndex, stop]);

  const finalizeSession = useCallback(
    (nextPerfectRounds: number, nextFirstTrySuccesses: number): void => {
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, {
        activityKey: `lesson_practice:${LESSON_KEY}`,
        lessonKey: LESSON_KEY,
        correctAnswers: nextFirstTrySuccesses,
        totalQuestions: TOTAL_ROUNDS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: LESSON_KEY,
        score: nextPerfectRounds,
        totalQuestions: TOTAL_ROUNDS,
        correctAnswers: nextFirstTrySuccesses,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setFirstTrySuccesses(nextFirstTrySuccesses);
      setDone(true);
      setPhase('summary');
    },
    [ownerKey]
  );

  const queueNextRound = useCallback((): void => {
      const nextPerfectRounds = perfectRounds + 1;
      setPerfectRounds(nextPerfectRounds);
      const nextFirstTrySuccesses = errorCountInCurrentRound > 0
        ? firstTrySuccesses
        : firstTrySuccesses + 1;
      setFirstTrySuccesses(nextFirstTrySuccesses);

      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        feedbackTimeoutRef.current = scheduleKangurRoundFeedback(() => {
          finalizeSession(nextPerfectRounds, nextFirstTrySuccesses);
        }, 900);
        return;
      }

      feedbackTimeoutRef.current = scheduleKangurRoundFeedback(() => {
        setRoundIndex((current) => current + 1);
      }, 900);
    },
    [finalizeSession, firstTrySuccesses, errorCountInCurrentRound, perfectRounds, roundIndex]
  );

  const handleListen = useCallback(async (): Promise<void> => {
    if (!round || isPlayingSequence) {
      return;
    }

    clearTransientTimeouts();
    stop();
    stopAllSustainedNotes({ immediate: true });
    setPhase('listen');
    setEnteredNotes([]);
    setPressedNoteId(null);
    setPressedVelocity(null);
    setAttemptOutcome(null);
    setFeedback({
      accent: round.accent,
      message: isAudioSupported
        ? 'Sluchaj i patrz, ktore kolory zapalaja sie po kolei.'
        : 'Ta przegladarka nie obsluguje odtwarzania dzwiekow.',
    });

    const started = await playSequence(melodyPlayback, {
      gapMs: isSlowMode ? 260 : 120,
      onStepStart: (_note, index) => {
        setActiveStepIndex(index);
      },
    });

    setActiveStepIndex(null);

    if (!started) {
      setFeedback({
        accent: 'rose',
        message: isAudioBlocked
          ? 'Przegladarka zatrzymala dzwiek. Dotknij przycisku jeszcze raz.'
          : 'Nie udalo sie uruchomic melodii. Sprobuj ponownie.',
      });
      setAttemptOutcome('error');
      return;
    }

    setPhase('repeat');
    const firstNote = round.notes[0];
    setFeedback({
      accent: 'emerald',
      message: firstNote
        ? `Twoja kolej. Zacznij od dzwieku ${DIATONIC_PIANO_KEYS_BY_ID[firstNote].spokenLabel}.`
        : 'Twoja kolej. Powtorz melodie.',
    });
  }, [
    clearTransientTimeouts,
    isAudioBlocked,
    isAudioSupported,
    isPlayingSequence,
    isSlowMode,
    melodyPlayback,
    playSequence,
    round,
    stopAllSustainedNotes,
    stop,
  ]);

  const handleKeyPress = useCallback(
    async (
      noteId: DiatonicNoteId,
      pressDetails: KangurMusicPianoKeyPressDetails
    ): Promise<void> => {
      if (!round || phase !== 'repeat' || isPlayingSequence || done) {
        return;
      }

      const expectedNote = round.notes[enteredNotes.length];
      if (!expectedNote) {
        return;
      }

      setPressedNoteId(noteId);
      setPressedVelocity(pressDetails.velocity);
      if (pressedResetTimeoutRef.current !== null) {
        globalThis.clearTimeout(pressedResetTimeoutRef.current);
      }
      pressedResetTimeoutRef.current = globalThis.setTimeout(() => {
        setPressedNoteId(null);
        setPressedVelocity(null);
      }, 220);

      if (pressDetails.keyboardMode === 'piano') {
        await playNote({
          brightness: pressDetails.brightness,
          ...DIATONIC_PIANO_KEYS_BY_ID[noteId],
          durationMs: 300,
          id: noteId,
          velocity: pressDetails.velocity,
        });
      }

      if (noteId !== expectedNote) {
        clearTransientTimeouts();
        stopAllSustainedNotes({ immediate: true });
        setErrorCountInCurrentRound((n) => n + 1);
        setAttemptOutcome('error');
        setPhase('listen');
        setActiveStepIndex(null);
        setEnteredNotes([]);
        setFeedback({
          accent: 'rose',
          message: 'Ups. Posluchaj jeszcze raz i powtorz melodie od poczatku.',
        });
        feedbackTimeoutRef.current = scheduleKangurRoundFeedback(() => {
          void handleListen();
        }, 720);
        return;
      }

      const nextEnteredNotes = [...enteredNotes, noteId];
      setEnteredNotes(nextEnteredNotes);

      if (nextEnteredNotes.length >= round.notes.length) {
        clearTransientTimeouts();
        stopAllSustainedNotes({ immediate: true });
        setAttemptOutcome('success');
        setPhase('listen');
        setActiveStepIndex(null);
        setFeedback({
          accent: 'emerald',
          message: 'Brawo! Cala melodia zabrzmiala poprawnie.',
        });
        queueNextRound();
        return;
      }

      const nextExpected = round.notes[nextEnteredNotes.length];
      setFeedback({
        accent: 'emerald',
        message: nextExpected
          ? `Dobrze! ${resolveExpectedNoteMessage(nextExpected)}`
          : 'Dobrze! Dokoncz melodie.',
      });
    },
    [
      clearTransientTimeouts,
      done,
      enteredNotes,
      handleListen,
      isPlayingSequence,
      phase,
      playNote,
      queueNextRound,
      round,
      stopAllSustainedNotes,
    ]
  );

  const handleKeyboardModeChange = useCallback(
    (nextMode: KangurMusicKeyboardMode): void => {
      setKeyboardMode(nextMode);
      stopAllSustainedNotes({ immediate: true });
    },
    [stopAllSustainedNotes]
  );

  const handleSynthWaveformChange = useCallback(
    (nextWaveform: KangurMusicSynthWaveform): void => {
      setSynthWaveform(nextWaveform);
      stopAllSustainedNotes({ immediate: true });
    },
    [stopAllSustainedNotes]
  );

  const handleSynthGlideModeChange = useCallback(
    (nextGlideMode: KangurMusicSynthGlideMode): void => {
      setSynthGlideMode(nextGlideMode);
      stopAllSustainedNotes({ immediate: true });
    },
    [stopAllSustainedNotes]
  );

  const handleSynthGestureStart = useCallback(
    async (details: KangurMusicSynthGestureDetails<DiatonicNoteId>): Promise<void> => {
      if (details.keyboardMode !== 'synth' || phase !== 'repeat' || isPlayingSequence || done) {
        return;
      }

      await startSustainedNote(
        {
          ...DIATONIC_PIANO_KEYS_BY_ID[details.noteId],
          brightness: details.brightness,
          frequencyHz: details.frequencyHz,
          id: details.noteId,
          stereoPan: details.stereoPan,
          velocity: details.velocity,
          vibratoDepth: details.vibratoDepth,
          vibratoRateHz: details.vibratoRateHz,
          waveform: synthWaveform,
        },
        { interactionId: details.interactionId }
      );
    },
    [done, isPlayingSequence, phase, startSustainedNote, synthWaveform]
  );

  const handleSynthGestureChange = useCallback(
    (details: KangurMusicSynthGestureDetails<DiatonicNoteId>): void => {
      if (details.keyboardMode !== 'synth' || phase !== 'repeat' || isPlayingSequence || done) {
        return;
      }

      updateSustainedNote({
        brightness: details.brightness,
        frequencyHz: details.frequencyHz,
        interactionId: details.interactionId,
        stereoPan: details.stereoPan,
        velocity: details.velocity,
        vibratoDepth: details.vibratoDepth,
        vibratoRateHz: details.vibratoRateHz,
      });
    },
    [done, isPlayingSequence, phase, updateSustainedNote]
  );

  const handleSynthGestureEnd = useCallback(
    (details: KangurMusicSynthGestureDetails<DiatonicNoteId>): void => {
      stopSustainedNote(details.interactionId);
    },
    [stopSustainedNote]
  );

  const handleRestart = (): void => {
    clearTransientTimeouts();
    stop();
    sessionStartedAtRef.current = Date.now();
    setRoundIndex(0);
    setEnteredNotes([]);
    setPressedNoteId(null);
    setPressedVelocity(null);
    setActiveStepIndex(null);
    setPhase('listen');
    setPerfectRounds(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setAttemptOutcome(null);
    setErrorCountInCurrentRound(0);
    setFirstTrySuccesses(0);
    setFeedback({
      accent: MUSIC_MELODY_REPEAT_ROUNDS[0]?.accent ?? 'sky',
      message: buildRoundStartMessage(),
    });
  };

  useEffect(() => {
    return () => {
      clearTransientTimeouts();
      stop();
    };
  }, [clearTransientTimeouts, stop]);

  if (done) {
    const firstTryPercent = Math.round((firstTrySuccesses / TOTAL_ROUNDS) * 100);

    return (
      <KangurPracticeGameSummary dataTestId='music-melody-repeat-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='music-melody-repeat-summary-emoji'
          emoji={firstTrySuccesses === TOTAL_ROUNDS ? '🏆' : firstTryPercent >= 60 ? '🌟' : '🎹'}
        />
        <KangurPracticeGameSummaryTitle
          accent='sky'
          title={
            <KangurHeadline data-testid='music-melody-repeat-summary-title'>
              Za pierwszym razem: {firstTrySuccesses}/{TOTAL_ROUNDS}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='sky' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='music-melody-repeat-summary-breakdown'
          itemDataTestIdPrefix='music-melody-repeat-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress
          accent='sky'
          ariaLabel='Melodie powtorzone za pierwszym razem'
          ariaValueText={`${firstTryPercent}% melodii za pierwszym razem`}
          dataTestId='music-melody-repeat-summary-progress-bar'
          percent={firstTryPercent}
        />
        <KangurPracticeGameSummaryMessage>
          {firstTrySuccesses === TOTAL_ROUNDS
            ? 'Kazda melodia zabrzmiala czysto i pewnie — za pierwszym razem!'
            : firstTryPercent >= 60
              ? 'Coraz lepiej lapiesz melodie. Sprobuj jeszcze raz, aby zagrac wszystkie bez pomylek.'
              : 'Posluchaj ponownie i podazaj za swiecacymi kolorami krok po kroku.'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel='Wroc do tematow'
          onFinish={onFinish}
          onRestart={handleRestart}
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <div className='w-full' data-testid='music-melody-repeat-stage'>
      <div className='relative flex w-full flex-col gap-4 px-2 sm:gap-5 sm:px-3'>
        <div className='pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-sky-200/30 blur-3xl' />
        <div className='pointer-events-none absolute -left-14 bottom-0 h-36 w-36 rounded-full bg-violet-200/25 blur-3xl' />

        <div
          className='relative flex w-full min-w-0 items-center gap-3 overflow-hidden'
          data-testid='music-melody-repeat-top-rail'
        >
          <div className='min-w-0 flex-1'>
            <KangurPracticeGameProgress
              accent={round?.accent ?? 'sky'}
              currentRound={roundIndex}
              dataTestId='music-melody-repeat-progress-bar'
              totalRounds={TOTAL_ROUNDS}
            />
          </div>
          <div
            className={cn(
              'ml-auto flex shrink-0 items-center gap-2',
              isCompactMobile
                ? 'max-w-[58vw] flex-nowrap overflow-x-auto pb-1 whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                : 'max-w-full flex-wrap justify-end'
            )}
            data-testid='music-melody-repeat-status-rail'
          >
            <KangurStatusChip
              aria-label={isPlayingSequence ? 'Sluchaj' : phase === 'repeat' ? 'Twoja kolej' : 'Start'}
              className='bg-sky-100 text-sky-800'
              data-testid='music-melody-repeat-status-phase'
            >
              <KangurVisualCueContent
                icon={isPlayingSequence ? '👂' : phase === 'repeat' ? '👉' : '▶'}
                iconTestId='music-melody-repeat-status-phase-icon'
                label={isPlayingSequence ? 'Sluchaj' : phase === 'repeat' ? 'Twoja kolej' : 'Start'}
              />
            </KangurStatusChip>
            <KangurStatusChip
              aria-label={`Nuty: ${enteredNotes.length}/${round?.notes.length ?? 0}`}
              className='bg-white/80 text-slate-700'
              data-testid='music-melody-repeat-status-notes'
            >
              <KangurVisualCueContent
                detail={
                  <KangurVisualCueDots
                    activeCount={enteredNotes.length}
                    total={round?.notes.length ?? 0}
                  />
                }
                detailTestId='music-melody-repeat-status-notes-dots'
                icon='🎵'
                iconTestId='music-melody-repeat-status-notes-icon'
                label={`Nuty: ${enteredNotes.length}/${round?.notes.length ?? 0}`}
              />
            </KangurStatusChip>
            {errorCountInCurrentRound > 0 ? (
              <KangurStatusChip
                aria-label={`Proba ${errorCountInCurrentRound + 1}`}
                className='bg-amber-100 text-amber-700'
                data-testid='music-melody-repeat-status-attempt'
              >
                <KangurVisualCueContent
                  icon='🔄'
                  iconTestId='music-melody-repeat-status-attempt-icon'
                  label={`Proba ${errorCountInCurrentRound + 1}`}
                />
              </KangurStatusChip>
            ) : null}
            <KangurStatusChip
              aria-label={`Tryb: ${keyboardMode === 'synth' ? 'synth' : 'piano'}`}
              className='bg-fuchsia-100 text-fuchsia-800'
              data-testid='music-melody-repeat-status-mode'
            >
              <KangurVisualCueContent
                icon={keyboardMode === 'synth' ? '✨' : '🎹'}
                iconTestId='music-melody-repeat-status-mode-icon'
                label={`Tryb: ${keyboardMode === 'synth' ? 'synth' : 'piano'}`}
              />
            </KangurStatusChip>
            {attemptOutcome ? (
              <KangurStatusChip
                aria-label={attemptOutcome === 'success' ? 'Poprawnie' : 'Sprobuj jeszcze raz'}
                className={
                  attemptOutcome === 'success'
                    ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80'
                    : 'bg-rose-100 text-rose-800 ring-1 ring-rose-200/80'
                }
                data-testid='music-melody-repeat-status-outcome'
              >
                <KangurVisualCueContent
                  icon={attemptOutcome === 'success' ? '✅' : '❌'}
                  iconTestId='music-melody-repeat-status-outcome-icon'
                  label={attemptOutcome === 'success' ? 'Poprawnie' : 'Sprobuj jeszcze raz'}
                />
              </KangurStatusChip>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'relative flex w-full flex-col gap-3 rounded-[30px] border px-2 py-2.5 transition-all duration-300 sm:px-3',
            attemptOutcome ? 'ring-1' : undefined,
            attemptOutcome === 'success' ? 'ring-emerald-200/75' : undefined,
            attemptOutcome === 'error' ? 'ring-rose-200/75' : undefined,
            outcomeShellClassName
          )}
          data-outcome={attemptOutcome ?? 'idle'}
          data-testid='music-melody-repeat-outcome-shell'
        >
          {attemptOutcome ? (
            <div
              aria-label={attemptOutcome === 'success' ? 'Melodia poprawna' : 'Melodia do powtorzenia'}
              className={cn(
                'flex items-center justify-center gap-2 rounded-[22px] border px-3 py-2.5 text-center shadow-[0_18px_40px_-30px_rgba(15,23,42,0.34)] motion-reduce:animate-none',
                attemptOutcome === 'success'
                  ? 'border-emerald-200/85 bg-emerald-100/90 text-emerald-800 motion-safe:animate-pulse'
                  : 'border-rose-200/85 bg-rose-100/92 text-rose-800 motion-safe:animate-pulse'
              )}
              data-testid='music-melody-repeat-outcome-banner'
            >
              <span
                aria-hidden='true'
                className='text-lg leading-none'
                data-testid='music-melody-repeat-outcome-banner-icon'
              >
                {attemptOutcome === 'success' ? '✅' : '❌'}
              </span>
              <span className='text-sm font-black uppercase tracking-[0.18em]'>
                {attemptOutcome === 'success' ? 'Brawo!' : 'Jeszcze raz'}
              </span>
            </div>
          ) : null}

          <KangurMusicPianoRoll
            activeStepIndex={activeStepIndex}
            completedStepCount={enteredNotes.length}
            disabled={phase !== 'repeat' || isPlayingSequence}
            expectedStepIndex={phase === 'repeat' ? enteredNotes.length : null}
            interactive
            keyTestIdPrefix='music-melody-repeat-key'
            keyboardMode={keyboardMode}
            keys={DIATONIC_PIANO_KEYS}
            melody={round?.notes ?? []}
            className='!overflow-visible !border-0 !bg-transparent !px-1.5 !py-2.5 !shadow-none sm:!px-2.5 sm:!py-3'
            onKeyboardModeChange={handleKeyboardModeChange}
            onKeyPress={(noteId, details) => {
              void handleKeyPress(noteId, details);
            }}
            onSynthGlideModeChange={handleSynthGlideModeChange}
            onSynthGestureChange={handleSynthGestureChange}
            onSynthGestureEnd={handleSynthGestureEnd}
            onSynthGestureStart={(details) => {
              void handleSynthGestureStart(details);
            }}
            onSynthWaveformChange={handleSynthWaveformChange}
            pressedNoteId={pressedNoteId}
            pressedVelocity={pressedVelocity}
            shellTestId='music-melody-repeat-piano-roll'
            showKeyboardModeSwitch
            showSynthGlideModeSwitch
            showSynthWaveformSwitch
            synthGlideMode={synthGlideMode}
            stepTestIdPrefix='music-melody-repeat-step'
            synthWaveform={synthWaveform}
            visualCueMode='six_year_old'
          />

          <div
            className='flex w-full max-w-full justify-center px-1 pt-1 sm:px-2'
            data-testid='music-melody-repeat-actions'
          >
            <div
              className='inline-grid max-w-full grid-cols-[auto_auto_auto] items-center max-[340px]:grid-cols-[auto] max-[340px]:gap-y-2'
              data-testid='music-melody-repeat-actions-group'
            >
              <div
                className='flex justify-end pr-3 max-[340px]:hidden'
                data-testid='music-melody-repeat-actions-left-slot'
              >
                {phase === 'repeat' ? (
                  <KangurButton
                    aria-hidden='true'
                    className={cn('pointer-events-none invisible', replayButtonClassName)}
                    disabled
                    size='lg'
                    tabIndex={-1}
                    type='button'
                    variant='surface'
                  >
                    Zagraj od poczatku
                  </KangurButton>
                ) : null}
              </div>
              <div
                className='flex items-center justify-center p-1'
                data-testid='music-melody-repeat-listen-button-shell'
              >
                <button
                  aria-label='Posluchaj melodii'
                  className={cn(
                    'relative z-10 flex h-14 w-14 cursor-pointer items-center justify-center rounded-[22px] border border-sky-200/70 bg-[linear-gradient(160deg,rgba(224,242,254,0.9),rgba(186,230,253,0.74)_48%,rgba(224,231,255,0.64)_100%)] text-sky-700 shadow-[0_18px_34px_-26px_rgba(14,116,144,0.42)] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70',
                    isCoarsePointer
                      ? 'touch-manipulation select-none active:scale-[0.97]'
                      : 'hover:scale-[1.03]'
                  )}
                  data-testid='music-melody-repeat-listen-button'
                  onClick={() => {
                    void handleListen();
                  }}
                  type='button'
                >
                  <svg
                    aria-hidden='true'
                    className='relative z-10 translate-x-[2px] size-8 drop-shadow-[0_2px_4px_rgba(255,255,255,0.22)]'
                    data-testid='music-melody-repeat-listen-icon'
                    fill='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path d='M7.25 4.75v14.5L18.9 12 7.25 4.75Z' />
                  </svg>
                </button>
              </div>
              <div
                className='flex justify-start pl-3 max-[340px]:justify-center max-[340px]:pl-0'
                data-testid='music-melody-repeat-actions-right-slot'
              >
                {phase === 'repeat' ? (
                  <KangurButton
                    className={replayButtonClassName}
                    onClick={() => {
                      void handleListen();
                    }}
                    size='lg'
                    type='button'
                    variant='surface'
                  >
                    Zagraj od poczatku
                  </KangurButton>
                ) : null}
              </div>
            </div>
          </div>
          <div className='flex w-full justify-center pb-1'>
            <button
              aria-label={isSlowMode ? 'Wolne tempo — kliknij aby przyspieszyc' : 'Normalne tempo — kliknij aby zwolnic'}
              aria-pressed={isSlowMode}
              className={cn(
                'flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-sm font-semibold transition-colors',
                isCoarsePointer ? 'touch-manipulation select-none active:scale-[0.97]' : 'hover:bg-slate-50',
                isSlowMode
                  ? 'border-amber-200 bg-amber-50 text-amber-700 ring-1 ring-amber-200/80'
                  : 'border-slate-200 bg-white/60 text-slate-400'
              )}
              data-testid='music-melody-repeat-slow-mode-toggle'
              onClick={() => setIsSlowMode((v) => !v)}
              type='button'
            >
              <span aria-hidden='true' className='text-base leading-none'>🐢</span>
              <span>{isSlowMode ? 'Wolne tempo' : 'Zwolnij'}</span>
            </button>
          </div>
        </div>

        {feedback.message ? (
          <KangurInfoCard
            accent={feedback.accent}
            className='w-full rounded-[24px] text-sm leading-relaxed'
            data-testid='music-melody-repeat-feedback'
            padding='md'
            tone='accent'
          >
            {feedback.message}
          </KangurInfoCard>
        ) : null}
      </div>
    </div>
  );
}
