'use client';

import React, { useCallback, useMemo } from 'react';

import {
  CSS_ANIMATION_EFFECTS,
  CSS_ANIMATION_TRIGGERS,
  CSS_ANIMATION_DIRECTIONS,
  CSS_ANIMATION_FILL_MODES,
  CSS_EASINGS,
  DEFAULT_CSS_ANIMATION_CONFIG,
  type CssAnimationConfig,
  type CssAnimationTrigger,
  type CssAnimationEffect,
  type CssAnimationDirection,
  type CssAnimationFillMode,
} from '@/features/cms/types/css-animations';
import { Checkbox, Input, Label, SectionPanel, UnifiedSelect } from '@/shared/ui';

interface CssAnimationConfigPanelProps {
  value?: CssAnimationConfig;
  onChange: (config: CssAnimationConfig) => void;
}

const easingValues = new Set(CSS_EASINGS.map((opt: { value: string }) => opt.value));

export function CssAnimationConfigPanel({ value, onChange }: CssAnimationConfigPanelProps): React.ReactNode {
  const config = useMemo(() => ({ ...DEFAULT_CSS_ANIMATION_CONFIG, ...(value ?? {}) }), [value]);
  const enabled = config.enabled ?? false;
  const effect = config.effect ?? 'fade-up';
  const trigger = config.trigger ?? 'load';
  const duration = config.duration ?? 700;
  const delay = config.delay ?? 0;
  const easing = config.easing ?? 'ease-out';
  const loop = config.loop ?? false;
  const iterations = config.iterations ?? 1;
  const direction = config.direction ?? 'normal';
  const fillMode = config.fillMode ?? 'both';
  const distance = config.distance ?? 40;
  const scale = config.scale ?? 0.9;
  const rotate = config.rotate ?? 12;
  const blur = config.blur ?? 6;
  const replayOnExit = config.replayOnExit ?? false;

  const easingSelectValue = easingValues.has(easing) ? easing : 'custom';

  const handleToggleEnabled = useCallback(
    (checked: boolean | 'indeterminate'): void => {
      onChange({ ...config, enabled: checked === true });
    },
    [config, onChange]
  );

  const handleEffectChange = useCallback(
    (value: string): void => {
      onChange({ ...config, effect: value as CssAnimationEffect });
    },
    [config, onChange]
  );

  const handleTriggerChange = useCallback(
    (value: string): void => {
      onChange({ ...config, trigger: value as CssAnimationTrigger });
    },
    [config, onChange]
  );

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        onChange({ ...config, duration: Math.max(100, Math.min(5000, val)) });
      }
    },
    [config, onChange]
  );

  const handleDelayChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        onChange({ ...config, delay: Math.max(0, Math.min(5000, val)) });
      }
    },
    [config, onChange]
  );

  const handleEasingChange = useCallback(
    (value: string): void => {
      onChange({ ...config, easing: value === 'custom' ? easing : value });
    },
    [config, easing, onChange]
  );

  const handleCustomEasingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...config, easing: e.target.value });
    },
    [config, onChange]
  );

  const handleLoopChange = useCallback(
    (checked: boolean | 'indeterminate'): void => {
      onChange({ ...config, loop: checked === true });
    },
    [config, onChange]
  );

  const handleIterationsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        onChange({ ...config, iterations: Math.max(1, Math.min(50, val)) });
      }
    },
    [config, onChange]
  );

  const handleDirectionChange = useCallback(
    (value: string): void => {
      onChange({ ...config, direction: value as CssAnimationDirection });
    },
    [config, onChange]
  );

  const handleFillModeChange = useCallback(
    (value: string): void => {
      onChange({ ...config, fillMode: value as CssAnimationFillMode });
    },
    [config, onChange]
  );

  const handleDistanceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        onChange({ ...config, distance: Math.max(0, Math.min(200, val)) });
      }
    },
    [config, onChange]
  );

  const handleScaleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        onChange({ ...config, scale: Math.max(0.2, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  const handleRotateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        onChange({ ...config, rotate: Math.max(-180, Math.min(180, val)) });
      }
    },
    [config, onChange]
  );

  const handleBlurChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val)) {
        onChange({ ...config, blur: Math.max(0, Math.min(40, val)) });
      }
    },
    [config, onChange]
  );

  const handleReplayOnExit = useCallback(
    (checked: boolean | 'indeterminate'): void => {
      onChange({ ...config, replayOnExit: checked === true });
    },
    [config, onChange]
  );

  const helpText = useMemo(() => {
    if (trigger === 'hover') return 'Animation plays while hovering the element.';
    if (trigger === 'inView') return 'Animation plays when the element enters the viewport.';
    return 'Animation plays on load.';
  }, [trigger]);

  return (
    <div className='space-y-4'>
      <SectionPanel variant='subtle-compact' className='space-y-2'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            CSS Animation
          </Label>
          <Checkbox checked={enabled} onCheckedChange={handleToggleEnabled} />
        </div>

        {enabled && (
          <>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Effect</Label>
              <UnifiedSelect
                value={effect}
                onValueChange={handleEffectChange}
                options={CSS_ANIMATION_EFFECTS}
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Trigger</Label>
              <UnifiedSelect
                value={trigger}
                onValueChange={handleTriggerChange}
                options={CSS_ANIMATION_TRIGGERS}
              />
              <p className='text-[10px] text-gray-500'>{helpText}</p>
            </div>

            {trigger === 'inView' && (
              <label className='flex items-center gap-2 text-xs text-gray-300'>
                <Checkbox checked={replayOnExit} onCheckedChange={handleReplayOnExit} />
                Replay when leaving/entering
              </label>
            )}

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Duration (ms)</Label>
                <Input
                  type='number'
                  min={100}
                  max={5000}
                  step={50}
                  value={duration}
                  onChange={handleDurationChange}
                  className='text-sm'
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Delay (ms)</Label>
                <Input
                  type='number'
                  min={0}
                  max={5000}
                  step={50}
                  value={delay}
                  onChange={handleDelayChange}
                  className='text-sm'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Easing</Label>
              <UnifiedSelect
                value={easingSelectValue}
                onValueChange={handleEasingChange}
                options={CSS_EASINGS}
              />
              {easingSelectValue === 'custom' && (
                <Input
                  value={easing}
                  onChange={handleCustomEasingChange}
                  placeholder='cubic-bezier(0.22, 0.61, 0.36, 1)'
                  className='text-xs font-mono'
                />
              )}
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <label className='flex items-center gap-2 text-xs text-gray-300'>
                <Checkbox checked={loop} onCheckedChange={handleLoopChange} />
                Loop animation
              </label>
              {!loop && (
                <div className='space-y-1.5'>
                  <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Iterations</Label>
                  <Input
                    type='number'
                    min={1}
                    max={50}
                    step={1}
                    value={iterations}
                    onChange={handleIterationsChange}
                    className='text-sm'
                  />
                </div>
              )}
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Direction</Label>
                <UnifiedSelect
                  value={direction}
                  onValueChange={handleDirectionChange}
                  options={CSS_ANIMATION_DIRECTIONS}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Fill mode</Label>
                <UnifiedSelect
                  value={fillMode}
                  onValueChange={handleFillModeChange}
                  options={CSS_ANIMATION_FILL_MODES}
                />
              </div>
            </div>
          </>
        )}
      </SectionPanel>

      {enabled && effect !== 'none' && (
        <SectionPanel variant='subtle-compact' className='space-y-2'>
          <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
            Transform controls
          </Label>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Distance (px)</Label>
              <Input
                type='number'
                min={0}
                max={200}
                step={2}
                value={distance}
                onChange={handleDistanceChange}
                className='text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Scale</Label>
              <Input
                type='number'
                min={0.2}
                max={2}
                step={0.02}
                value={scale}
                onChange={handleScaleChange}
                className='text-sm'
              />
            </div>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Rotate (deg)</Label>
              <Input
                type='number'
                min={-180}
                max={180}
                step={1}
                value={rotate}
                onChange={handleRotateChange}
                className='text-sm'
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>Blur (px)</Label>
              <Input
                type='number'
                min={0}
                max={40}
                step={1}
                value={blur}
                onChange={handleBlurChange}
                className='text-sm'
              />
            </div>
          </div>
        </SectionPanel>
      )}
    </div>
  );
}
