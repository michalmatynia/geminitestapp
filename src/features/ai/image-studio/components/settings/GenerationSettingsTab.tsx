'use client';

import { X } from 'lucide-react';
import React from 'react';

import {
  Button,
  Badge,
  FormField,
  FormSection,
  Input,
  Label,
  SelectSimple,
  Textarea,
  Hint,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useImageStudioSettingsContext } from '../../context/ImageStudioSettingsContext';

export function GenerationSettingsTab(): React.JSX.Element {
  const {
    studioSettings,
    setStudioSettings,
    selectedGenerationModel,
    setGenerationModelAndPresets,
    quickSwitchModels,
    quickSwitchModelSelectOptions,
    modelToAdd,
    setModelToAdd,
    addableGenerationModelOptions,
    imageStudioApiKey,
    setImageStudioApiKey,
    modelCapabilities,
    modelAwareSizeValue,
    modelAwareQualityValue,
    modelAwareFormatValue,
    modelAwareSizeOptions,
    modelAwareQualityOptions,
    modelAwareFormatOptions,
    advancedOverridesText,
    advancedOverridesError,
    handleAdvancedOverridesChange,
  } = useImageStudioSettingsContext();

  const handleSizeChange = (val: string): void => {
    setStudioSettings((prev) => ({
      ...prev,
      targetAi: {
        ...prev.targetAi,
        openai: {
          ...prev.targetAi.openai,
          image: { ...prev.targetAi.openai.image, size: val === '__null__' ? null : val },
        },
      },
    }));
  };

  const handleQualityChange = (val: string): void => {
    setStudioSettings((prev) => ({
      ...prev,
      targetAi: {
        ...prev.targetAi,
        openai: {
          ...prev.targetAi.openai,
          image: { 
            ...prev.targetAi.openai.image, 
            quality: (val === '__null__' ? null : val) as 'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd' | null
          },
        },
      },
    }));
  };

  const handleFormatChange = (val: string): void => {
    setStudioSettings((prev) => ({
      ...prev,
      targetAi: {
        ...prev.targetAi,
        openai: {
          ...prev.targetAi.openai,
          image: { 
            ...prev.targetAi.openai.image, 
            format: (val === '__null__' ? null : val) as 'png' | 'jpeg' | 'webp' | null
          },
        },
      },
    }));
  };

  return (
    <div className='space-y-6'>
      <FormSection
        title='OpenAI Configuration'
        description='Settings for Image generation API.'
      >
        <div className='space-y-4'>
          <FormField label='OpenAI API Key' description='Required for DALL-E generation.'>
            <Input
              type='password'
              value={imageStudioApiKey}
              onChange={(e) => setImageStudioApiKey(e.target.value)}
              placeholder='sk-...'
            />
          </FormField>

          <div className='grid gap-6 lg:grid-cols-2'>
            <div className='space-y-4'>
              <FormField
                label='Target Generation Model'
                description='Active model for image production.'
              >
                <SelectSimple
                  value={selectedGenerationModel}
                  onValueChange={(val) => setGenerationModelAndPresets(val, quickSwitchModels)}
                  options={quickSwitchModelSelectOptions}
                  triggerClassName='h-10 border-border bg-card/60 text-white'
                />
              </FormField>

              <div className='space-y-2'>
                <Label className='text-xs font-semibold uppercase tracking-wider text-gray-400'>Quick Switch Models</Label>
                <div className='flex flex-wrap gap-2'>
                  {quickSwitchModels.map((modelId) => (
                    <Badge
                      key={modelId}
                      variant={modelId === studioSettings.targetAi.openai.model ? 'info' : 'neutral'}
                      className='group relative pr-8 cursor-pointer uppercase tracking-wider text-[10px] px-2 py-0.5 h-5'
                      onClick={() => setGenerationModelAndPresets(modelId, quickSwitchModels)}
                    >
                      {modelId}
                      <button
                        type='button'
                        className='absolute right-1 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-gray-500 hover:bg-gray-700 hover:text-white'
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = quickSwitchModels.filter((m) => m !== modelId);
                          setGenerationModelAndPresets(
                            studioSettings.targetAi.openai.model === modelId ? (next[0] ?? '') : studioSettings.targetAi.openai.model,
                            next
                          );
                        }}
                      >
                        <X className='size-3' />
                      </button>
                    </Badge>
                  ))}
                  {addableGenerationModelOptions.length > 0 && (
                    <div className='flex items-center gap-2'>
                      <SelectSimple
                        size='sm'
                        value={modelToAdd}
                        onValueChange={setModelToAdd}
                        options={addableGenerationModelOptions}
                        className='w-[180px]'
                        triggerClassName='h-8 text-xs'
                      />
                      <Button
                        size='xs'
                        variant='outline'
                        className='h-8'
                        onClick={() => {
                          if (modelToAdd) {
                            setGenerationModelAndPresets(modelToAdd, [...quickSwitchModels, modelToAdd]);
                            setModelToAdd('');
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Image Size'>
                  <SelectSimple
                    value={modelAwareSizeValue}
                    onValueChange={handleSizeChange}
                    options={modelAwareSizeOptions}
                  />
                </FormField>
                <FormField label='Quality'>
                  <SelectSimple
                    value={modelAwareQualityValue}
                    onValueChange={handleQualityChange}
                    options={modelAwareQualityOptions}
                  />
                </FormField>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Output Format'>
                  <SelectSimple
                    value={modelAwareFormatValue}
                    onValueChange={handleFormatChange}
                    options={modelAwareFormatOptions}
                  />
                </FormField>
                {modelCapabilities.supportsOutputCompression && (
                  <FormField label='Compression'>
                    <Input
                      type='number'
                      min={0}
                      max={100}
                      value={studioSettings.targetAi.openai.image.output_compression ?? 0}
                      onChange={(e) =>
                        setStudioSettings((prev) => ({
                          ...prev,
                          targetAi: {
                            ...prev.targetAi,
                            openai: {
                              ...prev.targetAi.openai,
                              image: { ...prev.targetAi.openai.image, output_compression: Number(e.target.value) },
                            },
                          },
                        }))
                      }
                    />
                  </FormField>
                )}
              </div>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection
        title='Advanced Overrides (JSON)'
        description='Force specific OpenAI parameters (overrides all UI choices).'
      >
        <div className='space-y-2'>
          <Textarea
            className={cn('min-h-[160px] font-mono text-xs', advancedOverridesError && 'border-rose-500/60 focus:border-rose-500')}
            value={advancedOverridesText}
            onChange={(e) => handleAdvancedOverridesChange(e.target.value)}
            spellCheck={false}
          />
          {advancedOverridesError && (
            <p className='text-xs font-medium text-rose-400'>{String(advancedOverridesError)}</p>
          )}
          <Hint className='text-gray-500 italic'>
            JSON merged into images.generate() request payload.
          </Hint>
        </div>
      </FormSection>
    </div>
  );
}
