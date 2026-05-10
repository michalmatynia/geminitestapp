'use client';

import React from 'react';

import { Checkbox } from '@/shared/ui/primitives.public';
import { FormField, FormSection, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';

import type { OrderedDitheringPresetKey } from '../context/Viewer3DContext';
import { SettingsRangeField } from './Viewer3DSettingsPanel.controls';
import {
  orderedDitheringLuminanceSelectOptions,
  orderedDitheringPresetOptions,
} from './Viewer3DSettingsPanel.options';
import type { Viewer3DSettingsSectionProps } from './Viewer3DSettingsPanel.types';

const parseInteger = (value: string): number => Number.parseInt(value, 10);

function ToneMappingSection({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='ACES Tone Mapping' variant='subtle' className='p-3 space-y-3' actions={<Checkbox checked={state.enableToneMapping} onCheckedChange={(value) => actions.setEnableToneMapping(Boolean(value))} />}>
      {state.enableToneMapping && (
        <div className='mt-2'>
          <SettingsRangeField label='Exposure' value={state.exposure} valueLabel={state.exposure.toFixed(1)} min='0.1' max='3' step='0.1' onChange={actions.setExposure} />
        </div>
      )}
    </FormSection>
  );
}

function BloomSection({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='Bloom Effect' variant='subtle' className='p-3 space-y-3' actions={<Checkbox checked={state.enableBloom} onCheckedChange={(value) => actions.setEnableBloom(Boolean(value))} />}>
      {state.enableBloom && (
        <div className='mt-2'>
          <SettingsRangeField label='Intensity' value={state.bloomIntensity} valueLabel={state.bloomIntensity.toFixed(1)} min='0' max='2' step='0.1' onChange={actions.setBloomIntensity} />
        </div>
      )}
    </FormSection>
  );
}

function PixelationSection({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='Pixel Art' description='Chunky pixelated rendering' variant='subtle' className='p-3 space-y-3' actions={<Checkbox checked={state.enablePixelation} onCheckedChange={(value) => actions.setEnablePixelation(Boolean(value))} />}>
      {state.enablePixelation && (
        <div className='mt-2'>
          <SettingsRangeField label='Pixel Size' value={state.pixelSize} valueLabel={`${state.pixelSize}px`} min='2' max='24' step='1' onChange={actions.setPixelSize} parseValue={parseInteger} />
        </div>
      )}
    </FormSection>
  );
}

function DitheringSection({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='B&W Dithering' description='Artistic retro effect' variant='subtle' className='p-3 space-y-3' actions={<Checkbox checked={state.enableDithering} onCheckedChange={(value) => actions.setEnableDithering(Boolean(value))} />}>
      {state.enableDithering && (
        <div className='mt-2'>
          <SettingsRangeField label='Intensity' value={state.ditheringIntensity} valueLabel={state.ditheringIntensity.toFixed(1)} min='0.1' max='2' step='0.1' onChange={actions.setDitheringIntensity} />
        </div>
      )}
    </FormSection>
  );
}

function OrderedDitheringPresetField({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormField label='Preset'>
      <SelectSimple
        size='sm'
        value={state.orderedDitheringPreset}
        onValueChange={(value: string): void => {
          const preset = value as OrderedDitheringPresetKey;
          if (preset === 'custom') actions.setOrderedDitheringPreset('custom');
          else actions.applyOrderedDitheringPreset(preset);
        }}
        options={orderedDitheringPresetOptions}
        triggerClassName='w-full bg-gray-800 border-gray-700 text-xs text-gray-200 h-8'
        ariaLabel='Preset'
        title='Preset'
      />
    </FormField>
  );
}

function OrderedDitheringOptions({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <ToggleRow label='Grayscale only' checked={state.orderedDitheringGrayscaleOnly} onCheckedChange={(value) => { actions.setOrderedDitheringGrayscaleOnly(value); actions.setOrderedDitheringPreset('custom'); }} variant='checkbox' className='bg-transparent border-none p-0 hover:bg-transparent' />
      <ToggleRow label='Invert colors' checked={state.orderedDitheringInvertColor} onCheckedChange={(value) => { actions.setOrderedDitheringInvertColor(value); actions.setOrderedDitheringPreset('custom'); }} variant='checkbox' className='bg-transparent border-none p-0 hover:bg-transparent' />
    </div>
  );
}

function OrderedDitheringSection({ state, actions }: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <FormSection title='Ordered Dithering' description='Shader-based dither with pixel grid' variant='subtle' className='p-3 space-y-3' actions={<Checkbox checked={state.enableOrderedDithering} onCheckedChange={(value) => actions.setEnableOrderedDithering(Boolean(value))} />}>
      {state.enableOrderedDithering && (
        <div className='mt-4 space-y-4'>
          <OrderedDitheringPresetField state={state} actions={actions} />
          <SettingsRangeField label='Grid Size' value={state.orderedDitheringGridSize} valueLabel={state.orderedDitheringGridSize.toFixed(1)} min='2' max='12' step='0.5' onChange={(value) => { actions.setOrderedDitheringGridSize(value); actions.setOrderedDitheringPreset('custom'); }} />
          <SettingsRangeField label='Pixel Ratio' value={state.orderedDitheringPixelSizeRatio} valueLabel={state.orderedDitheringPixelSizeRatio.toFixed(1)} min='0.5' max='3' step='0.1' onChange={(value) => { actions.setOrderedDitheringPixelSizeRatio(value); actions.setOrderedDitheringPreset('custom'); }} />
          <FormField label='Luminance'>
            <SelectSimple size='sm' value={String(state.orderedDitheringLuminanceMethod)} onValueChange={(value: string): void => { actions.setOrderedDitheringLuminanceMethod(Number.parseInt(value, 10)); actions.setOrderedDitheringPreset('custom'); }} options={orderedDitheringLuminanceSelectOptions} triggerClassName='w-full bg-gray-800 border-gray-700 text-xs text-gray-200 h-8' ariaLabel='Luminance' title='Luminance' />
          </FormField>
          <OrderedDitheringOptions state={state} actions={actions} />
        </div>
      )}
    </FormSection>
  );
}

export function Viewer3DEffectsTab(props: Viewer3DSettingsSectionProps): React.JSX.Element {
  return (
    <>
      <ToneMappingSection {...props} />
      <BloomSection {...props} />
      <ToggleRow label='Vignette' checked={props.state.enableVignette} onCheckedChange={props.actions.setEnableVignette} variant='checkbox' className='p-3 rounded-md border border-border/40 bg-gray-900/40' />
      <PixelationSection {...props} />
      <OrderedDitheringSection {...props} />
      <DitheringSection {...props} />
    </>
  );
}
