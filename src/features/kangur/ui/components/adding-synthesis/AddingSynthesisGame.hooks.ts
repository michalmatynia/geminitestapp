'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { translateKangurMiniGameWithFallback } from '@/features/kangur/ui/constants/mini-game-i18n';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  ADDING_SYNTHESIS_FEEDBACK_PAUSE_MS,
  ADDING_SYNTHESIS_NOTE_DURATION_MS,
  createAddingSynthesisSequence,
  getLocalizedAddingSynthesisFeedback,
  getLocalizedAddingSynthesisNoteFocus,
  getLocalizedAddingSynthesisNoteHint,
  getAddingSynthesisTimingGrade,
  type AddingSynthesisNote,
} from '@/features/kangur/ui/services/adding-synthesis';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';
import { LANE_STYLES } from './AddingSynthesisGame.constants';
import type { GamePhase, FeedbackState, GameSummary } from './AddingSynthesisGame.types';
import {
  resolveAddingSynthesisAccuracy,
  resolveAddingSynthesisCurrentStage,
  resolveAddingSynthesisExitLabels,
  resolveAddingSynthesisViewKind,
} from './AddingSynthesisGame.utils';

const resolveAddingSynthesisElapsedProgress = ({
  noteElapsedMs,
  noteStartedAtMs,
}: {
  noteElapsedMs: number;
  noteStartedAtMs: number | null;
}): number => {
  const elapsedMs = noteStartedAtMs ? Date.now() - noteStartedAtMs : noteElapsedMs;
  return Math.min(elapsedMs / ADDING_SYNTHESIS_NOTE_DURATION_MS, 1);
};

const resolveAddingSynthesisChoiceMeta = ({
  currentNote,
  laneIndex,
  noteElapsedMs,
  noteStartedAtMs,
}: {
  currentNote: AddingSynthesisNote;
  laneIndex: number | null;
  noteElapsedMs: number;
  noteStartedAtMs: number | null;
}): {
  chosenValue: number | null;
  correctLaneIndex: number;
  elapsedProgress: number;
  failureKind: 'miss' | 'wrong';
  isCorrectChoice: boolean;
} => {
  const correctLaneIndex = currentNote.choices.indexOf(currentNote.answer);
  return {
    chosenValue: laneIndex === null ? null : currentNote.choices[laneIndex] ?? null,
    correctLaneIndex,
    elapsedProgress: resolveAddingSynthesisElapsedProgress({ noteElapsedMs, noteStartedAtMs }),
    failureKind: laneIndex === null ? 'miss' : 'wrong',
    isCorrectChoice: laneIndex !== null && laneIndex === correctLaneIndex,
  };
};

const buildAddingSynthesisSuccessFeedback = ({
  correctLaneIndex,
  currentNote,
  laneIndex,
  timingGrade,
  translations,
}: {
  correctLaneIndex: number;
  currentNote: AddingSynthesisNote;
  laneIndex: number;
  timingGrade: ReturnType<typeof getAddingSynthesisTimingGrade>;
  translations: Parameters<typeof getLocalizedAddingSynthesisFeedback>[0]['translate'];
}): FeedbackState => {
  const copy = getLocalizedAddingSynthesisFeedback({
    kind: timingGrade,
    note: currentNote,
    chosenValue: currentNote.answer,
    translate: translations,
  });

  return {
    kind: timingGrade,
    title: copy.title,
    description: copy.description,
    hint: getLocalizedAddingSynthesisNoteFocus(currentNote, translations),
    correctLaneIndex,
    chosenLaneIndex: laneIndex,
  };
};

const buildAddingSynthesisFailureFeedback = ({
  chosenValue,
  correctLaneIndex,
  currentNote,
  failureKind,
  laneIndex,
  translations,
}: {
  chosenValue: number | null;
  correctLaneIndex: number;
  currentNote: AddingSynthesisNote;
  failureKind: 'miss' | 'wrong';
  laneIndex: number | null;
  translations: Parameters<typeof getLocalizedAddingSynthesisFeedback>[0]['translate'];
}): FeedbackState => {
  const copy = getLocalizedAddingSynthesisFeedback({
    kind: failureKind,
    note: currentNote,
    chosenValue,
    translate: translations,
  });
  const hint =
    failureKind === 'miss'
      ? getLocalizedAddingSynthesisNoteHint(currentNote, translations)
      : getLocalizedAddingSynthesisNoteFocus(currentNote, translations);

  return {
    kind: failureKind,
    title: copy.title,
    description: copy.description,
    hint,
    correctLaneIndex,
    chosenLaneIndex: laneIndex,
  };
};

export function useAddingSynthesisGameState() {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();

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
  const noteDeadlineRef = useRef<number | null>(null);
  const noteAdvanceRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef(Date.now());

  const currentNote = phase === 'playing' ? (notes[currentIndex] ?? null) : null;

  const stopCurrentNoteTimers = useCallback((): void => {
    if (noteDeadlineRef.current !== null) {
      window.clearTimeout(noteDeadlineRef.current);
      noteDeadlineRef.current = null;
    }
  }, []);

  const clearAllTimers = useCallback((): void => {
    stopCurrentNoteTimers();
    if (noteAdvanceRef.current !== null) {
      window.clearTimeout(noteAdvanceRef.current);
      noteAdvanceRef.current = null;
    }
  }, [stopCurrentNoteTimers]);

  const finishSession = useCallback((
    finalScore: number,
    finalPerfectHits: number,
    finalBestStreak: number
  ): void => {
    const progress = loadProgress({ ownerKey });
    const reward = createLessonPracticeReward(progress, 'adding', finalScore, notes.length, 65);
    addXp(reward.xp, reward.progressUpdates, { ownerKey });
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
  }, [notes.length, ownerKey]);

  const queueAdvance = useCallback((
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
  }, [currentIndex, finishSession, notes.length]);

  const resolveChoice = useCallback((laneIndex: number | null): void => {
    if (!currentNote || feedback) {
      return;
    }

    stopCurrentNoteTimers();
    const choiceMeta = resolveAddingSynthesisChoiceMeta({
      currentNote,
      laneIndex,
      noteElapsedMs,
      noteStartedAtMs: noteStartedAtRef.current,
    });

    if (choiceMeta.isCorrectChoice && laneIndex !== null) {
      const timingGrade = getAddingSynthesisTimingGrade(choiceMeta.elapsedProgress);
      const nextScore = score + 1;
      const nextStreak = streak + 1;
      const nextBestStreak = Math.max(bestStreak, nextStreak);
      const nextPerfectHits = perfectHits + (timingGrade === 'perfect' ? 1 : 0);

      setScore(nextScore);
      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      setPerfectHits(nextPerfectHits);
      setFeedback(
        buildAddingSynthesisSuccessFeedback({
          correctLaneIndex: choiceMeta.correctLaneIndex,
          currentNote,
          laneIndex,
          timingGrade,
          translations,
        })
      );
      queueAdvance(nextScore, nextPerfectHits, nextBestStreak);
      return;
    }

    setStreak(0);
    setFeedback(
      buildAddingSynthesisFailureFeedback({
        chosenValue: choiceMeta.chosenValue,
        correctLaneIndex: choiceMeta.correctLaneIndex,
        currentNote,
        failureKind: choiceMeta.failureKind,
        laneIndex,
        translations,
      })
    );
    queueAdvance(score, perfectHits, bestStreak);
  }, [bestStreak, currentNote, feedback, perfectHits, queueAdvance, score, stopCurrentNoteTimers, streak, translations, noteElapsedMs]);

  useEffect(() => {
    if (phase !== 'playing' || !currentNote || feedback) return;
    noteStartedAtRef.current = Date.now();
    setNoteElapsedMs(0);
    noteDeadlineRef.current = window.setTimeout(() => resolveChoice(null), ADDING_SYNTHESIS_NOTE_DURATION_MS);
    return () => stopCurrentNoteTimers();
  }, [currentIndex, currentNote, feedback, phase, resolveChoice, stopCurrentNoteTimers]);

  useInterval(() => {
    if (!noteStartedAtRef.current) return;
    setNoteElapsedMs(Math.min(Date.now() - noteStartedAtRef.current, ADDING_SYNTHESIS_NOTE_DURATION_MS));
  }, phase === 'playing' && currentNote && !feedback ? 40 : null);

  const startSession = useCallback((): void => {
    const nextNotes = createAddingSynthesisSequence();
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
    setPhase('playing');
  }, [clearAllTimers]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  return {
    translations,
    isCoarsePointer,
    phase,
    setPhase,
    notes,
    currentIndex,
    noteElapsedMs,
    feedback,
    setFeedback,
    score,
    streak,
    bestStreak,
    perfectHits,
    summary,
    currentNote,
    startSession,
    resolveChoice,
  };
}

export function useAddingSynthesisSession(props: KangurMiniGameFinishProps) {
  const state = useAddingSynthesisGameState();
  const { currentStage, localizedStages } = resolveAddingSynthesisCurrentStage({
    currentNote: state.currentNote,
    translations: state.translations,
  });
  const accuracy = resolveAddingSynthesisAccuracy({
    currentIndex: state.currentIndex,
    feedback: state.feedback,
    score: state.score,
  });
  const t = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>
  ): string =>
    translateKangurMiniGameWithFallback(state.translations, key, fallback, values);
  const { exitLabel, inSessionExitLabel } = resolveAddingSynthesisExitLabels({
    finishLabel: props.finishLabel,
    t,
  });
  const viewKind = resolveAddingSynthesisViewKind({
    phase: state.phase,
    summary: state.summary,
  });
  const noteProgress = Math.min(
    state.noteElapsedMs / ADDING_SYNTHESIS_NOTE_DURATION_MS,
    1
  );

  return {
    ...state,
    accuracy,
    currentStage,
    exitLabel,
    inSessionExitLabel,
    introNoteCount: state.notes.length,
    laneCount: LANE_STYLES.length,
    localizedStages,
    noteScale: 1 - noteProgress * 0.08,
    noteTop: Math.round(noteProgress * 230),
    onFinish: props.onFinish,
    t,
    upcomingNotes: state.notes.slice(state.currentIndex + 1, state.currentIndex + 4),
    viewKind,
  };
}
