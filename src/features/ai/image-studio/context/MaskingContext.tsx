'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import { type VectorShape, type VectorToolMode } from '@/shared/lib/vector-drawing';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

import { useProjectsState } from './ProjectsContext';
import { useSlotsState } from './SlotsContext';
import {
  DEFAULT_MASK_DETECTION_SETTINGS,
  getEdgeMaskBounds,
  getThresholdMaskBounds,
  loadMaskingProjectLocalState,
  saveMaskingProjectLocalState,
  toExpandedRect,
  type MaskDetectionSettings,
  type MaskGenerationMode,
} from './masking-context-utils';
import { internalError } from '@/shared/errors/app-error';

// ── Types ────────────────────────────────────────────────────────────────────

export type { MaskGenerationMode } from './masking-context-utils';

// ── State/Actions interfaces ─────────────────────────────────────────────────

export interface MaskingState {
  tool: VectorToolMode;
  maskShapes: VectorShape[];
  activeMaskId: string | null;
  selectedPointIndex: number | null;
  maskInvert: boolean;
  maskFeather: number;
  brushRadius: number;
  maskGenLoading: boolean;
  maskGenMode: MaskGenerationMode;
  maskThresholdSensitivity: number;
  maskEdgeSensitivity: number;
}

export interface MaskingActions {
  setTool: (t: VectorToolMode) => void;
  setMaskShapes: React.Dispatch<React.SetStateAction<VectorShape[]>>;
  setActiveMaskId: (id: string | null) => void;
  setSelectedPointIndex: (index: number | null) => void;
  setMaskInvert: (i: boolean) => void;
  setMaskFeather: (f: number) => void;
  setBrushRadius: (r: number) => void;
  setMaskGenMode: (m: MaskGenerationMode) => void;
  setMaskThresholdSensitivity: (value: number) => void;
  setMaskEdgeSensitivity: (value: number) => void;
  handleAiMaskGeneration: (mode?: MaskGenerationMode) => void;
}

// ── Contexts ─────────────────────────────────────────────────────────────────

const MaskingStateContext = createContext<MaskingState | null>(null);
const MaskingActionsContext = createContext<MaskingActions | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function MaskingProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const { projectId } = useProjectsState();
  const { workingSlot, selectedSlot } = useSlotsState();

  const [tool, setTool] = useState<VectorToolMode>('select');
  const [maskShapes, setMaskShapes] = useState<VectorShape[]>([]);
  const [activeMaskId, setActiveMaskId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [maskInvert, setMaskInvert] = useState<boolean>(false);
  const [maskFeather, setMaskFeather] = useState<number>(0);
  const [brushRadius, setBrushRadius] = useState<number>(8);
  const [maskGenLoading, setMaskGenLoading] = useState<boolean>(false);
  const [maskGenMode, setMaskGenMode] = useState<MaskGenerationMode>('ai-polygon');
  const [slotMaskDetectionSettings, setSlotMaskDetectionSettings] = useState<
    Record<string, MaskDetectionSettings>
  >({});

  useEffect(() => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) {
      setTool('select');
      setMaskShapes([]);
      setActiveMaskId(null);
      setSelectedPointIndex(null);
      setMaskInvert(false);
      setMaskFeather(0);
      setBrushRadius(8);
      setMaskGenLoading(false);
      setMaskGenMode('ai-polygon');
      setSlotMaskDetectionSettings({});
      return;
    }

    const restored = loadMaskingProjectLocalState(normalizedProjectId);
    const restoredShapes = restored?.maskShapes ?? [];
    const restoredShapeIds = new Set(restoredShapes.map((shape) => shape.id));
    const restoredActiveMaskId =
      restored?.activeMaskId && restoredShapeIds.has(restored.activeMaskId)
        ? restored.activeMaskId
        : null;
    const restoredActiveShape = restoredActiveMaskId
      ? (restoredShapes.find((shape) => shape.id === restoredActiveMaskId) ?? null)
      : null;
    const restoredSelectedPointIndex =
      typeof restored?.selectedPointIndex === 'number' &&
      Number.isFinite(restored.selectedPointIndex) &&
      restored.selectedPointIndex >= 0 &&
      restoredActiveShape &&
      restored.selectedPointIndex < restoredActiveShape.points.length
        ? restored.selectedPointIndex
        : null;

    setTool(restored?.tool ?? 'select');
    setMaskShapes(restoredShapes);
    setActiveMaskId(restoredActiveMaskId);
    setSelectedPointIndex(restoredSelectedPointIndex);
    setMaskInvert(restored?.maskInvert ?? false);
    setMaskFeather(restored?.maskFeather ?? 0);
    setBrushRadius(restored?.brushRadius ?? 8);
    setMaskGenLoading(false);
    setMaskGenMode(restored?.maskGenMode ?? 'ai-polygon');
    setSlotMaskDetectionSettings(restored?.slotMaskDetectionSettings ?? {});
  }, [projectId]);

  useEffect(() => {
    const normalizedProjectId = projectId.trim();
    if (!normalizedProjectId) return;

    const activeShape = activeMaskId
      ? (maskShapes.find((shape) => shape.id === activeMaskId) ?? null)
      : null;
    const persistedActiveMaskId = activeShape ? activeShape.id : null;
    const persistedSelectedPointIndex =
      typeof selectedPointIndex === 'number' &&
      Number.isFinite(selectedPointIndex) &&
      selectedPointIndex >= 0 &&
      activeShape &&
      selectedPointIndex < activeShape.points.length
        ? selectedPointIndex
        : null;
    const persistedMaskFeather = Math.max(0, Math.min(100, Math.round(maskFeather)));
    const persistedBrushRadius = Math.max(1, Math.min(64, Math.round(brushRadius)));

    const timer = window.setTimeout(() => {
      saveMaskingProjectLocalState(normalizedProjectId, {
        version: 1,
        projectId: normalizedProjectId,
        savedAt: new Date().toISOString(),
        tool,
        maskShapes,
        activeMaskId: persistedActiveMaskId,
        selectedPointIndex: persistedSelectedPointIndex,
        maskInvert,
        maskFeather: persistedMaskFeather,
        brushRadius: persistedBrushRadius,
        maskGenMode,
        slotMaskDetectionSettings,
      });
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    projectId,
    tool,
    maskShapes,
    activeMaskId,
    selectedPointIndex,
    maskInvert,
    maskFeather,
    brushRadius,
    maskGenMode,
    slotMaskDetectionSettings,
  ]);

  const activeMaskDetectionKey = workingSlot?.id ?? selectedSlot?.id ?? '__global__';
  const maskDetectionSettings =
    slotMaskDetectionSettings[activeMaskDetectionKey] ?? DEFAULT_MASK_DETECTION_SETTINGS;
  const maskThresholdSensitivity = maskDetectionSettings.thresholdSensitivity;
  const maskEdgeSensitivity = maskDetectionSettings.edgeSensitivity;

  const setMaskThresholdSensitivity = useCallback(
    (value: number): void => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      setSlotMaskDetectionSettings((prev) => {
        const existing = prev[activeMaskDetectionKey] ?? DEFAULT_MASK_DETECTION_SETTINGS;
        return {
          ...prev,
          [activeMaskDetectionKey]: { ...existing, thresholdSensitivity: clamped },
        };
      });
    },
    [activeMaskDetectionKey]
  );

  const setMaskEdgeSensitivity = useCallback(
    (value: number): void => {
      const clamped = Math.max(0, Math.min(100, Math.round(value)));
      setSlotMaskDetectionSettings((prev) => {
        const existing = prev[activeMaskDetectionKey] ?? DEFAULT_MASK_DETECTION_SETTINGS;
        return { ...prev, [activeMaskDetectionKey]: { ...existing, edgeSensitivity: clamped } };
      });
    },
    [activeMaskDetectionKey]
  );

  const handleAiMaskGeneration = useCallback(
    (mode?: MaskGenerationMode) => {
      const effectiveMode = mode ?? maskGenMode;
      const filepath = workingSlot?.imageFile?.url;
      if (!filepath) {
        toast('Select a working slot with an image first.', { variant: 'info' });
        return;
      }
      setMaskGenLoading(true);

      const appendRectShape = (
        x: number,
        y: number,
        w: number,
        h: number,
        labelPrefix: string
      ): void => {
        const shapeId = `ai_${Date.now().toString(36)}`;
        const newShape: VectorShape = {
          id: shapeId,
          name: `${labelPrefix} ${maskShapes.length + 1}`,
          type: 'rect',
          points: [
            { x, y },
            { x: x + w, y: y + h },
          ],
          style: {},
          role: 'custom',
          closed: true,
          visible: true,
        };
        setMaskShapes((prev) => [...prev, newShape]);
        setActiveMaskId(shapeId);
      };

      if (effectiveMode === 'threshold' || effectiveMode === 'edges') {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
          try {
            const sourceWidth = image.naturalWidth || image.width || 1;
            const sourceHeight = image.naturalHeight || image.height || 1;
            const ratio = Math.min(1, 1024 / Math.max(sourceWidth, sourceHeight));
            const sampledWidth = Math.max(1, Math.round(sourceWidth * ratio));
            const sampledHeight = Math.max(1, Math.round(sourceHeight * ratio));

            const canvas = document.createElement('canvas');
            canvas.width = sampledWidth;
            canvas.height = sampledHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw internalError('Canvas context unavailable.');
            ctx.drawImage(image, 0, 0, sampledWidth, sampledHeight);
            const imageData = ctx.getImageData(0, 0, sampledWidth, sampledHeight);
            const bounds =
              effectiveMode === 'threshold'
                ? getThresholdMaskBounds(
                  imageData.data,
                  sampledWidth,
                  sampledHeight,
                  maskThresholdSensitivity
                )
                : getEdgeMaskBounds(
                  imageData.data,
                  sampledWidth,
                  sampledHeight,
                  maskEdgeSensitivity
                );
            if (!bounds) {
              toast('No clear mask area detected for this mode.', { variant: 'warning' });
              return;
            }

            const rect = toExpandedRect(bounds, sampledWidth, sampledHeight);
            const invRatio = ratio > 0 ? 1 / ratio : 1;
            const bx = Math.max(0, Math.round(rect.x * invRatio));
            const by = Math.max(0, Math.round(rect.y * invRatio));
            const bw = Math.max(1, Math.round(rect.w * invRatio));
            const bh = Math.max(1, Math.round(rect.h * invRatio));
            const normalizedX = sourceWidth > 0 ? bx / sourceWidth : 0;
            const normalizedY = sourceHeight > 0 ? by / sourceHeight : 0;
            const normalizedW = sourceWidth > 0 ? bw / sourceWidth : 1;
            const normalizedH = sourceHeight > 0 ? bh / sourceHeight : 1;
            appendRectShape(
              Math.max(0, Math.min(1, normalizedX)),
              Math.max(0, Math.min(1, normalizedY)),
              Math.max(1 / Math.max(sourceWidth, 1), Math.min(1, normalizedW)),
              Math.max(1 / Math.max(sourceHeight, 1), Math.min(1, normalizedH)),
              effectiveMode === 'threshold' ? 'Threshold BBox' : 'Edge BBox'
            );
            toast(
              effectiveMode === 'threshold' ? 'Threshold mask generated.' : 'Edge mask generated.',
              { variant: 'success' }
            );
          } catch (err: unknown) {
            toast(err instanceof Error ? err.message : 'Mask generation failed.', {
              variant: 'error',
            });
          } finally {
            setMaskGenLoading(false);
          }
        };
        image.onerror = () => {
          toast('Failed to load image for mask generation.', { variant: 'error' });
          setMaskGenLoading(false);
        };
        image.src = filepath;
        return;
      }

      const apiMode = effectiveMode === 'ai-polygon' ? 'polygon' : 'bbox';
      api
        .post<{
          polygon?: Array<{ x: number; y: number }>;
          bbox?: { x: number; y: number; w: number; h: number };
        }>('/api/image-studio/mask/ai', {
          imagePath: filepath,
          mode: apiMode,
          ...(contextRegistry ? { contextRegistry } : {}),
        })
        .then((result) => {
          if (apiMode === 'polygon' && result.polygon && result.polygon.length >= 3) {
            const newShape: VectorShape = {
              id: `ai_${Date.now().toString(36)}`,
              name: `AI Polygon ${maskShapes.length + 1}`,
              type: 'polygon',
              points: result.polygon.map((p) => ({ x: p.x, y: p.y })),
              style: {},
              role: 'custom',
              closed: true,
              visible: true,
            };
            setMaskShapes((prev) => [...prev, newShape]);
            toast('AI polygon mask generated.', { variant: 'success' });
          } else if (apiMode === 'bbox' && result.bbox) {
            const { x, y, w, h } = result.bbox;
            appendRectShape(x, y, w, h, 'AI BBox');
            toast('AI bounding box mask generated.', { variant: 'success' });
          } else {
            toast('AI did not return a valid mask.', { variant: 'error' });
          }
        })
        .catch((err: unknown) => {
          toast(err instanceof Error ? err.message : 'AI mask generation failed.', {
            variant: 'error',
          });
        })
        .finally(() => {
          setMaskGenLoading(false);
        });
    },
    [
      maskGenMode,
      workingSlot,
      maskShapes.length,
      setMaskShapes,
      setActiveMaskId,
      toast,
      contextRegistry,
      maskThresholdSensitivity,
      maskEdgeSensitivity,
    ]
  );

  const state = useMemo<MaskingState>(
    () => ({
      tool,
      maskShapes,
      activeMaskId,
      selectedPointIndex,
      maskInvert,
      maskFeather,
      brushRadius,
      maskGenLoading,
      maskGenMode,
      maskThresholdSensitivity,
      maskEdgeSensitivity,
    }),
    [
      tool,
      maskShapes,
      activeMaskId,
      selectedPointIndex,
      maskInvert,
      maskFeather,
      brushRadius,
      maskGenLoading,
      maskGenMode,
      maskThresholdSensitivity,
      maskEdgeSensitivity,
    ]
  );

  const actions = useMemo<MaskingActions>(
    () => ({
      setTool,
      setMaskShapes,
      setActiveMaskId,
      setSelectedPointIndex,
      setMaskInvert,
      setMaskFeather,
      setBrushRadius,
      setMaskGenMode,
      setMaskThresholdSensitivity,
      setMaskEdgeSensitivity,
      handleAiMaskGeneration,
    }),
    [setMaskThresholdSensitivity, setMaskEdgeSensitivity, handleAiMaskGeneration]
  );

  return (
    <MaskingActionsContext.Provider value={actions}>
      <MaskingStateContext.Provider value={state}>{children}</MaskingStateContext.Provider>
    </MaskingActionsContext.Provider>
  );
}

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useMaskingState(): MaskingState {
  const ctx = useContext(MaskingStateContext);
  if (!ctx) throw internalError('useMaskingState must be used within a MaskingProvider');
  return ctx;
}

export function useMaskingActions(): MaskingActions {
  const ctx = useContext(MaskingActionsContext);
  if (!ctx) throw internalError('useMaskingActions must be used within a MaskingProvider');
  return ctx;
}
