'use client';

import React from 'react';

import { ImagePickerField } from '@/features/cms/components/page-builder/shared-fields';
import type { SettingsFieldOption } from '@/shared/contracts/cms';
import { Input, SelectSimple } from '@/shared/ui';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { useCompositeFieldContext } from '../CompositeFieldContext';
import { BG_TYPE_OPTIONS, GRADIENT_DIRECTION_OPTIONS } from '../settings-field-constants';

export function BackgroundField(): React.ReactNode {
  const { value, onChange, buildAriaLabel } = useCompositeFieldContext();
  const bg: Record<string, unknown> = isObjectRecord(value) ? value : { type: 'none' };
  const bgType = typeof bg['type'] === 'string' ? bg['type'] : 'none';
  const update = (key: string, v: unknown): void => {
    onChange({ ...bg, [key]: v });
  };
  const normalizeAngle = (angle: unknown): number => {
    if (typeof angle !== 'number' || !Number.isFinite(angle)) return 180;
    const normalized = ((Math.round(angle) % 360) + 360) % 360;
    return normalized;
  };
  const currentAngle = normalizeAngle(bg['gradientAngle']);
  const currentDirectionValue = GRADIENT_DIRECTION_OPTIONS.find(
    (opt: SettingsFieldOption) => opt.value === String(currentAngle)
  )
    ? String(currentAngle)
    : 'custom';
  const fromOpacity =
    typeof bg['gradientFromOpacity'] === 'number' ? bg['gradientFromOpacity'] : 100;
  const toOpacity = typeof bg['gradientToOpacity'] === 'number' ? bg['gradientToOpacity'] : 100;

  return (
    <div className='space-y-2'>
      <SelectSimple
        size='sm'
        value={bgType}
        onValueChange={(v: string): void => update('type', v)}
        options={BG_TYPE_OPTIONS}
        triggerClassName='text-xs h-7'
        ariaLabel={buildAriaLabel('type')}
      />

      {bgType === 'none' && (
        <div className='rounded-md border border-border/60 bg-card/30 px-3 py-2 text-[11px] text-gray-400'>
          No background override (uses color scheme / inherited background).
        </div>
      )}

      {bgType === 'solid' && (
        <div className='flex items-center gap-2'>
          <input
            type='color'
            value={(bg['color'] as string) ?? '#000000'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('color', e.target.value)
            }
            className='h-8 w-10 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
            aria-label={buildAriaLabel('solid color picker')}
          />
          <Input
            value={(bg['color'] as string) ?? '#000000'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
              update('color', e.target.value)
            }
            className='flex-1 text-xs font-mono'
            maxLength={7}
            aria-label={buildAriaLabel('solid color value')}
          />
        </div>
      )}

      {bgType === 'gradient' && (
        <div className='space-y-1.5'>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] text-gray-500 w-10'>Dir</span>
            <SelectSimple
              size='sm'
              value={currentDirectionValue}
              onValueChange={(v: string): void => {
                if (v === 'custom') return;
                update('gradientAngle', Number(v));
              }}
              options={GRADIENT_DIRECTION_OPTIONS}
              className='flex-1'
              triggerClassName='text-xs h-7'
              ariaLabel={buildAriaLabel('gradient direction')}
            />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] text-gray-500 w-10'>From</span>
            <input
              type='color'
              value={(bg['gradientFrom'] as string) ?? '#000000'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('gradientFrom', e.target.value)
              }
              className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
              aria-label={buildAriaLabel('gradient from color picker')}
            />
            <Input
              value={(bg['gradientFrom'] as string) ?? '#000000'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('gradientFrom', e.target.value)
              }
              className='flex-1 text-xs font-mono'
              maxLength={7}
              aria-label={buildAriaLabel('gradient from color value')}
            />
            <Input
              type='number'
              value={fromOpacity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('gradientFromOpacity', Number(e.target.value))
              }
              className='w-16 text-xs h-7'
              min={0}
              max={100}
              title='Opacity (%)'
              aria-label={buildAriaLabel('gradient from opacity')}
            />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] text-gray-500 w-10'>To</span>
            <input
              type='color'
              value={(bg['gradientTo'] as string) ?? '#ffffff'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('gradientTo', e.target.value)
              }
              className='h-7 w-7 cursor-pointer rounded border border-border/50 bg-transparent p-0.5'
              aria-label={buildAriaLabel('gradient to color picker')}
            />
            <Input
              value={(bg['gradientTo'] as string) ?? '#ffffff'}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('gradientTo', e.target.value)
              }
              className='flex-1 text-xs font-mono'
              maxLength={7}
              aria-label={buildAriaLabel('gradient to color value')}
            />
            <Input
              type='number'
              value={toOpacity}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('gradientToOpacity', Number(e.target.value))
              }
              className='w-16 text-xs h-7'
              min={0}
              max={100}
              title='Opacity (%)'
              aria-label={buildAriaLabel('gradient to opacity')}
            />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-[10px] text-gray-500 w-10'>Angle</span>
            <Input
              type='number'
              value={currentAngle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                update('gradientAngle', Number(e.target.value))
              }
              className='w-20 text-xs h-7'
              min={0}
              max={360}
              aria-label={buildAriaLabel('gradient angle')}
            />
            <span className='text-xs text-gray-500'>deg</span>
          </div>
          <p className='text-[11px] text-gray-500'>
            Use opacity to create transparent gradients (0–100%).
          </p>
        </div>
      )}

      {bgType === 'image' && (
        <ImagePickerField
          label={undefined}
          value={(bg['imageUrl'] as string) ?? ''}
          onChange={(nextValue: string): void => update('imageUrl', nextValue)}
        />
      )}
    </div>
  );
}
