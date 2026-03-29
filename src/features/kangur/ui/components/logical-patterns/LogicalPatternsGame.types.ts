'use client';

import type { LogicalPatternCell, LogicalPatternTile } from '../logical-patterns-workshop-data';
import type { MultiSlottedRoundStateDto } from '../round-state-contracts';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';

export type RoundState = MultiSlottedRoundStateDto<LogicalPatternTile>;
export type BlankCell = Extract<LogicalPatternCell, { type: 'blank' }>;

export type GameSummary = {
  accuracy: number;
  score: number;
  totalNotes: number;
  perfectHits: number;
  bestStreak: number;
  xpEarned: number;
  breakdown: KangurRewardBreakdownEntry[];
};
