"use client";

import React, { useCallback } from "react";
import {
  Button,
  Checkbox,
  Label,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
} from "@/shared/ui";
import type {
  GsapAnimationConfig,
  AnimationPreset,
  AnimationEasing,
  AnimationTrigger,
  StaggerFrom,
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

interface AnimationConfigPanelProps {
  value: GsapAnimationConfig | undefined;
  onChange: (config: GsapAnimationConfig) => void;
}

export function AnimationConfigPanel({ value, onChange }: AnimationConfigPanelProps): React.ReactNode {
  const config = value ?? DEFAULT_ANIMATION_CONFIG;
  const selectorValue = config.selector ?? "";
  const staggerEachValue = config.staggerEach ?? DEFAULT_ANIMATION_CONFIG.staggerEach ?? 0.12;
  const staggerAmountValue = config.staggerAmount ?? 0;
  const staggerFromValue = config.staggerFrom ?? DEFAULT_ANIMATION_CONFIG.staggerFrom ?? "start";
  const parallaxPresetValue = config.parallaxPreset ?? DEFAULT_ANIMATION_CONFIG.parallaxPreset ?? "none";
  const parallaxAxisValue = config.parallaxAxis ?? DEFAULT_ANIMATION_CONFIG.parallaxAxis ?? "y";
  const parallaxOffsetValue =
    config.parallaxOffset ?? PARALLAX_DEFAULTS[parallaxPresetValue]?.offset ?? DEFAULT_ANIMATION_CONFIG.parallaxOffset ?? 0;
  const parallaxScrubValue = config.parallaxScrub ?? DEFAULT_ANIMATION_CONFIG.parallaxScrub ?? 0.6;
  const parallaxStartValue = config.parallaxStart ?? DEFAULT_ANIMATION_CONFIG.parallaxStart ?? "top bottom";
  const parallaxEndValue = config.parallaxEnd ?? DEFAULT_ANIMATION_CONFIG.parallaxEnd ?? "bottom top";
  const parallaxPatternValue = config.parallaxPattern ?? DEFAULT_ANIMATION_CONFIG.parallaxPattern ?? "uniform";
  const parallaxReverseValue = config.parallaxReverse ?? DEFAULT_ANIMATION_CONFIG.parallaxReverse ?? false;
  const parallaxChildStepValue = config.parallaxChildStep ?? DEFAULT_ANIMATION_CONFIG.parallaxChildStep ?? 16;
  const parallaxLayerStrengthValue = config.parallaxLayerStrength ?? DEFAULT_ANIMATION_CONFIG.parallaxLayerStrength ?? 0.35;
  const parallaxLayerScaleStepValue = config.parallaxLayerScaleStep ?? DEFAULT_ANIMATION_CONFIG.parallaxLayerScaleStep ?? 0.015;
  const parallaxRandomSeedValue = config.parallaxRandomSeed ?? DEFAULT_ANIMATION_CONFIG.parallaxRandomSeed ?? 7;
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
  const svgDrawEnabledValue = config.svgDrawEnabled ?? DEFAULT_ANIMATION_CONFIG.svgDrawEnabled ?? false;
  const svgDrawSelectorValue = config.svgDrawSelector ?? DEFAULT_ANIMATION_CONFIG.svgDrawSelector ?? "path";
  const svgDrawFromValue = config.svgDrawFrom ?? DEFAULT_ANIMATION_CONFIG.svgDrawFrom ?? 0;
  const svgDrawToValue = config.svgDrawTo ?? DEFAULT_ANIMATION_CONFIG.svgDrawTo ?? 100;
  const svgMorphEnabledValue = config.svgMorphEnabled ?? DEFAULT_ANIMATION_CONFIG.svgMorphEnabled ?? false;
  const svgMorphSelectorValue = config.svgMorphSelector ?? DEFAULT_ANIMATION_CONFIG.svgMorphSelector ?? "path";
  const svgMorphToValue = config.svgMorphTo ?? DEFAULT_ANIMATION_CONFIG.svgMorphTo ?? "";
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
  const flipEnabledValue = config.flipEnabled ?? DEFAULT_ANIMATION_CONFIG.flipEnabled ?? false;
  const flipSelectorValue = config.flipSelector ?? DEFAULT_ANIMATION_CONFIG.flipSelector ?? "";
  const flipScaleValue = config.flipScale ?? DEFAULT_ANIMATION_CONFIG.flipScale ?? true;
  const flipFadeValue = config.flipFade ?? DEFAULT_ANIMATION_CONFIG.flipFade ?? true;
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

  const quickSelectors = [
    { label: "Self", value: "" },
    { label: "Children", value: ":scope > *" },
    { label: "Headings", value: "h1, h2, h3, h4, h5, h6" },
    { label: "Text", value: "p, li" },
    { label: "Buttons", value: "button, a" },
    { label: "Images", value: "img" },
  ];

  const staggerFromOptions: { label: string; value: StaggerFrom }[] = [
    { label: "Start", value: "start" },
    { label: "Center", value: "center" },
    { label: "End", value: "end" },
    { label: "Edges", value: "edges" },
    { label: "Random", value: "random" },
  ];

  const parallaxAxisOptions: { label: string; value: ParallaxAxis }[] = [
    { label: "Vertical (Y)", value: "y" },
    { label: "Horizontal (X)", value: "x" },
  ];

  const timelineModeOptions: { label: string; value: TimelineMode }[] = TIMELINE_MODES;
  const scrollModeOptions: { label: string; value: ScrollMode }[] = SCROLL_MODES;
  const revealStyleOptions: { label: string; value: RevealStyle }[] = REVEAL_STYLES;

  const handlePresetChange = useCallback(
    (preset: AnimationPreset) => {
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
    (trigger: string) => {
      onChange({ ...config, trigger: trigger as AnimationTrigger });
    },
    [config, onChange]
  );

  const handleSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, selector: e.target.value });
    },
    [config, onChange]
  );

  const handleQuickSelector = useCallback(
    (selector: string) => {
      onChange({ ...config, selector });
    },
    [config, onChange]
  );

  const handleStaggerEachChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, staggerEach: Math.max(0.01, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleStaggerAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, staggerAmount: Math.max(0, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleStaggerFromChange = useCallback(
    (value: string) => {
      onChange({ ...config, staggerFrom: value as StaggerFrom });
    },
    [config, onChange]
  );

  const handleParallaxPresetChange = useCallback(
    (value: string) => {
      const preset = value as ParallaxPreset;
      const defaults = PARALLAX_DEFAULTS[preset];
      onChange({
        ...config,
        parallaxPreset: preset,
        parallaxOffset: preset === "none" ? 0 : defaults?.offset ?? config.parallaxOffset,
      });
    },
    [config, onChange]
  );

  const handleParallaxAxisChange = useCallback(
    (value: string) => {
      onChange({ ...config, parallaxAxis: value as ParallaxAxis });
    },
    [config, onChange]
  );

  const handleParallaxOffsetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxOffset: Math.max(-300, Math.min(300, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxScrubChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, parallaxScrub: Math.max(0, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleParallaxStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...config, motionPathPath: e.target.value });
    },
    [config, onChange]
  );

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
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...config, svgMorphTo: e.target.value });
    },
    [config, onChange]
  );

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

  const handleVisualFilterFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualFilterFrom: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualFilterToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualFilterTo: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualClipFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualClipFrom: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualClipToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualClipTo: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualRadiusFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualRadiusFrom: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualRadiusToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualRadiusTo: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualShadowFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualShadowFrom: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualShadowToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualShadowTo: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualBackgroundFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualBackgroundFrom: e.target.value });
    },
    [config, onChange]
  );

  const handleVisualBackgroundToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, visualBackgroundTo: e.target.value });
    },
    [config, onChange]
  );

  const handleFlipEnabledChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, flipEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleFlipSelectorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...config, flipSelector: e.target.value });
    },
    [config, onChange]
  );

  const handleFlipScaleChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, flipScale: checked === true });
    },
    [config, onChange]
  );

  const handleFlipFadeChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onChange({ ...config, flipFade: checked === true });
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

  const handleObserverTypeChange = useCallback(
    (value: string) => {
      onChange({ ...config, observerType: value as ObserverType });
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
              {quickSelectors.map((option) => (
                <Button
                  key={option.label}
                  type="button"
                  size="sm"
                  variant={selectorValue === option.value ? "secondary" : "outline"}
                  onClick={(): void => handleQuickSelector(option.value)}
                  className="h-7 px-2 text-[10px]"
                >
                  {option.label}
                </Button>
              ))}
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
            <Select value={config.easing} onValueChange={handleEasingChange}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANIMATION_EASINGS.map((e: { label: string; value: AnimationEasing }) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Timeline choreography
              </Label>
              <Select value={timelineModeValue} onValueChange={handleTimelineModeChange}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timelineModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          {/* Scroll storytelling */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Scroll storytelling
              </Label>
              <Select value={scrollModeValue} onValueChange={handleScrollModeChange}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scrollModeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <Select value={revealStyleValue} onValueChange={handleRevealStyleChange}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {revealStyleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          </div>

          {/* Parallax */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Parallax
              </Label>
              <Select value={parallaxPresetValue} onValueChange={handleParallaxPresetChange}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARALLAX_PRESETS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {parallaxPresetValue !== "none" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Pattern
                    </Label>
                    <Select value={parallaxPatternValue} onValueChange={handleParallaxPatternChange}>
                      <SelectTrigger className="w-full text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PARALLAX_PATTERNS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <Select value={parallaxAxisValue} onValueChange={handleParallaxAxisChange}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parallaxAxisOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          </div>

          {/* Motion Path */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Motion Path
              </Label>
              <Checkbox checked={motionPathEnabledValue} onCheckedChange={handleMotionPathEnabledChange} />
            </div>

            {motionPathEnabledValue && (
              <>
                <Textarea
                  value={motionPathPathValue}
                  onChange={handleMotionPathPathChange}
                  placeholder="SVG path data or selector (#path)"
                  className="text-xs"
                />

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
          </div>

          {/* SVG Effects */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
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
                  <Input
                    value={svgDrawSelectorValue}
                    onChange={handleSvgDrawSelectorChange}
                    placeholder="path, line, circle"
                    className="text-sm"
                  />
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
                  <Input
                    value={svgMorphSelectorValue}
                    onChange={handleSvgMorphSelectorChange}
                    placeholder="path"
                    className="text-sm"
                  />
                  <Textarea
                    value={svgMorphToValue}
                    onChange={handleSvgMorphToChange}
                    placeholder="Target path data or selector (#path)"
                    className="text-xs"
                  />
                </>
              )}
            </div>
          </div>

          {/* Text Effects */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Text Effects
            </Label>
            <Select value={textEffectValue} onValueChange={handleTextEffectChange}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_EFFECTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          </div>

          {/* Visual Effects */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Visual FX
            </Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={visualFilterFromValue}
                onChange={handleVisualFilterFromChange}
                placeholder="Filter from (e.g. hue-rotate(0deg))"
                className="text-sm"
              />
              <Input
                value={visualFilterToValue}
                onChange={handleVisualFilterToChange}
                placeholder="Filter to (e.g. hue-rotate(90deg))"
                className="text-sm"
              />
              <Input
                value={visualClipFromValue}
                onChange={handleVisualClipFromChange}
                placeholder="Clip-path from (inset(100% 0 0 0))"
                className="text-sm"
              />
              <Input
                value={visualClipToValue}
                onChange={handleVisualClipToChange}
                placeholder="Clip-path to (inset(0 0 0 0))"
                className="text-sm"
              />
              <Input
                value={visualRadiusFromValue}
                onChange={handleVisualRadiusFromChange}
                placeholder="Radius from (0px)"
                className="text-sm"
              />
              <Input
                value={visualRadiusToValue}
                onChange={handleVisualRadiusToChange}
                placeholder="Radius to (999px)"
                className="text-sm"
              />
              <Input
                value={visualShadowFromValue}
                onChange={handleVisualShadowFromChange}
                placeholder="Shadow from"
                className="text-sm"
              />
              <Input
                value={visualShadowToValue}
                onChange={handleVisualShadowToChange}
                placeholder="Shadow to"
                className="text-sm"
              />
              <Input
                value={visualBackgroundFromValue}
                onChange={handleVisualBackgroundFromChange}
                placeholder="Background from"
                className="text-sm"
              />
              <Input
                value={visualBackgroundToValue}
                onChange={handleVisualBackgroundToChange}
                placeholder="Background to"
                className="text-sm"
              />
            </div>
          </div>

          {/* Velocity-based FX */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Velocity FX
            </Label>
            <Select value={velocityEffectValue} onValueChange={handleVelocityEffectChange}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VELOCITY_EFFECTS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {velocityEffectValue !== "none" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Strength
                    </Label>
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
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Max
                    </Label>
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
                <p className="text-[10px] text-gray-500">
                  Works with scroll, drag, and observer inputs.
                </p>
              </>
            )}
          </div>

          {/* Observer */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Observer
              </Label>
              <Checkbox checked={observerEnabledValue} onCheckedChange={handleObserverEnabledChange} />
            </div>
            {observerEnabledValue && (
              <>
                <Select value={observerTypeValue} onValueChange={handleObserverTypeChange}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBSERVER_TYPES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={observerAxisValue} onValueChange={handleObserverAxisChange}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRAG_AXES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Speed multiplier
                  </Label>
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
              </>
            )}
          </div>

          {/* Magnet */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Magnet
              </Label>
              <Checkbox checked={magnetEnabledValue} onCheckedChange={handleMagnetEnabledChange} />
            </div>
            {magnetEnabledValue && (
              <>
                <Select value={magnetAxisValue} onValueChange={handleMagnetAxisChange}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRAG_AXES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Strength
                    </Label>
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
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Radius (px)
                    </Label>
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
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Return duration (s)
                  </Label>
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
              </>
            )}
          </div>

          {/* Flip transitions */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Layout Flip
              </Label>
              <Checkbox checked={flipEnabledValue} onCheckedChange={handleFlipEnabledChange} />
            </div>
            {flipEnabledValue && (
              <>
                <Input
                  value={flipSelectorValue}
                  onChange={handleFlipSelectorChange}
                  placeholder="Selector (leave empty for direct children)"
                  className="text-sm"
                />
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <Checkbox checked={flipScaleValue} onCheckedChange={handleFlipScaleChange} />
                    Scale
                  </label>
                  <label className="flex items-center gap-2 text-xs text-gray-300">
                    <Checkbox checked={flipFadeValue} onCheckedChange={handleFlipFadeChange} />
                    Fade
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Gestures */}
          <div className="space-y-2 rounded-lg border border-border/30 bg-gray-900/30 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Gestures (Draggable)
              </Label>
              <Checkbox checked={draggableEnabledValue} onCheckedChange={handleDraggableEnabledChange} />
            </div>
            {draggableEnabledValue && (
              <>
                <Select value={draggableTypeValue} onValueChange={handleDraggableTypeChange}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DRAG_AXES.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={draggableBoundsValue}
                  onChange={handleDraggableBoundsChange}
                  placeholder="Bounds selector (optional)"
                  className="text-sm"
                />
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <Checkbox checked={draggableMomentumValue} onCheckedChange={handleDraggableMomentumChange} />
                  Momentum
                </label>
                {draggableMomentumValue && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Momentum factor
                    </Label>
                    <Input
                      type="number"
                      min={0.1}
                      max={2}
                      step={0.1}
                      value={draggableMomentumFactorValue}
                      onChange={handleDraggableMomentumFactorChange}
                      className="text-sm"
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <Checkbox checked={draggableCarouselValue} onCheckedChange={handleDraggableCarouselChange} />
                  Carousel mode (snap to slides)
                </label>
                {draggableCarouselValue && (
                  <>
                    <Input
                      value={draggableCarouselSelectorValue}
                      onChange={handleDraggableCarouselSelectorChange}
                      placeholder="Carousel track selector (optional)"
                      className="text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs text-gray-300">
                      <Checkbox checked={draggableCarouselSnapValue} onCheckedChange={handleDraggableCarouselSnapChange} />
                      Snap to child positions
                    </label>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Snap (px)
                  </Label>
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
              </>
            )}
          </div>

          {/* Stagger hint */}
          {config.preset === "stagger" && (
            <>
              <div className="rounded border border-border/30 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
                Stagger animates each target element in sequence. Amount overrides Each when set above 0.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Stagger each (seconds)
                  </Label>
                  <Input
                    type="number"
                    min={0.01}
                    max={2}
                    step={0.01}
                    value={staggerEachValue}
                    onChange={handleStaggerEachChange}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Stagger amount (seconds)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    step={0.05}
                    value={staggerAmountValue}
                    onChange={handleStaggerAmountChange}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Stagger from
                </Label>
                <Select value={staggerFromValue} onValueChange={handleStaggerFromChange}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {staggerFromOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </>
      )}
      <div className="space-y-3 rounded-lg border border-border/30 bg-gray-900/30 p-3">
        <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          GSAP playbook
        </Label>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Layout transitions / FLIP
            </div>
            <ul className="space-y-0.5">
              <li>Super efektowne plynne przejscia ukladu:</li>
              <li>sortowanie gridu</li>
              <li>przejscie karta -&gt; fullscreen</li>
              <li>filtr galerii bez &quot;skakania&quot; layoutu</li>
            </ul>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              SVG: morphing, rysowanie, maski
            </div>
            <ul className="space-y-0.5">
              <li>Morphing ksztaltow (MorphSVG) - logo, ikony, plynne przejscia</li>
              <li>&quot;Draw on&quot; (DrawSVG) - rysowanie linii/obrysow</li>
              <li>Maski / reveal w SVG: wycinanki, wipe&#39;y, spotlight</li>
            </ul>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Tekst: kinetyczna typografia
            </div>
            <ul className="space-y-0.5">
              <li>SplitText: animowanie liter/slow/wierszy (wejscia, fale, rozpad)</li>
              <li>ScrambleText: &quot;hakowanie&quot;, glitch tekstowy</li>
              <li>Typing/cursor (latwe do zrobienia timeline&#39;em)</li>
              <li>Count-up w liczbach (liczniki, KPI, statystyki)</li>
            </ul>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Efekty wizualne bez WebGL (CSS/SVG)
            </div>
            <ul className="space-y-0.5">
              <li>hue-rotate, saturate, contrast, brightness</li>
              <li>drop-shadow (pulsujace cienie)</li>
              <li>clip-path (reveal, &quot;zamykanie&quot; w ksztalt, dynamiczne wyciecia)</li>
              <li>border-radius (morph box -&gt; pill -&gt; circle)</li>
              <li>gradienty (da sie, choc czasem wygodniej przez SVG/stop colors)</li>
            </ul>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Interakcje i gesty (Draggable / Observer / Inertia)
            </div>
            <ul className="space-y-0.5">
              <li>Drag &amp; drop, swipe, &quot;rzuty&quot; z bezwladnoscia (momentum)</li>
              <li>&quot;Magnetyczne&quot; przyciaganie do punktow</li>
              <li>Carousel sterowany gestami</li>
              <li>Ruch zalezny od predkosci scrolla/drag (velocity-based)</li>
            </ul>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Canvas / WebGL / Pixi
            </div>
            <ul className="space-y-0.5">
              <li>GSAP swietnie steruje:</li>
              <li>animacjami na <span className="font-mono text-gray-300">&lt;canvas&gt;</span></li>
              <li>scenami WebGL (np. PixiJS przez PixiPlugin)</li>
              <li>parametrami shaderow (gdy masz do nich dostep w JS)</li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Mini-przyklady (dla wyobrazenia)
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-gray-300">Stagger &quot;fala&quot; na kafelkach:</p>
              <pre className="rounded border border-border/40 bg-gray-950/60 p-2 text-[11px] text-gray-200">
{`gsap.from(".card", {
  y: 30,
  opacity: 0,
  duration: 0.6,
  stagger: 0.06,
  ease: "power3.out"
});`}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] text-gray-300">ScrollTrigger: pin + scrub (storytelling):</p>
              <pre className="rounded border border-border/40 bg-gray-950/60 p-2 text-[11px] text-gray-200">
{`gsap.to(".panel", {
  xPercent: -100,
  ease: "none",
  scrollTrigger: {
    trigger: ".wrap",
    start: "top top",
    end: "+=1500",
    scrub: true,
    pin: true
  }
});`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
