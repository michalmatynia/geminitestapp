'use client';

import type {
  KangurDrawingStrokeRenderMode,
  KangurFreeformDrawingTool,
} from './types';

export type KangurFreeformDrawingToolConfig = {
  colors?: readonly string[];
  coarsePointerWidthBoost?: number;
  defaultColor?: string;
  defaultTool?: KangurFreeformDrawingTool;
  eraserWidthMultiplier?: number;
  preferredWidthIndex?: number;
  strokeRenderMode?: KangurDrawingStrokeRenderMode;
  strokeWidths?: readonly number[];
};

export type ResolvedKangurFreeformDrawingToolConfig = Required<KangurFreeformDrawingToolConfig>;

export const DEFAULT_KANGUR_FREEFORM_DRAWING_COLORS = [
  '#1e293b',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#f59e0b',
] as const;

export const DEFAULT_KANGUR_FREEFORM_DRAWING_STROKE_WIDTHS = [2, 4, 8] as const;

export const DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG: ResolvedKangurFreeformDrawingToolConfig = {
  colors: DEFAULT_KANGUR_FREEFORM_DRAWING_COLORS,
  coarsePointerWidthBoost: 2,
  defaultColor: DEFAULT_KANGUR_FREEFORM_DRAWING_COLORS[0],
  defaultTool: 'pen',
  eraserWidthMultiplier: 3,
  preferredWidthIndex: 1,
  strokeRenderMode: 'smooth',
  strokeWidths: DEFAULT_KANGUR_FREEFORM_DRAWING_STROKE_WIDTHS,
};

export function resolveKangurFreeformDrawingToolConfig(
  config?: KangurFreeformDrawingToolConfig
): ResolvedKangurFreeformDrawingToolConfig {
  const colors =
    config?.colors && config.colors.length > 0
      ? [...config.colors]
      : [...DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.colors];
  const strokeWidths =
    config?.strokeWidths && config.strokeWidths.length > 0
      ? [...config.strokeWidths]
      : [...DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.strokeWidths];
  const defaultColor =
    config?.defaultColor && colors.includes(config.defaultColor)
      ? config.defaultColor
      : (colors[0] ?? DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.defaultColor);

  return {
    colors,
    coarsePointerWidthBoost:
      config?.coarsePointerWidthBoost ??
      DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.coarsePointerWidthBoost,
    defaultColor,
    defaultTool:
      config?.defaultTool ?? DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.defaultTool,
    eraserWidthMultiplier:
      config?.eraserWidthMultiplier ??
      DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.eraserWidthMultiplier,
    preferredWidthIndex:
      config?.preferredWidthIndex ??
      DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.preferredWidthIndex,
    strokeRenderMode:
      config?.strokeRenderMode ??
      DEFAULT_KANGUR_FREEFORM_DRAWING_TOOL_CONFIG.strokeRenderMode,
    strokeWidths,
  };
}

export function resolveKangurFreeformDrawingStrokeWidths(
  config: ResolvedKangurFreeformDrawingToolConfig,
  isCoarsePointer: boolean
): readonly number[] {
  return config.strokeWidths.map((width) =>
    isCoarsePointer ? width + config.coarsePointerWidthBoost : width
  );
}
