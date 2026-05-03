'use client';

import { useMemo } from 'react';
import {
  resolveNumberBalanceRushMatchMeta,
  resolveNumberBalanceRushTiming,
  shouldPollNumberBalanceRushMatch,
} from './NumberBalanceRushGame.runtime';
import type { MatchStatus, UseNumberBalanceRushDerivedStateProps } from './NumberBalanceRushGame.types';

type NumberBalanceRushDerivedState = {
  activeMatchId: string | null;
  activeMatchStatus: MatchStatus;
  activePlayerId: string | null;
  shouldPoll: boolean;
} & ReturnType<typeof resolveNumberBalanceRushMatchMeta> &
  ReturnType<typeof resolveNumberBalanceRushTiming>;

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
}: UseNumberBalanceRushDerivedStateProps): NumberBalanceRushDerivedState {
  const activeMatchId = match?.matchId ?? null;
  const activeMatchStatus = (match?.status ?? 'waiting') as MatchStatus;
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
