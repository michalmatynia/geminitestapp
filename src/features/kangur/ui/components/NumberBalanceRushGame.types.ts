'use client';

import type {
  NumberBalanceTier,
  NumberBalanceTile,
  NumberBalancePuzzle,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalanceMatchStatus,
  NumberBalanceMatchState,
  NumberBalanceMatchPlayerState,
  NumberBalancePlayerScore,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';

export type NumberBalanceRushGameProps = {
  durationMs?: number;
  tier?: NumberBalanceTier;
  matchId?: string;
  balancedProbability?: number;
  onFinish?: () => void;
};

export type ZoneId = 'tray' | 'left' | 'right';

export type Phase = 'loading' | 'waiting' | 'countdown' | 'running' | 'finished';
export type MatchStatus = NumberBalanceMatchStatus | 'completed';

export type RoundState = {
  tray: NumberBalanceTile[];
  left: NumberBalanceTile[];
  right: NumberBalanceTile[];
};
