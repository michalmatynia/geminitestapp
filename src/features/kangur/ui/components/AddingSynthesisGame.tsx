'use client';

import React, { useEffect } from 'react';

import { translateKangurMiniGameWithFallback } from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  ADDING_SYNTHESIS_NOTE_DURATION_MS,
} from '@/features/kangur/ui/services/adding-synthesis';
import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';

import { LANE_STYLES } from './adding-synthesis/AddingSynthesisGame.constants';
import { useAddingSynthesisGameState } from './adding-synthesis/AddingSynthesisGame.hooks';
import type { AddingSynthesisTranslate } from './adding-synthesis/AddingSynthesisGame.types';
import {
  resolveAddingSynthesisAccuracy,
  resolveAddingSynthesisCurrentStage,
  resolveAddingSynthesisExitLabels,
  resolveAddingSynthesisViewKind,
} from './adding-synthesis/AddingSynthesisGame.utils';
import {
  AddingSynthesisIntroView,
  AddingSynthesisPlayingView,
  AddingSynthesisSummaryView,
} from './adding-synthesis/AddingSynthesisGame.sections';

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
