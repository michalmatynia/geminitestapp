'use client';

import React from 'react';

import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { FormField, FormSection, Input, SelectSimple, Textarea, Hint } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useImageStudioSettingsContext } from '../../context/ImageStudioSettingsContext';

export function GenerationSettingsTab(): React.JSX.Element {
  const {
    studioSettings,
    setStudioSettings,
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
  const brainGenerationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });
  const effectiveGenerationModel =
    brainGenerationModel.effectiveModelId.trim() ||
    studioSettings.targetAi.openai.model.trim() ||
    '';

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
            quality: (val === '__null__' ? null : val) as
              | 'auto'
              | 'low'
              | 'medium'
              | 'high'
              | 'standard'
              | 'hd'
              | null,
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
            format: (val === '__null__' ? null : val) as 'png' | 'jpeg' | 'webp' | null,
          },
        },
      },
    }));
  };

  return (
    <div className='space-y-6'>
      <FormSection title='OpenAI Configuration' description='Settings for Image generation API.'>
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
                description='Brain-managed via Image Studio Image Generation capability.'
              >
                <Input
                  value={effectiveGenerationModel || 'Not configured in AI Brain'}
                  readOnly
                  disabled
                  className='cursor-not-allowed'
                  placeholder='Not configured in AI Brain'
                />
              </FormField>

              <div className='rounded-md border border-border/60 bg-card/35 px-3 py-2 text-[11px] text-gray-400'>
                Model switching is managed in AI Brain. Local Image Studio generation model presets
                remain as compatibility snapshots only.
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
                              image: {
                                ...prev.targetAi.openai.image,
                                output_compression: Number(e.target.value),
                              },
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
            className={cn(
              'min-h-[160px] font-mono text-xs',
              advancedOverridesError && 'border-rose-500/60 focus:border-rose-500'
            )}
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
