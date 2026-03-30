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
  'bg-red-400',
  'bg-blue-400',
  'bg-green-400',
  'bg-yellow-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-orange-400',
  'bg-teal-400',
  'bg-indigo-400',
  'bg-rose-400',
] as const;

type BallSurfacePalette = {
  base: string;
  edge: string;
  highlight: string;
  shadow: string;
};

const BALL_SURFACE_PALETTES: Record<(typeof BALL_COLORS)[number], BallSurfacePalette> = {
  'bg-red-400': {
    base: 'rgba(248,113,113,0.98)',
    edge: 'rgba(190,24,93,0.98)',
    highlight: 'rgba(255,241,242,0.98)',
    shadow: 'rgba(239,68,68,0.5)',
  },
  'bg-blue-400': {
    base: 'rgba(96,165,250,0.98)',
    edge: 'rgba(37,99,235,0.98)',
    highlight: 'rgba(239,246,255,0.98)',
    shadow: 'rgba(59,130,246,0.48)',
  },
  'bg-green-400': {
    base: 'rgba(74,222,128,0.98)',
    edge: 'rgba(22,163,74,0.98)',
    highlight: 'rgba(240,253,244,0.98)',
    shadow: 'rgba(34,197,94,0.44)',
  },
  'bg-yellow-400': {
    base: 'rgba(250,204,21,0.98)',
    edge: 'rgba(217,119,6,0.98)',
    highlight: 'rgba(254,252,232,0.98)',
    shadow: 'rgba(234,179,8,0.44)',
  },
  'bg-purple-400': {
    base: 'rgba(192,132,252,0.98)',
    edge: 'rgba(147,51,234,0.98)',
    highlight: 'rgba(250,245,255,0.98)',
    shadow: 'rgba(168,85,247,0.46)',
  },
  'bg-pink-400': {
    base: 'rgba(244,114,182,0.98)',
    edge: 'rgba(219,39,119,0.98)',
    highlight: 'rgba(253,242,248,0.98)',
    shadow: 'rgba(236,72,153,0.44)',
  },
  'bg-orange-400': {
    base: 'rgba(251,146,60,0.98)',
    edge: 'rgba(234,88,12,0.98)',
    highlight: 'rgba(255,247,237,0.98)',
    shadow: 'rgba(249,115,22,0.46)',
  },
  'bg-teal-400': {
    base: 'rgba(45,212,191,0.98)',
    edge: 'rgba(13,148,136,0.98)',
    highlight: 'rgba(240,253,250,0.98)',
    shadow: 'rgba(20,184,166,0.44)',
  },
  'bg-indigo-400': {
    base: 'rgba(129,140,248,0.98)',
    edge: 'rgba(79,70,229,0.98)',
    highlight: 'rgba(238,242,255,0.98)',
    shadow: 'rgba(99,102,241,0.46)',
  },
  'bg-rose-400': {
    base: 'rgba(251,113,133,0.98)',
    edge: 'rgba(225,29,72,0.98)',
    highlight: 'rgba(255,241,242,0.98)',
    shadow: 'rgba(244,63,94,0.48)',
  },
};

const getBallSurfacePalette = (colorClassName: string): BallSurfacePalette =>
  BALL_SURFACE_PALETTES[colorClassName as keyof typeof BALL_SURFACE_PALETTES] ??
  BALL_SURFACE_PALETTES['bg-blue-400'];

export const getBallSurfaceStyle = (colorClassName: string) => {
  const palette = getBallSurfacePalette(colorClassName);

  return {
    background: `radial-gradient(circle at 30% 24%, ${palette.highlight} 0%, rgba(255,255,255,0.56) 14%, ${palette.base} 36%, ${palette.edge} 100%)`,
    borderColor: 'rgba(255,255,255,0.7)',
    boxShadow: `0 18px 32px -18px ${palette.shadow}, inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -10px 14px rgba(15,23,42,0.14)`,
  };
};

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
