"use client";

import React, { useCallback } from "react";
import {
  Checkbox,
  Label,
  Input,
  UnifiedSelect,
  SectionPanel,
} from "@/shared/ui";
import type {
  GsapAnimationConfig,
  TimelineMode,
  ScrollMode,
  RevealStyle,
} from "@/features/gsap";
import {
  DEFAULT_ANIMATION_CONFIG,
  TIMELINE_MODES,
  SCROLL_MODES,
  REVEAL_STYLES,
} from "@/features/gsap";

interface TimelineSectionProps {
  config: GsapAnimationConfig;
  onChange: (config: GsapAnimationConfig) => void;
}

export function TimelineSection({ config, onChange }: TimelineSectionProps): React.ReactNode {
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

  const timelineModeOptions: { label: string; value: TimelineMode }[] = TIMELINE_MODES;
  const scrollModeOptions: { label: string; value: ScrollMode }[] = SCROLL_MODES;
  const revealStyleOptions: { label: string; value: RevealStyle }[] = REVEAL_STYLES;

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

  return (
    <>
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
    </>
  );
}
