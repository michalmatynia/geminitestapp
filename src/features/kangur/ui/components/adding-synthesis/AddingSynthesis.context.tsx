'use client';

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { translateKangurMiniGameWithFallback } from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  ADDING_SYNTHESIS_NOTE_DURATION_MS,
  type AddingSynthesisNote,
} from '@/features/kangur/ui/services/adding-synthesis';
import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';
import { LANE_STYLES } from './AddingSynthesisGame.constants';
import { useAddingSynthesisGameState } from './AddingSynthesisGame.hooks';
import type { AddingSynthesisTranslate, AddingSynthesisLocalizedStage, AddingSynthesisLocalizedStages } from './AddingSynthesisGame.types';
import {
  resolveAddingSynthesisAccuracy,
  resolveAddingSynthesisCurrentStage,
  resolveAddingSynthesisExitLabels,
  resolveAddingSynthesisViewKind,
} from './AddingSynthesisGame.utils';

export type AddingSynthesisContextValue = ReturnType<typeof useAddingSynthesisGameState> & {
  t: AddingSynthesisTranslate;
  currentStage: AddingSynthesisLocalizedStage;
  localizedStages: AddingSynthesisLocalizedStages;
  accuracy: number;
  noteTop: number;
  noteScale: number;
  laneCount: number;
  introNoteCount: number;
  upcomingNotes: AddingSynthesisNote[];
  exitLabel: string;
  inSessionExitLabel: string;
  viewKind: 'intro' | 'summary' | 'playing';
  onFinish: (() => void) | undefined;
};

const AddingSynthesisContext = createContext<AddingSynthesisContextValue | null>(null);

export function AddingSynthesisProvider({
  children,
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps & { children: React.ReactNode }) {
  const state = useAddingSynthesisGameState();
  const {
    currentIndex,
    currentNote,
    feedback,
    noteElapsedMs,
    notes,
    phase,
    score,
    summary,
    translations,
    resolveChoice,
  } = state;

  const t = useMemo<AddingSynthesisTranslate>(() => (key, fallback, values) =>
    translateKangurMiniGameWithFallback(translations, key, fallback, values), [translations]);

  const { currentStage, localizedStages } = useMemo(() => resolveAddingSynthesisCurrentStage({
    currentNote,
    translations,
  }), [currentNote, translations]);

  const accuracy = useMemo(() => resolveAddingSynthesisAccuracy({
    currentIndex,
    feedback,
    score,
  }), [currentIndex, feedback, score]);

  const noteProgress = Math.min(noteElapsedMs / ADDING_SYNTHESIS_NOTE_DURATION_MS, 1);
  const noteTop = 24 + noteProgress * 236;
  const noteScale = 0.95 + Math.min(noteProgress, 1) * 0.07;
  const laneCount = LANE_STYLES.length;
  const introNoteCount = useMemo(() => localizedStages.reduce((sum, stage) => sum + stage.noteCount, 0), [localizedStages]);
  const upcomingNotes = useMemo(() => currentNote ? notes.slice(currentIndex + 1, currentIndex + 4) : [], [currentNote, notes, currentIndex]);
  const { exitLabel, inSessionExitLabel } = useMemo(() => resolveAddingSynthesisExitLabels({
    finishLabel,
    t,
  }), [finishLabel, t]);
  const viewKind = useMemo(() => resolveAddingSynthesisViewKind({
    phase,
    summary,
  }), [phase, summary]);

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

  const value = useMemo(() => ({
    ...state,
    t,
    currentStage,
    localizedStages,
    accuracy,
    noteTop,
    noteScale,
    laneCount,
    introNoteCount,
    upcomingNotes,
    exitLabel,
    inSessionExitLabel,
    viewKind,
    onFinish,
  }), [
    state,
    t,
    currentStage,
    localizedStages,
    accuracy,
    noteTop,
    noteScale,
    laneCount,
    introNoteCount,
    upcomingNotes,
    exitLabel,
    inSessionExitLabel,
    viewKind,
    onFinish,
  ]);

  return (
    <AddingSynthesisContext.Provider value={value}>
      {children}
    </AddingSynthesisContext.Provider>
  );
}

export function useAddingSynthesisContext(): AddingSynthesisContextValue {
  const context = useContext(AddingSynthesisContext);
  if (!context) {
    throw new Error('useAddingSynthesisContext must be used within a AddingSynthesisProvider');
  }
  return context;
}
