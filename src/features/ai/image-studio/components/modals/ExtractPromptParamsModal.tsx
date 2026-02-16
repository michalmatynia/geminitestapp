'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { AppModal, Button, Label, Textarea } from '@/shared/ui';

// TODO: These types should be defined in a more central place
type ParamUiControl =
  | 'auto'
  | 'checkbox'
  | 'buttons'
  | 'select'
  | 'slider'
  | 'number'
  | 'text'
  | 'textarea'
  | 'json'
  | 'rgb'
  | 'tuple2';

// TODO: These components should be moved to a shared location
function PromptExtractionHistoryPanel(props: any): React.JSX.Element {
  console.log('PromptExtractionHistoryPanel props:', props);
  return <div>PromptExtractionHistoryPanel</div>;
}

interface ExtractPromptParamsModalProps extends ModalStateProps {
  extractDraftPrompt: string;
  setExtractDraftPrompt: (prompt: string) => void;
  extractBusy: 'none' | 'programmatic' | 'smart' | 'ai' | 'ui';
  handleSmartExtraction: () => void;
  handleProgrammaticExtraction: () => void;
  handleAiExtraction: () => void;
  handleSuggestUiControls: () => void;
  handleApplyExtraction: () => void;
  previewParams: Record<string, unknown> | null;
  extractError: string | null;
  extractHistory: any[];
  selectedExtractHistory: any;
  selectedExtractDiffLines: any[];
  selectedExtractChanged: boolean;
  setSelectedExtractHistoryId: (id: string | null) => void;
  setExtractHistory: (history: any[]) => void;
  studioSettings: { promptExtraction: { showValidationSummary: boolean } };
  previewValidation: {
    before: any[];
    after: any[];
  } | null;
  previewLeaves: Array<{ path: string, value: unknown }>;
  previewControls: Record<string, ParamUiControl>;
}

export function ExtractPromptParamsModal({
  isOpen,
  onClose,
  extractDraftPrompt,
  setExtractDraftPrompt,
  extractBusy,
  handleSmartExtraction,
  handleProgrammaticExtraction,
  handleAiExtraction,
  handleSuggestUiControls,
  handleApplyExtraction,
  previewParams,
  extractError,
  extractHistory,
  selectedExtractHistory,
  selectedExtractDiffLines,
  selectedExtractChanged,
  setSelectedExtractHistoryId,
  setExtractHistory,
  studioSettings,
  previewValidation,
  previewLeaves,
  previewControls,
}: ExtractPromptParamsModalProps): React.JSX.Element {
  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title='Extract Prompt Params'
      size='xl'
    >
      <div className='space-y-4'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Prompt Source</Label>
          <Textarea
            size='sm'
            value={extractDraftPrompt}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setExtractDraftPrompt(event.target.value)}
            className='h-36 font-mono text-[11px]'
            placeholder='Paste prompt text with params object...'
          />
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button
            size='xs'
            type='button'
            onClick={() => {
              void handleSmartExtraction();
            }}
            disabled={extractBusy !== 'none'}
          >
            {extractBusy === 'smart' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            Smart Extract
          </Button>
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              void handleProgrammaticExtraction();
            }}
            disabled={extractBusy !== 'none'}
          >
            {extractBusy === 'programmatic' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            Programmatic Extract
          </Button>
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              void handleAiExtraction();
            }}
            disabled={extractBusy !== 'none'}
          >
            {extractBusy === 'ai' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            AI Only
          </Button>
          <Button
            size='xs'
            type='button'
            variant='outline'
            onClick={() => {
              void handleSuggestUiControls();
            }}
            disabled={!previewParams || extractBusy !== 'none'}
          >
            {extractBusy === 'ui' ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
            Suggest Selectors
          </Button>
          <Button size='xs' type='button' onClick={handleApplyExtraction} disabled={!previewParams}>
            Apply
          </Button>
        </div>

        {extractError ? (
          <div className='rounded border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200'>
            {extractError}
          </div>
        ) : null}

        {extractHistory.length > 0 ? (
          <PromptExtractionHistoryPanel
            extractHistory={extractHistory}
            selectedExtractHistory={selectedExtractHistory}
            selectedExtractDiffLines={selectedExtractDiffLines}
            selectedExtractChanged={selectedExtractChanged}
            onSelectExtractHistory={setSelectedExtractHistoryId}
            onClearHistory={() => {
              setExtractHistory([]);
              setSelectedExtractHistoryId(null);
            }}
          />
        ) : null}

        {studioSettings.promptExtraction.showValidationSummary && previewValidation ? (
          <div className='grid gap-2 rounded border border-cyan-500/35 bg-cyan-500/5 p-3 text-xs text-cyan-100 md:grid-cols-2'>
            <div className='space-y-1'>
              <div className='font-medium text-cyan-200'>Validation Before: {previewValidation.before.length}</div>
              {previewValidation.before.length === 0 ? (
                <div className='text-cyan-100/70'>No issues.</div>
              ) : (
                <div className='space-y-1'>
                  {previewValidation.before.slice(0, 6).map((issue, index) => (
                    <div key={`before-${issue.ruleId ?? index}`} className='rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1'>
                      <div className='text-cyan-100'>{issue.title ?? issue.ruleId ?? 'Issue'}</div>
                      <div className='text-cyan-100/70'>{issue.message ?? ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className='space-y-1'>
              <div className='font-medium text-cyan-200'>Validation After: {previewValidation.after.length}</div>
              {previewValidation.after.length === 0 ? (
                <div className='text-cyan-100/70'>No issues.</div>
              ) : (
                <div className='space-y-1'>
                  {previewValidation.after.slice(0, 6).map((issue, index) => (
                    <div key={`after-${issue.ruleId ?? index}`} className='rounded border border-cyan-500/20 bg-cyan-500/5 px-2 py-1'>
                      <div className='text-cyan-100'>{issue.title ?? issue.ruleId ?? 'Issue'}</div>
                      <div className='text-cyan-100/70'>{issue.message ?? ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        {previewLeaves.length > 0 ? (
          <div className='max-h-72 overflow-auto rounded border border-border/60 bg-card/50'>
            <div className='grid grid-cols-[1.6fr_1fr_1fr] gap-2 border-b border-border/50 px-3 py-2 text-[11px] text-gray-400'>
              <div>Path</div>
              <div>Value</div>
              <div>Selector</div>
            </div>
            <div className='divide-y divide-border/40'>
              {previewLeaves.map((leaf) => (
                <div
                  key={leaf.path}
                  className='grid grid-cols-[1.6fr_1fr_1fr] gap-2 px-3 py-2 text-[11px]'
                >
                  <div className='truncate font-mono text-gray-200' title={leaf.path}>
                    {leaf.path}
                  </div>
                  <div className='truncate text-gray-300' title={JSON.stringify(leaf.value)}>
                    {typeof leaf.value === 'string' ? leaf.value : JSON.stringify(leaf.value)}
                  </div>
                  <div className='truncate text-gray-400'>
                    {previewControls[leaf.path] ?? 'auto'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className='text-xs text-gray-500'>
            Extracted params will appear here.
          </div>
        )}
      </div>
    </AppModal>
  );
}
