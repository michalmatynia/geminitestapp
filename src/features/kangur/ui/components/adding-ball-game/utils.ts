import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import type {
  BallItem,
  CompleteSlotId,
  GroupSlotId,
  Round,
  RoundMode,
  SurfaceCardState,
} from './types';

export const BALL_COLORS = [
  '#f87171',
  '#60a5fa',
  '#4ade80',
  '#facc15',
  '#c084fc',
  '#f472b6',
  '#fb923c',
  '#2dd4bf',
  '#818cf8',
  '#fb7185',
] as const;

export const MODES: RoundMode[] = ['complete_equation', 'group_sum', 'pick_answer'];
export const TOTAL_ROUNDS = 6;
export const BALL_POOL_CLASSNAME =
  'flex min-h-[60px] w-full max-w-xs flex-wrap justify-center gap-2 rounded-[24px] shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)]';

export function createBalls(count: number): BallItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `ball-${i}`,
    num: 1,
    color: BALL_COLORS[i % BALL_COLORS.length] ?? BALL_COLORS[0],
  }));
}

export function formatAcceptedEquationPair(a: number, b: number): string {
  return a === b ? `${a} + ${b}` : `${a} + ${b} albo ${b} + ${a}`;
}

export function formatAcceptedGroupPair(a: number, b: number): string {
  return a === b ? `po ${a}` : `${a} i ${b}`;
}

export function isAcceptedCountSplit(
  firstCount: number,
  secondCount: number,
  a: number,
  b: number
): boolean {
  return (
    (firstCount === a && secondCount === b) ||
    (firstCount === b && secondCount === a)
  );
}

export function formatSubmittedEquationPair(firstCount: number, secondCount: number): string {
  return `${firstCount} + ${secondCount}`;
}

export function formatSubmittedGroupPair(firstCount: number, secondCount: number): string {
  return `${firstCount} i ${secondCount}`;
}

export function removeBallById(items: BallItem[], id: string): { updated: BallItem[]; ball: BallItem | null } {
  const index = items.findIndex((entry) => entry.id === id);
  if (index === -1) return { updated: items, ball: null };
  const updated = [...items];
  const [ball] = updated.splice(index, 1);
  return { updated, ball: ball ?? null };
}

export function reorderWithinList<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const next = [...list];
  const [moved] = next.splice(startIndex, 1);
  if (moved === undefined) {
    return list;
  }
  next.splice(endIndex, 0, moved);
  return next;
}

export function moveBetweenLists<T>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } {
  const sourceNext = [...source];
  const destinationNext = [...destination];
  const [moved] = sourceNext.splice(sourceIndex, 1);
  if (moved === undefined) {
    return { source, destination };
  }
  destinationNext.splice(destinationIndex, 0, moved);
  return { source: sourceNext, destination: destinationNext };
}

export function isCompleteSlotId(id: string): id is CompleteSlotId {
  return id === 'pool' || id === 'slotA' || id === 'slotB';
}

export function isGroupSlotId(id: string): id is GroupSlotId {
  return id === 'pool' || id === 'group1' || id === 'group2';
}

export function generateRound(mode: RoundMode): Round {
  const random1to9 = (): number => Math.floor(Math.random() * 9) + 1;

  if (mode === 'complete_equation') {
    const a = random1to9();
    const b = random1to9();
    return { mode, a, b, target: a + b };
  }

  if (mode === 'group_sum') {
    const target = Math.floor(Math.random() * 8) + 4;
    const a = Math.floor(Math.random() * (target - 1)) + 1;
    const b = target - a;
    return { mode, target, a, b };
  }

  const a = random1to9();
  const b = random1to9();
  const correct = a + b;
  const wrongs = new Set<number>();

  while (wrongs.size < 3) {
    const delta = Math.floor(Math.random() * 5) + 1;
    const sign = Math.random() < 0.5 ? 1 : -1;
    const wrong = correct + delta * sign;
    if (wrong > 0 && wrong !== correct) {
      wrongs.add(wrong);
    }
  }

  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return { mode, a, b, correct, choices };
}

export const getRectDropZoneSurface = ({
  isDraggingOver,
  checked,
  correct,
}: {
  isDraggingOver: boolean;
  checked: boolean;
  correct: boolean;
}): SurfaceCardState => {
  if (checked) {
    return {
      accent: correct ? 'emerald' : 'rose',
      className: 'flex flex-wrap gap-1 rounded-[22px] p-2 transition-all',
      tone: 'accent',
    };
  }

  if (isDraggingOver) {
    return {
      accent: 'amber',
      className: 'flex flex-wrap gap-1 rounded-[22px] p-2 transition-all scale-[1.02]',
      tone: 'accent',
    };
  }

  return {
    accent: 'amber',
    className: cn(
      'flex flex-wrap gap-1 rounded-[22px] p-2 transition-all',
      KANGUR_ACCENT_STYLES.amber.hoverCard
    ),
    tone: 'neutral',
  };
};

export const getAnswerSlotSurface = ({
  isDraggingOver,
  checked,
  correct,
}: {
  isDraggingOver: boolean;
  checked: boolean;
  correct: boolean;
}): SurfaceCardState => {
  if (checked) {
    return {
      accent: correct ? 'emerald' : 'rose',
      className:
        'flex h-24 w-24 items-center justify-center rounded-full border-2 p-0 text-center transition-all',
      tone: 'accent',
    };
  }

  if (isDraggingOver) {
    return {
      accent: 'amber',
      className:
        'flex h-24 w-24 items-center justify-center rounded-full border-2 p-0 text-center transition-all scale-110',
      tone: 'accent',
    };
  }

  return {
    accent: 'amber',
    className: cn(
      'flex h-24 w-24 items-center justify-center rounded-full border-2 p-0 text-center transition-all',
      KANGUR_ACCENT_STYLES.amber.hoverCard
    ),
    tone: 'neutral',
  };
};
