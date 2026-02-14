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
import { Checkbox, Input, SelectSimple, FormSection, FormField } from '@/shared/ui';

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
      <FormSection
        title='CSS Animation'
        variant='subtle-compact'
        actions={<Checkbox checked={enabled} onCheckedChange={handleToggleEnabled} />}
        className='space-y-2 p-3'
      >
        {enabled && (
          <div className='mt-4 space-y-4'>
            <FormField label='Effect'>
              <SelectSimple size='sm'
                value={effect}
                onValueChange={handleEffectChange}
                options={CSS_ANIMATION_EFFECTS}
              />
            </FormField>

            <FormField label='Trigger' description={helpText}>
              <SelectSimple size='sm'
                value={trigger}
                onValueChange={handleTriggerChange}
                options={CSS_ANIMATION_TRIGGERS}
              />
            </FormField>

            {trigger === 'inView' && (
              <div className='flex items-center gap-2'>
                <Checkbox checked={replayOnExit} onCheckedChange={handleReplayOnExit} />
                <span className='text-xs text-gray-300'>Replay when leaving/entering</span>
              </div>
            )}

            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Duration (ms)'>
                <Input
                  type='number'
                  min={100}
                  max={5000}
                  step={50}
                  value={duration}
                  onChange={handleDurationChange}
                  className='h-9'
                />
              </FormField>
              <FormField label='Delay (ms)'>
                <Input
                  type='number'
                  min={0}
                  max={5000}
                  step={50}
                  value={delay}
                  onChange={handleDelayChange}
                  className='h-9'
                />
              </FormField>
            </div>

            <FormField label='Easing'>
              <SelectSimple size='sm'
                value={easingSelectValue}
                onValueChange={handleEasingChange}
                options={CSS_EASINGS}
              />
              {easingSelectValue === 'custom' && (
                <Input
                  value={easing}
                  onChange={handleCustomEasingChange}
                  placeholder='cubic-bezier(0.22, 0.61, 0.36, 1)'
                  className='mt-2 text-xs font-mono h-9'
                />
              )}
            </FormField>

            <div className='grid gap-3 sm:grid-cols-2 items-end'>
              <div className='flex items-center gap-2 mb-2'>
                <Checkbox checked={loop} onCheckedChange={handleLoopChange} />
                <span className='text-xs text-gray-300'>Loop animation</span>
              </div>
              {!loop && (
                <FormField label='Iterations'>
                  <Input
                    type='number'
                    min={1}
                    max={50}
                    step={1}
                    value={iterations}
                    onChange={handleIterationsChange}
                    className='h-9'
                  />
                </FormField>
              )}
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Direction'>
                <SelectSimple size='sm'
                  value={direction}
                  onValueChange={handleDirectionChange}
                  options={CSS_ANIMATION_DIRECTIONS}
                />
              </FormField>
              <FormField label='Fill mode'>
                <SelectSimple size='sm'
                  value={fillMode}
                  onValueChange={handleFillModeChange}
                  options={CSS_ANIMATION_FILL_MODES}
                />
              </FormField>
            </div>
          </div>
        )}
      </FormSection>

      {enabled && effect !== 'none' && (
        <FormSection title='Transform controls' variant='subtle-compact' className='space-y-2 p-3'>
          <div className='grid gap-3 sm:grid-cols-2 mt-4'>
            <FormField label='Distance (px)'>
              <Input
                type='number'
                min={0}
                max={200}
                step={2}
                value={distance}
                onChange={handleDistanceChange}
                className='h-9'
              />
            </FormField>
            <FormField label='Scale'>
              <Input
                type='number'
                min={0.2}
                max={2}
                step={0.02}
                value={scale}
                onChange={handleScaleChange}
                className='h-9'
              />
            </FormField>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Rotate (deg)'>
              <Input
                type='number'
                min={-180}
                max={180}
                step={1}
                value={rotate}
                onChange={handleRotateChange}
                className='h-9'
              />
            </FormField>
            <FormField label='Blur (px)'>
              <Input
                type='number'
                min={0}
                max={40}
                step={1}
                value={blur}
                onChange={handleBlurChange}
                className='h-9'
              />
            </FormField>
          </div>
        </FormSection>
      )}
    </div>
  );
}
