'use client';

import { Sun, Moon, Sparkles, Eye } from 'lucide-react';
import React, { useState } from 'react';

import {
  Button,
  SelectSimple,
  Input,
  FormSection,
  FormField,
  Checkbox,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ToggleRow,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  useViewer3DActions,
  useViewer3DState,
  orderedDitheringPresets,
  type OrderedDitheringPresetKey,
} from '../context/Viewer3DContext';

import type { LightingPreset, EnvironmentPreset } from './Viewer3D';

type EnvironmentPresetOption = { value: EnvironmentPreset; label: string };
type LightingPresetOption = { value: LightingPreset; label: string; icon: React.ReactNode };
type LuminanceOption = { value: number; label: string };

const environmentPresets: EnvironmentPresetOption[] = [
  { value: 'studio', label: 'Studio' },
  { value: 'sunset', label: 'Sunset' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'night', label: 'Night' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'forest', label: 'Forest' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'city', label: 'City' },
  { value: 'park', label: 'Park' },
  { value: 'lobby', label: 'Lobby' },
];

const lightingPresets: LightingPresetOption[] = [
  { value: 'studio', label: 'Studio', icon: <Sun className='h-4 w-4' /> },
  { value: 'outdoor', label: 'Outdoor', icon: <Sun className='h-4 w-4' /> },
  { value: 'dramatic', label: 'Dramatic', icon: <Moon className='h-4 w-4' /> },
  { value: 'soft', label: 'Soft', icon: <Sparkles className='h-4 w-4' /> },
];

const orderedDitheringLuminanceOptions: LuminanceOption[] = [
  { value: 0, label: 'Average' },
  { value: 1, label: 'Rec. 601' },
  { value: 2, label: 'Rec. 709' },
  { value: 3, label: 'Max Channel' },
];

export function Viewer3DSettingsPanel(): React.JSX.Element {
  const {
    autoRotate,
    autoRotateSpeed,
    environment,
    lighting,
    lightIntensity,
    enableShadows,
    enableContactShadows,
    showGround,
    enableBloom,
    bloomIntensity,
    enableVignette,
    enableToneMapping,
    exposure,
    enableDithering,
    ditheringIntensity,
    enablePixelation,
    pixelSize,
    enableOrderedDithering,
    orderedDitheringGridSize,
    orderedDitheringPixelSizeRatio,
    orderedDitheringGrayscaleOnly,
    orderedDitheringInvertColor,
    orderedDitheringLuminanceMethod,
    orderedDitheringPreset,
    backgroundColor,
  } = useViewer3DState();

  const {
    setAutoRotate,
    setAutoRotateSpeed,
    setEnvironment,
    setLighting,
    setLightIntensity,
    setEnableShadows,
    setEnableContactShadows,
    setShowGround,
    setEnableBloom,
    setBloomIntensity,
    setEnableVignette,
    setEnableToneMapping,
    setExposure,
    setEnableDithering,
    setDitheringIntensity,
    setEnablePixelation,
    setPixelSize,
    setEnableOrderedDithering,
    setOrderedDitheringGridSize,
    setOrderedDitheringPixelSizeRatio,
    setOrderedDitheringGrayscaleOnly,
    setOrderedDitheringInvertColor,
    setOrderedDitheringLuminanceMethod,
    setOrderedDitheringPreset,
    applyOrderedDitheringPreset,
    setBackgroundColor,
  } = useViewer3DActions();

  const [activeTab, setActiveTab] = useState<'environment' | 'effects' | 'view'>('environment');

  return (
    <div className='w-full h-full flex flex-col'>
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'environment' | 'effects' | 'view')}
        className='flex flex-col h-full'
      >
        <TabsList className='flex border-b border-gray-700 h-auto bg-transparent p-0 rounded-none'>
          <TabsTrigger
            value='environment'
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium transition-colors rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 text-gray-400 hover:text-white border-b-2 border-transparent'
            )}
          >
            <Sun className='h-4 w-4 inline mr-1' />
            Environment
          </TabsTrigger>
          <TabsTrigger
            value='effects'
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium transition-colors rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 text-gray-400 hover:text-white border-b-2 border-transparent'
            )}
          >
            <Sparkles className='h-4 w-4 inline mr-1' />
            Effects
          </TabsTrigger>
          <TabsTrigger
            value='view'
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium transition-colors rounded-none h-auto data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 text-gray-400 hover:text-white border-b-2 border-transparent'
            )}
          >
            <Eye className='h-4 w-4 inline mr-1' />
            View
          </TabsTrigger>
        </TabsList>

        <div className='flex-1 overflow-y-auto'>
          <TabsContent value='environment' className='p-4 space-y-4 mt-0'>
            {/* Environment Preset */}
            <FormField label='HDR Environment'>
              <SelectSimple
                size='sm'
                value={environment}
                onValueChange={(v: string): void => setEnvironment(v as EnvironmentPreset)}
                options={environmentPresets}
                triggerClassName='w-full bg-gray-800 border-gray-700 text-white text-sm h-10'
              />
            </FormField>

            {/* Lighting Preset */}
            <FormField label='Lighting'>
              <div className='grid grid-cols-2 gap-2 mt-2'>
                {lightingPresets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={lighting === preset.value ? 'default' : 'ghost'}
                    onClick={() => setLighting(preset.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors h-auto justify-start',
                      lighting === preset.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    )}
                  >
                    {preset.icon}
                    {preset.label}
                  </Button>
                ))}
              </div>
            </FormField>

            {/* Light Intensity */}
            <FormField label={`Light Intensity: ${lightIntensity.toFixed(1)}`}>
              <Input
                type='range'
                min='0.1'
                max='3'
                step='0.1'
                value={lightIntensity}
                onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
              />
            </FormField>

            {/* Background Color */}
            <FormField label='Background'>
              <div className='flex gap-2 mt-2'>
                {['#1a1a2e', '#0a0a0f', '#1f1f1f', '#2d2d3a', '#111827'].map((color) => (
                  <Button
                    key={color}
                    onClick={() => setBackgroundColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-md border-2 transition-all p-0',
                      backgroundColor === color
                        ? 'border-blue-500 scale-110'
                        : 'border-gray-600 hover:border-gray-500'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                  type='color'
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className='w-8 h-8 rounded-md cursor-pointer p-0 border-none'
                />
              </div>
            </FormField>

            {/* Shadows */}
            <FormSection title='Environment Options' variant='subtle' className='p-3 space-y-3'>
              <div className='space-y-2 mt-2'>
                <ToggleRow
                  label='Enable Shadows'
                  checked={enableShadows}
                  onCheckedChange={setEnableShadows}
                  type='checkbox'
                  className='bg-transparent border-none p-0 hover:bg-transparent'
                />
                <ToggleRow
                  label='Contact Shadows'
                  checked={enableContactShadows}
                  onCheckedChange={setEnableContactShadows}
                  type='checkbox'
                  className='bg-transparent border-none p-0 hover:bg-transparent'
                />
                <ToggleRow
                  label='Show Ground'
                  checked={showGround}
                  onCheckedChange={setShowGround}
                  type='checkbox'
                  className='bg-transparent border-none p-0 hover:bg-transparent'
                />
              </div>
            </FormSection>
          </TabsContent>

          <TabsContent value='effects' className='p-4 space-y-4 mt-0'>
            {/* Tone Mapping */}
            <FormSection
              title='ACES Tone Mapping'
              variant='subtle'
              className='p-3 space-y-3'
              actions={
                <Checkbox
                  checked={enableToneMapping}
                  onCheckedChange={(v) => setEnableToneMapping(Boolean(v))}
                />
              }
            >
              {enableToneMapping && (
                <div className='mt-2'>
                  <FormField label={`Exposure: ${exposure.toFixed(1)}`}>
                    <Input
                      type='range'
                      min='0.1'
                      max='3'
                      step='0.1'
                      value={exposure}
                      onChange={(e) => setExposure(parseFloat(e.target.value))}
                      className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
                    />
                  </FormField>
                </div>
              )}
            </FormSection>

            {/* Bloom */}
            <FormSection
              title='Bloom Effect'
              variant='subtle'
              className='p-3 space-y-3'
              actions={
                <Checkbox
                  checked={enableBloom}
                  onCheckedChange={(v) => setEnableBloom(Boolean(v))}
                />
              }
            >
              {enableBloom && (
                <div className='mt-2'>
                  <FormField label={`Intensity: ${bloomIntensity.toFixed(1)}`}>
                    <Input
                      type='range'
                      min='0'
                      max='2'
                      step='0.1'
                      value={bloomIntensity}
                      onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                      className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
                    />
                  </FormField>
                </div>
              )}
            </FormSection>

            {/* Vignette */}
            <ToggleRow
              label='Vignette'
              checked={enableVignette}
              onCheckedChange={setEnableVignette}
              type='checkbox'
              className='p-3 rounded-md border border-border/40 bg-gray-900/40'
            />

            {/* Pixelation */}
            <FormSection
              title='Pixel Art'
              description='Chunky pixelated rendering'
              variant='subtle'
              className='p-3 space-y-3'
              actions={
                <Checkbox
                  checked={enablePixelation}
                  onCheckedChange={(v) => setEnablePixelation(Boolean(v))}
                />
              }
            >
              {enablePixelation && (
                <div className='mt-2'>
                  <FormField label={`Pixel Size: ${pixelSize}px`}>
                    <Input
                      type='range'
                      min='2'
                      max='24'
                      step='1'
                      value={pixelSize}
                      onChange={(e) => setPixelSize(parseInt(e.target.value, 10))}
                      className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
                    />
                  </FormField>
                </div>
              )}
            </FormSection>

            {/* Ordered Dithering */}
            <FormSection
              title='Ordered Dithering'
              description='Shader-based dither with pixel grid'
              variant='subtle'
              className='p-3 space-y-3'
              actions={
                <Checkbox
                  checked={enableOrderedDithering}
                  onCheckedChange={(v) => setEnableOrderedDithering(Boolean(v))}
                />
              }
            >
              {enableOrderedDithering && (
                <div className='mt-4 space-y-4'>
                  <FormField label='Preset'>
                    <SelectSimple
                      size='sm'
                      value={orderedDitheringPreset}
                      onValueChange={(v: string): void => {
                        const value = v as OrderedDitheringPresetKey;
                        if (value !== 'custom') {
                          applyOrderedDitheringPreset(value);
                        } else {
                          setOrderedDitheringPreset('custom');
                        }
                      }}
                      options={[
                        ...Object.entries(orderedDitheringPresets).map(([key, preset]) => ({
                          value: key,
                          label: preset.label,
                        })),
                        { value: 'custom', label: 'Custom' },
                      ]}
                      triggerClassName='w-full bg-gray-800 border-gray-700 text-xs text-gray-200 h-8'
                    />
                  </FormField>
                  <FormField label={`Grid Size: ${orderedDitheringGridSize.toFixed(1)}`}>
                    <Input
                      type='range'
                      min='2'
                      max='12'
                      step='0.5'
                      value={orderedDitheringGridSize}
                      onChange={(e) => {
                        setOrderedDitheringGridSize(parseFloat(e.target.value));
                        setOrderedDitheringPreset('custom');
                      }}
                      className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
                    />
                  </FormField>
                  <FormField label={`Pixel Ratio: ${orderedDitheringPixelSizeRatio.toFixed(1)}`}>
                    <Input
                      type='range'
                      min='0.5'
                      max='3'
                      step='0.1'
                      value={orderedDitheringPixelSizeRatio}
                      onChange={(e) => {
                        setOrderedDitheringPixelSizeRatio(parseFloat(e.target.value));
                        setOrderedDitheringPreset('custom');
                      }}
                      className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
                    />
                  </FormField>
                  <FormField label='Luminance'>
                    <SelectSimple
                      size='sm'
                      value={String(orderedDitheringLuminanceMethod)}
                      onValueChange={(v: string): void => {
                        setOrderedDitheringLuminanceMethod(parseInt(v, 10));
                        setOrderedDitheringPreset('custom');
                      }}
                      options={orderedDitheringLuminanceOptions.map((opt) => ({
                        value: String(opt.value),
                        label: opt.label,
                      }))}
                      triggerClassName='w-full bg-gray-800 border-gray-700 text-xs text-gray-200 h-8'
                    />
                  </FormField>
                  <div className='space-y-2'>
                    <ToggleRow
                      label='Grayscale only'
                      checked={orderedDitheringGrayscaleOnly}
                      onCheckedChange={(v) => {
                        setOrderedDitheringGrayscaleOnly(v);
                        setOrderedDitheringPreset('custom');
                      }}
                      type='checkbox'
                      className='bg-transparent border-none p-0 hover:bg-transparent'
                    />
                    <ToggleRow
                      label='Invert colors'
                      checked={orderedDitheringInvertColor}
                      onCheckedChange={(v) => {
                        setOrderedDitheringInvertColor(v);
                        setOrderedDitheringPreset('custom');
                      }}
                      type='checkbox'
                      className='bg-transparent border-none p-0 hover:bg-transparent'
                    />
                  </div>
                </div>
              )}
            </FormSection>

            {/* Dithering */}
            <FormSection
              title='B&W Dithering'
              description='Artistic retro effect'
              variant='subtle'
              className='p-3 space-y-3'
              actions={
                <Checkbox
                  checked={enableDithering}
                  onCheckedChange={(v) => setEnableDithering(Boolean(v))}
                />
              }
            >
              {enableDithering && (
                <div className='mt-2'>
                  <FormField label={`Intensity: ${ditheringIntensity.toFixed(1)}`}>
                    <Input
                      type='range'
                      min='0.1'
                      max='2'
                      step='0.1'
                      value={ditheringIntensity}
                      onChange={(e) => setDitheringIntensity(parseFloat(e.target.value))}
                      className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
                    />
                  </FormField>
                </div>
              )}
            </FormSection>
          </TabsContent>

          <TabsContent value='view' className='p-4 space-y-4 mt-0'>
            {/* Auto Rotate */}
            <FormSection
              title='Auto-rotate'
              variant='subtle'
              className='p-3 space-y-3'
              actions={
                <Checkbox checked={autoRotate} onCheckedChange={(v) => setAutoRotate(Boolean(v))} />
              }
            >
              {autoRotate && (
                <div className='mt-2'>
                  <FormField label={`Speed: ${autoRotateSpeed.toFixed(1)}`}>
                    <Input
                      type='range'
                      min='0.5'
                      max='10'
                      step='0.5'
                      value={autoRotateSpeed}
                      onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
                      className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer p-0 border-none mt-2'
                    />
                  </FormField>
                </div>
              )}
            </FormSection>

            {/* Controls Help */}
            <FormSection
              title='Controls'
              variant='subtle-compact'
              className='p-3 text-xs text-gray-400 space-y-1'
            >
              <div className='mt-2 space-y-1'>
                <p>• Left click + drag to rotate</p>
                <p>• Right click + drag to pan</p>
                <p>• Scroll to zoom</p>
              </div>
            </FormSection>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
