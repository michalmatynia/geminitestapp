import type { Point2d } from '@/shared/contracts/geometry';
import type {
  SymmetryAxis,
  SymmetryExpectedSide,
} from '@/features/kangur/ui/services/geometry-symmetry';

export type TemplatePath = {
  points: Point2d[];
  closed?: boolean;
};

export type TemplateShape = {
  paths: TemplatePath[];
};

export type SymmetryRoundType = 'axis' | 'mirror';

export type SymmetryRound = {
  id: string;
  type: SymmetryRoundType;
  title: string;
  prompt: string;
  hint: string;
  emoji: string;
  axis: SymmetryAxis;
  template: TemplateShape;
  expectedSide?: SymmetryExpectedSide;
};

export type ShapeBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};
