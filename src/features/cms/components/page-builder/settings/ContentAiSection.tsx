'use client';

import React from 'react';

import { Button, Label, Textarea, SectionPanel, UnifiedSelect } from '@/shared/ui';

interface ContentAiSectionProps {
  selectedLabel: string;
  contentAiProvider: 'model' | 'agent';
  setContentAiProvider: (value: 'model' | 'agent') => void;
  contentAiModelId: string;
  setContentAiModelId: (value: string) => void;
  contentAiAgentId: string;
  setContentAiAgentId: (value: string) => void;
  contentAiPrompt: string;
  setContentAiPrompt: (value: string) => void;
  contentAiLoading: boolean;
  contentAiError: string | null;
  contentAiOutput: string;
  contentAiAllowedKeys: string[];
  contentAiPlaceholder: string;
  providerOptions: Array<{ label: string; value: string }>;
  modelOptions: string[];
  agentOptions: Array<{ label: string; value: string }>;
  onGenerateContentAi: () => void;
  onCancelContentAi: () => void;
  onApplyContentAi: () => void;
}

function ContentAiSection({
  selectedLabel,
  contentAiProvider,
  setContentAiProvider,
  contentAiModelId,
  setContentAiModelId,
  contentAiAgentId,
  setContentAiAgentId,
  contentAiPrompt,
  setContentAiPrompt,
  contentAiLoading,
  contentAiError,
  contentAiOutput,
  contentAiAllowedKeys,
  contentAiPlaceholder,
  providerOptions,
  modelOptions,
  agentOptions,
  onGenerateContentAi,
  onCancelContentAi,
  onApplyContentAi,
}: ContentAiSectionProps): React.ReactNode {
  return (
    <div className="space-y-3">
      <div className="rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400">
        AI content for <span className="text-gray-200">{selectedLabel}</span>
      </div>
      <SectionPanel variant="subtle-compact" className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-gray-400">
            Content AI
          </Label>
          <span className="text-[10px] text-gray-500">JSON output</span>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400">Provider</Label>
          <UnifiedSelect
            value={contentAiProvider}
            onValueChange={(value: string): void => setContentAiProvider(value as 'model' | 'agent')}
            options={providerOptions}
            placeholder="Select provider"
          />
        </div>
        {contentAiProvider !== 'agent' ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Model</Label>
            <UnifiedSelect
              value={contentAiModelId}
              onValueChange={(value: string): void => setContentAiModelId(value)}
              options={modelOptions.map((model: string) => ({ value: model, label: model }))}
              placeholder={modelOptions.length ? 'Select model' : 'No models available'}
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs text-gray-400">Deepthinking agent</Label>
            <UnifiedSelect
              value={contentAiAgentId}
              onValueChange={(value: string): void => setContentAiAgentId(value)}
              options={agentOptions.length ? agentOptions : [{ label: 'No agents configured', value: '' }]}
              placeholder={agentOptions.length ? 'Select agent' : 'No agents configured'}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-400">Prompt</Label>
          <Textarea
            value={contentAiPrompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void =>
              setContentAiPrompt(e.target.value)
            }
            placeholder={`Describe the content you want.\n\nContext:\n${contentAiPlaceholder}`}
            className="min-h-[120px] text-xs"
            spellCheck={false}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-gray-500">Context placeholders</div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(): void => {
              const current = contentAiPrompt.trim();
              const nextPrompt = current.length ? `${current}\n\n${contentAiPlaceholder}` : contentAiPlaceholder;
              setContentAiPrompt(nextPrompt);
            }}
          >
            Insert placeholders
          </Button>
        </div>
        <Textarea
          value={contentAiPlaceholder}
          readOnly
          className="min-h-[64px] text-xs font-mono text-gray-300"
        />
        <div className="text-[11px] text-gray-500">
          <span className="font-mono text-gray-300">allowed_keys</span> = {contentAiAllowedKeys.length ? contentAiAllowedKeys.join(', ') : 'No keys available.'}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            onClick={(): void => void onGenerateContentAi()}
            disabled={contentAiLoading}
          >
            {contentAiLoading ? 'Generating\u2026' : 'Generate JSON'}
          </Button>
          {contentAiLoading && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancelContentAi}
            >
              Cancel
            </Button>
          )}
        </div>
        {contentAiError && (
          <div className="text-xs text-red-400">{contentAiError}</div>
        )}
        {contentAiOutput && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-400">AI output</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onApplyContentAi}
              >
                Apply to settings
              </Button>
            </div>
            <Textarea
              value={contentAiOutput}
              readOnly
              className="min-h-[140px] text-xs font-mono text-gray-300"
            />
          </div>
        )}
      </SectionPanel>
    </div>
  );
}

export { ContentAiSection };
