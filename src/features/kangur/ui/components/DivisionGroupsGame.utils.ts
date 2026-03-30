'use client';

import type { Round, TokenItem, GroupZoneId, ZoneId } from './DivisionGroupsGame.types';

export const TOTAL_ROUNDS = 6;

export const TOKEN_STYLES = [
  'bg-gradient-to-br from-sky-200 via-cyan-300 to-blue-300 shadow-[0_10px_26px_-12px_rgba(14,165,233,0.55)]',
  'bg-gradient-to-br from-emerald-200 via-teal-300 to-cyan-300 shadow-[0_10px_26px_-12px_rgba(20,184,166,0.5)]',
  'bg-gradient-to-br from-indigo-200 via-blue-300 to-sky-300 shadow-[0_10px_26px_-12px_rgba(59,130,246,0.45)]',
  'bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 shadow-[0_10px_26px_-12px_rgba(251,146,60,0.5)]',
  'bg-gradient-to-br from-violet-200 via-fuchsia-300 to-pink-300 shadow-[0_10px_26px_-12px_rgba(217,70,239,0.45)]',
];
export const DEFAULT_TOKEN_STYLE = TOKEN_STYLES[0] ?? 'bg-slate-200';

export const TOKEN_EMOJIS = ['🫧', '🐟', '🐠', '⭐', '🔷'];

export const randomBetween = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const createTokens = (count: number, seed: number): TokenItem[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `division-token-${seed}-${index}`,
    emoji: TOKEN_EMOJIS[index % TOKEN_EMOJIS.length] ?? '⭐',
    style: TOKEN_STYLES[index % TOKEN_STYLES.length] ?? DEFAULT_TOKEN_STYLE,
  }));

export const buildGroups = (count: number): TokenItem[][] =>
  Array.from({ length: count }, () => []);

export const groupId = (index: number): GroupZoneId => `group-${index}`;

export const isGroupZoneId = (value: string): value is GroupZoneId =>
  value.startsWith('group-') && Number.isFinite(Number(value.slice(6)));

export const isZoneId = (value: string): value is ZoneId =>
  value === 'pool' || value === 'remainder' || isGroupZoneId(value);

export const reorderWithinList = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const next = [...list];
  const [moved] = next.splice(startIndex, 1);
  if (moved === undefined) {
    return list;
  }
  next.splice(endIndex, 0, moved);
  return next;
};

export const moveBetweenLists = <T,>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } => {
  const sourceNext = [...source];
  const destinationNext = [...destination];
  const [moved] = sourceNext.splice(sourceIndex, 1);
  if (moved === undefined) {
    return { source, destination };
  }
  destinationNext.splice(destinationIndex, 0, moved);
  return { source: sourceNext, destination: destinationNext };
};

type DivisionGroupsDifficulty = 'easy' | 'medium' | 'hard';

const resolveDivisionGroupsDifficulty = (roundIndex: number): DivisionGroupsDifficulty => {
  if (roundIndex < 2) {
    return 'easy';
  }

  if (roundIndex < 4) {
    return 'medium';
  }

  return 'hard';
};

const resolveDivisionGroupsRanges = (
  difficulty: DivisionGroupsDifficulty
): {
  divisorMax: number;
  divisorMin: number;
  quotientMax: number;
  quotientMin: number;
} => {
  if (difficulty === 'easy') {
    return {
      divisorMax: 3,
      divisorMin: 2,
      quotientMax: 4,
      quotientMin: 2,
    };
  }

  if (difficulty === 'medium') {
    return {
      divisorMax: 4,
      divisorMin: 2,
      quotientMax: 5,
      quotientMin: 3,
    };
  }

  return {
    divisorMax: 5,
    divisorMin: 3,
    quotientMax: 5,
    quotientMin: 3,
  };
};

const resolveDivisionGroupsRemainder = ({
  divisor,
  remainderAllowed,
  roundIndex,
}: {
  divisor: number;
  remainderAllowed: boolean;
  roundIndex: number;
}): number => {
  if (!remainderAllowed) {
    return 0;
  }

  const remainder = randomBetween(0, divisor - 1);
  return roundIndex % 2 === 1 ? Math.max(1, remainder) : remainder;
};

const buildDivisionGroupsCandidateRound = ({
  divisorMax,
  divisorMin,
  quotientMax,
  quotientMin,
  remainderAllowed,
  roundIndex,
}: {
  divisorMax: number;
  divisorMin: number;
  quotientMax: number;
  quotientMin: number;
  remainderAllowed: boolean;
  roundIndex: number;
}): Omit<Round, 'tokens'> => {
  const divisor = randomBetween(divisorMin, divisorMax);
  const quotient = randomBetween(quotientMin, quotientMax);
  const remainder = resolveDivisionGroupsRemainder({
    divisor,
    remainderAllowed,
    roundIndex,
  });

  return {
    dividend: divisor * quotient + remainder,
    divisor,
    quotient,
    remainder,
  };
};

export const createRound = (roundIndex: number): Round => {
  const ranges = resolveDivisionGroupsRanges(resolveDivisionGroupsDifficulty(roundIndex));
  const remainderAllowed = roundIndex >= 3;

  let candidate = buildDivisionGroupsCandidateRound({
    ...ranges,
    remainderAllowed,
    roundIndex,
  });

  while (candidate.dividend > 18) {
    candidate = buildDivisionGroupsCandidateRound({
      ...ranges,
      remainderAllowed,
      roundIndex,
    });
  }

  return {
    ...candidate,
    tokens: createTokens(candidate.dividend, roundIndex),
  };
};
