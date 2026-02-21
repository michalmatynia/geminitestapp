'use client';

import React, { useCallback } from 'react';

import type {
  GsapAnimationConfig,
  ParallaxPreset,
  ParallaxAxis,
  ParallaxPattern,
} from '@/features/gsap';
import {
  DEFAULT_ANIMATION_CONFIG,
  ANIMATION_EASINGS,
  PARALLAX_PRESETS,
  PARALLAX_DEFAULTS,
  PARALLAX_PATTERNS,
} from '@/features/gsap';
import {
  Checkbox,
  Input,
  SelectSimple,
  FormSection,
  FormField,
} from '@/shared/ui';

import { useAnimationConfigContext } from './AnimationConfigContext';

export function ParallaxSection(): React.ReactNode {
  const { config, onChange } = useAnimationConfigContext();
  const parallaxPresetValue = config.parallaxPreset ?? DEFAULT_ANIMATION_CONFIG.parallaxPreset ?? 'none';
  const parallaxSelectorValue = config.parallaxSelector ?? DEFAULT_ANIMATION_CONFIG.parallaxSelector ?? '';
  const parallaxAxisValue = config.parallaxAxis ?? DEFAULT_ANIMATION_CONFIG.parallaxAxis ?? 'y';
  const parallaxOffsetValue =
    config.parallaxOffset ?? PARALLAX_DEFAULTS[parallaxPresetValue]?.offset ?? DEFAULT_ANIMATION_CONFIG.parallaxOffset ?? 0;
  const parallaxScrubValue = config.parallaxScrub ?? DEFAULT_ANIMATION_CONFIG.parallaxScrub ?? 0.6;
  const parallaxStartValue = config.parallaxStart ?? DEFAULT_ANIMATION_CONFIG.parallaxStart ?? 'top bottom';
  const parallaxEndValue = config.parallaxEnd ?? DEFAULT_ANIMATION_CONFIG.parallaxEnd ?? 'bottom top';
  const parallaxEaseValue = config.parallaxEase ?? DEFAULT_ANIMATION_CONFIG.parallaxEase ?? 'sine.inOut';
  const parallaxPatternValue = config.parallaxPattern ?? DEFAULT_ANIMATION_CONFIG.parallaxPattern ?? 'uniform';
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

  const parallaxAxisOptions: { label: string; value: ParallaxAxis }[] = [
    { label: 'Vertical (Y)', value: 'y' },
    { label: 'Horizontal (X)', value: 'x' },
  ];

  const handleParallaxPresetChange = useCallback(
    (value: string): void => {
      const preset = value as ParallaxPreset;
      const defaults = PARALLAX_DEFAULTS[preset];
      const next: GsapAnimationConfig = {
        ...config,
        parallaxPreset: preset,
        parallaxOffset: preset === 'none' ? 0 : defaults?.offset ?? config.parallaxOffset,
      };
      if (preset === 'depth' && defaults?.scale) {
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
      onChange({ ...config, parallaxEase: value });
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
    (checked: boolean | 'indeterminate') => {
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
    <FormSection title='Parallax' variant='subtle-compact' className='p-3 space-y-4'>
      <FormField label='Preset'>
        <SelectSimple size='sm'
          value={parallaxPresetValue}
          onValueChange={handleParallaxPresetChange}
          options={PARALLAX_PRESETS}
        />
      </FormField>

      {parallaxPresetValue !== 'none' && (
        <div className='mt-4 space-y-4'>
          <div className='grid gap-3 sm:grid-cols-2 items-end'>
            <FormField label='Pattern'>
              <SelectSimple size='sm'
                value={parallaxPatternValue}
                onValueChange={handleParallaxPatternChange}
                options={PARALLAX_PATTERNS}
              />
            </FormField>

            <div className='flex items-center gap-2 mb-2'>
              <Checkbox checked={parallaxReverseValue} onCheckedChange={handleParallaxReverseChange} />
              <span className='text-xs text-gray-300'>Reverse direction</span>
            </div>
          </div>

          <FormField label='Axis'>
            <SelectSimple size='sm'
              value={parallaxAxisValue}
              onValueChange={handleParallaxAxisChange}
              options={parallaxAxisOptions}
            />
          </FormField>

          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Offset (px)'>
              <Input
                type='number'
                min={-300}
                max={300}
                step={5}
                value={parallaxOffsetValue}
                onChange={handleParallaxOffsetChange}
                className='h-9'
              />
            </FormField>

            <FormField label='Scrub'>
              <Input
                type='number'
                min={0}
                max={2}
                step={0.1}
                value={parallaxScrubValue}
                onChange={handleParallaxScrubChange}
                className='h-9'
              />
            </FormField>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Start'>
              <Input
                value={parallaxStartValue}
                onChange={handleParallaxStartChange}
                placeholder='top bottom'
                className='h-9'
              />
            </FormField>
            <FormField label='End'>
              <Input
                value={parallaxEndValue}
                onChange={handleParallaxEndChange}
                placeholder='bottom top'
                className='h-9'
              />
            </FormField>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Target selector'>
              <Input
                value={parallaxSelectorValue}
                onChange={handleParallaxSelectorChange}
                placeholder=':scope > *'
                className='h-9'
              />
            </FormField>
            <FormField label='Ease'>
              <SelectSimple size='sm'
                value={parallaxEaseValue}
                onValueChange={handleParallaxEaseChange}
                options={ANIMATION_EASINGS}
              />
            </FormField>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Scale from'>
              <Input
                type='number'
                min={0.2}
                max={3}
                step={0.02}
                value={parallaxScaleFromValue}
                onChange={handleParallaxScaleFromChange}
                className='h-9'
              />
            </FormField>
            <FormField label='Scale to'>
              <Input
                type='number'
                min={0.2}
                max={3}
                step={0.02}
                value={parallaxScaleToValue}
                onChange={handleParallaxScaleToChange}
                className='h-9'
              />
            </FormField>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Rotate from (deg)'>
              <Input
                type='number'
                min={-180}
                max={180}
                step={1}
                value={parallaxRotateFromValue}
                onChange={handleParallaxRotateFromChange}
                className='h-9'
              />
            </FormField>
            <FormField label='Rotate to (deg)'>
              <Input
                type='number'
                min={-180}
                max={180}
                step={1}
                value={parallaxRotateToValue}
                onChange={handleParallaxRotateToChange}
                className='h-9'
              />
            </FormField>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Opacity from'>
              <Input
                type='number'
                min={0}
                max={1}
                step={0.05}
                value={parallaxOpacityFromValue}
                onChange={handleParallaxOpacityFromChange}
                className='h-9'
              />
            </FormField>
            <FormField label='Opacity to'>
              <Input
                type='number'
                min={0}
                max={1}
                step={0.05}
                value={parallaxOpacityToValue}
                onChange={handleParallaxOpacityToChange}
                className='h-9'
              />
            </FormField>
          </div>

          <div className='grid gap-3 sm:grid-cols-2'>
            <FormField label='Blur from (px)'>
              <Input
                type='number'
                min={0}
                max={30}
                step={1}
                value={parallaxBlurFromValue}
                onChange={handleParallaxBlurFromChange}
                className='h-9'
              />
            </FormField>
            <FormField label='Blur to (px)'>
              <Input
                type='number'
                min={0}
                max={30}
                step={1}
                value={parallaxBlurToValue}
                onChange={handleParallaxBlurToChange}
                className='h-9'
              />
            </FormField>
          </div>
          {parallaxPatternValue === 'increment' && (
            <FormField label='Per-child step (px)'>
              <Input
                type='number'
                min={0}
                max={200}
                step={1}
                value={parallaxChildStepValue}
                onChange={handleParallaxChildStepChange}
                className='h-9'
              />
            </FormField>
          )}

          {parallaxPatternValue === 'layers' && (
            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Layer strength'>
                <Input
                  type='number'
                  min={0}
                  max={2}
                  step={0.05}
                  value={parallaxLayerStrengthValue}
                  onChange={handleParallaxLayerStrengthChange}
                  className='h-9'
                />
              </FormField>
              <FormField label='Layer scale step'>
                <Input
                  type='number'
                  min={0}
                  max={0.2}
                  step={0.005}
                  value={parallaxLayerScaleStepValue}
                  onChange={handleParallaxLayerScaleStepChange}
                  className='h-9'
                />
              </FormField>
            </div>
          )}

          {parallaxPatternValue === 'random' && (
            <FormField label='Random seed'>
              <Input
                type='number'
                min={0}
                max={1000}
                step={1}
                value={parallaxRandomSeedValue}
                onChange={handleParallaxRandomSeedChange}
                className='h-9'
              />
            </FormField>
          )}

          <p className='text-[10px] text-gray-500'>
            Use a selector like <span className='text-gray-400'>:scope &gt; *</span> for per-child patterns.
          </p>
        </div>
      )}
    </FormSection>
  );
}
