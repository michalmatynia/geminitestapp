'use client';

import { Zap } from 'lucide-react';
import React from 'react';

import type { 
  GsapAnimationConfig,
  AnimationPreset,
  AnimationEasing,
  AnimationTrigger
} from '@/features/gsap/types/animation';
import { 
  ANIMATION_PRESETS, 
  ANIMATION_EASINGS,
  DEFAULT_ANIMATION_CONFIG
} from '@/features/gsap/types/animation';
import { 
  Input, 
  Label, 
  SelectSimple,
  RadioGroup,
  RadioGroupItem,
  FormField,
  SectionHeader,
  ToggleRow
} from '@/shared/ui';

import { AdvancedSection } from './animation/AdvancedSection';
import { AnimationConfigProvider } from './animation/AnimationConfigContext';
import type { OpenVectorOverlay } from './animation/AnimationConfigContext';
import { ParallaxSection } from './animation/ParallaxSection';
import { TimelineSection } from './animation/TimelineSection';
import { VisualEffectsSection } from './animation/VisualEffectsSection';

interface AnimationConfigPanelProps {
  config: GsapAnimationConfig;
  onChange: (updates: Partial<GsapAnimationConfig>) => void;
  openVectorOverlay?: OpenVectorOverlay;
}

export function AnimationConfigPanel({
  config,
  onChange,
  openVectorOverlay,
}: AnimationConfigPanelProps): React.JSX.Element {
  const isEnabled = config.preset !== 'none' || config.motionPathEnabled || config.svgDrawEnabled || config.parallaxPreset !== 'none';

  return (
    <div className='space-y-6 pb-20'>
      <SectionHeader
        title='Animations & FX'
        description='Configure GSAP-powered transitions and interactive effects.'
        icon={<Zap className='size-4 text-yellow-400' />}
      />

      <ToggleRow
        label='Enable Animations'
        description='Master switch for all animation effects on this component'
        checked={isEnabled}
        onCheckedChange={(checked) => {
          if (!checked) {
            onChange({ ...DEFAULT_ANIMATION_CONFIG, preset: 'none' });
          } else {
            onChange({ preset: 'fadeIn' });
          }
        }}
      />

      {isEnabled && (
        <>
          <FormField label='Animation Preset' description='Core entry transition style'>
            <SelectSimple
              options={ANIMATION_PRESETS}
              value={config.preset}
              onValueChange={(val) => onChange({ preset: val as AnimationPreset })}
            />
          </FormField>

          <div className='grid grid-cols-2 gap-4'>
            <FormField label='Duration (s)'>
              <Input
                type='number'
                min={0}
                max={10}
                step={0.1}
                value={config.duration}
                onChange={(e) => onChange({ duration: Number(e.target.value) })}
              />
            </FormField>
            <FormField label='Delay (s)'>
              <Input
                type='number'
                min={0}
                max={10}
                step={0.1}
                value={config.delay}
                onChange={(e) => onChange({ delay: Number(e.target.value) })}
              />
            </FormField>
          </div>

          <FormField label='Easing' description='The rhythm of the motion'>
            <SelectSimple
              options={ANIMATION_EASINGS}
              value={config.easing}
              onValueChange={(val) => onChange({ easing: val as AnimationEasing })}
            />
          </FormField>

          <FormField label='Trigger' description='When should the animation start?'>
            <RadioGroup
              value={config.trigger}
              onValueChange={(val) => onChange({ trigger: val as AnimationTrigger })}
              className='grid grid-cols-1 gap-2 mt-2'
            >
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='load' id='trigger-load' />
                <Label htmlFor='trigger-load' className='text-sm text-gray-300 cursor-pointer'>
                  On page load
                </Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='hover' id='trigger-hover' />
                <Label htmlFor='trigger-hover' className='text-sm text-gray-300 cursor-pointer'>
                  On mouse hover
                </Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='scroll' id='trigger-scroll' />
                <Label htmlFor='trigger-scroll' className='text-sm text-gray-300 cursor-pointer'>
                  On scroll into view
                </Label>
              </div>
            </RadioGroup>
          </FormField>

          <AnimationConfigProvider value={{ 
            config, 
            onChange, 
            openVectorOverlay: openVectorOverlay ?? (() => {}) 
          }}>
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
