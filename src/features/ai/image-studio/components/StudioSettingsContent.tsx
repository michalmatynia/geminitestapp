'use client';

import { RefreshCcw } from 'lucide-react';
import React, { useState } from 'react';

import {
  Button,
  Input,
  Label,
  SectionHeader,
  Textarea,
  SelectSimple,
} from '@/shared/ui';

import { useSettings } from '../context/SettingsContext';

export function StudioSettingsContent(): React.JSX.Element {
  const {
    studioSettings,
    setStudioSettings,
    saveStudioSettings,
    resetStudioSettings,
    handleRefreshSettings,
    settingsLoaded,
  } = useSettings();

  const [advancedOverridesText, setAdvancedOverridesText] = useState<string>(
    JSON.stringify(studioSettings.targetAi.openai.advanced_overrides ?? {}, null, 2)
  );
  const [advancedOverridesError, setAdvancedOverridesError] = useState<string | null>(null);

  const handleAdvancedOverridesChange = (raw: string): void => {
    setAdvancedOverridesText(raw);
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null) {
        setAdvancedOverridesError(null);
        setStudioSettings((prev) => ({
          ...prev,
          targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, advanced_overrides: null } },
        }));
        return;
      }
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setAdvancedOverridesError('Must be a JSON object (or null).');
        return;
      }
      setAdvancedOverridesError(null);
      setStudioSettings((prev) => ({
        ...prev,
        targetAi: {
          ...prev.targetAi,
          openai: { ...prev.targetAi.openai, advanced_overrides: parsed as Record<string, unknown> },
        },
      }));
    } catch {
      setAdvancedOverridesError('Invalid JSON.');
    }
  };

  return (
    <div className='rounded border border-border bg-card/40 overflow-hidden'>
      <SectionHeader
        title='Studio Settings'
        size='xs'
        className='p-3 border-b border-border'
        actions={(
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='xs'
              onClick={handleRefreshSettings}
              title='Reload settings'
            >
              <RefreshCcw className='mr-2 size-4' />
              Refresh
            </Button>
            <Button
              variant='outline'
              size='xs'
              onClick={resetStudioSettings}
            >
              Reset
            </Button>
            <Button
              size='xs'
              variant='default'
              onClick={() => void saveStudioSettings({ silent: false })}
              disabled={Boolean(advancedOverridesError)}
              className='min-w-[80px]'
            >
              Save
            </Button>
          </div>
        )}
      />

      <div className='p-3 space-y-4'>
        {!settingsLoaded ? (
          <div className='text-xs text-gray-500'>Loading settings…</div>
        ) : null}

        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>Prompt Extraction</Label>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <div className='text-[11px] text-gray-500'>Mode</div>
              <SelectSimple
                value={studioSettings.promptExtraction.mode}
                onValueChange={(value: string) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    promptExtraction: {
                      ...prev.promptExtraction,
                      mode: value === 'gpt' || value === 'hybrid' ? value : 'programmatic',
                    },
                  }))
                }
                options={[
                  { value: 'programmatic', label: 'Programmatic' },
                  { value: 'gpt', label: 'GPT (AI)' },
                  { value: 'hybrid', label: 'Hybrid (Auto Fallback)' },
                ]}
                size='sm'
                ariaLabel='Prompt extraction mode'
              />
            </div>

            <div className='space-y-1'>
              <div className='text-[11px] text-gray-500'>Model</div>
              <Input
                value={studioSettings.promptExtraction.gpt.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    promptExtraction: {
                      ...prev.promptExtraction,
                      gpt: { ...prev.promptExtraction.gpt, model: e.target.value },
                    },
                  }))
                }
                size='sm'
                placeholder='e.g. gpt-4o-mini'
              />
            </div>
          </div>
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
            <label className='flex items-center gap-2 rounded border border-border/40 bg-foreground/5 px-3 py-2 text-[11px] text-gray-300'>
              <input
                type='checkbox'
                className='h-3.5 w-3.5'
                checked={studioSettings.promptExtraction.applyAutofix}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    promptExtraction: {
                      ...prev.promptExtraction,
                      applyAutofix: event.target.checked,
                    },
                  }))
                }
              />
              Apply formatter before extract
            </label>
            <label className='flex items-center gap-2 rounded border border-border/40 bg-foreground/5 px-3 py-2 text-[11px] text-gray-300'>
              <input
                type='checkbox'
                className='h-3.5 w-3.5'
                checked={studioSettings.promptExtraction.autoApplyFormattedPrompt}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    promptExtraction: {
                      ...prev.promptExtraction,
                      autoApplyFormattedPrompt: event.target.checked,
                    },
                  }))
                }
              />
              Auto-apply formatted prompt
            </label>
            <label className='flex items-center gap-2 rounded border border-border/40 bg-foreground/5 px-3 py-2 text-[11px] text-gray-300'>
              <input
                type='checkbox'
                className='h-3.5 w-3.5'
                checked={studioSettings.promptExtraction.showValidationSummary}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    promptExtraction: {
                      ...prev.promptExtraction,
                      showValidationSummary: event.target.checked,
                    },
                  }))
                }
              />
              Show validation summary
            </label>
          </div>
        </div>

        {/* AI Extractor Settings */}
        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>UI Extractor</Label>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <div className='text-[11px] text-gray-500'>Mode</div>
              <SelectSimple
                value={studioSettings.uiExtractor.mode}
                onValueChange={(value: string) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    uiExtractor: {
                      ...prev.uiExtractor,
                      mode: value === 'ai' || value === 'both' ? value : 'heuristic',
                    },
                  }))
                }
                options={[
                  { value: 'heuristic', label: 'Heuristic' },
                  { value: 'ai', label: 'AI' },
                  { value: 'both', label: 'Both' },
                ]}
                size='sm'
                ariaLabel='UI extractor mode'
              />
            </div>
            <div className='space-y-1'>
              <div className='text-[11px] text-gray-500'>Model</div>
              <Input
                value={studioSettings.uiExtractor.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    uiExtractor: { ...prev.uiExtractor, model: e.target.value },
                  }))
                }
                size='sm'
                placeholder='e.g. gpt-4o-mini'
              />
            </div>
          </div>
        </div>

        {/* OpenAI Options */}
        <div className='space-y-2'>
          <Label className='text-xs text-gray-400'>Target AI (OpenAI / GPT)</Label>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <div className='text-[11px] text-gray-500'>API</div>
              <SelectSimple
                value={studioSettings.targetAi.openai.api}
                onValueChange={(value: string) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, api: value === 'responses' ? 'responses' : 'images' } },
                  }))
                }
                options={[
                  { value: 'images', label: 'Images' },
                  { value: 'responses', label: 'Responses' },
                ]}
                size='sm'
                ariaLabel='OpenAI API mode'
              />
            </div>
            <div className='space-y-1'>
              <div className='text-[11px] text-gray-500'>Model</div>
              <Input
                value={studioSettings.targetAi.openai.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, model: e.target.value } },
                  }))
                }
                size='sm'
              />
            </div>
          </div>
        </div>

        <div className='space-y-1'>
          <div className='text-[11px] text-gray-500'>Advanced Overrides (JSON)</div>
          <Textarea
            value={advancedOverridesText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAdvancedOverridesChange(e.target.value)}
            className='h-28 font-mono text-[11px]'
            size='sm'
          />
          {advancedOverridesError ? (
            <div className='text-[11px] text-red-300'>{advancedOverridesError}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
