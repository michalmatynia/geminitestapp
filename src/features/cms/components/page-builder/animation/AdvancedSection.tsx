"use client";

import React, { useCallback } from "react";
import {
  Hand,
  Layers,
  MousePointer2,
  PenLine,
  RotateCw,
  Trash2,
} from "lucide-react";
import {
  Button,
  Checkbox,
  Label,
  Input,
  Tooltip,
  UnifiedSelect,
  SectionPanel,
  type VectorShape,
} from "@/shared/ui";
import type { VectorOverlayResult } from "../../../hooks/usePageBuilderContext";
import type {
  GsapAnimationConfig,
  TextEffect,
  DragAxis,
  ObserverType,
  VelocityEffect,
} from "@/features/gsap";
import {
  DEFAULT_ANIMATION_CONFIG,
  TEXT_EFFECTS,
  DRAG_AXES,
  OBSERVER_TYPES,
  VELOCITY_EFFECTS,
} from "@/features/gsap";

const EMPTY_SHAPES: VectorShape[] = [];

interface AdvancedSectionProps {
  config: GsapAnimationConfig;
  onChange: (config: GsapAnimationConfig) => void;
  openVectorOverlay: (options: {
    title: string;
    description: string;
    initialShapes: VectorShape[];
    onApply: (result: VectorOverlayResult) => void;
  }) => void;
}

export function AdvancedSection({ config, onChange, openVectorOverlay }: AdvancedSectionProps): React.ReactNode {
  const motionPathEnabledValue = config.motionPathEnabled ?? DEFAULT_ANIMATION_CONFIG.motionPathEnabled ?? false;
  const motionPathPathValue = config.motionPathPath ?? DEFAULT_ANIMATION_CONFIG.motionPathPath ?? "";
  const motionPathAlignValue = config.motionPathAlign ?? DEFAULT_ANIMATION_CONFIG.motionPathAlign ?? true;
  const motionPathAutoRotateValue = config.motionPathAutoRotate ?? DEFAULT_ANIMATION_CONFIG.motionPathAutoRotate ?? true;
  const motionPathRotateOffsetValue = config.motionPathRotateOffset ?? DEFAULT_ANIMATION_CONFIG.motionPathRotateOffset ?? 0;
  const motionPathStartValue = config.motionPathStart ?? DEFAULT_ANIMATION_CONFIG.motionPathStart ?? 0;
  const motionPathEndValue = config.motionPathEnd ?? DEFAULT_ANIMATION_CONFIG.motionPathEnd ?? 1;
  const motionPathFollowValue = config.motionPathFollow ?? DEFAULT_ANIMATION_CONFIG.motionPathFollow ?? false;
  const motionPathSpacingValue = config.motionPathSpacing ?? DEFAULT_ANIMATION_CONFIG.motionPathSpacing ?? 0.08;
  const motionPathShapesValue = config.motionPathShapes ?? DEFAULT_ANIMATION_CONFIG.motionPathShapes ?? EMPTY_SHAPES;
  const svgDrawEnabledValue = config.svgDrawEnabled ?? DEFAULT_ANIMATION_CONFIG.svgDrawEnabled ?? false;
  const svgDrawSelectorValue = config.svgDrawSelector ?? DEFAULT_ANIMATION_CONFIG.svgDrawSelector ?? "path";
  const svgDrawFromValue = config.svgDrawFrom ?? DEFAULT_ANIMATION_CONFIG.svgDrawFrom ?? 0;
  const svgDrawToValue = config.svgDrawTo ?? DEFAULT_ANIMATION_CONFIG.svgDrawTo ?? 100;
  const svgDrawPathValue = config.svgDrawPath ?? DEFAULT_ANIMATION_CONFIG.svgDrawPath ?? "";
  const svgDrawShapesValue = config.svgDrawShapes ?? DEFAULT_ANIMATION_CONFIG.svgDrawShapes ?? EMPTY_SHAPES;
  const svgMorphEnabledValue = config.svgMorphEnabled ?? DEFAULT_ANIMATION_CONFIG.svgMorphEnabled ?? false;
  const svgMorphSelectorValue = config.svgMorphSelector ?? DEFAULT_ANIMATION_CONFIG.svgMorphSelector ?? "path";
  const svgMorphToValue = config.svgMorphTo ?? DEFAULT_ANIMATION_CONFIG.svgMorphTo ?? "";
  const svgMorphShapesValue = config.svgMorphShapes ?? DEFAULT_ANIMATION_CONFIG.svgMorphShapes ?? EMPTY_SHAPES;
  const textEffectValue = config.textEffect ?? DEFAULT_ANIMATION_CONFIG.textEffect ?? "none";
  const textStaggerValue = config.textStagger ?? DEFAULT_ANIMATION_CONFIG.textStagger ?? 0.05;
  const textScrambleCharsValue = config.textScrambleChars ?? DEFAULT_ANIMATION_CONFIG.textScrambleChars ?? "";
  const textTypingSpeedValue = config.textTypingSpeed ?? DEFAULT_ANIMATION_CONFIG.textTypingSpeed ?? 24;
  const textCursorValue = config.textCursor ?? DEFAULT_ANIMATION_CONFIG.textCursor ?? false;
  const textCountFromValue = config.textCountFrom ?? DEFAULT_ANIMATION_CONFIG.textCountFrom ?? 0;
  const textCountToValue = config.textCountTo ?? DEFAULT_ANIMATION_CONFIG.textCountTo ?? 100;
  const textCountDecimalsValue = config.textCountDecimals ?? DEFAULT_ANIMATION_CONFIG.textCountDecimals ?? 0;
  const draggableEnabledValue = config.draggableEnabled ?? DEFAULT_ANIMATION_CONFIG.draggableEnabled ?? false;
  const draggableTypeValue = config.draggableType ?? DEFAULT_ANIMATION_CONFIG.draggableType ?? "x,y";
  const draggableBoundsValue = config.draggableBounds ?? DEFAULT_ANIMATION_CONFIG.draggableBounds ?? "";
  const draggableMomentumValue = config.draggableMomentum ?? DEFAULT_ANIMATION_CONFIG.draggableMomentum ?? false;
  const draggableMomentumFactorValue = config.draggableMomentumFactor ?? DEFAULT_ANIMATION_CONFIG.draggableMomentumFactor ?? 0.6;
  const draggableSnapValue = config.draggableSnap ?? DEFAULT_ANIMATION_CONFIG.draggableSnap ?? 0;
  const draggableCarouselValue = config.draggableCarousel ?? DEFAULT_ANIMATION_CONFIG.draggableCarousel ?? false;
  const draggableCarouselSelectorValue =
    config.draggableCarouselSelector ?? DEFAULT_ANIMATION_CONFIG.draggableCarouselSelector ?? "";
  const draggableCarouselSnapValue =
    config.draggableCarouselSnap ?? DEFAULT_ANIMATION_CONFIG.draggableCarouselSnap ?? true;
  const observerEnabledValue = config.observerEnabled ?? DEFAULT_ANIMATION_CONFIG.observerEnabled ?? false;
  const observerTypeValue = config.observerType ?? DEFAULT_ANIMATION_CONFIG.observerType ?? "wheel,touch";
  const observerAxisValue = config.observerAxis ?? DEFAULT_ANIMATION_CONFIG.observerAxis ?? "y";
  const observerSpeedValue = config.observerSpeed ?? DEFAULT_ANIMATION_CONFIG.observerSpeed ?? 1;
  const velocityEffectValue = config.velocityEffect ?? DEFAULT_ANIMATION_CONFIG.velocityEffect ?? "none";
  const velocityStrengthValue = config.velocityStrength ?? DEFAULT_ANIMATION_CONFIG.velocityStrength ?? 0.15;
  const velocityMaxValue = config.velocityMax ?? DEFAULT_ANIMATION_CONFIG.velocityMax ?? 20;
  const magnetEnabledValue = config.magnetEnabled ?? DEFAULT_ANIMATION_CONFIG.magnetEnabled ?? false;
  const magnetStrengthValue = config.magnetStrength ?? DEFAULT_ANIMATION_CONFIG.magnetStrength ?? 0.35;
  const magnetRadiusValue = config.magnetRadius ?? DEFAULT_ANIMATION_CONFIG.magnetRadius ?? 140;
  const magnetAxisValue = config.magnetAxis ?? DEFAULT_ANIMATION_CONFIG.magnetAxis ?? "x,y";
  const magnetReturnValue = config.magnetReturn ?? DEFAULT_ANIMATION_CONFIG.magnetReturn ?? 0.35;

  const observerTypeIcons: Record<string, React.ReactNode> = {
    "wheel,touch": (
      <span className="flex items-center gap-0.5">
        <RotateCw className="size-3.5" />
        <Hand className="size-3.5" />
      </span>
    ),
    "wheel": <RotateCw className="size-3.5" />,
    "touch": <Hand className="size-3.5" />,
    "pointer": <MousePointer2 className="size-3.5" />,
    "wheel,touch,pointer": <Layers className="size-3.5" />,
  };

  // Motion path handlers
  const handleMotionPathEnabledChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, motionPathEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleMotionPathPathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, motionPathPath: e.target.value });
    },
    [config, onChange]
  );

  const handleMotionPathDraw = useCallback((): void => {
    openVectorOverlay({
      title: "Motion Path",
      description: "Draw the motion path directly on the preview canvas.",
      initialShapes: motionPathShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({ ...config, motionPathEnabled: true, motionPathPath: path, motionPathShapes: shapes });
      },
    });
  }, [config, motionPathShapesValue, onChange, openVectorOverlay]);

  const handleMotionPathClear = useCallback((): void => {
    onChange({ ...config, motionPathPath: "", motionPathShapes: [] });
  }, [config, onChange]);

  const handleMotionPathAlignChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, motionPathAlign: checked === true });
    },
    [config, onChange]
  );

  const handleMotionPathAutoRotateChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, motionPathAutoRotate: checked === true });
    },
    [config, onChange]
  );

  const handleMotionPathRotateOffsetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, motionPathRotateOffset: Math.max(-360, Math.min(360, val)) });
      }
    },
    [config, onChange]
  );

  const handleMotionPathStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, motionPathStart: Math.max(0, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  const handleMotionPathEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, motionPathEnd: Math.max(0, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  const handleMotionPathFollowChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, motionPathFollow: checked === true });
    },
    [config, onChange]
  );

  const handleMotionPathSpacingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, motionPathSpacing: Math.max(0, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  // SVG Draw handlers
  const handleSvgDrawEnabledChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, svgDrawEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleSvgDrawSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, svgDrawSelector: e.target.value });
    },
    [config, onChange]
  );

  const handleSvgDrawFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, svgDrawFrom: Math.max(0, Math.min(100, val)) });
      }
    },
    [config, onChange]
  );

  const handleSvgDrawToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, svgDrawTo: Math.max(0, Math.min(100, val)) });
      }
    },
    [config, onChange]
  );

  const handleSvgDrawPathChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, svgDrawPath: e.target.value });
    },
    [config, onChange]
  );

  const handleSvgDrawCanvas = useCallback((): void => {
    openVectorOverlay({
      title: "SVG Draw Path",
      description: "Draw a custom SVG path to animate stroke drawing.",
      initialShapes: svgDrawShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({ ...config, svgDrawEnabled: true, svgDrawPath: path, svgDrawShapes: shapes });
      },
    });
  }, [config, onChange, openVectorOverlay, svgDrawShapesValue]);

  const handleSvgDrawClear = useCallback((): void => {
    onChange({ ...config, svgDrawPath: "", svgDrawShapes: [] });
  }, [config, onChange]);

  // SVG Morph handlers
  const handleSvgMorphEnabledChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, svgMorphEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleSvgMorphSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, svgMorphSelector: e.target.value });
    },
    [config, onChange]
  );

  const handleSvgMorphToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, svgMorphTo: e.target.value });
    },
    [config, onChange]
  );

  const handleSvgMorphDraw = useCallback((): void => {
    openVectorOverlay({
      title: "SVG Morph Target",
      description: "Draw the target path for morphing.",
      initialShapes: svgMorphShapesValue,
      onApply: ({ shapes, path }: VectorOverlayResult) => {
        onChange({ ...config, svgMorphEnabled: true, svgMorphTo: path, svgMorphShapes: shapes });
      },
    });
  }, [config, onChange, openVectorOverlay, svgMorphShapesValue]);

  const handleSvgMorphClear = useCallback((): void => {
    onChange({ ...config, svgMorphTo: "", svgMorphShapes: [] });
  }, [config, onChange]);

  // Text effect handlers
  const handleTextEffectChange = useCallback(
    (value: string) => {
      onChange({ ...config, textEffect: value as TextEffect });
    },
    [config, onChange]
  );

  const handleTextStaggerChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textStagger: Math.max(0.01, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleTextScrambleCharsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, textScrambleChars: e.target.value });
    },
    [config, onChange]
  );

  const handleTextTypingSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textTypingSpeed: Math.max(4, Math.min(120, val)) });
      }
    },
    [config, onChange]
  );

  const handleTextCursorChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, textCursor: checked === true });
    },
    [config, onChange]
  );

  const handleTextCountFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textCountFrom: val });
      }
    },
    [config, onChange]
  );

  const handleTextCountToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textCountTo: val });
      }
    },
    [config, onChange]
  );

  const handleTextCountDecimalsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, textCountDecimals: Math.max(0, Math.min(6, val)) });
      }
    },
    [config, onChange]
  );

  // Draggable handlers
  const handleDraggableEnabledChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, draggableEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleDraggableTypeChange = useCallback(
    (value: string) => {
      onChange({ ...config, draggableType: value as DragAxis });
    },
    [config, onChange]
  );

  const handleDraggableBoundsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, draggableBounds: e.target.value });
    },
    [config, onChange]
  );

  const handleDraggableMomentumChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, draggableMomentum: checked === true });
    },
    [config, onChange]
  );

  const handleDraggableMomentumFactorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, draggableMomentumFactor: Math.max(0.1, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleDraggableSnapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, draggableSnap: Math.max(0, Math.min(200, val)) });
      }
    },
    [config, onChange]
  );

  const handleDraggableCarouselChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, draggableCarousel: checked === true });
    },
    [config, onChange]
  );

  const handleDraggableCarouselSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, draggableCarouselSelector: e.target.value });
    },
    [config, onChange]
  );

  const handleDraggableCarouselSnapChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, draggableCarouselSnap: checked === true });
    },
    [config, onChange]
  );

  // Observer handlers
  const handleObserverEnabledChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, observerEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleObserverAxisChange = useCallback(
    (value: string) => {
      onChange({ ...config, observerAxis: value as DragAxis });
    },
    [config, onChange]
  );

  const handleObserverSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, observerSpeed: Math.max(0.1, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  // Velocity handlers
  const handleVelocityEffectChange = useCallback(
    (value: string) => {
      onChange({ ...config, velocityEffect: value as VelocityEffect });
    },
    [config, onChange]
  );

  const handleVelocityStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, velocityStrength: Math.max(0.01, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleVelocityMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, velocityMax: Math.max(1, Math.min(60, val)) });
      }
    },
    [config, onChange]
  );

  // Magnet handlers
  const handleMagnetEnabledChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, magnetEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleMagnetStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, magnetStrength: Math.max(0.05, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  const handleMagnetRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, magnetRadius: Math.max(40, Math.min(600, val)) });
      }
    },
    [config, onChange]
  );

  const handleMagnetAxisChange = useCallback(
    (value: string) => {
      onChange({ ...config, magnetAxis: value as DragAxis });
    },
    [config, onChange]
  );

  const handleMagnetReturnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, magnetReturn: Math.max(0.05, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  return (
    <>
      {/* Motion Path */}
      <SectionPanel variant="subtle-compact" className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Motion Path
          </Label>
          <Checkbox checked={motionPathEnabledValue} onCheckedChange={handleMotionPathEnabledChange} />
        </div>

        {motionPathEnabledValue && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Path / Selector
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={motionPathPathValue}
                  onChange={handleMotionPathPathChange}
                  placeholder="SVG path data or selector (#path)"
                  className="flex-1 text-xs font-mono"
                />
                <Tooltip content="Draw path on canvas">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleMotionPathDraw}
                  >
                    <PenLine className="size-4" />
                  </Button>
                </Tooltip>
                <Tooltip content="Clear path">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleMotionPathClear}
                    disabled={!motionPathPathValue && motionPathShapesValue.length === 0}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </Tooltip>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Start (0-1)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={motionPathStartValue}
                  onChange={handleMotionPathStartChange}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">End (0-1)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={motionPathEndValue}
                  onChange={handleMotionPathEndChange}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <Checkbox checked={motionPathAlignValue} onCheckedChange={handleMotionPathAlignChange} />
                Align to path
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <Checkbox checked={motionPathAutoRotateValue} onCheckedChange={handleMotionPathAutoRotateChange} />
                Auto rotate
              </label>
            </div>

            {motionPathAutoRotateValue && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Rotate offset (deg)
                </Label>
                <Input
                  type="number"
                  min={-360}
                  max={360}
                  step={1}
                  value={motionPathRotateOffsetValue}
                  onChange={handleMotionPathRotateOffsetChange}
                  className="text-sm"
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <Checkbox checked={motionPathFollowValue} onCheckedChange={handleMotionPathFollowChange} />
                Follow path (multi)
              </label>
              {motionPathFollowValue && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Spacing (0-1)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={motionPathSpacingValue}
                    onChange={handleMotionPathSpacingChange}
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </SectionPanel>

      {/* SVG Effects */}
      <SectionPanel variant="subtle-compact" className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          SVG Effects
        </Label>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs text-gray-300">
            <Checkbox checked={svgDrawEnabledValue} onCheckedChange={handleSvgDrawEnabledChange} />
            Draw SVG strokes
          </label>
          {svgDrawEnabledValue && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Target selector</Label>
                <Input
                  value={svgDrawSelectorValue}
                  onChange={handleSvgDrawSelectorChange}
                  placeholder="path, line, circle"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Custom path</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={svgDrawPathValue}
                    onChange={handleSvgDrawPathChange}
                    placeholder="Draw or paste SVG path"
                    className="flex-1 text-xs font-mono"
                  />
                  <Tooltip content="Draw path on canvas">
                    <Button type="button" size="icon" variant="outline" onClick={handleSvgDrawCanvas}>
                      <PenLine className="size-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Clear path">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={handleSvgDrawClear}
                      disabled={!svgDrawPathValue && svgDrawShapesValue.length === 0}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">From %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={svgDrawFromValue}
                    onChange={handleSvgDrawFromChange}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">To %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={svgDrawToValue}
                    onChange={handleSvgDrawToChange}
                    className="text-sm"
                  />
                </div>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 text-xs text-gray-300">
            <Checkbox checked={svgMorphEnabledValue} onCheckedChange={handleSvgMorphEnabledChange} />
            Morph SVG path (basic)
          </label>
          {svgMorphEnabledValue && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Target selector</Label>
                <Input
                  value={svgMorphSelectorValue}
                  onChange={handleSvgMorphSelectorChange}
                  placeholder="path"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Target path</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={svgMorphToValue}
                    onChange={handleSvgMorphToChange}
                    placeholder="Target path data or selector (#path)"
                    className="flex-1 text-xs font-mono"
                  />
                  <Tooltip content="Draw path on canvas">
                    <Button type="button" size="icon" variant="outline" onClick={handleSvgMorphDraw}>
                      <PenLine className="size-4" />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Clear path">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={handleSvgMorphClear}
                      disabled={!svgMorphToValue && svgMorphShapesValue.length === 0}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            </>
          )}
        </div>
      </SectionPanel>

      {/* Text Effects */}
      <SectionPanel variant="subtle-compact" className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Text Effects
        </Label>
        <UnifiedSelect
          value={textEffectValue}
          onValueChange={handleTextEffectChange}
          options={TEXT_EFFECTS}
        />

        {textEffectValue !== "none" && (
          <>
            {(textEffectValue === "splitChars" ||
              textEffectValue === "splitWords" ||
              textEffectValue === "splitLines") && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Stagger (seconds)
                </Label>
                <Input
                  type="number"
                  min={0.01}
                  max={2}
                  step={0.01}
                  value={textStaggerValue}
                  onChange={handleTextStaggerChange}
                  className="text-sm"
                />
              </div>
            )}

            {textEffectValue === "scramble" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Scramble chars
                </Label>
                <Input
                  value={textScrambleCharsValue}
                  onChange={handleTextScrambleCharsChange}
                  className="text-sm"
                />
              </div>
            )}

            {textEffectValue === "typing" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Typing speed (chars/sec)
                  </Label>
                  <Input
                    type="number"
                    min={4}
                    max={120}
                    step={1}
                    value={textTypingSpeedValue}
                    onChange={handleTextTypingSpeedChange}
                    className="text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <Checkbox checked={textCursorValue} onCheckedChange={handleTextCursorChange} />
                  Show cursor
                </label>
              </>
            )}

            {textEffectValue === "countUp" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    From
                  </Label>
                  <Input
                    type="number"
                    value={textCountFromValue}
                    onChange={handleTextCountFromChange}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    To
                  </Label>
                  <Input
                    type="number"
                    value={textCountToValue}
                    onChange={handleTextCountToChange}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Decimals
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={6}
                    step={1}
                    value={textCountDecimalsValue}
                    onChange={handleTextCountDecimalsChange}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </SectionPanel>

      {/* Velocity-based FX */}
      <SectionPanel variant="subtle-compact" className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Velocity FX
        </Label>
        <UnifiedSelect
          value={velocityEffectValue}
          onValueChange={handleVelocityEffectChange}
          options={VELOCITY_EFFECTS}
        />
        {velocityEffectValue !== "none" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Strength</Label>
                <Input
                  type="number"
                  min={0.01}
                  max={2}
                  step={0.01}
                  value={velocityStrengthValue}
                  onChange={handleVelocityStrengthChange}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Max limit</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={velocityMaxValue}
                  onChange={handleVelocityMaxChange}
                  className="text-sm"
                />
              </div>
            </div>
          </>
        )}
      </SectionPanel>

      {/* Draggable */}
      <SectionPanel variant="subtle-compact" className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Draggable
          </Label>
          <Checkbox checked={draggableEnabledValue} onCheckedChange={handleDraggableEnabledChange} />
        </div>

        {draggableEnabledValue && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Axis</Label>
              <UnifiedSelect
                value={draggableTypeValue}
                onValueChange={handleDraggableTypeChange}
                options={DRAG_AXES}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Bounds selector</Label>
              <Input
                value={draggableBoundsValue}
                onChange={handleDraggableBoundsChange}
                placeholder="e.g. .container"
                className="text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Snap (px)</Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={draggableSnapValue}
                  onChange={handleDraggableSnapChange}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Momentum factor</Label>
                <Input
                  type="number"
                  min={0.1}
                  max={2}
                  step={0.05}
                  value={draggableMomentumFactorValue}
                  onChange={handleDraggableMomentumFactorChange}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <Checkbox checked={draggableMomentumValue} onCheckedChange={handleDraggableMomentumChange} />
                Enable momentum
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <Checkbox checked={draggableCarouselValue} onCheckedChange={handleDraggableCarouselChange} />
                Carousel mode
              </label>
            </div>

            {draggableCarouselValue && (
              <div className="space-y-3 pl-2 border-l border-border/40">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Track selector</Label>
                  <Input
                    value={draggableCarouselSelectorValue}
                    onChange={handleDraggableCarouselSelectorChange}
                    placeholder="e.g. .track"
                    className="text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <Checkbox checked={draggableCarouselSnapValue} onCheckedChange={handleDraggableCarouselSnapChange} />
                  Snap to items
                </label>
              </div>
            )}
          </div>
        )}
      </SectionPanel>

      {/* Observer */}
      <SectionPanel variant="subtle-compact" className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Observer (Events)
          </Label>
          <Checkbox checked={observerEnabledValue} onCheckedChange={handleObserverEnabledChange} />
        </div>

        {observerEnabledValue && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Event types</Label>
              <Input
                value={observerTypeValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange({ ...config, observerType: e.target.value as ObserverType })}
                placeholder="wheel,touch,pointer"
                className="text-sm"
              />
              <div className="flex flex-wrap gap-1.5">
                {OBSERVER_TYPES.map((option: { label: string; value: string }) => (
                  <Tooltip key={option.label} content={option.label}>
                    <Button
                      type="button"
                      size="sm"
                      variant={observerTypeValue.includes(option.value) ? "secondary" : "outline"}
                      onClick={(): void => {
                        const types = observerTypeValue.split(",").map((t: string) => t.trim()).filter(Boolean);
                        const next = types.includes(option.value)
                          ? types.filter((t: string) => t !== option.value)
                          : [...types, option.value];
                        onChange({ ...config, observerType: next.join(",") as ObserverType });
                      }}
                      className="h-7 w-9 p-0"
                      aria-label={option.label}
                    >
                      {observerTypeIcons[option.value] ?? <MousePointer2 className="size-3.5" />}
                    </Button>
                  </Tooltip>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Axis</Label>
                <UnifiedSelect
                  value={observerAxisValue}
                  onValueChange={handleObserverAxisChange}
                  options={DRAG_AXES}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Speed</Label>
                <Input
                  type="number"
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={observerSpeedValue}
                  onChange={handleObserverSpeedChange}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </SectionPanel>

      {/* Magnet effect */}
      <SectionPanel variant="subtle-compact" className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Magnet
          </Label>
          <Checkbox checked={magnetEnabledValue} onCheckedChange={handleMagnetEnabledChange} />
        </div>

        {magnetEnabledValue && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Strength</Label>
                <Input
                  type="number"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={magnetStrengthValue}
                  onChange={handleMagnetStrengthChange}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Radius (px)</Label>
                <Input
                  type="number"
                  min={40}
                  max={600}
                  step={10}
                  value={magnetRadiusValue}
                  onChange={handleMagnetRadiusChange}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Axis</Label>
                <UnifiedSelect
                  value={magnetAxisValue}
                  onValueChange={handleMagnetAxisChange}
                  options={DRAG_AXES}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">Return speed</Label>
                <Input
                  type="number"
                  min={0.05}
                  max={2}
                  step={0.05}
                  value={magnetReturnValue}
                  onChange={handleMagnetReturnChange}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        )}
      </SectionPanel>
    </>
  );
}
