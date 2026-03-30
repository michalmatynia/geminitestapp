import { cn } from '@/features/kangur/shared/utils';
import {
  translateKangurMiniGameWithFallback,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_INLINE_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurIntlTranslate,
} from '@/features/kangur/ui/types';
import type { PartOfSpeech } from './EnglishPartsOfSpeechGame.types';

export const getPartsOfSpeechRoundMessage = (
  translate: KangurIntlTranslate,
  roundId: string,
  field: 'title' | 'prompt' | 'hint',
  fallback: string
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `englishPartsOfSpeech.inRound.rounds.${roundId}.${field}`,
    fallback
  );

export const getPartsOfSpeechPartMessage = (
  translate: KangurIntlTranslate,
  part: PartOfSpeech,
  field: 'label' | 'description',
  fallback: string
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `englishPartsOfSpeech.inRound.parts.${part}.${field}`,
    fallback
  );

export const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

export const binIdForDroppable = (binId: PartOfSpeech): string => `bin-${binId}`;
export const isBinDroppable = (value: string): boolean => value.startsWith('bin-');
export const getBinIdFromDroppable = (value: string): PartOfSpeech =>
  value.replace('bin-', '') as PartOfSpeech;

export const moveWithinList = <T,>(items: T[], from: number, to: number): T[] => {
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  if (moved === undefined) return updated;
  updated.splice(to, 0, moved);
  return updated;
};

export const moveBetweenLists = <T,>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } => {
  const nextSource = [...source];
  const nextDestination = [...destination];
  const [moved] = nextSource.splice(sourceIndex, 1);
  if (!moved) {
    return { source, destination };
  }
  nextDestination.splice(destinationIndex, 0, moved);
  return { source: nextSource, destination: nextDestination };
};

export const removeTokenById = <T extends { id: string }>(
  items: T[],
  tokenId: string
): { updated: T[]; token?: T } => {
  const index = items.findIndex((item) => item.id === tokenId);
  if (index === -1) {
    return { updated: items };
  }
  const updated = [...items];
  const [token] = updated.splice(index, 1);
  return { updated, token };
};

export const buildTokenClassName = ({
  isDragging,
  showStatus,
  isCorrect,
  isSelected,
  isCoarsePointer,
}: {
  isDragging: boolean;
  showStatus: boolean;
  isCorrect: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
}): string =>
  cn(
    KANGUR_INLINE_CENTER_ROW_CLASSNAME,
    'rounded-[18px] border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white cursor-grab select-none touch-manipulation active:scale-[0.985]',
    isCoarsePointer ? 'min-h-[52px] px-4 py-3 text-[15px]' : 'px-3 py-2 text-base',
    KANGUR_ACCENT_STYLES.slate.badge,
    KANGUR_ACCENT_STYLES.slate.hoverCard,
    isDragging && 'scale-[1.02] shadow-[0_18px_40px_-26px_rgba(15,23,42,0.2)] cursor-grabbing',
    isSelected && 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white',
    showStatus &&
      (isCorrect
        ? 'ring-2 ring-emerald-400/80 ring-offset-1 ring-offset-transparent'
        : 'ring-2 ring-rose-400/80 ring-offset-1 ring-offset-transparent')
  );
