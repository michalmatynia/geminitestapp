'use client';

import React from 'react';
import { Button, Label, Textarea, ToggleRow, Tooltip } from '@/shared/ui';
import type { RegexConfig, AiNode } from '@/shared/lib/ai-paths';

export type RegexAiPromptSectionProps = {
  regexConfig: RegexConfig;
  onUpdateRegex: (patch: Partial<RegexConfig>) => void;
  connectedModel: {
    modelNode: AiNode | null | undefined;
    modelLabel?: string;
    usesBrainDefault?: boolean;
    isStale?: boolean;
  };
  onSendToAi?: (nodeId: string, prompt: string) => void | Promise<void>;
  sendingToAi: boolean;
  resolvedAiPrompt: string;
  nodeId: string;
  placeholderTooltips: {
    text: string;
    lines: string;
    value: string;
  };
};

export function RegexAiPromptSection(props: RegexAiPromptSectionProps): React.JSX.Element {
  const {
    regexConfig,
    onUpdateRegex,
    connectedModel,
    onSendToAi,
    sendingToAi,
    resolvedAiPrompt,
    nodeId,
    placeholderTooltips,
  } = props;

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <Label className='text-xs text-gray-400'>AI Prompt (Output to AI Model)</Label>
        {connectedModel.modelNode ? (
          <div className='text-[11px] text-emerald-200'>
            Connected:{' '}
            <span className='text-emerald-100'>{connectedModel.modelLabel || 'Model'}</span>
            {connectedModel.usesBrainDefault ? ' (AI Brain default)' : ''}
            {connectedModel.isStale ? ' (not currently in Brain catalog)' : ''}
          </div>
        ) : (
          <div className='text-[11px] text-amber-200'>Not connected to AI Model</div>
        )}
      </div>
      <ToggleRow
        variant='switch'
        label='Auto-run AI prompt'
        description="When off, Regex won't auto-trigger the model during path runs."
        checked={regexConfig.aiAutoRun ?? false}
        onCheckedChange={(checked: boolean) => onUpdateRegex({ aiAutoRun: checked })}
      />

      <Textarea
        className='min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
        value={regexConfig.aiPrompt ?? ''}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
          onUpdateRegex({ aiPrompt: event.target.value })
        }
        onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            if (!onSendToAi || !resolvedAiPrompt.trim() || sendingToAi) return;
            void onSendToAi(nodeId, resolvedAiPrompt);
          }
        }}
        placeholder='Ask the model to propose a regex. Use {{text}} / {{lines}} placeholders. (Ctrl+Enter to send)'
      />

      <div className='flex flex-wrap items-center gap-2 text-[11px] text-gray-400'>
        <span>Placeholders:</span>
        <Tooltip content={placeholderTooltips.text} side='bottom'>
          <span
            tabIndex={0}
            className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
            title={placeholderTooltips.text}
          >
            {'{{text}}'}
          </span>
        </Tooltip>
        <Tooltip content={placeholderTooltips.lines} side='bottom'>
          <span
            tabIndex={0}
            className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
            title={placeholderTooltips.lines}
          >
            {'{{lines}}'}
          </span>
        </Tooltip>
        <Tooltip content={placeholderTooltips.value} side='bottom'>
          <span
            tabIndex={0}
            className='rounded-full border px-2 py-0.5 text-[10px] text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
            title={placeholderTooltips.value}
          >
            {'{{value}}'}
          </span>
        </Tooltip>
      </div>

      <div className='flex flex-wrap gap-2'>
        {onSendToAi ? (
          <Button
            type='button'
            className='h-8 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 text-[11px] text-sky-200 hover:bg-sky-500/20 disabled:opacity-50'
            disabled={sendingToAi || !resolvedAiPrompt.trim()}
            onClick={() => {
              void onSendToAi(nodeId, resolvedAiPrompt);
            }}
          >
            {sendingToAi ? 'Sending...' : 'Send to AI Model'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
