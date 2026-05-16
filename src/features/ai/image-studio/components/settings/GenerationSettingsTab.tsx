'use client';

import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

import type { BrainModelDescriptor, BrainModelVendor } from '@/shared/contracts/ai-brain';
import { inferBrainModelVendor } from '@/shared/lib/ai-brain/model-vendor';
import {
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
} from '@/shared/lib/ai-brain/settings';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useBrainModels } from '@/features/ai/brain/hooks/useBrainQueries';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge } from '@/shared/ui/primitives.public';
import { FormField, FormSection, Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Button, Input, Textarea, useToast } from '@/shared/ui/primitives.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  useImageStudioSettingsActions,
  useImageStudioSettingsState,
} from '../../context/ImageStudioSettingsContext';

const VENDOR_LABELS: Record<BrainModelVendor, string> = {
  openai: 'GPT',
  anthropic: 'Claude',
  gemini: 'Gemini',
  ollama: 'Ollama',
};

const VENDOR_COLORS: Record<BrainModelVendor, string> = {
  openai: 'border-emerald-600/60 text-emerald-300',
  anthropic: 'border-amber-600/60 text-amber-300',
  gemini: 'border-blue-600/60 text-blue-300',
  ollama: 'border-gray-600/60 text-gray-400',
};

function VendorBadge({ modelId }: { modelId: string }): React.JSX.Element | null {
  if (!modelId.trim()) return null;
  const vendor = inferBrainModelVendor(modelId);
  return (
    <Badge
      variant='outline'
      className={cn('h-4 shrink-0 px-1.5 text-[10px] font-medium', VENDOR_COLORS[vendor])}
    >
      {VENDOR_LABELS[vendor]}
    </Badge>
  );
}

const FAMILY_LABELS: Record<string, string> = {
  image_generation: 'image gen',
  chat: 'chat',
  vision_extract: 'vision',
  embedding: 'embedding',
  ocr: 'ocr',
  validation: 'validation',
};

const buildCatalogOptions = (
  sources: {
    modelPresets?: string[];
    paidModels?: string[];
    configuredOllamaModels?: string[];
    liveOllamaModels?: string[];
  } | undefined,
  descriptors: Record<string, BrainModelDescriptor>
): Array<{ value: string; label: string; description: string; group: string }> => {
  const seen = new Set<string>();
  const imageGen: Array<{ value: string; label: string; description: string; group: string }> = [];
  const other: Array<{ value: string; label: string; description: string; group: string }> = [];

  const allIds = [
    ...(sources?.modelPresets ?? []),
    ...(sources?.paidModels ?? []),
    ...(sources?.configuredOllamaModels ?? []),
    ...(sources?.liveOllamaModels ?? []),
  ];

  for (const id of allIds) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);

    const vendor = inferBrainModelVendor(trimmed);
    const descriptor = descriptors[trimmed];
    const family = descriptor?.family ?? null;
    const familyLabel = family ? (FAMILY_LABELS[family] ?? family) : 'unclassified';
    const entry = {
      value: trimmed,
      label: trimmed,
      description: familyLabel,
      group: VENDOR_LABELS[vendor] ?? vendor,
    };

    if (family === 'image_generation') {
      imageGen.push(entry);
    } else {
      other.push(entry);
    }
  }

  return [...imageGen, ...other];
};

function GenerationModelEditor(): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();

  const { effectiveModelId } = useBrainAssignment({ capability: 'image_studio.general' });
  const modelsQuery = useBrainModels();
  const isLoading = modelsQuery.isLoading;
  const sourceWarning = modelsQuery.data?.warning?.message?.trim() ?? '';

  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft(effectiveModelId);
  }, [effectiveModelId]);

  const catalogOptions = buildCatalogOptions(modelsQuery.data?.sources, modelsQuery.data?.descriptors ?? {});

  const handleApply = useCallback(async (): Promise<void> => {
    const modelId = draft.trim();
    if (!modelId) {
      toast('Model ID cannot be empty.', { variant: 'error' });
      return;
    }
    try {
      const raw = settingsStore.get(AI_BRAIN_SETTINGS_KEY);
      const current = parseBrainSettings(raw);
      const existing = current.capabilities['image_studio.general'];
      const next: typeof current = {
        ...current,
        capabilities: {
          ...current.capabilities,
          'image_studio.general': {
            enabled: true,
            provider: 'model',
            modelId,
            agentId: '',
            temperature: existing?.temperature,
            maxTokens: existing?.maxTokens,
            ...(existing?.systemPrompt ? { systemPrompt: existing.systemPrompt } : {}),
            notes: existing?.notes ?? null,
          },
        },
      };
      await updateSetting.mutateAsync({
        key: AI_BRAIN_SETTINGS_KEY,
        value: JSON.stringify(next),
      });
      toast(`Generation model set to "${modelId}".`, { variant: 'success' });
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to save model.', { variant: 'error' });
    }
  }, [draft, settingsStore, toast, updateSetting]);

  const isDirty = draft.trim() !== effectiveModelId;

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-1.5'>
        <Input
          value={draft}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
          placeholder='e.g. dall-e-3, gpt-image-1'
          disabled={isLoading}
          aria-label='Generation model ID'
          title='Generation model ID'
          className='flex-1'
        />
        <VendorBadge modelId={draft} />
      </div>

      {catalogOptions.length > 0 ? (
        <SelectSimple
          value=''
          onValueChange={(value: string) => setDraft(value)}
          options={catalogOptions}
          placeholder='Pick from Brain catalog…'
          disabled={isLoading}
          size='sm'
          ariaLabel='Pick generation model from Brain catalog'
          title='Pick generation model from Brain catalog'
        />
      ) : (
        <p className='text-[11px] text-gray-500'>
          No models in Brain catalog.{' '}
          <Link href='/admin/brain?tab=providers' className='text-blue-300 hover:text-blue-200'>
            Add models in AI Brain Providers
          </Link>
          .
        </p>
      )}

      {sourceWarning ? (
        <p className='text-[11px] text-amber-400'>{sourceWarning}</p>
      ) : null}

      <div className='flex items-center gap-2 pt-1'>
        <Button
          size='sm'
          onClick={() => void handleApply()}
          disabled={!isDirty || !draft.trim() || updateSetting.isPending}
        >
          {updateSetting.isPending ? 'Saving…' : 'Apply'}
        </Button>
        {isDirty && (
          <button
            type='button'
            className='text-[11px] text-gray-500 hover:text-gray-300'
            onClick={() => setDraft(effectiveModelId)}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

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
                description='Governs which model runs Image Studio generations. Saved to the AI Brain image_studio.general capability.'
              >
                <GenerationModelEditor />
              </FormField>
            </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Image Size'>
                  <SelectSimple
                    value={modelAwareSizeValue}
                    onValueChange={handleSizeChange}
                    options={modelAwareSizeOptions}
                    ariaLabel='Image Size'
                    title='Image Size'
                  />
                </FormField>
                <FormField label='Quality'>
                  <SelectSimple
                    value={modelAwareQualityValue}
                    onValueChange={handleQualityChange}
                    options={modelAwareQualityOptions}
                    ariaLabel='Quality'
                    title='Quality'
                  />
                </FormField>
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <FormField label='Output Format'>
                  <SelectSimple
                    value={modelAwareFormatValue}
                    onValueChange={handleFormatChange}
                    options={modelAwareFormatOptions}
                    ariaLabel='Output Format'
                    title='Output Format'
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
                      aria-label='Compression'
                      title='Compression'
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
            aria-label='Textarea'
            title='Textarea'
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
