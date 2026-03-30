'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type {
  NumberBalanceMatchPlayerState,
  NumberBalanceMatchState,
  NumberBalancePlayerScore,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';
import type { MatchStatus } from './NumberBalanceRushGame.types';
import {
  resolveNumberBalanceRushMatchMeta,
  resolveNumberBalanceRushTiming,
  shouldPollNumberBalanceRushMatch,
} from './NumberBalanceRushGame.runtime';

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

export function useNumberBalanceRushDerivedState({
  clockNowMs,
  durationMs,
  isLoading,
  match,
  player,
  playerCount,
  scores,
  serverOffsetMs,
  translations,
}: UseNumberBalanceRushDerivedStateProps) {
  const activeMatchId = match?.matchId ?? null;
  const activeMatchStatus: MatchStatus | null = match?.status ?? null;
  const activePlayerId = player?.playerId ?? null;
  const shouldPoll = shouldPollNumberBalanceRushMatch({
    activeMatchId,
    activeMatchStatus,
    activePlayerId,
  });
  const matchMeta = useMemo(
    () =>
      resolveNumberBalanceRushMatchMeta({
        activePlayerId,
        playerCount,
        scores,
        translations,
      }),
    [activePlayerId, playerCount, scores, translations]
  );
  const timing = useMemo(
    () =>
      resolveNumberBalanceRushTiming({
        clockNowMs,
        durationMs,
        isLoading,
        match,
        serverOffsetMs,
      }),
    [clockNowMs, durationMs, isLoading, match, serverOffsetMs]
  );

  return {
    activeMatchId,
    activeMatchStatus,
    activePlayerId,
    shouldPoll,
    ...matchMeta,
    ...timing,
  };
}
