"use client";

import React, { useCallback } from "react";
import {
  Button,
  Label,
  Input,
  RadioGroup,
  RadioGroupItem,
} from "@/shared/ui";
import type {
  GsapAnimationConfig,
  AnimationPreset,
  AnimationEasing,
  AnimationTrigger,
} from "@/features/gsap";
import {
  DEFAULT_ANIMATION_CONFIG,
  ANIMATION_EASINGS,
  AnimationPresetPicker,
} from "@/features/gsap";

interface AnimationConfigPanelProps {
  value: GsapAnimationConfig | undefined;
  onChange: (config: GsapAnimationConfig) => void;
}

export function AnimationConfigPanel({ value, onChange }: AnimationConfigPanelProps): React.ReactNode {
  const config = value ?? DEFAULT_ANIMATION_CONFIG;
  const selectorValue = config.selector ?? "";

  const quickSelectors = [
    { label: "Self", value: "" },
    { label: "Children", value: ":scope > *" },
    { label: "Headings", value: "h1, h2, h3, h4, h5, h6" },
    { label: "Text", value: "p, li" },
    { label: "Buttons", value: "button, a" },
    { label: "Images", value: "img" },
  ];

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

          {/* Stagger hint */}
          {config.preset === "stagger" && (
            <div className="rounded border border-border/30 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
              Stagger animates each direct child element in sequence with a slight offset.
            </div>
          )}
        </>
      )}
    </div>
  );
}
