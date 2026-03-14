'use client';

import React from 'react';

import { DEFAULT_ANIMATION_CONFIG, VELOCITY_EFFECTS, type VelocityEffect } from '@/features/gsap';
import { Input, SelectSimple, FormSection, FormField } from '@/shared/ui';

import { useAnimationConfigActions, useAnimationConfigState } from '../AnimationConfigContext';

export function AdvancedVelocitySection(): React.JSX.Element {
  const { config } = useAnimationConfigState();
  const { onChange } = useAnimationConfigActions();

  const velocityEffectValue =
    config.velocityEffect ?? DEFAULT_ANIMATION_CONFIG.velocityEffect ?? 'none';
  const velocityStrengthValue =
    config.velocityStrength ?? DEFAULT_ANIMATION_CONFIG.velocityStrength ?? 0.15;
  const velocityMaxValue = config.velocityMax ?? DEFAULT_ANIMATION_CONFIG.velocityMax ?? 20;

  return (
    <FormSection title='Velocity FX' variant='subtle-compact' className='p-3 space-y-4'>
      <FormField label='Effect'>
        <SelectSimple
          size='sm'
          value={velocityEffectValue}
          onValueChange={(v) => onChange({ ...config, velocityEffect: v as VelocityEffect })}
          options={VELOCITY_EFFECTS}
         ariaLabel="Effect" title="Effect"/>
      </FormField>
      {velocityEffectValue !== 'none' && (
        <div className='grid gap-3 sm:grid-cols-2 mt-4'>
          <FormField label='Strength'>
            <Input
              type='number'
              min={0.01}
              max={2}
              step={0.01}
              value={velocityStrengthValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val))
                  onChange({ ...config, velocityStrength: Math.max(0.01, Math.min(2, val)) });
              }}
              className='h-9'
             aria-label="Strength" title="Strength"/>
          </FormField>
          <FormField label='Max limit'>
            <Input
              type='number'
              min={1}
              max={60}
              step={1}
              value={velocityMaxValue}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val))
                  onChange({ ...config, velocityMax: Math.max(1, Math.min(60, val)) });
              }}
              className='h-9'
             aria-label="Max limit" title="Max limit"/>
          </FormField>
        </div>
      )}
    </FormSection>
  );
}
