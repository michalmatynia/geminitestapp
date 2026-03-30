import { z } from 'zod';
import type { AiNode, Edge } from './ai-paths-core';

export const pathUiStateSchema = z.object({
  selectedNodeId: z.string().nullable().optional(),
  configOpen: z.boolean().optional(),
});
export type PathUiState = z.infer<typeof pathUiStateSchema>;

export type MarqueeMode = 'replace' | 'add' | 'subtract';

export type MarqueeSelectionState = {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
};

export type SubgraphClipboardPayload = {
  version: 1;
  sourcePathId: string | null;
  capturedAt: string;
  nodes: AiNode[];
  edges: Edge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

export type TouchPointSample = {
  x: number;
  y: number;
  time: number;
  ts?: number;
  vx?: number;
  vy?: number;
};

export type TouchGestureState =
  | {
      mode: 'pinch';
      pointerIds: [number, number];
      startDistance: number;
      startScale: number;
      anchorCanvas: { x: number; y: number };
    }
  | {
      mode: 'pan';
      pointerId: number;
      recentSamples: TouchPointSample[];
    };

export type TouchLongPressSelectionState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startedAt: number;
  indicatorViewportX: number;
  indicatorViewportY: number;
  mode: MarqueeMode;
  baseNodeIds: string[];
  timerId: number | null;
};

export type TouchLongPressIndicatorState = {
  x: number;
  y: number;
  progress: number;
  phase: 'pending' | 'activated';
};

export interface HandleSelectNodeOptions {
  toggle?: boolean;
}
