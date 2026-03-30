import type {
  NumberBalancePuzzle,
  NumberBalanceTile,
  NumberBalancePlacement,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import type { MatchStatus, ZoneId } from './NumberBalanceRushGame.types';

export const isTerminalMatchStatus = (status: MatchStatus | null): boolean =>
  status !== null && status !== 'waiting' && status !== 'in_progress';

export const TILE_STYLES = [
  'bg-gradient-to-br from-amber-200 via-orange-200 to-rose-200 text-amber-900',
  'bg-gradient-to-br from-sky-200 via-cyan-200 to-emerald-200 text-sky-900',
  'bg-gradient-to-br from-violet-200 via-fuchsia-200 to-pink-200 text-violet-900',
  'bg-gradient-to-br from-lime-200 via-emerald-200 to-teal-200 text-emerald-900',
  'bg-gradient-to-br from-yellow-200 via-amber-200 to-orange-200 text-amber-900',
  'bg-gradient-to-br from-indigo-200 via-blue-200 to-sky-200 text-indigo-900',
] as const;

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

export const removeTileById = <T extends { id: string }>(
  items: T[],
  tileId: string
): { updated: T[]; tile?: T } => {
  const index = items.findIndex((item) => item.id === tileId);
  if (index === -1) {
    return { updated: items };
  }
  const updated = [...items];
  const [tile] = updated.splice(index, 1);
  return { updated, tile };
};

export const isZoneId = (value: string): value is ZoneId =>
  value === 'tray' || value === 'left' || value === 'right';

export const buildPlacement = (
  puzzle: NumberBalancePuzzle,
  left: NumberBalanceTile[],
  right: NumberBalanceTile[]
): NumberBalancePlacement => {
  const placement: NumberBalancePlacement = {};
  puzzle.tiles.forEach((tile) => {
    placement[tile.id] = 'tray';
  });
  left.forEach((tile) => {
    placement[tile.id] = 'left';
  });
  right.forEach((tile) => {
    placement[tile.id] = 'right';
  });
  return placement;
};
