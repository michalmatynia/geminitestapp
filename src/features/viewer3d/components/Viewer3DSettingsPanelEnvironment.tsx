'use client';

import React from 'react';

import { Button, Input } from '@/shared/ui/primitives.public';
import { FormField, FormSection, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

import type { EnvironmentPreset } from './Viewer3D';
import { SettingsRangeField } from './Viewer3DSettingsPanel.controls';
import { environmentPresets, lightingPresets } from './Viewer3DSettingsPanel.options';
import type { Viewer3DSettingsSectionProps } from './Viewer3DSettingsPanel.types';

const backgroundColors = ['#1a1a2e', '#0a0a0f', '#1f1f1f', '#2d2d3a', '#111827'];

function EnvironmentPresetField({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormField label='HDR Environment'>
      <SelectSimple
        size='sm'
        value={state.environment}
        onValueChange={(value: string): void => actions.setEnvironment(value as EnvironmentPreset)}
        options={environmentPresets}
        triggerClassName='w-full bg-gray-800 border-gray-700 text-white text-sm h-10'
        ariaLabel='HDR Environment'
        title='HDR Environment'
      />
    </FormField>
  );
}

function LightingPresetField({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormField label='Lighting'>
      <div className='grid grid-cols-2 gap-2 mt-2'>
        {lightingPresets.map((preset) => (
          <Button
            key={preset.value}
            variant={state.lighting === preset.value ? 'default' : 'ghost'}
            onClick={() => actions.setLighting(preset.value)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors h-auto justify-start',
              state.lighting === preset.value ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            )}
          >
            {preset.icon}
            {preset.label}
          </Button>
        ))}
      </div>
    </FormField>
  );
}

function BackgroundColorField({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormField label='Background'>
      <div className='flex gap-2 mt-2'>
        {backgroundColors.map((color) => (
          <Button
            key={color}
            onClick={() => actions.setBackgroundColor(color)}
            className={cn('w-8 h-8 rounded-md border-2 transition-all p-0', state.backgroundColor === color ? 'border-blue-500 scale-110' : 'border-gray-600 hover:border-gray-500')}
            style={{ backgroundColor: color }}
          />
        ))}
        <Input type='color' value={state.backgroundColor} onChange={(event) => actions.setBackgroundColor(event.target.value)} className='w-8 h-8 rounded-md cursor-pointer p-0 border-none' aria-label='Background' title='Background' />
      </div>
    </FormField>
  );
}

function EnvironmentOptions({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='Environment Options' variant='subtle' className='p-3 space-y-3'>
      <div className='space-y-2 mt-2'>
        <ToggleRow label='Enable Shadows' checked={state.enableShadows} onCheckedChange={actions.setEnableShadows} variant='checkbox' className='bg-transparent border-none p-0 hover:bg-transparent' />
        <ToggleRow label='Contact Shadows' checked={state.enableContactShadows} onCheckedChange={actions.setEnableContactShadows} variant='checkbox' className='bg-transparent border-none p-0 hover:bg-transparent' />
        <ToggleRow label='Show Ground' checked={state.showGround} onCheckedChange={actions.setShowGround} variant='checkbox' className='bg-transparent border-none p-0 hover:bg-transparent' />
      </div>
    </FormSection>
  );
}

export function Viewer3DEnvironmentTab(props: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <>
      <EnvironmentPresetField {...props} />
      <LightingPresetField {...props} />
      <SettingsRangeField label='Light Intensity' value={props.state.lightIntensity} valueLabel={props.state.lightIntensity.toFixed(1)} min='0.1' max='3' step='0.1' onChange={props.actions.setLightIntensity} />
      <BackgroundColorField {...props} />
      <EnvironmentOptions {...props} />
    </>
  );
}
