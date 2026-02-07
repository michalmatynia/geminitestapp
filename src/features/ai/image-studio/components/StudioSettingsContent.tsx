'use client';

import { RefreshCcw } from 'lucide-react';
import React, { useState } from 'react';

import { useUpdateSetting } from '@/shared/hooks/use-settings';
import {
  Button,
  Input,
  Label,
  PanelHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/ui';

import { useImageStudio } from '../context/ImageStudioContext';

export function StudioSettingsContent(): React.JSX.Element {
  const {
    studioSettings,
    setStudioSettings,
    saveStudioSettings,
    resetStudioSettings,
    handleRefreshSettings,
    settingsLoaded,
  } = useImageStudio();

  const _updateSetting = useUpdateSetting();

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
    <div className="rounded border border-border bg-card/40 overflow-hidden">
      <PanelHeader
        title="Studio Settings"
        actions={(
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshSettings}
              title="Reload settings"
            >
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetStudioSettings}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => void saveStudioSettings()}
              disabled={Boolean(advancedOverridesError)}
            >
              Save
            </Button>
          </div>
        )}
      />

      <div className="p-3 space-y-4">
        {!settingsLoaded ? (
          <div className="text-xs text-gray-500">Loading settings…</div>
        ) : null}

        <div className="space-y-2">
          <Label className="text-xs text-gray-400">Prompt Extraction</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Mode</div>
              <Select
                value={studioSettings.promptExtraction.mode}
                onValueChange={(value: string) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    promptExtraction: {
                      ...prev.promptExtraction,
                      mode: value === 'gpt' ? 'gpt' : 'programmatic',
                    },
                  }))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programmatic">Programmatic</SelectItem>
                  <SelectItem value="gpt">GPT (AI)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Model</div>
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
                className="h-8"
                placeholder="e.g. gpt-4o-mini"
              />
            </div>
          </div>
        </div>

        {/* AI Extractor Settings */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-400">UI Extractor</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Mode</div>
              <Select
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
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heuristic">Heuristic</SelectItem>
                  <SelectItem value="ai">AI</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Model</div>
              <Input
                value={studioSettings.uiExtractor.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    uiExtractor: { ...prev.uiExtractor, model: e.target.value },
                  }))
                }
                className="h-8"
                placeholder="e.g. gpt-4o-mini"
              />
            </div>
          </div>
        </div>

        {/* OpenAI Options */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-400">Target AI (OpenAI / GPT)</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">API</div>
              <Select
                value={studioSettings.targetAi.openai.api}
                onValueChange={(value: string) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, api: value === 'responses' ? 'responses' : 'images' } },
                  }))
                }
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="images">Images</SelectItem>
                  <SelectItem value="responses">Responses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500">Model</div>
              <Input
                value={studioSettings.targetAi.openai.model}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    targetAi: { ...prev.targetAi, openai: { ...prev.targetAi.openai, model: e.target.value } },
                  }))
                }
                className="h-8"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] text-gray-500">Advanced Overrides (JSON)</div>
          <Textarea
            value={advancedOverridesText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleAdvancedOverridesChange(e.target.value)}
            className="h-28 font-mono text-[11px]"
          />
          {advancedOverridesError ? (
            <div className="text-[11px] text-red-300">{advancedOverridesError}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
