'use client';

import { cn } from '@/features/kangur/shared/utils';
import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { LogicalPatternRound, LogicalPatternTile } from '../logical-patterns-workshop-data';
import type { RoundState, BlankCell } from './LogicalPatternsGame.types';

export const createFallbackRound = (): LogicalPatternRound => ({
  id: 'fallback',
  title: 'Wzorce i ciągi',
  prompt: 'Brak danych do gry.',
  ruleHint: 'Uzupełnij brakujące elementy.',
  ruleSummary: 'Uzupełnij brakujące elementy.',
  stepHint: 'Najpierw znajdź powtarzający się fragment.',
  pool: [],
  sequence: [],
});

export const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const buildRoundState = (
  round: LogicalPatternRound,
  tiles: Record<string, LogicalPatternTile>
): RoundState => {
  const pool = shuffle(
    round.pool
      .map((tileId) => tiles[tileId])
      .filter((tile): tile is LogicalPatternTile => Boolean(tile))
  );
  const slots = round.sequence
    .filter((cell): cell is BlankCell => cell.type === 'blank')
    .reduce<RoundState['slots']>((acc, blank) => {
      acc[blank.id] = [];
      return acc;
    }, {});
  return { pool, slots };
};

export const slotIdForBlank = (blankId: string): string => `slot-${blankId}`;
export const isSlotId = (value: string): boolean => value.startsWith('slot-');
export const getBlankIdFromSlot = (slotId: string): string => slotId.replace('slot-', '');

export const removeTokenById = (
  items: LogicalPatternTile[],
  tokenId: string
): { updated: LogicalPatternTile[]; token?: LogicalPatternTile } => {
  const index = items.findIndex((item) => item.id === tokenId);
  if (index < 0) {
    return { updated: items };
  }
  const updated = [...items];
  const [token] = updated.splice(index, 1);
  return { updated, token };
};

export const ringClasses: Record<KangurAccent, string> = {
  indigo: 'ring-indigo-400/70',
  violet: 'ring-violet-400/70',
  emerald: 'ring-emerald-400/70',
  sky: 'ring-sky-400/70',
  amber: 'ring-amber-400/70',
  rose: 'ring-rose-400/70',
  teal: 'ring-teal-400/70',
  slate: 'ring-slate-400/70',
};

export const buildTileClassName = ({
  accent,
  isSelected,
  isDragging,
  isCompact,
  isDisabled,
  isCoarsePointer,
  isMuted,
}: {
  accent: KangurAccent;
  isSelected: boolean;
  isDragging: boolean;
  isCompact: boolean;
  isDisabled: boolean;
  isCoarsePointer: boolean;
  isMuted: boolean;
}): string =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-[18px] border font-semibold transition touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
    isCompact ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-base',
    isCoarsePointer && (isCompact ? 'min-h-[3rem] min-w-[3rem] active:scale-[0.98] active:shadow-sm' : 'min-h-[4rem] min-w-[4rem] active:scale-[0.98] active:shadow-sm'),
    KANGUR_ACCENT_STYLES[accent].badge,
    !isDisabled && KANGUR_ACCENT_STYLES[accent].hoverCard,
    isSelected && `ring-2 ${ringClasses[accent]} ring-offset-1 ring-offset-transparent`,
    isDragging && 'scale-[1.02] shadow-[0_18px_40px_-24px_rgba(124,58,237,0.35)]',
    isDisabled ? 'cursor-default' : 'cursor-pointer',
    isMuted && 'opacity-70'
  );

export const getSlotSurface = ({
  checked,
  isDraggingOver,
  isCorrect,
  hasToken,
}: {
  checked: boolean;
  isDraggingOver: boolean;
  isCorrect: boolean;
  hasToken: boolean;
}): { accent: KangurAccent; className: string } => {
  const focusRingClassName =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white';
  if (checked && hasToken) {
    return {
      accent: isCorrect ? 'emerald' : 'rose',
      className: cn(
        'flex min-h-[56px] min-w-[64px] items-center justify-center rounded-[20px] border px-2 py-2 transition',
        focusRingClassName,
        isCorrect
          ? KANGUR_ACCENT_STYLES.emerald.activeCard
          : KANGUR_ACCENT_STYLES.rose.activeCard
      ),
    };
  }

  if (isDraggingOver) {
    return {
      accent: 'violet',
      className: cn(
        'flex min-h-[56px] min-w-[64px] items-center justify-center rounded-[20px] border border-violet-300 bg-violet-100/70 px-2 py-2 transition scale-[1.02]',
        focusRingClassName
      ),
    };
  }

  return {
    accent: 'violet',
    className: cn(
      'flex min-h-[56px] min-w-[64px] items-center justify-center rounded-[20px] border border-dashed border-violet-300/70 px-2 py-2 text-xs font-semibold text-violet-600/80 transition',
      focusRingClassName,
      KANGUR_ACCENT_STYLES.violet.hoverCard
    ),
  };
};
