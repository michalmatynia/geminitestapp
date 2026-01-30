"use client";

import React, { useCallback } from "react";
import {
  Label,
  Input,
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
} from "../../types/animation";
import {
  DEFAULT_ANIMATION_CONFIG,
  ANIMATION_PRESETS,
  ANIMATION_EASINGS,
} from "../../types/animation";

interface AnimationConfigPanelProps {
  value: GsapAnimationConfig | undefined;
  onChange: (config: GsapAnimationConfig) => void;
}

export function AnimationConfigPanel({ value, onChange }: AnimationConfigPanelProps): React.ReactNode {
  const config = value ?? DEFAULT_ANIMATION_CONFIG;

  const handlePresetChange = useCallback(
    (preset: string) => {
      if (preset === "none") {
        onChange({ ...DEFAULT_ANIMATION_CONFIG, preset: "none" });
      } else {
        onChange({ ...config, preset: preset as AnimationPreset });
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

  return (
    <div className="space-y-4">
      {/* Preset selector */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Animation preset
        </Label>
        <Select value={config.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANIMATION_PRESETS.map((p: { label: string; value: AnimationPreset }) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config.preset !== "none" && (
        <>
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
