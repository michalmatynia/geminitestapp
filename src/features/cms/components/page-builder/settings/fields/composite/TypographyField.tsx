'use client';

import React from 'react';
import { Input, SelectSimple } from '@/shared/ui';
import { useCompositeFieldContext } from '../CompositeFieldContext';
import { FONT_FAMILY_OPTIONS, FONT_WEIGHT_OPTIONS } from '../settings-field-constants';

export function TypographyField(): React.ReactNode {
  const { value, onChange, buildAriaLabel } = useCompositeFieldContext();
  const typo = (value as Record<string, unknown>) ?? {};
  const update = (key: string, v: unknown): void => {
    onChange({ ...typo, [key]: v });
  };
  return (
    <div className='space-y-2'>
      <div className='space-y-0.5'>
        <span className='text-[10px] text-gray-500 uppercase'>Font Family</span>
        <SelectSimple
          size='sm'
          value={(typo['fontFamily'] as string) ?? 'Inter, sans-serif'}
          onValueChange={(v: string): void => update('fontFamily', v)}
          options={FONT_FAMILY_OPTIONS}
          triggerClassName='text-xs h-7'
          ariaLabel={buildAriaLabel('font family')}
        />
      </div>
      <div className='grid grid-cols-2 gap-2'>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Weight</span>
          <SelectSimple
            size='sm'
            value={String((typo['fontWeight'] as string | number) ?? '400')}
            onValueChange={(v: string): void => update('fontWeight', v)}
            options={FONT_WEIGHT_OPTIONS}
            triggerClassName='text-xs h-7'
            ariaLabel={buildAriaLabel('font weight')}
          />
        </div>
        <div className='space-y-0.5'>
          <span className='text-[10px] text-gray-500 uppercase'>Size (px)</span>
          <Input
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
          <span className='text-[10px] text-gray-500 uppercase'>Line Height</span>
          <Input
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
          <span className='text-[10px] text-gray-500 uppercase'>Letter Spacing</span>
          <Input
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
        <span className='text-[10px] text-gray-500 uppercase'>Text Color</span>
        <div className='flex items-center gap-2'>
          <input
            type='color'
            value={(typo['textColor'] as string) ?? '#ffffff'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('textColor', e.target.value)
            }
            className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
            aria-label={buildAriaLabel('text color picker')}
          />
          <Input
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
