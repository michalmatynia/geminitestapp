import { Hand, Layers, MousePointer2, RotateCw } from 'lucide-react';
import React, { useCallback } from 'react';

import type { DragAxis } from '@/features/gsap';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { DEFAULT_ANIMATION_CONFIG, DRAG_AXES, OBSERVER_TYPES } from '@/features/gsap';
import {
  Button,
  Checkbox,
  FormField,
  FormSection,
  Input,
  SelectSimple,
  Tooltip,
} from '@/shared/ui';

import { useAnimationConfigActions, useAnimationConfigState } from './AnimationConfigContext';

const observerTypeIcons: Record<string, React.ReactNode> = {
  'wheel,touch': (
    <span className='flex items-center gap-0.5'>
      <RotateCw className='size-3.5' />
      <Hand className='size-3.5' />
    </span>
  ),
  wheel: <RotateCw className='size-3.5' />,
  touch: <Hand className='size-3.5' />,
  pointer: <MousePointer2 className='size-3.5' />,
  'wheel,touch,pointer': <Layers className='size-3.5' />,
};

export function AdvancedObserverMagnetSection(): React.JSX.Element {
  const { config } = useAnimationConfigState();
  const { onChange } = useAnimationConfigActions();
  const observerEnabledValue =
    config.observerEnabled ?? DEFAULT_ANIMATION_CONFIG.observerEnabled ?? false;
  const observerTypeValue =
    config.observerType ?? DEFAULT_ANIMATION_CONFIG.observerType ?? 'wheel,touch';
  const observerAxisValue = config.observerAxis ?? DEFAULT_ANIMATION_CONFIG.observerAxis ?? 'y';
  const observerSpeedValue = config.observerSpeed ?? DEFAULT_ANIMATION_CONFIG.observerSpeed ?? 1;

  const magnetEnabledValue =
    config.magnetEnabled ?? DEFAULT_ANIMATION_CONFIG.magnetEnabled ?? false;
  const magnetStrengthValue =
    config.magnetStrength ?? DEFAULT_ANIMATION_CONFIG.magnetStrength ?? 0.35;
  const magnetRadiusValue = config.magnetRadius ?? DEFAULT_ANIMATION_CONFIG.magnetRadius ?? 140;
  const magnetAxisValue = config.magnetAxis ?? DEFAULT_ANIMATION_CONFIG.magnetAxis ?? 'x,y';
  const magnetReturnValue = config.magnetReturn ?? DEFAULT_ANIMATION_CONFIG.magnetReturn ?? 0.35;

  const handleObserverEnabledChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, observerEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleObserverAxisChange = useCallback(
    (value: string) => {
      onChange({ ...config, observerAxis: value as DragAxis });
    },
    [config, onChange]
  );

  const handleObserverSpeedChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, observerSpeed: Math.max(0.1, Math.min(5, val)) });
      }
    },
    [config, onChange]
  );

  const handleMagnetEnabledChange = useCallback(
    (checked: boolean | 'indeterminate') => {
      onChange({ ...config, magnetEnabled: checked === true });
    },
    [config, onChange]
  );

  const handleMagnetStrengthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, magnetStrength: Math.max(0.05, Math.min(1, val)) });
      }
    },
    [config, onChange]
  );

  const handleMagnetRadiusChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, magnetRadius: Math.max(40, Math.min(600, val)) });
      }
    },
    [config, onChange]
  );

  const handleMagnetAxisChange = useCallback(
    (value: string) => {
      onChange({ ...config, magnetAxis: value as DragAxis });
    },
    [config, onChange]
  );

  const handleMagnetReturnChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val)) {
        onChange({ ...config, magnetReturn: Math.max(0.05, Math.min(2, val)) });
      }
    },
    [config, onChange]
  );

  return (
    <>
      <FormSection
        title='Observer (Events)'
        variant='subtle-compact'
        actions={
          <Checkbox checked={observerEnabledValue} onCheckedChange={handleObserverEnabledChange} />
        }
        className='p-3 space-y-4'
      >
        {observerEnabledValue && (
          <div className='mt-4 space-y-4'>
            <FormField label='Event types'>
              <div className='space-y-2'>
                <Input
                  value={observerTypeValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    onChange({ ...config, observerType: e.target.value })
                  }
                  placeholder='wheel,touch,pointer'
                  className='h-9'
                 aria-label='wheel,touch,pointer' title='wheel,touch,pointer'/>
                <div className='flex flex-wrap gap-1.5'>
                  {OBSERVER_TYPES.map((option: LabeledOptionDto<string>) => (
                    <Tooltip key={option.label} content={option.label}>
                      <Button
                        type='button'
                        size='sm'
                        variant={observerTypeValue.includes(option.value) ? 'secondary' : 'outline'}
                        onClick={(): void => {
                          const types = observerTypeValue
                            .split(',')
                            .map((t: string) => t.trim())
                            .filter(Boolean);
                          const next = types.includes(option.value)
                            ? types.filter((t: string) => t !== option.value)
                            : [...types, option.value];
                          onChange({ ...config, observerType: next.join(',') });
                        }}
                        className='h-7 w-9 p-0'
                        aria-label={option.label}
                        title={option.label}>
                        {observerTypeIcons[option.value] ?? <MousePointer2 className='size-3.5' />}
                      </Button>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </FormField>

            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Axis'>
                <SelectSimple
                  size='sm'
                  value={observerAxisValue}
                  onValueChange={handleObserverAxisChange}
                  options={DRAG_AXES}
                 ariaLabel='Axis' title='Axis'/>
              </FormField>
              <FormField label='Speed'>
                <Input
                  type='number'
                  min={0.1}
                  max={5}
                  step={0.1}
                  value={observerSpeedValue}
                  onChange={handleObserverSpeedChange}
                  className='h-9'
                 aria-label='Speed' title='Speed'/>
              </FormField>
            </div>
          </div>
        )}
      </FormSection>

      <FormSection
        title='Magnet'
        variant='subtle-compact'
        actions={
          <Checkbox checked={magnetEnabledValue} onCheckedChange={handleMagnetEnabledChange} />
        }
        className='p-3 space-y-4'
      >
        {magnetEnabledValue && (
          <div className='mt-4 space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Strength'>
                <Input
                  type='number'
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={magnetStrengthValue}
                  onChange={handleMagnetStrengthChange}
                  className='h-9'
                 aria-label='Strength' title='Strength'/>
              </FormField>
              <FormField label='Radius (px)'>
                <Input
                  type='number'
                  min={40}
                  max={600}
                  step={10}
                  value={magnetRadiusValue}
                  onChange={handleMagnetRadiusChange}
                  className='h-9'
                 aria-label='Radius (px)' title='Radius (px)'/>
              </FormField>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <FormField label='Axis'>
                <SelectSimple
                  size='sm'
                  value={magnetAxisValue}
                  onValueChange={handleMagnetAxisChange}
                  options={DRAG_AXES}
                 ariaLabel='Axis' title='Axis'/>
              </FormField>
              <FormField label='Return speed'>
                <Input
                  type='number'
                  min={0.05}
                  max={2}
                  step={0.05}
                  value={magnetReturnValue}
                  onChange={handleMagnetReturnChange}
                  className='h-9'
                 aria-label='Return speed' title='Return speed'/>
              </FormField>
            </div>
          </div>
        )}
      </FormSection>
    </>
  );
}
