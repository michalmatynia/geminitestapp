'use client';

import React from 'react';

import {
  applyCanvasResizeLocalTransform,
  type CanvasResizeDirection,
} from '@/features/ai/image-studio/utils/canvas-resize';

import { parseCanvasSizePresetValue } from './right-sidebar-utils';
import { useMaskingActions, useMaskingState } from '../../context/MaskingContext';
import { useProjectsActions, useProjectsState } from '../../context/ProjectsContext';
import { useSlotsState } from '../../context/SlotsContext';
import { useUiActions, useUiState } from '../../context/UiContext';


type ApplyCanvasResizeArgs = {
  direction: CanvasResizeDirection;
  height: number;
  onSuccess?: () => void;
  width: number;
};

type ApplyCanvasSizePresetArgs = {
  direction?: CanvasResizeDirection;
  onSuccess?: () => void;
  presetValue: string;
};

type UseRightSidebarCanvasResizeResult = {
  applyCanvasResize: (args: ApplyCanvasResizeArgs) => Promise<boolean>;
  applyCanvasSizePreset: (args: ApplyCanvasSizePresetArgs) => Promise<boolean>;
  canResizeCanvas: boolean;
  fallbackCanvasHeightPx: number;
  fallbackCanvasWidthPx: number;
  resizeCanvasBusy: boolean;
};

export function useRightSidebarCanvasResize(): UseRightSidebarCanvasResizeResult {
  const { projectId, projectsQuery } = useProjectsState();
  const { handleResizeProjectCanvas, resizeProjectCanvasMutation } = useProjectsActions();
  const { workingSlot } = useSlotsState();
  const { maskShapes } = useMaskingState();
  const { setMaskShapes } = useMaskingActions();
  const { canvasImageOffset } = useUiState();
  const { setCanvasImageOffset, getPreviewCanvasImageFrame } = useUiActions();

  const activeProject = React.useMemo(
    () => (projectsQuery.data ?? []).find((project) => project.id === projectId) ?? null,
    [projectId, projectsQuery.data]
  );
  const projectCanvasWidthPx = React.useMemo(() => {
    const width = activeProject?.canvasWidthPx ?? null;
    return typeof width === 'number' && Number.isFinite(width) && width > 0 ? Math.floor(width) : null;
  }, [activeProject?.canvasWidthPx]);
  const projectCanvasHeightPx = React.useMemo(() => {
    const height = activeProject?.canvasHeightPx ?? null;
    return typeof height === 'number' && Number.isFinite(height) && height > 0
      ? Math.floor(height)
      : null;
  }, [activeProject?.canvasHeightPx]);
  const fallbackCanvasWidthPx = React.useMemo(
    () => projectCanvasWidthPx ?? workingSlot?.imageFile?.width ?? 1024,
    [projectCanvasWidthPx, workingSlot?.imageFile?.width]
  );
  const fallbackCanvasHeightPx = React.useMemo(
    () => projectCanvasHeightPx ?? workingSlot?.imageFile?.height ?? 1024,
    [projectCanvasHeightPx, workingSlot?.imageFile?.height]
  );

  const normalizedProjectId = projectId.trim();
  const canResizeCanvas = normalizedProjectId.length > 0;
  const resizeCanvasBusy = resizeProjectCanvasMutation.isPending;

  const applyCanvasResize = React.useCallback(
    async ({ direction, height, onSuccess, width }: ApplyCanvasResizeArgs): Promise<boolean> => {
      if (!canResizeCanvas || resizeCanvasBusy) return false;

      const transform = applyCanvasResizeLocalTransform({
        shapes: maskShapes,
        oldCanvasWidth: fallbackCanvasWidthPx,
        oldCanvasHeight: fallbackCanvasHeightPx,
        newCanvasWidth: width,
        newCanvasHeight: height,
        direction,
        currentImageOffset: canvasImageOffset,
        currentImageFrame: getPreviewCanvasImageFrame()?.frame,
        sourceAspectRatio:
          workingSlot?.imageFile?.width && workingSlot?.imageFile?.height
            ? workingSlot.imageFile.width / workingSlot.imageFile.height
            : null,
      });

      await handleResizeProjectCanvas({
        projectId: normalizedProjectId,
        canvasWidthPx: width,
        canvasHeightPx: height,
      });
      setMaskShapes(transform.shapes);
      setCanvasImageOffset(transform.imageOffset);
      onSuccess?.();
      return true;
    },
    [
      canResizeCanvas,
      resizeCanvasBusy,
      maskShapes,
      fallbackCanvasWidthPx,
      fallbackCanvasHeightPx,
      canvasImageOffset,
      getPreviewCanvasImageFrame,
      workingSlot,
      handleResizeProjectCanvas,
      normalizedProjectId,
      setMaskShapes,
      setCanvasImageOffset,
    ]
  );

  const applyCanvasSizePreset = React.useCallback(
    async ({
      direction = 'down-right',
      onSuccess,
      presetValue,
    }: ApplyCanvasSizePresetArgs): Promise<boolean> => {
      const nextSize = parseCanvasSizePresetValue(presetValue);
      if (!nextSize) return false;
      return applyCanvasResize({
        direction,
        height: nextSize.height,
        onSuccess,
        width: nextSize.width,
      });
    },
    [applyCanvasResize]
  );

  return {
    applyCanvasResize,
    applyCanvasSizePreset,
    canResizeCanvas,
    fallbackCanvasHeightPx,
    fallbackCanvasWidthPx,
    resizeCanvasBusy,
  };
}
