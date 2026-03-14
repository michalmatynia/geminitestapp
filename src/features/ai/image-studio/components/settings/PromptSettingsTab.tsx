'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import React from 'react';

import { IMAGE_STUDIO_SEQUENCE_OPERATIONS } from '@/features/ai/image-studio/utils/studio-settings';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import {
  Button,
  FormField,
  FormSection,
  Input,
  SelectSimple,
  StatusBadge,
  ToggleRow,
  Switch,
  Card,
  Hint,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import {
  useImageStudioSettingsActions,
  useImageStudioSettingsState,
} from '../../context/ImageStudioSettingsContext';

export function PromptSettingsTab(): React.JSX.Element {
  const promptExtractModel = useBrainAssignment({
    capability: 'image_studio.prompt_extract',
  });
  const uiExtractorModel = useBrainAssignment({
    capability: 'image_studio.ui_extractor',
  });
  const {
    studioSettings,
  } = useImageStudioSettingsState();
  const {
    setStudioSettings,
    toggleProjectSequencingOperation,
    moveProjectSequencingOperation,
  } = useImageStudioSettingsActions();

  const handleUiExtractorModeChange = (val: string): void => {
    setStudioSettings((prev) => ({
      ...prev,
      uiExtractor: { ...prev.uiExtractor, mode: val as 'heuristic' | 'ai' | 'both' },
    }));
  };

  return (
    <div className='space-y-6'>
      <div className='grid gap-6 lg:grid-cols-2'>
        <FormSection
          title='GPT Prompt Extraction'
          description='Define which AI model interprets raw image prompts.'
        >
          <div className='space-y-4'>
            <ToggleRow
              label='Enabled'
              variant='switch'
              checked={studioSettings.promptExtraction.mode !== 'programmatic'}
              onCheckedChange={(checked) =>
                setStudioSettings((prev) => ({
                  ...prev,
                  promptExtraction: {
                    ...prev.promptExtraction,
                    mode: checked ? 'hybrid' : 'programmatic',
                  },
                }))
              }
            />
            <FormField
              label='Model'
              description='Brain-managed via Image Studio Prompt Extract capability.'
            >
              <Input
                value={promptExtractModel.effectiveModelId.trim() || 'Not configured in AI Brain'}
                readOnly
                disabled
                className='cursor-not-allowed'
                placeholder='Not configured in AI Brain'
               aria-label="Not configured in AI Brain" title="Not configured in AI Brain"/>
            </FormField>
            <div className='grid grid-cols-2 gap-4'>
              <FormField label='Temperature'>
                <Input
                  type='number'
                  step='0.1'
                  min={0}
                  max={2}
                  value={studioSettings.promptExtraction.gpt.temperature ?? 0}
                  onChange={(e) =>
                    setStudioSettings((prev) => ({
                      ...prev,
                      promptExtraction: {
                        ...prev.promptExtraction,
                        gpt: { ...prev.promptExtraction.gpt, temperature: Number(e.target.value) },
                      },
                    }))
                  }
                 aria-label="Temperature" title="Temperature"/>
              </FormField>
              <FormField label='Max Tokens'>
                <Input
                  type='number'
                  value={studioSettings.promptExtraction.gpt.max_output_tokens ?? 0}
                  onChange={(e) =>
                    setStudioSettings((prev) => ({
                      ...prev,
                      promptExtraction: {
                        ...prev.promptExtraction,
                        gpt: {
                          ...prev.promptExtraction.gpt,
                          max_output_tokens: Number(e.target.value),
                        },
                      },
                    }))
                  }
                 aria-label="Max Tokens" title="Max Tokens"/>
              </FormField>
            </div>
          </div>
        </FormSection>

        <FormSection
          title='UI Extractor'
          description='Control how UI elements are detected and cropped.'
        >
          <div className='space-y-4'>
            <FormField label='Extractor Mode'>
              <SelectSimple
                value={studioSettings.uiExtractor.mode}
                onValueChange={handleUiExtractorModeChange}
                options={[
                  { value: 'heuristic', label: 'Heuristic Only' },
                  { value: 'ai', label: 'AI Only' },
                  { value: 'both', label: 'Both (AI + Heuristic)' },
                ]}
               ariaLabel="Extractor Mode" title="Extractor Mode"/>
            </FormField>
            {(studioSettings.uiExtractor.mode === 'ai' ||
              studioSettings.uiExtractor.mode === 'both') && (
              <FormField
                label='AI Model'
                description='Brain-managed via Image Studio UI Extractor capability.'
              >
                <Input
                  value={uiExtractorModel.effectiveModelId.trim() || 'Not configured in AI Brain'}
                  readOnly
                  disabled
                  className='cursor-not-allowed'
                  placeholder='Not configured in AI Brain'
                 aria-label="Not configured in AI Brain" title="Not configured in AI Brain"/>
              </FormField>
            )}
          </div>
        </FormSection>
      </div>

      <FormSection
        title='Project Sequencing'
        description='Order of operations for batch processing.'
      >
        <div className='space-y-4'>
          <div className='grid gap-3'>
            {IMAGE_STUDIO_SEQUENCE_OPERATIONS.map((op) => {
              const enabled = studioSettings.projectSequencing.operations.includes(op);
              const index = studioSettings.projectSequencing.operations.indexOf(op);
              return (
                <Card
                  key={op}
                  variant='subtle-compact'
                  padding='sm'
                  className={cn(
                    'flex items-center justify-between border-border/60 bg-card/30',
                    !enabled && 'opacity-50 grayscale'
                  )}
                >
                  <div className='flex items-center gap-3'>
                    <StatusBadge
                      status={index >= 0 ? `#${index + 1}` : 'N/A'}
                      variant={enabled ? 'info' : 'neutral'}
                      size='sm'
                      className='min-w-[2.5rem] font-mono'
                    />
                    <div>
                      <p className='text-xs font-medium text-white uppercase tracking-wider'>
                        {op.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    {enabled && (
                      <div className='flex items-center gap-1 border-r border-border/60 pr-2 mr-1'>
                        <Button
                          variant='ghost'
                          size='xs'
                          className='h-7 w-7 p-0'
                          onClick={() => moveProjectSequencingOperation(op, -1)}
                          disabled={index <= 0}
                          aria-label={`Move ${op.replace(/_/g, ' ')} up`}
                          title='Move operation up'
                        >
                          <ArrowUp className='size-3.5' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='xs'
                          className='h-7 w-7 p-0'
                          onClick={() => moveProjectSequencingOperation(op, 1)}
                          disabled={index >= studioSettings.projectSequencing.operations.length - 1}
                          aria-label={`Move ${op.replace(/_/g, ' ')} down`}
                          title='Move operation down'
                        >
                          <ArrowDown className='size-3.5' />
                        </Button>
                      </div>
                    )}
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => toggleProjectSequencingOperation(op, checked)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
          <Hint className='text-gray-500 italic'>
            Operations are executed top-to-bottom. Use arrows to reorder.
          </Hint>
        </div>
      </FormSection>
    </div>
  );
}
