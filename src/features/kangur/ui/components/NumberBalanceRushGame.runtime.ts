'use client';

import type React from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import type { TranslationValues } from 'use-intl';

import type {
  NumberBalanceTile,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type {
  NumberBalanceMatchPlayerState,
  NumberBalancePlayerScore,
} from '@/features/kangur/shared/contracts/kangur-multiplayer-number-balance';

import type {
  MatchStatus,
  Phase,
  RoundState,
  ZoneId,
} from './NumberBalanceRushGame.types';
import {
  isTerminalMatchStatus,
  isZoneId,
  moveBetweenLists,
  removeTileById,
  reorderWithinList,
} from './NumberBalanceRushGame.utils';

type NumberBalanceTranslations = (key: string, values?: TranslationValues) => string;

type NumberBalanceLeaderboardEntry = NumberBalancePlayerScore & {
  isLeader: boolean;
  isSelf: boolean;
  label: string;
  rank: number;
};

const copyNumberBalanceTextWithFallback = async (text: string): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return true;
};

const clearNumberBalanceTimeout = (timeoutId: number | null): void => {
  if (timeoutId !== null && typeof window !== 'undefined') {
    window.clearTimeout(timeoutId);
  }
};

const resolveNumberBalanceRank = (
  scores: NumberBalancePlayerScore[],
  score: number,
  fallbackIndex: number
): number => {
  const rankIndex = scores.findIndex((entry) => entry.score === score);
  return rankIndex >= 0 ? rankIndex + 1 : fallbackIndex + 1;
};

const resolveNumberBalanceLeaderScore = (
  scores: NumberBalancePlayerScore[]
): number | null => (scores.length > 0 ? scores[0]?.score ?? 0 : null);

const resolveNumberBalanceSelfScoreEntry = ({
  activePlayerId,
  scores,
}: {
  activePlayerId: string | null;
  scores: NumberBalancePlayerScore[];
}): NumberBalancePlayerScore | null =>
  activePlayerId === null
    ? null
    : scores.find((entry) => entry.playerId === activePlayerId) ?? null;

const resolveNumberBalanceOpponentEntry = ({
  activePlayerId,
  scores,
}: {
  activePlayerId: string | null;
  scores: NumberBalancePlayerScore[];
}): NumberBalancePlayerScore | undefined =>
  activePlayerId === null
    ? undefined
    : scores.find((entry) => entry.playerId !== activePlayerId);

const resolveNumberBalanceOpponentLabel = ({
  hasOpponent,
  opponentEntry,
  opponentScore,
  translations,
}: {
  hasOpponent: boolean;
  opponentEntry: NumberBalancePlayerScore | undefined;
  opponentScore: number | null;
  translations: NumberBalanceTranslations;
}): string => {
  if (opponentEntry) {
    return translations('numberBalance.inRound.opponent.ready', { score: opponentScore ?? 0 });
  }

  if (hasOpponent) {
    return translations('numberBalance.inRound.opponent.searching');
  }

  return translations('numberBalance.inRound.opponent.empty');
};

const buildNumberBalanceLeaderboardEntries = ({
  activePlayerId,
  leaderScore,
  scores,
  translations,
}: {
  activePlayerId: string | null;
  leaderScore: number | null;
  scores: NumberBalancePlayerScore[];
  translations: NumberBalanceTranslations;
}): NumberBalanceLeaderboardEntry[] =>
  scores.map((entry, index) => {
    const isSelf = entry.playerId === activePlayerId;
    return {
      ...entry,
      isLeader: leaderScore !== null && entry.score === leaderScore,
      isSelf,
      label: isSelf
        ? translations('numberBalance.inRound.player.self')
        : translations('numberBalance.inRound.player.other', { index: index + 1 }),
      rank: resolveNumberBalanceRank(scores, entry.score, index),
    };
  });

const removeTileFromRoundState = (
  roundState: RoundState,
  selectedTileId: string
): { roundState: RoundState; tile?: NumberBalanceTile } => {
  const trayResult = removeTileById(roundState.tray, selectedTileId);
  if (trayResult.tile) {
    return {
      roundState: { ...roundState, tray: trayResult.updated },
      tile: trayResult.tile,
    };
  }

  const leftResult = removeTileById(roundState.left, selectedTileId);
  if (leftResult.tile) {
    return {
      roundState: { ...roundState, left: leftResult.updated },
      tile: leftResult.tile,
    };
  }

  const rightResult = removeTileById(roundState.right, selectedTileId);
  if (rightResult.tile) {
    return {
      roundState: { ...roundState, right: rightResult.updated },
      tile: rightResult.tile,
    };
  }

  return { roundState };
};

const appendTileToZone = (
  roundState: RoundState,
  destination: ZoneId,
  tile: NumberBalanceTile
): RoundState => {
  if (destination === 'tray') {
    return { ...roundState, tray: [...roundState.tray, tile] };
  }

  if (destination === 'left') {
    return { ...roundState, left: [...roundState.left, tile] };
  }

  return { ...roundState, right: [...roundState.right, tile] };
};

const getRoundStateZone = (roundState: RoundState, zoneId: ZoneId): NumberBalanceTile[] => {
  if (zoneId === 'tray') {
    return roundState.tray;
  }

  if (zoneId === 'left') {
    return roundState.left;
  }

  return roundState.right;
};

const setRoundStateZone = (
  roundState: RoundState,
  zoneId: ZoneId,
  tiles: NumberBalanceTile[]
): RoundState => {
  if (zoneId === 'tray') {
    return { ...roundState, tray: tiles };
  }

  if (zoneId === 'left') {
    return { ...roundState, left: tiles };
  }

  return { ...roundState, right: tiles };
};

const canDropInNumberBalanceZone = (
  zoneId: ZoneId,
  roundState: RoundState,
  slots: { left: number; right: number }
): boolean => {
  if (zoneId === 'left') {
    return roundState.left.length < slots.left;
  }

  if (zoneId === 'right') {
    return roundState.right.length < slots.right;
  }

  return true;
};

export const clearNumberBalanceRushTimeouts = ({
  celebrateTimeoutId,
  copyStatusTimeoutId,
}: {
  celebrateTimeoutId: number | null;
  copyStatusTimeoutId: number | null;
}): void => {
  clearNumberBalanceTimeout(copyStatusTimeoutId);
  clearNumberBalanceTimeout(celebrateTimeoutId);
};

export const copyNumberBalanceMatchId = async (text: string): Promise<'success' | 'error'> => {
  const didCopy = await copyNumberBalanceTextWithFallback(text);
  return didCopy ? 'success' : 'error';
};

export const scheduleNumberBalanceStatusReset = ({
  delayMs,
  onReset,
  timeoutRef,
}: {
  delayMs: number;
  onReset: () => void;
  timeoutRef: React.MutableRefObject<number | null>;
}): void => {
  clearNumberBalanceTimeout(timeoutRef.current);
  if (typeof window === 'undefined') {
    timeoutRef.current = null;
    onReset();
    return;
  }

  timeoutRef.current = window.setTimeout(() => {
    timeoutRef.current = null;
    onReset();
  }, delayMs);
};

export const resolveNumberBalanceRushPhase = ({
  isLoading,
  match,
  matchDurationMs,
  serverNowMs,
}: {
  isLoading: boolean;
  match:
    | {
        roundDurationMs: number;
        startTimeMs: number;
        status: MatchStatus;
      }
    | null;
  matchDurationMs: number;
  serverNowMs: number;
}): Phase => {
  if (!match || isLoading) {
    return 'loading';
  }

  if (match.status === 'waiting') {
    return 'waiting';
  }

  if (match.status === 'completed') {
    return 'finished';
  }

  if (serverNowMs < match.startTimeMs) {
    return 'countdown';
  }

  if (match.startTimeMs + matchDurationMs - serverNowMs <= 0) {
    return 'finished';
  }

  return 'running';
};

export const resolveNumberBalanceRushTiming = ({
  clockNowMs,
  durationMs,
  isLoading,
  match,
  serverOffsetMs,
}: {
  clockNowMs: number;
  durationMs: number;
  isLoading: boolean;
  match:
    | {
        roundDurationMs: number;
        startTimeMs: number;
        status: MatchStatus;
      }
    | null;
  serverOffsetMs: number;
}): {
  countdownLeftMs: number;
  matchDurationMs: number;
  phase: Phase;
  serverNowMs: number;
  timeLeftMs: number;
} => {
  const serverNowMs = clockNowMs + serverOffsetMs;
  const matchStartMs = match?.startTimeMs ?? serverNowMs;
  const matchDurationMs = match?.roundDurationMs ?? durationMs;
  const countdownLeftMs = match ? Math.max(0, matchStartMs - serverNowMs) : 0;
  const timeLeftMs =
    match && match.status !== 'waiting'
      ? Math.max(0, matchStartMs + matchDurationMs - serverNowMs)
      : matchDurationMs;

  return {
    countdownLeftMs,
    matchDurationMs,
    phase: resolveNumberBalanceRushPhase({
      isLoading,
      match,
      matchDurationMs,
      serverNowMs,
    }),
    serverNowMs,
    timeLeftMs,
  };
};

export const resolveNumberBalanceRushMatchMeta = ({
  activePlayerId,
  playerCount,
  scores,
  translations,
}: {
  activePlayerId: string | null;
  playerCount: number;
  scores: NumberBalancePlayerScore[];
  translations: NumberBalanceTranslations;
}): {
  hasOpponent: boolean;
  leaderboardEntries: NumberBalanceLeaderboardEntry[];
  opponentLabel: string;
  opponentScore: number | null;
  playerRank: number | null;
  scoreGap: number | null;
  sortedScores: NumberBalancePlayerScore[];
} => {
  const sortedScores = [...scores].sort((left, right) => right.score - left.score);
  const selfScoreEntry = resolveNumberBalanceSelfScoreEntry({
    activePlayerId,
    scores: sortedScores,
  });
  const leaderScore = resolveNumberBalanceLeaderScore(sortedScores);
  const playerRank =
    selfScoreEntry === null
      ? null
      : resolveNumberBalanceRank(sortedScores, selfScoreEntry.score, sortedScores.indexOf(selfScoreEntry));
  const scoreGap =
    selfScoreEntry && typeof leaderScore === 'number'
      ? Math.max(0, leaderScore - selfScoreEntry.score)
      : null;
  const opponentEntry = resolveNumberBalanceOpponentEntry({
    activePlayerId,
    scores,
  });
  const opponentScore = opponentEntry?.score ?? null;
  const hasOpponent = playerCount > 1 || opponentEntry !== undefined;
  const opponentLabel = resolveNumberBalanceOpponentLabel({
    hasOpponent,
    opponentEntry,
    opponentScore,
    translations,
  });

  return {
    hasOpponent,
    leaderboardEntries: buildNumberBalanceLeaderboardEntries({
      activePlayerId,
      leaderScore,
      scores: sortedScores,
      translations,
    }),
    opponentLabel,
    opponentScore,
    playerRank,
    scoreGap,
    sortedScores,
  };
};

export const resolveNumberBalanceRushSelectedTile = ({
  leftTiles,
  rightTiles,
  selectedTileId,
  trayTiles,
}: {
  leftTiles: NumberBalanceTile[];
  rightTiles: NumberBalanceTile[];
  selectedTileId: string | null;
  trayTiles: NumberBalanceTile[];
}): NumberBalanceTile | null => {
  if (!selectedTileId) {
    return null;
  }

  return [...trayTiles, ...leftTiles, ...rightTiles].find((tile) => tile.id === selectedTileId) ?? null;
};

export const resolveNumberBalanceRushTouchHint = ({
  selectedTile,
  translations,
}: {
  selectedTile: NumberBalanceTile | null;
  translations: NumberBalanceTranslations;
}): string =>
  selectedTile
    ? translations('numberBalance.inRound.touch.selected', { value: selectedTile.value })
    : translations('numberBalance.inRound.touch.idle');

export const resolveNumberBalanceRushAverageSolve = (solveTimes: number[]): number | null =>
  solveTimes.length > 0
    ? Math.round(solveTimes.reduce((sum, value) => sum + value, 0) / solveTimes.length)
    : null;

export const shouldPollNumberBalanceRushMatch = ({
  activeMatchId,
  activeMatchStatus,
  activePlayerId,
}: {
  activeMatchId: string | null;
  activeMatchStatus: MatchStatus | null;
  activePlayerId: string | null;
}): boolean =>
  Boolean(activeMatchId && activePlayerId) && !isTerminalMatchStatus(activeMatchStatus);

export const resolveNumberBalanceRushNextSelectedMove = ({
  canInteract,
  destination,
  leftTiles,
  puzzleSlots,
  rightTiles,
  selectedTileId,
  trayTiles,
}: {
  canInteract: boolean;
  destination: ZoneId;
  leftTiles: NumberBalanceTile[];
  puzzleSlots: { left: number; right: number };
  rightTiles: NumberBalanceTile[];
  selectedTileId: string | null;
  trayTiles: NumberBalanceTile[];
}): RoundState | null => {
  if (!canInteract || !selectedTileId) {
    return null;
  }

  const removalResult = removeTileFromRoundState(
    {
      tray: trayTiles,
      left: leftTiles,
      right: rightTiles,
    },
    selectedTileId
  );

  if (!removalResult.tile) {
    return null;
  }

  if (!canDropInNumberBalanceZone(destination, removalResult.roundState, puzzleSlots)) {
    return null;
  }

  return appendTileToZone(removalResult.roundState, destination, removalResult.tile);
};

export const resolveNumberBalanceRushNextDragMove = ({
  leftTiles,
  puzzleSlots,
  result,
  rightTiles,
  trayTiles,
}: {
  leftTiles: NumberBalanceTile[];
  puzzleSlots: { left: number; right: number };
  result: DropResult;
  rightTiles: NumberBalanceTile[];
  trayTiles: NumberBalanceTile[];
}): RoundState | null => {
  if (!result.destination) {
    return null;
  }

  const sourceId = result.source.droppableId;
  const destinationId = result.destination.droppableId;
  if (!isZoneId(sourceId) || !isZoneId(destinationId)) {
    return null;
  }

  if (sourceId === destinationId && result.source.index === result.destination.index) {
    return null;
  }

  const currentState: RoundState = {
    tray: trayTiles,
    left: leftTiles,
    right: rightTiles,
  };

  if (sourceId === destinationId) {
    const updated = reorderWithinList(
      getRoundStateZone(currentState, sourceId),
      result.source.index,
      result.destination.index
    );
    return setRoundStateZone(currentState, sourceId, updated);
  }

  if (!canDropInNumberBalanceZone(destinationId, currentState, puzzleSlots)) {
    return null;
  }

  const moved = moveBetweenLists(
    getRoundStateZone(currentState, sourceId),
    getRoundStateZone(currentState, destinationId),
    result.source.index,
    result.destination.index
  );

  return setRoundStateZone(
    setRoundStateZone(currentState, sourceId, moved.source),
    destinationId,
    moved.destination
  );
};

export const resolveNumberBalanceRushPlayerSnapshot = ({
  currentPlayer,
  nextPlayer,
}: {
  currentPlayer: NumberBalanceMatchPlayerState | null;
  nextPlayer: NumberBalanceMatchPlayerState;
}): { player: NumberBalanceMatchPlayerState; score: number } => {
  if (!currentPlayer) {
    return {
      player: nextPlayer,
      score: nextPlayer.score,
    };
  }

  if (nextPlayer.puzzleIndex < currentPlayer.puzzleIndex) {
    return {
      player: currentPlayer,
      score: currentPlayer.score,
    };
  }

  if (nextPlayer.puzzleIndex === currentPlayer.puzzleIndex && nextPlayer.score < currentPlayer.score) {
    return {
      player: currentPlayer,
      score: currentPlayer.score,
    };
  }

  return {
    player: nextPlayer,
    score: nextPlayer.score,
  };
};
