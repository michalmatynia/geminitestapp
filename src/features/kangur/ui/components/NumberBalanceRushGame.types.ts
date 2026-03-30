'use client';

import type React from 'react';
import { useTranslations } from 'next-intl';
import type {
  NumberBalanceTier,
  NumberBalanceTile,
  NumberBalancePuzzle,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalanceMatchStatus,
  NumberBalanceMatchPlayerState,
  NumberBalanceMatchState,
  NumberBalancePlayerScore,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';

export type {
  NumberBalancePuzzle,
} from '@/features/kangur/games/number-balance/number-balance-generator';
export type {
  NumberBalanceMatchPlayerState,
  NumberBalanceMatchState,
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

export interface UseNumberBalanceRushInteractionStateProps {
  celebrateTimeoutRef: React.MutableRefObject<number | null>;
  celebrating: boolean;
  isSubmitting: boolean;
  leftTiles: NumberBalanceTile[];
  match: NumberBalanceMatchState | null;
  phase: string;
  player: NumberBalanceMatchPlayerState | null;
  puzzle: NumberBalancePuzzle | null;
  puzzleStartedAtRef: React.MutableRefObject<number>;
  rightTiles: NumberBalanceTile[];
  selectedTileId: string | null;
  serverNowMs: number;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setPlayer: React.Dispatch<React.SetStateAction<NumberBalanceMatchPlayerState | null>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setSelectedTileId: React.Dispatch<React.SetStateAction<string | null>>;
  setServerOffsetMs: React.Dispatch<React.SetStateAction<number>>;
  setSolves: React.Dispatch<React.SetStateAction<number>>;
  setLeftTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setRightTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setTrayTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  solveTimesRef: React.MutableRefObject<number[]>;
  trayTiles: NumberBalanceTile[];
  translations: ReturnType<typeof useTranslations<'KangurMiniGames'>>;
}

export interface UseNumberBalanceRushMatchActionsProps {
  balancedProbability: number | undefined;
  copyStatusTimeoutRef: React.MutableRefObject<number | null>;
  durationMs: number;
  match: NumberBalanceMatchState | null;
  matchId: string | undefined;
  lastLoadedPuzzleIndexRef: React.MutableRefObject<number | null>;
  lastLoadedPuzzleStartRef: React.MutableRefObject<number | null>;
  setCopyStatus: React.Dispatch<React.SetStateAction<'idle' | 'success' | 'error'>>;
  setCelebrating: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setLeftTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setMatch: React.Dispatch<React.SetStateAction<NumberBalanceMatchState | null>>;
  setPlayer: React.Dispatch<React.SetStateAction<NumberBalanceMatchPlayerState | null>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setPuzzle: React.Dispatch<React.SetStateAction<NumberBalancePuzzle | null>>;
  setRightTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setSelectedTileId: React.Dispatch<React.SetStateAction<string | null>>;
  setServerOffsetMs: React.Dispatch<React.SetStateAction<number>>;
  setSolves: React.Dispatch<React.SetStateAction<number>>;
  setTrayTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  solveTimesRef: React.MutableRefObject<number[]>;
  tier: NumberBalanceRushGameProps['tier'];
  translations: ReturnType<typeof useTranslations<'KangurMiniGames'>>;
}

export interface UseNumberBalanceRushPuzzleLoaderProps {
  lastLoadedPuzzleIndexRef: React.MutableRefObject<number | null>;
  lastLoadedPuzzleStartRef: React.MutableRefObject<number | null>;
  match: NumberBalanceMatchState | null;
  player: NumberBalanceMatchPlayerState | null;
  puzzleStartedAtRef: React.MutableRefObject<number>;
  serverOffsetMs: number;
  setLeftTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setPuzzle: React.Dispatch<React.SetStateAction<NumberBalancePuzzle | null>>;
  setRightTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
  setTrayTiles: React.Dispatch<React.SetStateAction<NumberBalanceTile[]>>;
}

export interface UseNumberBalanceRushPollingRuntimeProps {
  activeMatchId: string | null;
  activeMatchIdRef: React.MutableRefObject<string | null>;
  activeMatchStatus: MatchStatus | null;
  activeMatchStatusRef: React.MutableRefObject<MatchStatus | null>;
  setMatch: React.Dispatch<React.SetStateAction<NumberBalanceMatchState | null>>;
  setPlayer: React.Dispatch<React.SetStateAction<NumberBalanceMatchPlayerState | null>>;
  setPlayerCount: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setScores: React.Dispatch<React.SetStateAction<NumberBalancePlayerScore[]>>;
  setServerOffsetMs: React.Dispatch<React.SetStateAction<number>>;
  shouldPoll: boolean;
}

export interface UseNumberBalanceRushLifecycleEffectsProps {
  celebrateTimeoutRef: React.MutableRefObject<number | null>;
  copyStatusTimeoutRef: React.MutableRefObject<number | null>;
  initMatch: (requestedMatchId?: string) => Promise<void>;
  matchId: string | undefined;
  setClockNowMs: React.Dispatch<React.SetStateAction<number>>;
}

export interface UseNumberBalanceRushDerivedStateProps {
  clockNowMs: number;
  durationMs: number;
  isLoading: boolean;
  match: NumberBalanceMatchState | null;
  player: NumberBalanceMatchPlayerState | null;
  playerCount: number;
  scores: NumberBalancePlayerScore[];
  serverOffsetMs: number;
  translations: ReturnType<typeof useTranslations<'KangurMiniGames'>>;
}
