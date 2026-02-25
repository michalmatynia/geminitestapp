'use client';

import React from 'react';
import {
  Input,
  Checkbox,
  SelectSimple,
  FormSection,
  FormField,
} from '@/shared/ui';
import { DEFAULT_ANIMATION_CONFIG, TEXT_EFFECTS, type TextEffect } from '@/features/gsap';
import { useAnimationConfigContext } from '../AnimationConfigContext';

export function AdvancedTextEffectsSection(): React.JSX.Element {
  const { config, onChange } = useAnimationConfigContext();
  
  const textEffectValue = config.textEffect ?? DEFAULT_ANIMATION_CONFIG.textEffect ?? 'none';
  const textStaggerValue = config.textStagger ?? DEFAULT_ANIMATION_CONFIG.textStagger ?? 0.05;
  const textScrambleCharsValue = config.textScrambleChars ?? DEFAULT_ANIMATION_CONFIG.textScrambleChars ?? '';
  const textTypingSpeedValue = config.textTypingSpeed ?? DEFAULT_ANIMATION_CONFIG.textTypingSpeed ?? 24;
  const textCursorValue = config.textCursor ?? DEFAULT_ANIMATION_CONFIG.textCursor ?? false;
  const textCountFromValue = config.textCountFrom ?? DEFAULT_ANIMATION_CONFIG.textCountFrom ?? 0;
  const textCountToValue = config.textCountTo ?? DEFAULT_ANIMATION_CONFIG.textCountTo ?? 100;
  const textCountDecimalsValue = config.textCountDecimals ?? DEFAULT_ANIMATION_CONFIG.textCountDecimals ?? 0;

  return (
    <FormSection title='Text Effects' variant='subtle-compact' className='p-3 space-y-4'>
      <FormField label='Mode'>
        <SelectSimple size='sm'
          value={textEffectValue}
          onValueChange={(v) => onChange({ ...config, textEffect: v as TextEffect })}
          options={TEXT_EFFECTS}
        />
      </FormField>

      {textEffectValue !== 'none' && (
        <div className='mt-4 space-y-4'>
          {(textEffectValue === 'splitChars' ||
                      textEffectValue === 'splitWords' ||
                      textEffectValue === 'splitLines') && (
            <FormField label='Stagger (seconds)'>
              <Input
                type='number'
                min={0.01}
                max={2}
                step={0.01}
                value={textStaggerValue}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) onChange({ ...config, textStagger: Math.max(0.01, Math.min(2, val)) });
                }}
                className='h-9'
              />
            </FormField>
          )}

          {textEffectValue === 'scramble' && (
            <FormField label='Scramble chars'>
              <Input
                value={textScrambleCharsValue}
                onChange={(e) => onChange({ ...config, textScrambleChars: e.target.value })}
                className='h-9'
              />
            </FormField>
          )}

          {textEffectValue === 'typing' && (
            <>
              <FormField label='Typing speed (chars/sec)'>
                <Input
                  type='number'
                  min={4}
                  max={120}
                  step={1}
                  value={textTypingSpeedValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onChange({ ...config, textTypingSpeed: Math.max(4, Math.min(120, val)) });
                  }}
                  className='h-9'
                />
              </FormField>
              <div className='flex items-center gap-2'>
                <Checkbox checked={textCursorValue} onCheckedChange={(v) => onChange({ ...config, textCursor: v === true })} />
                <span className='text-xs text-gray-300'>Show cursor</span>
              </div>
            </>
          )}

          {textEffectValue === 'countUp' && (
            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='From'>
                <Input
                  type='number'
                  value={textCountFromValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onChange({ ...config, textCountFrom: val });
                  }}
                  className='h-9'
                />
              </FormField>
              <FormField label='To'>
                <Input
                  type='number'
                  value={textCountToValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onChange({ ...config, textCountTo: val });
                  }}
                  className='h-9'
                />
              </FormField>
              <FormField label='Decimals'>
                <Input
                  type='number'
                  min={0}
                  max={6}
                  step={1}
                  value={textCountDecimalsValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val)) onChange({ ...config, textCountDecimals: Math.max(0, Math.min(6, val)) });
                  }}
                  className='h-9'
                />
              </FormField>
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
}
