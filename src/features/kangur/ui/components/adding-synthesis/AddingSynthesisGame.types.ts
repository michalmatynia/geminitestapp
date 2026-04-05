import type {
  AddingSynthesisTimingGrade,
  AddingSynthesisStage,
  getLocalizedAddingSynthesisStages,
} from '@/features/kangur/ui/services/adding-synthesis';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import type { useAddingSynthesisGameState } from './AddingSynthesisGame.hooks';

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

export type AddingSynthesisState = ReturnType<typeof useAddingSynthesisGameState>;

export type AddingSynthesisTranslate = (
  key: string,
  fallback: string,
  values?: Record<string, string | number>
) => string;

export type AddingSynthesisLocalizedStage = AddingSynthesisStage;
export type AddingSynthesisLocalizedStages = ReturnType<typeof getLocalizedAddingSynthesisStages>;

export const ADDING_SYNTHESIS_VIEW_KINDS = {
  intro: 'intro',
  playing: 'playing',
  summary: 'summary',
} as const;

export type AddingSynthesisViewKind = keyof typeof ADDING_SYNTHESIS_VIEW_KINDS;
