'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_KANGUR_FREEFORM_DRAWING_STROKE_WIDTHS,
  resolveKangurFreeformDrawingStrokeWidths,
  resolveKangurFreeformDrawingToolConfig,
  type KangurFreeformDrawingToolConfig,
} from './freeform-config';
import type {
  KangurFreeformDrawingStrokeMeta,
  KangurFreeformDrawingTool,
} from './types';

type UseKangurFreeformDrawingToolsOptions = {
  config?: KangurFreeformDrawingToolConfig;
  isCoarsePointer?: boolean;
};

export type UseKangurFreeformDrawingToolsResult = {
  activeTool: KangurFreeformDrawingTool;
  colors: readonly string[];
  isEraser: boolean;
  selectColor: (color: string) => void;
  selectEraser: () => void;
  selectPen: () => void;
  selectWidth: (width: number) => void;
  selectedColor: string;
  selectedWidth: number;
  strokeMeta: KangurFreeformDrawingStrokeMeta;
  strokeWidths: readonly number[];
};

export function useKangurFreeformDrawingTools({
  config,
  isCoarsePointer = false,
}: UseKangurFreeformDrawingToolsOptions = {}): UseKangurFreeformDrawingToolsResult {
  const resolvedConfig = useMemo(
    () => resolveKangurFreeformDrawingToolConfig(config),
    [config]
  );
  const resolvedColors = resolvedConfig.colors;
  const resolvedStrokeWidths = useMemo(
    () => resolveKangurFreeformDrawingStrokeWidths(resolvedConfig, isCoarsePointer),
    [isCoarsePointer, resolvedConfig]
  );
  const preferredWidth =
    resolvedStrokeWidths[resolvedConfig.preferredWidthIndex] ??
    resolvedStrokeWidths[0] ??
    resolvedConfig.strokeWidths[resolvedConfig.preferredWidthIndex] ??
    resolvedConfig.strokeWidths[0] ??
    DEFAULT_KANGUR_FREEFORM_DRAWING_STROKE_WIDTHS[0];
  const [selectedColor, setSelectedColor] = useState<string>(
    resolvedConfig.defaultColor
  );
  const [selectedWidth, setSelectedWidth] = useState<number>(preferredWidth);
  const [activeTool, setActiveTool] =
    useState<KangurFreeformDrawingTool>(resolvedConfig.defaultTool);

  useEffect(() => {
    setSelectedColor((current) =>
      resolvedColors.includes(current)
        ? current
        : resolvedConfig.defaultColor
    );
  }, [resolvedColors, resolvedConfig.defaultColor]);

  useEffect(() => {
    setSelectedWidth((current) =>
      resolvedStrokeWidths.includes(current) ? current : preferredWidth
    );
  }, [preferredWidth, resolvedStrokeWidths]);

  const isEraser = activeTool === 'eraser';

  return {
    activeTool,
    colors: resolvedColors,
    isEraser,
    selectColor: (color) => {
      setSelectedColor(color);
      setActiveTool('pen');
    },
    selectEraser: () => {
      setActiveTool('eraser');
    },
    selectPen: () => {
      setActiveTool('pen');
    },
    selectWidth: (width) => {
      setSelectedWidth(width);
      setActiveTool('pen');
    },
    selectedColor,
    selectedWidth,
    strokeMeta: {
      color: selectedColor,
      isEraser,
      width: isEraser
        ? selectedWidth * resolvedConfig.eraserWidthMultiplier
        : selectedWidth,
    },
    strokeWidths: resolvedStrokeWidths,
  };
}
