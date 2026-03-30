'use client';

import type { AddingSynthesisTimingGrade } from '@/features/kangur/ui/services/adding-synthesis';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';

export type GamePhase = 'intro' | 'playing' | 'summary';
export type FeedbackKind = AddingSynthesisTimingGrade | 'wrong' | 'miss';

export type FeedbackState = {
  kind: FeedbackKind;
  title: string;
  description: string;
  hint: string;
  correctLaneIndex: number;
  chosenLaneIndex: number | null;
};

export type GameSummary = {
  accuracy: number;
  score: number;
  totalNotes: number;
  perfectHits: number;
  bestStreak: number;
  xpEarned: number;
  breakdown: KangurRewardBreakdownEntry[];
};
