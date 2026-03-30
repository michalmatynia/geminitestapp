import type { KangurDrawingStrokeRenderStyle } from '@/features/kangur/ui/components/drawing-engine/types';
import type { KangurMiniGameFeedbackState } from '@/features/kangur/ui/types';

type KangurTracingCanvasConfigOptions = {
  coarseMinDrawingLength?: number;
  coarseMinDrawingPoints?: number;
  coarseShadowBlur?: number;
  coarseStrokeWidth?: number;
  fineMinDrawingLength: number;
  fineMinDrawingPoints: number;
  fineShadowBlur?: number;
  fineStrokeWidth?: number;
  shadowColor?: string;
  strokeStyle?: string;
};

export type KangurTracingCanvasConfig = {
  minDrawingLength: number;
  minDrawingPoints: number;
  minPointDistance: number;
  strokeStyle: KangurDrawingStrokeRenderStyle;
};

export const getKangurTracingCanvasConfig = (
  isCoarsePointer: boolean,
  {
    coarseMinDrawingLength = 120,
    coarseMinDrawingPoints = 12,
    coarseShadowBlur = 8,
    coarseStrokeWidth = 14,
    fineMinDrawingLength,
    fineMinDrawingPoints,
    fineShadowBlur = 6,
    fineStrokeWidth = 10,
    shadowColor = 'rgba(15, 23, 42, 0.12)',
    strokeStyle = '#0f172a',
  }: KangurTracingCanvasConfigOptions
): KangurTracingCanvasConfig => ({
  minDrawingLength: isCoarsePointer ? coarseMinDrawingLength : fineMinDrawingLength,
  minDrawingPoints: isCoarsePointer ? coarseMinDrawingPoints : fineMinDrawingPoints,
  minPointDistance: isCoarsePointer ? 5 : 2,
  strokeStyle: {
    lineWidth: isCoarsePointer ? coarseStrokeWidth : fineStrokeWidth,
    shadowBlur: isCoarsePointer ? coarseShadowBlur : fineShadowBlur,
    shadowColor,
    strokeStyle,
  },
});

type EvaluateKangurTracingAttemptOptions = {
  keepGoingText: string;
  minDrawingLength: number;
  minDrawingPoints: number;
  pointCount: number;
  strokeLength: number;
  successText: string;
  tooShortText: string;
};

export const evaluateKangurTracingAttempt = ({
  keepGoingText,
  minDrawingLength,
  minDrawingPoints,
  pointCount,
  strokeLength,
  successText,
  tooShortText,
}: EvaluateKangurTracingAttemptOptions): KangurMiniGameFeedbackState => {
  if (pointCount < minDrawingPoints) {
    return {
      kind: 'error',
      text: tooShortText,
    };
  }

  if (strokeLength < minDrawingLength) {
    return {
      kind: 'error',
      text: keepGoingText,
    };
  }

  return {
    kind: 'success',
    text: successText,
  };
};
