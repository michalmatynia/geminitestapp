'use client';

import React from 'react';

import { Input, SelectSimple } from '@/shared/ui';

import { useCompositeFieldContext } from '../CompositeFieldContext';
import { FONT_FAMILY_OPTIONS, FONT_WEIGHT_OPTIONS } from '../settings-field-constants';

export function TypographyField(): React.ReactNode {
  const { value, onChange, buildAriaLabel, buildControlId } = useCompositeFieldContext();
  const typo = (value as Record<string, unknown>) ?? {};
  const update = (key: string, v: unknown): void => {
    onChange({ ...typo, [key]: v });
  };
  const familyId = buildControlId('font-family');
  const weightId = buildControlId('font-weight');
  const sizeId = buildControlId('font-size');
  const lineHeightId = buildControlId('line-height');
  const letterSpacingId = buildControlId('letter-spacing');
  const colorValueId = buildControlId('text-color-value');
  const colorPickerId = buildControlId('text-color-picker');
  return (
    <div className='space-y-2'>
      <div className='space-y-0.5'>
        <label className='text-[10px] text-gray-500 uppercase' htmlFor={familyId}>
          Font Family
        </label>
        <SelectSimple
          size='sm'
          value={(typo['fontFamily'] as string) ?? 'Inter, sans-serif'}
          onValueChange={(v: string): void => update('fontFamily', v)}
          options={FONT_FAMILY_OPTIONS}
          triggerClassName='text-xs h-7'
          ariaLabel={buildAriaLabel('font family')}
          id={familyId}
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <label className='text-[10px] text-gray-500 uppercase' htmlFor={weightId}>
            Weight
          </label>
          <SelectSimple
            size='sm'
            value={String((typo['fontWeight'] as string | number) ?? '400')}
            onValueChange={(v: string): void => update('fontWeight', v)}
            options={FONT_WEIGHT_OPTIONS}
            triggerClassName='text-xs h-7'
            ariaLabel={buildAriaLabel('font weight')}
            id={weightId}
          />
        </div>
        <div className='space-y-0.5'>
          <label className='text-[10px] text-gray-500 uppercase' htmlFor={sizeId}>
            Size (px)
          </label>
          <Input
            id={sizeId}
            type='number'
            value={(typo['fontSize'] as number) ?? 16}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('fontSize', Number(e.target.value))
            }
            className='text-xs h-7'
            min={8}
            max={200}
            aria-label={buildAriaLabel('font size')}
          />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <label className='text-[10px] text-gray-500 uppercase' htmlFor={lineHeightId}>
            Line Height
          </label>
          <Input
            id={lineHeightId}
            type='number'
            value={(typo['lineHeight'] as number) ?? 1.5}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('lineHeight', Number(e.target.value))
            }
            className='text-xs h-7'
            min={0.5}
            max={5}
            step={0.1}
            aria-label={buildAriaLabel('line height')}
          />
        </div>
        <div className='space-y-0.5'>
          <label className='text-[10px] text-gray-500 uppercase' htmlFor={letterSpacingId}>
            Letter Spacing
          </label>
          <Input
            id={letterSpacingId}
            type='number'
            value={(typo['letterSpacing'] as number) ?? 0}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('letterSpacing', Number(e.target.value))
            }
            className='text-xs h-7'
            step={0.5}
            aria-label={buildAriaLabel('letter spacing')}
          />
        </div>
      </div>
      <div className='space-y-0.5'>
        <label className='text-[10px] text-gray-500 uppercase' htmlFor={colorValueId}>
          Text Color
        </label>
        <div className='flex items-center gap-2'>
          <input
            type='color'
            id={colorPickerId}
            value={(typo['textColor'] as string) ?? '#ffffff'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('textColor', e.target.value)
            }
            className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
            aria-label={buildAriaLabel('text color picker')}
          />
          <Input
            id={colorValueId}
            value={(typo['textColor'] as string) ?? '#ffffff'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('textColor', e.target.value)
            }
            className='flex-1 text-xs font-mono'
            maxLength={7}
            aria-label={buildAriaLabel('text color value')}
          />
        </div>
      </div>
    </div>
  );
}
