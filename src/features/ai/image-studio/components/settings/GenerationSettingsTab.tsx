'use client';

import Link from 'next/link';
import React from 'react';

import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { FormField, FormSection, Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Input, Textarea } from '@/shared/ui/primitives.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

import {
  useImageStudioSettingsActions,
  useImageStudioSettingsState,
} from '../../context/ImageStudioSettingsContext';

export function GenerationSettingsTab(): React.JSX.Element {
  const {
    studioSettings,
    modelCapabilities,
    modelAwareSizeValue,
    modelAwareQualityValue,
    modelAwareFormatValue,
    modelAwareSizeOptions,
    modelAwareQualityOptions,
    modelAwareFormatOptions,
    advancedOverridesText,
    advancedOverridesError,
  } = useImageStudioSettingsState();
  const { setStudioSettings, handleAdvancedOverridesChange } = useImageStudioSettingsActions();
  const brainGenerationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });
  const effectiveGenerationModel = brainGenerationModel.effectiveModelId.trim();

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
          <div className='rounded-md border border-border/60 bg-card/35 px-3 py-3 text-sm text-gray-300'>
            <div className='font-medium text-white'>Global provider ownership</div>
            <p className='mt-1 text-[13px] leading-relaxed text-gray-400'>
              OpenAI credentials are managed centrally in AI Brain and shared across Brain-routed
              features such as Image Studio, Kangur narration, and Case Resolver OCR.
            </p>
            <div className='mt-2 text-xs'>
              <Link href='/admin/brain?tab=providers' className='text-blue-300 hover:text-blue-200'>
                OpenAI providers in AI Brain
              </Link>
            </div>
          </div>

          <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
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
                 aria-label='Not configured in AI Brain' title='Not configured in AI Brain'/>
              </FormField>

              <div className='rounded-md border border-border/60 bg-card/35 px-3 py-2 text-[11px] text-gray-400'>
                Generation routing is managed in AI Brain. Image Studio no longer stores local
                generation model snapshots.
              </div>
            </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Image Size'>
                  <SelectSimple
                    value={modelAwareSizeValue}
                    onValueChange={handleSizeChange}
                    options={modelAwareSizeOptions}
                   ariaLabel='Image Size' title='Image Size'/>
                </FormField>
                <FormField label='Quality'>
                  <SelectSimple
                    value={modelAwareQualityValue}
                    onValueChange={handleQualityChange}
                    options={modelAwareQualityOptions}
                   ariaLabel='Quality' title='Quality'/>
                </FormField>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Output Format'>
                  <SelectSimple
                    value={modelAwareFormatValue}
                    onValueChange={handleFormatChange}
                    options={modelAwareFormatOptions}
                   ariaLabel='Output Format' title='Output Format'/>
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
                     aria-label='Compression' title='Compression'/>
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
           aria-label='Textarea' title='Textarea'/>
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
