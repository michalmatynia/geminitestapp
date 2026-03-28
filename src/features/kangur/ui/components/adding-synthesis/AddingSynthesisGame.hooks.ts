'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
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
import type { GamePhase, FeedbackState, GameSummary } from './AddingSynthesisGame.types';

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
    if (!currentNote || feedback) return;

    stopCurrentNoteTimers();

    const elapsedMs = noteStartedAtRef.current
      ? Date.now() - noteStartedAtRef.current
      : noteElapsedMs;
    const elapsedProgress = Math.min(elapsedMs / ADDING_SYNTHESIS_NOTE_DURATION_MS, 1);
    const correctLaneIndex = currentNote.choices.indexOf(currentNote.answer);

    if (laneIndex !== null && laneIndex === correctLaneIndex) {
      const timingGrade = getAddingSynthesisTimingGrade(elapsedProgress);
      const nextScore = score + 1;
      const nextStreak = streak + 1;
      const nextBestStreak = Math.max(bestStreak, nextStreak);
      const nextPerfectHits = perfectHits + (timingGrade === 'perfect' ? 1 : 0);
      const copy = getLocalizedAddingSynthesisFeedback({
        kind: timingGrade,
        note: currentNote,
        chosenValue: currentNote.answer,
        translate: translations,
      });

      setScore(nextScore);
      setStreak(nextStreak);
      setBestStreak(nextBestStreak);
      setPerfectHits(nextPerfectHits);
      setFeedback({
        kind: timingGrade,
        title: copy.title,
        description: copy.description,
        hint: getLocalizedAddingSynthesisNoteFocus(currentNote, translations),
        correctLaneIndex,
        chosenLaneIndex: laneIndex,
      });
      queueAdvance(nextScore, nextPerfectHits, nextBestStreak);
      return;
    }

    const copy = getLocalizedAddingSynthesisFeedback({
      kind: laneIndex === null ? 'miss' : 'wrong',
      note: currentNote,
      chosenValue: laneIndex === null ? null : currentNote.choices[laneIndex],
      translate: translations,
    });

    setStreak(0);
    setFeedback({
      kind: laneIndex === null ? 'miss' : 'wrong',
      title: copy.title,
      description: copy.description,
      hint: laneIndex === null ? getLocalizedAddingSynthesisNoteHint(currentNote, translations) : getLocalizedAddingSynthesisNoteFocus(currentNote, translations),
      correctLaneIndex,
      chosenLaneIndex: laneIndex,
    });
    queueAdvance(score, perfectHits, bestStreak);
  }, [bestStreak, currentIndex, currentNote, feedback, perfectHits, queueAdvance, score, stopCurrentNoteTimers, streak, translations, noteElapsedMs]);

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
