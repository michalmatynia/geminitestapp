'use client';

import React, { useMemo } from 'react';

import {
  CSS_ANIMATION_EFFECTS,
  CSS_ANIMATION_TRIGGERS,
  CSS_ANIMATION_DIRECTIONS,
  CSS_ANIMATION_FILL_MODES,
  CSS_EASINGS,
  DEFAULT_CSS_ANIMATION_CONFIG,
  type CssAnimationConfig,
} from '@/shared/contracts/cms';
import { Checkbox, FormSection } from '@/shared/ui';
import { SettingsFieldsRenderer, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

interface CssAnimationConfigPanelProps {
  value?: CssAnimationConfig;
  onChange: (config: CssAnimationConfig) => void;
}

const easingValues = new Set(CSS_EASINGS.map((opt: { value: string }) => opt.value));

export function CssAnimationConfigPanel({ value, onChange }: CssAnimationConfigPanelProps): React.ReactNode {
  const config = useMemo(() => ({ ...DEFAULT_CSS_ANIMATION_CONFIG, ...(value ?? {}) }), [value]);
  const easingSelectValue = easingValues.has(config.easing ?? 'ease-out') ? config.easing : 'custom';

  const fields: SettingsField<CssAnimationConfig>[] = useMemo(() => [
    {
      key: 'effect',
      label: 'Effect',
      type: 'select',
      options: CSS_ANIMATION_EFFECTS,
    },
    {
      key: 'trigger',
      label: 'Trigger',
      type: 'select',
      options: CSS_ANIMATION_TRIGGERS,
      helperText: config.trigger === 'hover' 
        ? 'Animation plays while hovering the element.' 
        : config.trigger === 'inView' 
          ? 'Animation plays when the element enters the viewport.' 
          : 'Animation plays on load.',
    },
    ...(config.trigger === 'inView' ? [
      {
        key: 'replayOnExit',
        label: 'Replay when leaving/entering',
        type: 'checkbox',
      } as SettingsField<CssAnimationConfig>
    ] : []),
    {
      key: 'duration',
      label: 'Duration',
      type: 'number',
      min: 100,
      max: 5000,
      step: 50,
      suffix: 'ms',
    },
    {
      key: 'delay',
      label: 'Delay',
      type: 'number',
      min: 0,
      max: 5000,
      step: 50,
      suffix: 'ms',
    },
    {
      key: 'easing',
      label: 'Easing',
      type: 'custom',
      render: ({ value, onChange: fieldChange }) => (
        <div className='space-y-2'>
          <SettingsFieldsRenderer
            fields={[{
              key: 'easing',
              label: '',
              type: 'select',
              options: CSS_EASINGS,
            } as SettingsField<{ easing: string }>]}
            values={{ easing: easingSelectValue || 'ease-out' }}
            onChange={(vals) => fieldChange(vals.easing === 'custom' ? value : vals.easing)}
          />
          {easingSelectValue === 'custom' && (
            <SettingsFieldsRenderer
              fields={[{
                key: 'easing',
                label: '',
                type: 'text',
                placeholder: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
                className: 'text-xs font-mono',
              } as SettingsField<{ easing: string }>]}
              values={{ easing: String(value) }}
              onChange={(vals) => fieldChange(vals.easing)}
            />
          )}
        </div>
      )
    },
    {
      key: 'loop',
      label: 'Loop animation',
      type: 'checkbox',
    },
    ...(!config.loop ? [
      {
        key: 'iterations',
        label: 'Iterations',
        type: 'number',
        min: 1,
        max: 50,
        step: 1,
      } as SettingsField<CssAnimationConfig>
    ] : []),
    {
      key: 'direction',
      label: 'Direction',
      type: 'select',
      options: CSS_ANIMATION_DIRECTIONS,
    },
    {
      key: 'fillMode',
      label: 'Fill mode',
      type: 'select',
      options: CSS_ANIMATION_FILL_MODES,
    },
  ], [config.trigger, config.loop, easingSelectValue]);

  const transformFields: SettingsField<CssAnimationConfig>[] = useMemo(() => [
    {
      key: 'distance',
      label: 'Distance',
      type: 'number',
      min: 0,
      max: 200,
      step: 2,
      suffix: 'px',
    },
    {
      key: 'scale',
      label: 'Scale',
      type: 'number',
      min: 0.2,
      max: 2,
      step: 0.02,
    },
    {
      key: 'rotate',
      label: 'Rotate',
      type: 'number',
      min: -180,
      max: 180,
      step: 1,
      suffix: 'deg',
    },
    {
      key: 'blur',
      label: 'Blur',
      type: 'number',
      min: 0,
      max: 40,
      step: 1,
      suffix: 'px',
    }
  ], []);

  return (
    <div className='space-y-4'>
      <FormSection
        title='CSS Animation'
        variant='subtle-compact'
        actions={
          <Checkbox 
            checked={config.enabled ?? false} 
            onCheckedChange={(checked) => onChange({ ...config, enabled: checked === true })} 
          />
        }
        className='space-y-2 p-3'
      >
        {config.enabled && (
          <div className='mt-4'>
            <SettingsFieldsRenderer
              fields={fields}
              values={config}
              onChange={(updates) => onChange({ ...config, ...updates })}
            />
          </div>
        )}
      </FormSection>

      {config.enabled && config.effect !== 'none' && (
        <FormSection title='Transform controls' variant='subtle-compact' className='space-y-2 p-3'>
          <div className='mt-4'>
            <SettingsFieldsRenderer
              fields={transformFields}
              values={config}
              onChange={(updates) => onChange({ ...config, ...updates })}
              className='grid gap-x-4 sm:grid-cols-2 space-y-0'
            />
          </div>
        </FormSection>
      )}
    </div>
  );
}
