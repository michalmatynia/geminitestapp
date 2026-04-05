'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  NumberBalancePuzzle,
  NumberBalanceTile,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalanceMatchPlayerState,
  NumberBalanceMatchState,
  NumberBalancePlayerScore,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import type { MatchStatus, NumberBalanceRushGameProps } from './NumberBalanceRushGame.types';
import { useNumberBalanceRushInteractionState } from './NumberBalanceRushGame.useInteractionState';
import { useNumberBalanceRushMatchActions } from './NumberBalanceRushGame.useMatchActions';
import { useNumberBalanceRushPuzzleLoader } from './NumberBalanceRushGame.usePuzzleLoader';
import { useNumberBalanceRushPollingRuntime } from './NumberBalanceRushGame.usePollingRuntime';
import { useNumberBalanceRushLifecycleEffects } from './NumberBalanceRushGame.useLifecycleEffects';
import { useNumberBalanceRushDerivedState } from './NumberBalanceRushGame.useDerivedState';

export function useNumberBalanceRushGameState(props: NumberBalanceRushGameProps) {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    durationMs = 15_000,
    tier = 'tier1',
    matchId,
    balancedProbability,
  } = props;

  const [match, setMatch] = useState<NumberBalanceMatchState | null>(null);
  const [player, setPlayer] = useState<NumberBalanceMatchPlayerState | null>(null);
  const [puzzle, setPuzzle] = useState<NumberBalancePuzzle | null>(null);
  const [trayTiles, setTrayTiles] = useState<NumberBalanceTile[]>([]);
  const [leftTiles, setLeftTiles] = useState<NumberBalanceTile[]>([]);
  const [rightTiles, setRightTiles] = useState<NumberBalanceTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [scores, setScores] = useState<NumberBalancePlayerScore[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [solves, setSolves] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [clockNowMs, setClockNowMs] = useState(() => Date.now());
  const [serverOffsetMs, setServerOffsetMs] = useState(0);

  const solveTimesRef = useRef<number[]>([]);
  const lastLoadedPuzzleIndexRef = useRef<number | null>(null);
  const lastLoadedPuzzleStartRef = useRef<number | null>(null);
  const puzzleStartedAtRef = useRef<number>(Date.now());
  const activeMatchIdRef = useRef<string | null>(null);
  const activeMatchStatusRef = useRef<MatchStatus | null>(null);
  const copyStatusTimeoutRef = useRef<number | null>(null);
  const celebrateTimeoutRef = useRef<number | null>(null);

  const {
    handleCopyMatchId,
    handleRetryMatch,
    initMatch,
  } = useNumberBalanceRushMatchActions({
    balancedProbability,
    copyStatusTimeoutRef,
    durationMs,
    match,
    matchId,
    setCopyStatus,
    setCelebrating,
    setError,
    setIsLoading,
    setIsSubmitting,
    setLeftTiles,
    setMatch,
    setPlayer,
    setPlayerCount,
    setPuzzle,
    setRightTiles,
    setScore,
    setScores,
    setSelectedTileId,
    setServerOffsetMs,
    setSolves,
    setTrayTiles,
    lastLoadedPuzzleIndexRef,
    lastLoadedPuzzleStartRef,
    solveTimesRef,
    tier,
    translations,
  });

  useNumberBalanceRushLifecycleEffects({
    celebrateTimeoutRef,
    copyStatusTimeoutRef,
    initMatch,
    matchId,
    setClockNowMs,
  });

  const {
    activeMatchId,
    activeMatchStatus,
    countdownLeftMs,
    hasOpponent,
    leaderboardEntries,
    opponentLabel,
    opponentScore,
    phase,
    playerRank,
    scoreGap,
    serverNowMs,
    shouldPoll,
    timeLeftMs,
  } = useNumberBalanceRushDerivedState({
    clockNowMs,
    durationMs,
    isLoading,
    match,
    player,
    playerCount,
    scores,
    serverOffsetMs,
    translations,
  });

  useNumberBalanceRushPollingRuntime({
    activeMatchId,
    activeMatchIdRef,
    activeMatchStatus,
    activeMatchStatusRef,
    setMatch,
    setPlayer,
    setPlayerCount,
    setScore,
    setScores,
    setServerOffsetMs,
    shouldPoll,
  });

  useNumberBalanceRushPuzzleLoader({
    lastLoadedPuzzleIndexRef,
    lastLoadedPuzzleStartRef,
    match,
    player,
    puzzleStartedAtRef,
    serverOffsetMs,
    setLeftTiles,
    setPuzzle,
    setRightTiles,
    setTrayTiles,
  });

  const {
    avgSolve,
    canInteract,
    handleDragEnd,
    moveSelectedTileTo,
    touchHint,
  } = useNumberBalanceRushInteractionState({
    celebrateTimeoutRef,
    celebrating,
    isSubmitting,
    leftTiles,
    match,
    phase,
    player,
    puzzle,
    puzzleStartedAtRef,
    rightTiles,
    selectedTileId,
    serverNowMs,
    setCelebrating,
    setError,
    setIsSubmitting,
    setPlayer,
    setPlayerCount,
    setScore,
    setScores,
    setSelectedTileId,
    setServerOffsetMs,
    setSolves,
    setLeftTiles,
    setRightTiles,
    setTrayTiles,
    solveTimesRef,
    trayTiles,
    translations,
  });

  return {
    translations,
    isCoarsePointer,
    match,
    player,
    puzzle,
    trayTiles,
    leftTiles,
    rightTiles,
    selectedTileId,
    setSelectedTileId,
    score,
    scores,
    playerCount,
    solves,
    celebrating,
    isSubmitting,
    isLoading,
    error,
    copyStatus,
    clockNowMs,
    timeLeftMs,
    countdownLeftMs,
    phase,
    opponentLabel,
    opponentScore,
    hasOpponent,
    playerRank,
    scoreGap,
    leaderboardEntries,
    avgSolve,
    initMatch,
    handleRetryMatch,
    handleCopyMatchId,
    handleDragEnd,
    moveSelectedTileTo,
    touchHint,
    canInteract,
  };
}
