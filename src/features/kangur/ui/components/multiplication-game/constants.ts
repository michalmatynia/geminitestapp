import { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';

export type MultiplicationArrayProblem = [number, number];

export const TOTAL_ROUNDS = 6;

export const GROUP_SIZES: MultiplicationArrayProblem[] = [
  [2, 3],
  [3, 4],
  [2, 5],
  [4, 3],
  [3, 6],
  [5, 2],
  [4, 4],
  [3, 5],
  [2, 6],
  [4, 5],
  [3, 3],
  [5, 3],
];

export const ROW_COLORS = [
  'bg-purple-400',
  'bg-indigo-400',
  'bg-violet-400',
  'bg-fuchsia-400',
  'bg-pink-400',
] as const;

export const ROW_GLOW = [
  'bg-purple-500 shadow-purple-300',
  'bg-indigo-500 shadow-indigo-300',
  'bg-violet-500 shadow-violet-300',
  'bg-fuchsia-500 shadow-fuchsia-300',
  'bg-pink-500 shadow-pink-300',
] as const;

export function pickProblem(excludePrev?: MultiplicationArrayProblem): MultiplicationArrayProblem {
  const candidates = GROUP_SIZES.filter(
    ([a, b]) => a !== excludePrev?.[0] || b !== (excludePrev?.[1] ?? -1)
  );
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return pick ?? [3, 4];
}
