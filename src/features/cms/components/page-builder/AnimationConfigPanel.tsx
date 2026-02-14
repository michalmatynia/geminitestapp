'use client';

import {
  AlignLeft,
  Heading as HeadingIcon,
  ImageIcon,
  LayoutGrid,
  Layers,
  MousePointerClick,
  Square,
} from 'lucide-react';
import React, { useCallback } from 'react';

import type {
  GsapAnimationConfig,
  AnimationPreset,
  AnimationEasing,
  AnimationTrigger,
} from '@/features/gsap';
import {
  DEFAULT_ANIMATION_CONFIG,
  ANIMATION_EASINGS,
  AnimationPresetPicker,
} from '@/features/gsap';
import {
  Button,
  Label,
  Input,
  Tooltip,
  SelectSimple,
  RadioGroup,
  RadioGroupItem,
} from '@/shared/ui';

import { AdvancedSection } from './animation/AdvancedSection';
import { AnimationConfigProvider } from './animation/AnimationConfigContext';
import { ParallaxSection } from './animation/ParallaxSection';
import { TimelineSection } from './animation/TimelineSection';
import { VisualEffectsSection } from './animation/VisualEffectsSection';
import { usePageBuilder } from '../../hooks/usePageBuilderContext';

interface AnimationConfigPanelProps {
  value: GsapAnimationConfig | undefined;
  onChange: (config: GsapAnimationConfig) => void;
}

export function AnimationConfigPanel({ value, onChange }: AnimationConfigPanelProps): React.ReactNode {
  const { openVectorOverlay } = usePageBuilder();
  const config = value ?? DEFAULT_ANIMATION_CONFIG;
  const selectorValue = config.selector ?? '';
  const customEaseValue = config.customEase ?? DEFAULT_ANIMATION_CONFIG.customEase ?? '';

  const quickSelectors: Array<{ label: string; value: string; icon: React.ElementType }> = [
    { label: 'Self', value: '', icon: Square },
    { label: 'Children', value: ':scope > *', icon: LayoutGrid },
    { label: 'Headings', value: 'h1, h2, h3, h4, h5, h6', icon: HeadingIcon },
    { label: 'Text', value: 'p, li', icon: AlignLeft },
    { label: 'Buttons', value: 'button, a', icon: MousePointerClick },
    { label: 'Images', value: 'img', icon: ImageIcon },
  ];

  const nodeTargetOptions: Array<{ value: 'self' | 'children' | 'descendants'; label: string; icon: React.ElementType }> = [
    { value: 'self', label: 'Animate me', icon: Square },
    { value: 'children', label: 'Animate children (stagger)', icon: LayoutGrid },
    { value: 'descendants', label: 'Animate all descendants', icon: Layers },
  ];

  const handlePresetChange = useCallback(
    (preset: AnimationPreset): void => {
      if (preset === 'none') {
        onChange({ ...DEFAULT_ANIMATION_CONFIG, preset: 'none' });
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
    (mode: 'self' | 'children' | 'descendants'): void => {
      if (mode === 'self') {
        onChange({ ...config, selector: ':scope' });
      } else if (mode === 'children') {
        onChange({ ...config, selector: ':scope > *', preset: 'stagger' });
      } else {
        onChange({ ...config, selector: ':scope *', preset: 'stagger' });
      }
    },
    [config, onChange]
  );

  const resolvedNodeTarget: 'self' | 'children' | 'descendants' | 'custom' = ((): 'self' | 'children' | 'descendants' | 'custom' => {
    const normalized = selectorValue.trim();
    if (!normalized || normalized === ':scope') return 'self';
    if (normalized === ':scope > *') return 'children';
    if (normalized === ':scope *') return 'descendants';
    return 'custom';
  })();

  const handleQuickSelector = useCallback(
    (selector: string): void => {
      onChange({ ...config, selector });
    },
    [config, onChange]
  );

  return (
    <div className='space-y-4'>
      {/* Preset selector */}
      <div className='space-y-1.5'>
        <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
          Animation preset
        </Label>
        <AnimationPresetPicker value={config.preset} onChange={handlePresetChange} />
      </div>

      {config.preset !== 'none' && (
        <>
          {/* Node target */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
              Node animation
            </Label>
            <div className='grid grid-cols-3 gap-2 place-items-center'>
              {nodeTargetOptions.map((option: (typeof nodeTargetOptions)[number]) => {
                const Icon = option.icon;
                const isActive = resolvedNodeTarget === option.value;
                return (
                  <Tooltip key={option.value} content={option.label}>
                    <Button
                      type='button'
                      size='sm'
                      variant={isActive ? 'secondary' : 'outline'}
                      onClick={(): void => handleNodeTargetChange(option.value)}
                      className='h-8 w-10 p-0'
                      aria-label={option.label}
                    >
                      {React.createElement(Icon, { className: 'size-4' })}
                    </Button>
                  </Tooltip>
                );
              })}
            </div>
            <p className='text-[10px] text-gray-500'>
              Use "Animate me" for element nodes. Use "Animate children" for folder nodes to stagger direct children.
            </p>
            {resolvedNodeTarget === 'custom' && (
              <p className='text-[10px] text-gray-400'>
                Custom selector active. Use the selector below and choose a stagger preset if needed.
              </p>
            )}
          </div>

          {/* Target selector */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
              Target selector
            </Label>
            <Input
              value={selectorValue}
              onChange={handleSelectorChange}
              placeholder=':scope > *, h2, .card'
              className='text-sm'
            />
            <div className='flex flex-wrap gap-1.5'>
              {quickSelectors.map((option: (typeof quickSelectors)[number]) => {
                const Icon = option.icon;
                const isActive = selectorValue === option.value;
                return (
                  <Tooltip key={option.label} content={option.label}>
                    <Button
                      type='button'
                      size='sm'
                      variant={isActive ? 'secondary' : 'outline'}
                      onClick={(): void => handleQuickSelector(option.value)}
                      className='h-7 w-9 p-0'
                      aria-label={option.label}
                    >
                      {React.createElement(Icon as React.ComponentType<{ className?: string }>, { className: 'size-3.5' })}
                    </Button>
                  </Tooltip>
                );
              })}
            </div>
            <p className='text-[10px] text-gray-500'>
              Leave empty to animate the wrapper element. Use <span className='text-gray-400'>:scope &gt; *</span> for direct children.
            </p>
          </div>

          {/* Duration */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
              Duration (seconds)
            </Label>
            <Input
              type='number'
              min={0.1}
              max={10}
              step={0.1}
              value={config.duration}
              onChange={handleDurationChange}
              className='text-sm'
            />
          </div>

          {/* Delay */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
              Delay (seconds)
            </Label>
            <Input
              type='number'
              min={0}
              max={5}
              step={0.1}
              value={config.delay}
              onChange={handleDelayChange}
              className='text-sm'
            />
          </div>

          {/* Easing */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
              Easing
            </Label>
            <SelectSimple size='sm'
              value={config.easing}
              onValueChange={handleEasingChange}
              options={ANIMATION_EASINGS}
            />
            {config.easing === 'custom' && (
              <Input
                value={customEaseValue}
                onChange={handleCustomEaseChange}
                placeholder='0.42,0,0.58,1 or custom ease string'
                className='text-sm'
              />
            )}
          </div>

          {/* Trigger */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-medium uppercase tracking-wide text-gray-400'>
              Trigger
            </Label>
            <RadioGroup
              value={config.trigger}
              onValueChange={handleTriggerChange}
              className='space-y-1'
            >
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='load' id='trigger-load' />
                <Label htmlFor='trigger-load' className='text-sm text-gray-300 cursor-pointer'>
                  On page load
                </Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='scroll' id='trigger-scroll' />
                <Label htmlFor='trigger-scroll' className='text-sm text-gray-300 cursor-pointer'>
                  On scroll into view
                </Label>
              </div>
            </RadioGroup>
          </div>

          <AnimationConfigProvider value={{ config, onChange, openVectorOverlay }}>
            <TimelineSection />
            <ParallaxSection />
            <AdvancedSection />
            <VisualEffectsSection />
          </AnimationConfigProvider>
        </>
      )}
    </div>
  );
}
