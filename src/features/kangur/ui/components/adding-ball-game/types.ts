import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type BallItem = {
  id: string;
  num: number;
  color: string;
};

export type RoundMode = 'complete_equation' | 'group_sum' | 'pick_answer';

export type BinaryTargetRound = {
  a: number;
  b: number;
  target: number;
};

export type CompleteEquationRound = {
  mode: 'complete_equation';
} & BinaryTargetRound;

export type GroupSumRound = {
  mode: 'group_sum';
} & BinaryTargetRound;

export type PickAnswerRound = {
  mode: 'pick_answer';
  a: number;
  b: number;
  correct: number;
  choices: number[];
};

export type Round = CompleteEquationRound | GroupSumRound | PickAnswerRound;

export type CompleteEquationState = {
  pool: BallItem[];
  slotA: BallItem[];
  slotB: BallItem[];
};

export type GroupSumState = {
  pool: BallItem[];
  group1: BallItem[];
  group2: BallItem[];
};

export type CompleteSlotId = keyof CompleteEquationState;
export type GroupSlotId = keyof GroupSumState;

export type SlotZoneProps = {
  id: 'slotA' | 'slotB';
  items: BallItem[];
  label: string;
  checked: boolean;
  correct: boolean;
  selectedBallId?: string | null;
  onSelectBall?: (id: string) => void;
};

export type BallProps = {
  ball: BallItem;
  small?: boolean;
};

export type DraggableBallProps = {
  ball: BallItem;
  index: number;
  isDragDisabled?: boolean;
  small?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
};

export type SurfaceTone = 'neutral' | 'accent';

export type SurfaceCardState = {
  accent: KangurAccent;
  className: string;
  tone: SurfaceTone;
};
