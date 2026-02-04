"use client";

import React, { useCallback } from "react";
import {
  AlignLeft,
  Hand,
  Heading as HeadingIcon,
  ImageIcon,
  LayoutGrid,
  Layers,
  MousePointer2,
  MousePointerClick,
  PenLine,
  RotateCw,
  Square,
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
  RadioGroup,
  RadioGroupItem,
  type VectorShape,
} from "@/shared/ui";
import { RangeField, SelectField } from "./shared-fields";
import type {
  GsapAnimationConfig,
  AnimationPreset,
  AnimationEasing,
  AnimationTrigger,
  ParallaxPreset,
  ParallaxAxis,
  ParallaxPattern,
  TimelineMode,
  ScrollMode,
  RevealStyle,
  TextEffect,
  DragAxis,
  ObserverType,
  VelocityEffect,
} from "@/features/gsap";
import {
  DEFAULT_ANIMATION_CONFIG,
  ANIMATION_EASINGS,
  AnimationPresetPicker,
  PARALLAX_PRESETS,
  PARALLAX_DEFAULTS,
  PARALLAX_PATTERNS,
  TIMELINE_MODES,
  SCROLL_MODES,
  REVEAL_STYLES,
  TEXT_EFFECTS,
  DRAG_AXES,
  OBSERVER_TYPES,
  VELOCITY_EFFECTS,
} from "@/features/gsap";
import { usePageBuilder } from "../../hooks/usePageBuilderContext";

interface AnimationConfigPanelProps {
  value: GsapAnimationConfig | undefined;
  onChange: (config: GsapAnimationConfig) => void;
}

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  const resolved = value || "#ffffff";
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <label className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded border border-border/50">
          <input
            type="color"
            value={resolved}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
          <div className="size-full rounded" style={{ backgroundColor: resolved }} />
        </label>
        <div className="text-xs text-gray-400">{resolved}</div>
      </div>
    </div>
  );
}

type VisualFilterType =
  | "none"
  | "blur"
  | "brightness"
  | "contrast"
  | "saturate"
  | "hue"
  | "grayscale"
  | "sepia"
  | "invert"
  | "opacity";

type VisualClipType =
  | "none"
  | "wipe-top"
  | "wipe-right"
  | "wipe-bottom"
  | "wipe-left"
  | "inset";

interface VisualShadowValues {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

const FILTER_OPTIONS: Array<{ label: string; value: VisualFilterType }> = [
  { label: "None", value: "none" },
  { label: "Blur", value: "blur" },
  { label: "Brightness", value: "brightness" },
  { label: "Contrast", value: "contrast" },
  { label: "Saturation", value: "saturate" },
  { label: "Hue", value: "hue" },
  { label: "Grayscale", value: "grayscale" },
  { label: "Sepia", value: "sepia" },
  { label: "Invert", value: "invert" },
  { label: "Opacity", value: "opacity" },
];

const FILTER_META: Record<VisualFilterType, { unit: string; min: number; max: number; step: number; defaultFrom: number; defaultTo: number }> = {
  none: { unit: "", min: 0, max: 100, step: 1, defaultFrom: 0, defaultTo: 0 },
  blur: { unit: "px", min: 0, max: 30, step: 1, defaultFrom: 0, defaultTo: 10 },
  brightness: { unit: "%", min: 0, max: 200, step: 5, defaultFrom: 60, defaultTo: 100 },
  contrast: { unit: "%", min: 0, max: 200, step: 5, defaultFrom: 60, defaultTo: 100 },
  saturate: { unit: "%", min: 0, max: 200, step: 5, defaultFrom: 0, defaultTo: 100 },
  hue: { unit: "deg", min: 0, max: 360, step: 5, defaultFrom: 0, defaultTo: 90 },
  grayscale: { unit: "%", min: 0, max: 100, step: 5, defaultFrom: 100, defaultTo: 0 },
  sepia: { unit: "%", min: 0, max: 100, step: 5, defaultFrom: 100, defaultTo: 0 },
  invert: { unit: "%", min: 0, max: 100, step: 5, defaultFrom: 100, defaultTo: 0 },
  opacity: { unit: "%", min: 0, max: 100, step: 5, defaultFrom: 0, defaultTo: 100 },
};

const CLIP_OPTIONS: Array<{ label: string; value: VisualClipType }> = [
  { label: "None", value: "none" },
  { label: "Wipe Top", value: "wipe-top" },
  { label: "Wipe Right", value: "wipe-right" },
  { label: "Wipe Bottom", value: "wipe-bottom" },
  { label: "Wipe Left", value: "wipe-left" },
  { label: "Inset (Uniform)", value: "inset" },
];

const DEFAULT_SHADOW: VisualShadowValues = {
  x: 0,
  y: 16,
  blur: 32,
  spread: 0,
  color: "#000000",
  opacity: 35,
};

const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const parseNumber = (value: string, fallback: number): number => {
  const match = value.match(/-?\d+(?:\.\d+)?/);
  if (!match) return fallback;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFilterString = (value: string): { type: VisualFilterType; amount: number } | null => {
  const match = value.match(/(blur|brightness|contrast|saturate|hue-rotate|grayscale|sepia|invert|opacity)\(([-\d.]+)(deg|px|%)?\)/i);
  if (!match?.[1] || !match[2]) return null;
  const rawType = match[1].toLowerCase();
  const type: VisualFilterType = rawType === "hue-rotate" ? "hue" : (rawType as VisualFilterType);
  const amount = Number.parseFloat(match[2]);
  if (!Number.isFinite(amount)) return null;
  return { type, amount };
};

const buildFilterString = (type: VisualFilterType, amount: number): string => {
  if (type === "none") return "";
  const meta = FILTER_META[type];
  const func = type === "hue" ? "hue-rotate" : type;
  const value = clampNumber(amount, meta.min, meta.max);
  return `${func}(${value}${meta.unit})`;
};

const parseClipString = (value: string): { type: VisualClipType; amount: number } | null => {
  const match = value.match(/inset\(([-\d.]+)%\s+([-\d.]+)%\s+([-\d.]+)%\s+([-\d.]+)%\)/i);
  if (!match?.[1] || !match[2] || !match[3] || !match[4]) return null;
  const top = Number.parseFloat(match[1]);
  const right = Number.parseFloat(match[2]);
  const bottom = Number.parseFloat(match[3]);
  const left = Number.parseFloat(match[4]);
  if ([top, right, bottom, left].some((val: number) => !Number.isFinite(val))) return null;
  if (right === 0 && bottom === 0 && left === 0) return { type: "wipe-top", amount: top };
  if (top === 0 && bottom === 0 && left === 0) return { type: "wipe-right", amount: right };
  if (top === 0 && right === 0 && left === 0) return { type: "wipe-bottom", amount: bottom };
  if (top === 0 && right === 0 && bottom === 0) return { type: "wipe-left", amount: left };
  if (top === right && right === bottom && bottom === left) {
    return { type: "inset", amount: top };
  }
  return null;
};

const buildClipString = (type: VisualClipType, amount: number): string => {
  if (type === "none") return "";
  const value = clampNumber(amount, 0, 100);
  switch (type) {
    case "wipe-top":
      return `inset(${value}% 0% 0% 0%)`;
    case "wipe-right":
      return `inset(0% ${value}% 0% 0%)`;
    case "wipe-bottom":
      return `inset(0% 0% ${value}% 0%)`;
    case "wipe-left":
      return `inset(0% 0% 0% ${value}%)`;
    case "inset":
      return `inset(${value}% ${value}% ${value}% ${value}%)`;
    default:
      return "";
  }
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.replace("#", "").trim();
  if (![3, 6].includes(normalized.length)) return null;
  const expanded = normalized.length === 3
    ? normalized.split("").map((c: string) => c + c).join("")
    : normalized;
  const int = Number.parseInt(expanded, 16);
  if (Number.isNaN(int)) return null;
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((val: number) => clampNumber(Math.round(val), 0, 255).toString(16).padStart(2, "0")).join("")}`;

const parseColor = (value: string): { color: string; opacity: number } => {
  if (!value) return { color: DEFAULT_SHADOW.color, opacity: DEFAULT_SHADOW.opacity };
  const rgbaMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbaMatch && rgbaMatch[1]) {
    const parts = rgbaMatch[1].split(",").map((part: string) => part.trim());
    const r = Number.parseFloat(parts[0] ?? "0");
    const g = Number.parseFloat(parts[1] ?? "0");
    const b = Number.parseFloat(parts[2] ?? "0");
    const a = parts[3] !== undefined ? Number.parseFloat(parts[3]) : 1;
    if ([r, g, b].every(Number.isFinite)) {
      return {
        color: rgbToHex(r, g, b),
        opacity: clampNumber(Number.isFinite(a) ? a * 100 : 100, 0, 100),
      };
    }
  }
  const hexMatch = value.match(/#([0-9a-f]{3,8})/i);
  if (hexMatch && hexMatch[1]) {
    return { color: `#${hexMatch[1].slice(0, 6)}`, opacity: 100 };
  }
  return { color: DEFAULT_SHADOW.color, opacity: DEFAULT_SHADOW.opacity };
};

const parseShadow = (value: string): VisualShadowValues => {
  if (!value) return { ...DEFAULT_SHADOW };
  const match = value.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px(?:\s+(-?\d+(?:\.\d+)?)px)?\s+(.+)$/i);
  if (!match) return { ...DEFAULT_SHADOW };
  const x = Number.parseFloat(match[1] ?? "0");
  const y = Number.parseFloat(match[2] ?? "0");
  const blur = Number.parseFloat(match[3] ?? "0");
  const spread = match[4] !== undefined ? Number.parseFloat(match[4]) : 0;
  const { color, opacity } = parseColor(match[5] ?? "");
  return {
    x: Number.isFinite(x) ? x : DEFAULT_SHADOW.x,
    y: Number.isFinite(y) ? y : DEFAULT_SHADOW.y,
    blur: Number.isFinite(blur) ? blur : DEFAULT_SHADOW.blur,
    spread: Number.isFinite(spread) ? spread : DEFAULT_SHADOW.spread,
    color,
    opacity,
  };
};

const buildShadow = (values: VisualShadowValues): string => {
  const rgb = hexToRgb(values.color) ?? hexToRgb(DEFAULT_SHADOW.color) ?? { r: 0, g: 0, b: 0 };
  const alpha = clampNumber(values.opacity, 0, 100) / 100;
  return `${values.x}px ${values.y}px ${values.blur}px ${values.spread}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const EMPTY_SHAPES: VectorShape[] = [];

export function AnimationConfigPanel({ value, onChange }: AnimationConfigPanelProps): React.ReactNode {
  const { openVectorOverlay } = usePageBuilder();
  const config = value ?? DEFAULT_ANIMATION_CONFIG;
  const selectorValue = config.selector ?? "";
  const parallaxPresetValue = config.parallaxPreset ?? DEFAULT_ANIMATION_CONFIG.parallaxPreset ?? "none";
  const parallaxSelectorValue = config.parallaxSelector ?? DEFAULT_ANIMATION_CONFIG.parallaxSelector ?? "";
  const parallaxAxisValue = config.parallaxAxis ?? DEFAULT_ANIMATION_CONFIG.parallaxAxis ?? "y";
  const parallaxOffsetValue =
    config.parallaxOffset ?? PARALLAX_DEFAULTS[parallaxPresetValue]?.offset ?? DEFAULT_ANIMATION_CONFIG.parallaxOffset ?? 0;
  const parallaxScrubValue = config.parallaxScrub ?? DEFAULT_ANIMATION_CONFIG.parallaxScrub ?? 0.6;
  const parallaxStartValue = config.parallaxStart ?? DEFAULT_ANIMATION_CONFIG.parallaxStart ?? "top bottom";
  const parallaxEndValue = config.parallaxEnd ?? DEFAULT_ANIMATION_CONFIG.parallaxEnd ?? "bottom top";
  const parallaxEaseValue = config.parallaxEase ?? DEFAULT_ANIMATION_CONFIG.parallaxEase ?? "sine.inOut";
  const parallaxPatternValue = config.parallaxPattern ?? DEFAULT_ANIMATION_CONFIG.parallaxPattern ?? "uniform";
  const parallaxReverseValue = config.parallaxReverse ?? DEFAULT_ANIMATION_CONFIG.parallaxReverse ?? false;
  const parallaxChildStepValue = config.parallaxChildStep ?? DEFAULT_ANIMATION_CONFIG.parallaxChildStep ?? 16;
  const parallaxLayerStrengthValue = config.parallaxLayerStrength ?? DEFAULT_ANIMATION_CONFIG.parallaxLayerStrength ?? 0.35;
  const parallaxLayerScaleStepValue = config.parallaxLayerScaleStep ?? DEFAULT_ANIMATION_CONFIG.parallaxLayerScaleStep ?? 0.015;
  const parallaxRandomSeedValue = config.parallaxRandomSeed ?? DEFAULT_ANIMATION_CONFIG.parallaxRandomSeed ?? 7;
  const parallaxScaleFromValue = config.parallaxScaleFrom ?? DEFAULT_ANIMATION_CONFIG.parallaxScaleFrom ?? 1;
  const parallaxScaleToValue = config.parallaxScaleTo ?? DEFAULT_ANIMATION_CONFIG.parallaxScaleTo ?? 1;
  const parallaxRotateFromValue = config.parallaxRotateFrom ?? DEFAULT_ANIMATION_CONFIG.parallaxRotateFrom ?? 0;
  const parallaxRotateToValue = config.parallaxRotateTo ?? DEFAULT_ANIMATION_CONFIG.parallaxRotateTo ?? 0;
  const parallaxOpacityFromValue = config.parallaxOpacityFrom ?? DEFAULT_ANIMATION_CONFIG.parallaxOpacityFrom ?? 1;
  const parallaxOpacityToValue = config.parallaxOpacityTo ?? DEFAULT_ANIMATION_CONFIG.parallaxOpacityTo ?? 1;
  const parallaxBlurFromValue = config.parallaxBlurFrom ?? DEFAULT_ANIMATION_CONFIG.parallaxBlurFrom ?? 0;
  const parallaxBlurToValue = config.parallaxBlurTo ?? DEFAULT_ANIMATION_CONFIG.parallaxBlurTo ?? 0;
  const timelineModeValue = config.timelineMode ?? DEFAULT_ANIMATION_CONFIG.timelineMode ?? "none";
  const timelineGapValue = config.timelineGap ?? DEFAULT_ANIMATION_CONFIG.timelineGap ?? 0.15;
  const timelineOverlapValue = config.timelineOverlap ?? DEFAULT_ANIMATION_CONFIG.timelineOverlap ?? 0.2;
  const timelineResponseOffsetValue = config.timelineResponseOffset ?? DEFAULT_ANIMATION_CONFIG.timelineResponseOffset ?? 0.2;
  const timelineStaggerEachValue = config.timelineStaggerEach ?? DEFAULT_ANIMATION_CONFIG.timelineStaggerEach ?? 0.12;
  const timelineWaveAmountValue = config.timelineWaveAmount ?? DEFAULT_ANIMATION_CONFIG.timelineWaveAmount ?? 0.5;
  const timelineRandomizeValue = config.timelineRandomize ?? DEFAULT_ANIMATION_CONFIG.timelineRandomize ?? false;
  const timelineLoopValue = config.timelineLoop ?? DEFAULT_ANIMATION_CONFIG.timelineLoop ?? false;
  const timelineRepeatValue = config.timelineRepeat ?? DEFAULT_ANIMATION_CONFIG.timelineRepeat ?? -1;
  const timelineYoyoValue = config.timelineYoyo ?? DEFAULT_ANIMATION_CONFIG.timelineYoyo ?? false;
  const timelineRepeatDelayValue = config.timelineRepeatDelay ?? DEFAULT_ANIMATION_CONFIG.timelineRepeatDelay ?? 0.2;
  const scrollModeValue = config.scrollMode ?? DEFAULT_ANIMATION_CONFIG.scrollMode ?? "none";
  const scrollScrubValue = config.scrollScrub ?? DEFAULT_ANIMATION_CONFIG.scrollScrub ?? 0.6;
  const scrollPinValue = config.scrollPin ?? DEFAULT_ANIMATION_CONFIG.scrollPin ?? false;
  const scrollSnapValue = config.scrollSnap ?? DEFAULT_ANIMATION_CONFIG.scrollSnap ?? false;
  const scrollSnapDurationValue = config.scrollSnapDuration ?? DEFAULT_ANIMATION_CONFIG.scrollSnapDuration ?? 0.35;
  const scrollStartValue = config.scrollStart ?? DEFAULT_ANIMATION_CONFIG.scrollStart ?? "top 85%";
  const scrollEndValue = config.scrollEnd ?? DEFAULT_ANIMATION_CONFIG.scrollEnd ?? "bottom top";
  const revealStyleValue = config.revealStyle ?? DEFAULT_ANIMATION_CONFIG.revealStyle ?? "none";
  const customEaseValue = config.customEase ?? DEFAULT_ANIMATION_CONFIG.customEase ?? "";
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
  const visualFilterFromValue = config.visualFilterFrom ?? DEFAULT_ANIMATION_CONFIG.visualFilterFrom ?? "";
  const visualFilterToValue = config.visualFilterTo ?? DEFAULT_ANIMATION_CONFIG.visualFilterTo ?? "";
  const visualClipFromValue = config.visualClipFrom ?? DEFAULT_ANIMATION_CONFIG.visualClipFrom ?? "";
  const visualClipToValue = config.visualClipTo ?? DEFAULT_ANIMATION_CONFIG.visualClipTo ?? "";
  const visualRadiusFromValue = config.visualRadiusFrom ?? DEFAULT_ANIMATION_CONFIG.visualRadiusFrom ?? "";
  const visualRadiusToValue = config.visualRadiusTo ?? DEFAULT_ANIMATION_CONFIG.visualRadiusTo ?? "";
  const visualShadowFromValue = config.visualShadowFrom ?? DEFAULT_ANIMATION_CONFIG.visualShadowFrom ?? "";
  const visualShadowToValue = config.visualShadowTo ?? DEFAULT_ANIMATION_CONFIG.visualShadowTo ?? "";
  const visualBackgroundFromValue = config.visualBackgroundFrom ?? DEFAULT_ANIMATION_CONFIG.visualBackgroundFrom ?? "";
  const visualBackgroundToValue = config.visualBackgroundTo ?? DEFAULT_ANIMATION_CONFIG.visualBackgroundTo ?? "";
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

  const resolvedFilterFrom = parseFilterString(visualFilterFromValue);
  const resolvedFilterTo = parseFilterString(visualFilterToValue);
  const filterTypeValue = resolvedFilterFrom?.type ?? resolvedFilterTo?.type ?? "none";
  const filterMeta = FILTER_META[filterTypeValue];
  const filterFromAmount = clampNumber(
    resolvedFilterFrom?.amount ?? filterMeta.defaultFrom,
    filterMeta.min,
    filterMeta.max
  );
  const filterToAmount = clampNumber(
    resolvedFilterTo?.amount ?? filterMeta.defaultTo,
    filterMeta.min,
    filterMeta.max
  );

  const resolvedClipFrom = parseClipString(visualClipFromValue);
  const resolvedClipTo = parseClipString(visualClipToValue);
  const clipTypeValue = resolvedClipFrom?.type ?? resolvedClipTo?.type ?? "none";
  const clipFromAmount = clampNumber(resolvedClipFrom?.amount ?? 100, 0, 100);
  const clipToAmount = clampNumber(resolvedClipTo?.amount ?? 0, 0, 100);

  const radiusFromAmount = clampNumber(parseNumber(visualRadiusFromValue, 0), 0, 200);
  const radiusToAmount = clampNumber(parseNumber(visualRadiusToValue, 0), 0, 200);

  const shadowFromValues = parseShadow(visualShadowFromValue);
  const shadowToValues = parseShadow(visualShadowToValue);

  const quickSelectors: Array<{ label: string; value: string; icon: React.ElementType }> = [
    { label: "Self", value: "", icon: Square },
    { label: "Children", value: ":scope > *", icon: LayoutGrid },
    { label: "Headings", value: "h1, h2, h3, h4, h5, h6", icon: HeadingIcon },
    { label: "Text", value: "p, li", icon: AlignLeft },
    { label: "Buttons", value: "button, a", icon: MousePointerClick },
    { label: "Images", value: "img", icon: ImageIcon },
  ];

  const nodeTargetOptions: Array<{ value: "self" | "children" | "descendants"; label: string; icon: React.ElementType }> = [
    { value: "self", label: "Animate me", icon: Square },
    { value: "children", label: "Animate children (stagger)", icon: LayoutGrid },
    { value: "descendants", label: "Animate all descendants", icon: Layers },
  ];

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

  const parallaxAxisOptions: { label: string; value: ParallaxAxis }[] = [
    { label: "Vertical (Y)", value: "y" },
    { label: "Horizontal (X)", value: "x" },
  ];

  const timelineModeOptions: { label: string; value: TimelineMode }[] = TIMELINE_MODES;
  const scrollModeOptions: { label: string; value: ScrollMode }[] = SCROLL_MODES;
  const revealStyleOptions: { label: string; value: RevealStyle }[] = REVEAL_STYLES;

  const handlePresetChange = useCallback(
    (preset: AnimationPreset): void => {
      if (preset === "none") {
        onChange({ ...DEFAULT_ANIMATION_CONFIG, preset: "none" });
      } else {
        onChange({ ...config, preset });
      }
    },
    [config, onChange]
  );

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, duration: Math.max(0.1, Math.min(10, val)) });
      }
    },
    [config, onChange]
  );

  const handleDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, delay: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleEasingChange = useCallback(
    (easing: string) => {
      onChange({ ...config, easing: easing as AnimationEasing });
    },
    [config, onChange]
  );

  const handleCustomEaseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, customEase: e.target.value });
    },
    [config, onChange]
  );

  const handleTriggerChange = useCallback(
    (trigger: string): void => {
      onChange({ ...config, trigger: trigger as AnimationTrigger });
    },
    [config, onChange]
  );

  const handleSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...config, selector: e.target.value });
    },
    [config, onChange]
  );

  const handleNodeTargetChange = useCallback(
    (mode: "self" | "children" | "descendants"): void => {
      if (mode === "self") {
        onChange({ ...config, selector: ":scope" });
      } else if (mode === "children") {
        onChange({ ...config, selector: ":scope > *", preset: "stagger" });
      } else {
        onChange({ ...config, selector: ":scope *", preset: "stagger" });
      }
    },
    [config, onChange]
  );

  const resolvedNodeTarget: "self" | "children" | "descendants" | "custom" = ((): "self" | "children" | "descendants" | "custom" => {
    const normalized = selectorValue.trim();
    if (!normalized || normalized === ":scope") return "self";
    if (normalized === ":scope > *") return "children";
    if (normalized === ":scope *") return "descendants";
    return "custom";
  })();

  const handleQuickSelector = useCallback(
    (selector: string): void => {
      onChange({ ...config, selector });
    },
    [config, onChange]
  );

  const handleParallaxPresetChange = useCallback(
    (value: string): void => {
      const preset = value as ParallaxPreset;
      const defaults = PARALLAX_DEFAULTS[preset];
      const next: GsapAnimationConfig = {
        ...config,
        parallaxPreset: preset,
        parallaxOffset: preset === "none" ? 0 : defaults?.offset ?? config.parallaxOffset,
      };
      if (preset === "depth" && defaults?.scale) {
        next.parallaxScaleFrom = defaults.scale;
        next.parallaxScaleTo = 1;
      }
      onChange(next);
    },
    [config, onChange]
  );

  const handleParallaxSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...config, parallaxSelector: e.target.value });
    },
    [config, onChange]
  );

  const handleParallaxAxisChange = useCallback(
    (value: string): void => {
      onChange({ ...config, parallaxAxis: value as ParallaxAxis });
    },
    [config, onChange]
  );

  const handleParallaxOffsetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxOffset: Math.max(-300, Math.min(300, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxScrubChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxScrub: Math.max(0, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...config, parallaxStart: e.target.value });
    },
    [config, onChange]
  );

  const handleParallaxEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, parallaxEnd: e.target.value });
    },
    [config, onChange]
  );

  const handleParallaxEaseChange = useCallback(
    (value: string) => {
      onChange({ ...config, parallaxEase: value as AnimationEasing });
    },
    [config, onChange]
  );

  const handleTimelineModeChange = useCallback(
    (value: string) => {
      onChange({ ...config, timelineMode: value as TimelineMode });
    },
    [config, onChange]
  );

  const handleTimelineGapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineGap: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineOverlapChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineOverlap: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineResponseOffsetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineResponseOffset: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineStaggerEachChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineStaggerEach: Math.max(0.01, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineWaveAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineWaveAmount: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineRandomizeChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, timelineRandomize: checked === true });
    },
    [config, onChange]
  );

  const handleTimelineLoopChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, timelineLoop: checked === true });
    },
    [config, onChange]
  );

  const handleTimelineRepeatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineRepeat: Math.max(-1, Math.min(50, val)) });
      }
    },
    [config, onChange]
  );

  const handleTimelineYoyoChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, timelineYoyo: checked === true });
    },
    [config, onChange]
  );

  const handleTimelineRepeatDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, timelineRepeatDelay: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleScrollModeChange = useCallback(
    (value: string) => {
      onChange({ ...config, scrollMode: value as ScrollMode });
    },
    [config, onChange]
  );

  const handleScrollScrubChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, scrollScrub: Math.max(0, Math.min(3, val)) });
      }
    },
    [config, onChange]
  );

  const handleScrollPinChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, scrollPin: checked === true });
    },
    [config, onChange]
  );

  const handleScrollSnapChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, scrollSnap: checked === true });
    },
    [config, onChange]
  );

  const handleScrollSnapDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, scrollSnapDuration: Math.max(0.1, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleScrollStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, scrollStart: e.target.value });
    },
    [config, onChange]
  );

  const handleScrollEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, scrollEnd: e.target.value });
    },
    [config, onChange]
  );

  const handleRevealStyleChange = useCallback(
    (value: string) => {
      onChange({ ...config, revealStyle: value as RevealStyle });
    },
    [config, onChange]
  );

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
      onApply: ({ shapes, path }: { shapes: VectorShape[]; path: string }) => {
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
      onApply: ({ shapes, path }: { shapes: VectorShape[]; path: string }) => {
        onChange({ ...config, svgDrawEnabled: true, svgDrawPath: path, svgDrawShapes: shapes });
      },
    });
  }, [config, onChange, openVectorOverlay, svgDrawShapesValue]);

  const handleSvgDrawClear = useCallback((): void => {
    onChange({ ...config, svgDrawPath: "", svgDrawShapes: [] });
  }, [config, onChange]);

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
      onApply: ({ shapes, path }: { shapes: VectorShape[]; path: string }) => {
        onChange({ ...config, svgMorphEnabled: true, svgMorphTo: path, svgMorphShapes: shapes });
      },
    });
  }, [config, onChange, openVectorOverlay, svgMorphShapesValue]);

  const handleSvgMorphClear = useCallback((): void => {
    onChange({ ...config, svgMorphTo: "", svgMorphShapes: [] });
  }, [config, onChange]);

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

  const handleVisualFilterTypeChange = useCallback(
    (value: string): void => {
      const type = value as VisualFilterType;
      if (type === "none") {
        onChange({ ...config, visualFilterFrom: "", visualFilterTo: "" });
        return;
      }
      const meta = FILTER_META[type];
      const from = clampNumber(resolvedFilterFrom?.amount ?? meta.defaultFrom, meta.min, meta.max);
      const to = clampNumber(resolvedFilterTo?.amount ?? meta.defaultTo, meta.min, meta.max);
      onChange({
        ...config,
        visualFilterFrom: buildFilterString(type, from),
        visualFilterTo: buildFilterString(type, to),
      });
    },
    [config, onChange, resolvedFilterFrom, resolvedFilterTo]
  );

  const handleVisualFilterFromChange = useCallback(
    (value: number): void => {
      if (filterTypeValue === "none") return;
      onChange({ ...config, visualFilterFrom: buildFilterString(filterTypeValue, value) });
    },
    [config, onChange, filterTypeValue]
  );

  const handleVisualFilterToChange = useCallback(
    (value: number): void => {
      if (filterTypeValue === "none") return;
      onChange({ ...config, visualFilterTo: buildFilterString(filterTypeValue, value) });
    },
    [config, onChange, filterTypeValue]
  );

  const handleVisualClipTypeChange = useCallback(
    (value: string): void => {
      const type = value as VisualClipType;
      if (type === "none") {
        onChange({ ...config, visualClipFrom: "", visualClipTo: "" });
        return;
      }
      onChange({
        ...config,
        visualClipFrom: buildClipString(type, clipFromAmount),
        visualClipTo: buildClipString(type, clipToAmount),
      });
    },
    [config, onChange, clipFromAmount, clipToAmount]
  );

  const handleVisualClipFromChange = useCallback(
    (value: number): void => {
      if (clipTypeValue === "none") return;
      onChange({ ...config, visualClipFrom: buildClipString(clipTypeValue, value) });
    },
    [config, onChange, clipTypeValue]
  );

  const handleVisualClipToChange = useCallback(
    (value: number): void => {
      if (clipTypeValue === "none") return;
      onChange({ ...config, visualClipTo: buildClipString(clipTypeValue, value) });
    },
    [config, onChange, clipTypeValue]
  );

  const handleVisualRadiusFromChange = useCallback(
    (value: number): void => {
      onChange({ ...config, visualRadiusFrom: `${clampNumber(value, 0, 200)}px` });
    },
    [config, onChange]
  );

  const handleVisualRadiusToChange = useCallback(
    (value: number): void => {
      onChange({ ...config, visualRadiusTo: `${clampNumber(value, 0, 200)}px` });
    },
    [config, onChange]
  );

  const updateShadowValue = useCallback(
    (target: "from" | "to", partial: Partial<VisualShadowValues>): void => {
      const current = target === "from" ? shadowFromValues : shadowToValues;
      const next = { ...current, ...partial };
      const shadow = buildShadow(next);
      onChange({
        ...config,
        [target === "from" ? "visualShadowFrom" : "visualShadowTo"]: shadow,
      });
    },
    [config, onChange, shadowFromValues, shadowToValues]
  );

  const handleVisualBackgroundFromChange = useCallback(
    (value: string): void => {
      onChange({ ...config, visualBackgroundFrom: value });
    },
    [config, onChange]
  );

  const handleVisualBackgroundToChange = useCallback(
    (value: string): void => {
      onChange({ ...config, visualBackgroundTo: value });
    },
    [config, onChange]
  );

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

  const handleParallaxPatternChange = useCallback(
    (value: string) => {
      onChange({ ...config, parallaxPattern: value as ParallaxPattern });
    },
    [config, onChange]
  );

  const handleParallaxReverseChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, parallaxReverse: checked === true });
    },
    [config, onChange]
  );

  const handleParallaxChildStepChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxChildStep: Math.max(0, Math.min(200, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxLayerStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxLayerStrength: Math.max(0, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxLayerScaleStepChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxLayerScaleStep: Math.max(0, Math.min(0.2, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxRandomSeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxRandomSeed: Math.max(0, Math.min(1000, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxScaleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxScaleFrom: Math.max(0.2, Math.min(3, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxScaleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxScaleTo: Math.max(0.2, Math.min(3, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxRotateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxRotateFrom: Math.max(-180, Math.min(180, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxRotateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxRotateTo: Math.max(-180, Math.min(180, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxOpacityFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxOpacityFrom: Math.max(0, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxOpacityToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxOpacityTo: Math.max(0, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxBlurFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxBlurFrom: Math.max(0, Math.min(30, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxBlurToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxBlurTo: Math.max(0, Math.min(30, val)) });
      }
    },
    [config, onChange]
  );

  return (
    <div className="space-y-4">
      {/* Preset selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Animation preset
        </Label>
        <AnimationPresetPicker value={config.preset} onChange={handlePresetChange} />
      </div>

      {config.preset !== "none" && (
        <>
          {/* Node target */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Node animation
            </Label>
            <div className="grid grid-cols-3 gap-2 place-items-center">
              {nodeTargetOptions.map((option: (typeof nodeTargetOptions)[number]) => {
                const Icon = option.icon;
                const isActive = resolvedNodeTarget === option.value;
                return (
                  <Tooltip key={option.value} content={option.label}>
                    <Button
                      type="button"
                      size="sm"
                      variant={isActive ? "secondary" : "outline"}
                      onClick={(): void => handleNodeTargetChange(option.value)}
                      className="h-8 w-10 p-0"
                      aria-label={option.label}
                    >
                      {React.createElement(Icon, { className: "size-4" })}
                    </Button>
                  </Tooltip>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-500">
              Use "Animate me" for element nodes. Use "Animate children" for folder nodes to stagger direct children.
            </p>
            {resolvedNodeTarget === "custom" && (
              <p className="text-[10px] text-gray-400">
                Custom selector active. Use the selector below and choose a stagger preset if needed.
              </p>
            )}
          </div>

          {/* Target selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Target selector
            </Label>
            <Input
              value={selectorValue}
              onChange={handleSelectorChange}
              placeholder=":scope > *, h2, .card"
              className="text-sm"
            />
            <div className="flex flex-wrap gap-1.5">
              {quickSelectors.map((option: (typeof quickSelectors)[number]) => {
                const Icon = option.icon;
                const isActive = selectorValue === option.value;
                return (
                  <Tooltip key={option.label} content={option.label}>
                    <Button
                      type="button"
                      size="sm"
                      variant={isActive ? "secondary" : "outline"}
                      onClick={(): void => handleQuickSelector(option.value)}
                      className="h-7 w-9 p-0"
                      aria-label={option.label}
                    >
                      {React.createElement(Icon as React.ComponentType<{ className?: string }>, { className: "size-3.5" })}
                    </Button>
                  </Tooltip>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-500">
              Leave empty to animate the wrapper element. Use <span className="text-gray-400">:scope &gt; *</span> for direct children.
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Duration (seconds)
            </Label>
            <Input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={config.duration}
              onChange={handleDurationChange}
              className="text-sm"
            />
          </div>

          {/* Delay */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Delay (seconds)
            </Label>
            <Input
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={config.delay}
              onChange={handleDelayChange}
              className="text-sm"
            />
          </div>

          {/* Easing */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Easing
            </Label>
            <UnifiedSelect
              value={config.easing}
              onValueChange={handleEasingChange}
              options={ANIMATION_EASINGS}
            />
            {config.easing === "custom" && (
              <Input
                value={customEaseValue}
                onChange={handleCustomEaseChange}
                placeholder="0.42,0,0.58,1 or custom ease string"
                className="text-sm"
              />
            )}
          </div>

          {/* Trigger */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Trigger
            </Label>
            <RadioGroup
              value={config.trigger}
              onValueChange={handleTriggerChange}
              className="space-y-1"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="load" id="trigger-load" />
                <Label htmlFor="trigger-load" className="text-sm text-gray-300 cursor-pointer">
                  On page load
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="scroll" id="trigger-scroll" />
                <Label htmlFor="trigger-scroll" className="text-sm text-gray-300 cursor-pointer">
                  On scroll into view
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Timeline choreography */}
          <SectionPanel variant="subtle-compact" className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Timeline choreography
              </Label>
              <UnifiedSelect
                value={timelineModeValue}
                onValueChange={handleTimelineModeChange}
                options={timelineModeOptions}
              />
            </div>

            {timelineModeValue !== "none" && (
              <>
                {(timelineModeValue === "sequence" || timelineModeValue === "callResponse") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Gap (seconds)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      step={0.05}
                      value={timelineGapValue}
                      onChange={handleTimelineGapChange}
                      className="text-sm"
                    />
                  </div>
                )}

                {(timelineModeValue === "overlap" || timelineModeValue === "domino") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Overlap (seconds)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      step={0.05}
                      value={timelineOverlapValue}
                      onChange={handleTimelineOverlapChange}
                      className="text-sm"
                    />
                  </div>
                )}

                {timelineModeValue === "callResponse" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Response offset (seconds)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      step={0.05}
                      value={timelineResponseOffsetValue}
                      onChange={handleTimelineResponseOffsetChange}
                      className="text-sm"
                    />
                  </div>
                )}

                {(timelineModeValue === "cascade" ||
                  timelineModeValue === "wave" ||
                  timelineModeValue === "ripple") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Stagger each (seconds)
                    </Label>
                    <Input
                      type="number"
                      min={0.01}
                      max={2}
                      step={0.01}
                      value={timelineStaggerEachValue}
                      onChange={handleTimelineStaggerEachChange}
                      className="text-sm"
                    />
                  </div>
                )}

                {timelineModeValue === "wave" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Wave amount (seconds)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      step={0.05}
                      value={timelineWaveAmountValue}
                      onChange={handleTimelineWaveAmountChange}
                      className="text-sm"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <Checkbox checked={timelineRandomizeValue} onCheckedChange={handleTimelineRandomizeChange} />
                    Random order
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <Checkbox checked={timelineLoopValue} onCheckedChange={handleTimelineLoopChange} />
                    Loop
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <Checkbox checked={timelineYoyoValue} onCheckedChange={handleTimelineYoyoChange} />
                    Yoyo
                  </label>
                </div>

                {timelineLoopValue && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Repeat (-1 = infinite)
                      </Label>
                      <Input
                        type="number"
                        min={-1}
                        max={50}
                        step={1}
                        value={timelineRepeatValue}
                        onChange={handleTimelineRepeatChange}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Repeat delay (seconds)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        step={0.05}
                        value={timelineRepeatDelayValue}
                        onChange={handleTimelineRepeatDelayChange}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-gray-500">
                  Use selector <span className="text-gray-400">:scope &gt; *</span> to choreograph children.
                </p>
              </>
            )}
          </SectionPanel>

          {/* Scroll storytelling */}
          <SectionPanel variant="subtle-compact" className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Scroll storytelling
              </Label>
              <UnifiedSelect
                value={scrollModeValue}
                onValueChange={handleScrollModeChange}
                options={scrollModeOptions}
              />
            </div>

            {scrollModeValue !== "none" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Start
                    </Label>
                    <Input
                      value={scrollStartValue}
                      onChange={handleScrollStartChange}
                      placeholder="top 85%"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      End
                    </Label>
                    <Input
                      value={scrollEndValue}
                      onChange={handleScrollEndChange}
                      placeholder="bottom top"
                      className="text-sm"
                    />
                  </div>
                </div>

                {scrollModeValue === "reveal" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Reveal style
                    </Label>
                    <UnifiedSelect
                      value={revealStyleValue}
                      onValueChange={handleRevealStyleChange}
                      options={revealStyleOptions}
                    />
                  </div>
                )}

                {(scrollModeValue === "scrub" || scrollModeValue === "pin" || scrollModeValue === "story") && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Scrub
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={3}
                          step={0.1}
                          value={scrollScrubValue}
                          onChange={handleScrollScrubChange}
                          className="text-sm"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-300">
                        <Checkbox
                          checked={scrollModeValue === "pin" || scrollModeValue === "story" ? true : scrollPinValue}
                          onCheckedChange={handleScrollPinChange}
                          disabled={scrollModeValue === "pin" || scrollModeValue === "story"}
                        />
                        Pin section
                      </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-xs text-gray-300">
                        <Checkbox checked={scrollSnapValue} onCheckedChange={handleScrollSnapChange} />
                        Scroll snap to steps
                      </label>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                          Snap duration
                        </Label>
                        <Input
                          type="number"
                          min={0.1}
                          max={2}
                          step={0.05}
                          value={scrollSnapDurationValue}
                          onChange={handleScrollSnapDurationChange}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                <p className="text-[10px] text-gray-500">
                  Story + pin works best with Timeline modes and multiple targets.
                </p>
              </>
            )}
          </SectionPanel>

          {/* Parallax */}
          <SectionPanel variant="subtle-compact" className="space-y-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Parallax
              </Label>
              <UnifiedSelect
                value={parallaxPresetValue}
                onValueChange={handleParallaxPresetChange}
                options={PARALLAX_PRESETS}
              />
            </div>

            {parallaxPresetValue !== "none" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Pattern
                    </Label>
                    <UnifiedSelect
                      value={parallaxPatternValue}
                      onValueChange={handleParallaxPatternChange}
                      options={PARALLAX_PATTERNS}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <Checkbox checked={parallaxReverseValue} onCheckedChange={handleParallaxReverseChange} />
                    Reverse direction
                  </label>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Axis
                  </Label>
                  <UnifiedSelect
                    value={parallaxAxisValue}
                    onValueChange={handleParallaxAxisChange}
                    options={parallaxAxisOptions}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Offset (px)
                    </Label>
                    <Input
                      type="number"
                      min={-300}
                      max={300}
                      step={5}
                      value={parallaxOffsetValue}
                      onChange={handleParallaxOffsetChange}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Scrub
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={parallaxScrubValue}
                      onChange={handleParallaxScrubChange}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Start
                    </Label>
                    <Input
                      value={parallaxStartValue}
                      onChange={handleParallaxStartChange}
                      placeholder="top bottom"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      End
                    </Label>
                    <Input
                      value={parallaxEndValue}
                      onChange={handleParallaxEndChange}
                      placeholder="bottom top"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Target selector
                    </Label>
                    <Input
                      value={parallaxSelectorValue}
                      onChange={handleParallaxSelectorChange}
                      placeholder=":scope > *"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Ease
                    </Label>
                    <UnifiedSelect
                      value={parallaxEaseValue}
                      onValueChange={handleParallaxEaseChange}
                      options={ANIMATION_EASINGS}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Scale from
                    </Label>
                    <Input
                      type="number"
                      min={0.2}
                      max={3}
                      step={0.02}
                      value={parallaxScaleFromValue}
                      onChange={handleParallaxScaleFromChange}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Scale to
                    </Label>
                    <Input
                      type="number"
                      min={0.2}
                      max={3}
                      step={0.02}
                      value={parallaxScaleToValue}
                      onChange={handleParallaxScaleToChange}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Rotate from (deg)
                    </Label>
                    <Input
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={parallaxRotateFromValue}
                      onChange={handleParallaxRotateFromChange}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Rotate to (deg)
                    </Label>
                    <Input
                      type="number"
                      min={-180}
                      max={180}
                      step={1}
                      value={parallaxRotateToValue}
                      onChange={handleParallaxRotateToChange}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Opacity from
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={parallaxOpacityFromValue}
                      onChange={handleParallaxOpacityFromChange}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Opacity to
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={parallaxOpacityToValue}
                      onChange={handleParallaxOpacityToChange}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Blur from (px)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      step={1}
                      value={parallaxBlurFromValue}
                      onChange={handleParallaxBlurFromChange}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Blur to (px)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      step={1}
                      value={parallaxBlurToValue}
                      onChange={handleParallaxBlurToChange}
                      className="text-sm"
                    />
                  </div>
                </div>
                {parallaxPatternValue === "increment" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Per-child step (px)
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={200}
                      step={1}
                      value={parallaxChildStepValue}
                      onChange={handleParallaxChildStepChange}
                      className="text-sm"
                    />
                  </div>
                )}

                {parallaxPatternValue === "layers" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Layer strength
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={2}
                        step={0.05}
                        value={parallaxLayerStrengthValue}
                        onChange={handleParallaxLayerStrengthChange}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Layer scale step
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={0.2}
                        step={0.005}
                        value={parallaxLayerScaleStepValue}
                        onChange={handleParallaxLayerScaleStepChange}
                        className="text-sm"
                      />
                    </div>
                  </div>
                )}

                {parallaxPatternValue === "random" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Random seed
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={1000}
                      step={1}
                      value={parallaxRandomSeedValue}
                      onChange={handleParallaxRandomSeedChange}
                      className="text-sm"
                    />
                  </div>
                )}

                <p className="text-[10px] text-gray-500">
                  Use a selector like <span className="text-gray-400">:scope &gt; *</span> for per-child patterns.
                </p>
              </>
            )}
          </SectionPanel>

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

          {/* Visual Effects */}
          <SectionPanel variant="subtle-compact" className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Visual FX
            </Label>
            <div className="space-y-3">
              <div className="rounded-lg border border-border/40 bg-gray-900/30 p-3 space-y-3">
                <SelectField
                  label="Filter type"
                  value={filterTypeValue}
                  onChange={handleVisualFilterTypeChange}
                  options={FILTER_OPTIONS}
                />
                {filterTypeValue !== "none" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RangeField
                      label="Filter from"
                      value={filterFromAmount}
                      onChange={handleVisualFilterFromChange}
                      min={filterMeta.min}
                      max={filterMeta.max}
                      step={filterMeta.step}
                      suffix={filterMeta.unit}
                    />
                    <RangeField
                      label="Filter to"
                      value={filterToAmount}
                      onChange={handleVisualFilterToChange}
                      min={filterMeta.min}
                      max={filterMeta.max}
                      step={filterMeta.step}
                      suffix={filterMeta.unit}
                    />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border/40 bg-gray-900/30 p-3 space-y-3">
                <SelectField
                  label="Clip path"
                  value={clipTypeValue}
                  onChange={handleVisualClipTypeChange}
                  options={CLIP_OPTIONS}
                />
                {clipTypeValue !== "none" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RangeField
                      label="Clip from"
                      value={clipFromAmount}
                      onChange={handleVisualClipFromChange}
                      min={0}
                      max={100}
                      step={1}
                      suffix="%"
                    />
                    <RangeField
                      label="Clip to"
                      value={clipToAmount}
                      onChange={handleVisualClipToChange}
                      min={0}
                      max={100}
                      step={1}
                      suffix="%"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border/40 bg-gray-900/30 p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <RangeField
                    label="Radius from"
                    value={radiusFromAmount}
                    onChange={handleVisualRadiusFromChange}
                    min={0}
                    max={200}
                    step={1}
                    suffix="px"
                  />
                  <RangeField
                    label="Radius to"
                    value={radiusToAmount}
                    onChange={handleVisualRadiusToChange}
                    min={0}
                    max={200}
                    step={1}
                    suffix="px"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-gray-900/30 p-3 space-y-3">
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Shadow</div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">From</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <RangeField
                        label="Offset X"
                        value={shadowFromValues.x}
                        onChange={(value: number) => updateShadowValue("from", { x: value })}
                        min={-60}
                        max={60}
                        step={1}
                        suffix="px"
                      />
                      <RangeField
                        label="Offset Y"
                        value={shadowFromValues.y}
                        onChange={(value: number) => updateShadowValue("from", { y: value })}
                        min={-60}
                        max={60}
                        step={1}
                        suffix="px"
                      />
                      <RangeField
                        label="Blur"
                        value={shadowFromValues.blur}
                        onChange={(value: number) => updateShadowValue("from", { blur: value })}
                        min={0}
                        max={120}
                        step={1}
                        suffix="px"
                      />
                      <RangeField
                        label="Spread"
                        value={shadowFromValues.spread}
                        onChange={(value: number) => updateShadowValue("from", { spread: value })}
                        min={-40}
                        max={40}
                        step={1}
                        suffix="px"
                      />
                      <RangeField
                        label="Opacity"
                        value={shadowFromValues.opacity}
                        onChange={(value: number) => updateShadowValue("from", { opacity: value })}
                        min={0}
                        max={100}
                        step={1}
                        suffix="%"
                      />
                    </div>
                    <ColorPickerField
                      label="Color"
                      value={shadowFromValues.color}
                      onChange={(value: string) => updateShadowValue("from", { color: value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">To</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <RangeField
                        label="Offset X"
                        value={shadowToValues.x}
                        onChange={(value: number) => updateShadowValue("to", { x: value })}
                        min={-60}
                        max={60}
                        step={1}
                        suffix="px"
                      />
                      <RangeField
                        label="Offset Y"
                        value={shadowToValues.y}
                        onChange={(value: number) => updateShadowValue("to", { y: value })}
                        min={-60}
                        max={60}
                        step={1}
                        suffix="px"
                      />
                      <RangeField
                        label="Blur"
                        value={shadowToValues.blur}
                        onChange={(value: number) => updateShadowValue("to", { blur: value })}
                        min={0}
                        max={120}
                        step={1}
                        suffix="px"
                      />
                      <RangeField
                        label="Spread"
                        value={shadowToValues.spread}
                        onChange={(value: number) => updateShadowValue("to", { spread: value })}
                        min={-40}
                        max={40}
                        step={1}
                        suffix="px"
                      />
                      <RangeField
                        label="Opacity"
                        value={shadowToValues.opacity}
                        onChange={(value: number) => updateShadowValue("to", { opacity: value })}
                        min={0}
                        max={100}
                        step={1}
                        suffix="%"
                      />
                    </div>
                    <ColorPickerField
                      label="Color"
                      value={shadowToValues.color}
                      onChange={(value: string) => updateShadowValue("to", { color: value })}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-gray-900/30 p-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <ColorPickerField
                    label="Background from"
                    value={visualBackgroundFromValue}
                    onChange={handleVisualBackgroundFromChange}
                  />
                  <ColorPickerField
                    label="Background to"
                    value={visualBackgroundToValue}
                    onChange={handleVisualBackgroundToChange}
                  />
                </div>
              </div>
            </div>
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
      )}
    </div>
  );
}
