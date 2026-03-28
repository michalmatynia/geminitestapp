'use client';

import type { GeometryShapeId } from '@/features/kangur/ui/services/geometry-drawing';

export type GeometryDrawingGameProps = {
  activityKey?: string;
  difficultyLabelOverride?: string;
  finishLabel?: string;
  lessonKey?: string;
  onFinish: () => void;
  operation?: string;
  shapeIds?: GeometryShapeId[];
  showDifficultySelector?: boolean;
};

export type ShapeRound = {
  id: GeometryShapeId;
  label: string;
  emoji: string;
  hint: string;
  accent: string;
};

export type GeometryDifficultyId = 'starter' | 'pro';
