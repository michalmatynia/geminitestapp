'use client';

import { Loader2, Zap, Cpu, Sparkles, Wand2 } from 'lucide-react';
import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { FormModal, Button, Label, Textarea } from '@/shared/ui';

import type {
  PromptExtractHistoryEntry,
  PromptExtractValidationIssue,
  PromptDiffLine,
  ParamUiControl,
} from '../studio-modals/prompt-extract-utils';

// TODO: These components should be moved to a shared location
function PromptExtractionHistoryPanel(props: {
  extractHistory: PromptExtractHistoryEntry[];
  selectedExtractHistory: PromptExtractHistoryEntry | null;
  selectedExtractDiffLines: PromptDiffLine[];
  selectedExtractChanged: boolean;
  onSelectExtractHistory: (id: string | null) => void;
  onClearHistory: () => void;
}): React.JSX.Element {
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
  extractHistory: PromptExtractHistoryEntry[];
  selectedExtractHistory: PromptExtractHistoryEntry | null;
  selectedExtractDiffLines: PromptDiffLine[];
  selectedExtractChanged: boolean;
  setSelectedExtractHistoryId: (id: string | null) => void;
  setExtractHistory: (history: PromptExtractHistoryEntry[]) => void;
  studioSettings: { promptExtraction: { showValidationSummary: boolean } };
  previewValidation: {
    before: PromptExtractValidationIssue[];
    after: PromptExtractValidationIssue[];
  } | null;
  previewLeaves: Array<{ path: string; value: unknown }>;
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
  const actions = (
    <>
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          handleSmartExtraction();
        }}
        disabled={extractBusy !== 'none'}
        className='gap-2'
      >
        {extractBusy === 'smart' ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <Zap className='size-4' />
        )}
        Smart
      </Button>
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          handleProgrammaticExtraction();
        }}
        disabled={extractBusy !== 'none'}
        className='gap-2'
      >
        {extractBusy === 'programmatic' ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <Cpu className='size-4' />
        )}
        Programmatic
      </Button>
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          handleAiExtraction();
        }}
        disabled={extractBusy !== 'none'}
        className='gap-2'
      >
        {extractBusy === 'ai' ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <Sparkles className='size-4' />
        )}
        AI Only
      </Button>
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          handleSuggestUiControls();
        }}
        disabled={!previewParams || extractBusy !== 'none'}
        className='gap-2'
      >
        {extractBusy === 'ui' ? (
          <Loader2 className='size-4 animate-spin' />
        ) : (
          <Wand2 className='size-4' />
        )}
        Suggest
      </Button>
    </>
  );

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title='Extract Prompt Params'
      size='xl'
      onSave={() => {
        handleApplyExtraction();
      }}
      isSaveDisabled={!previewParams}
      saveText='Apply Changes'
      actions={actions}
    >
      <div className='space-y-6'>
        <div className='space-y-2'>
          <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>Prompt Source</Label>
          <Textarea
            value={extractDraftPrompt}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setExtractDraftPrompt(event.target.value)}
            className='h-40 font-mono text-[11px] bg-black/20'
            placeholder='Paste prompt text with params object...'
          />
        </div>

        {extractError ? (
          <div className='rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive'>
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
          <div className='grid gap-4 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='font-bold uppercase tracking-wide text-cyan-400'>Validation Before: {previewValidation.before.length}</div>
              {previewValidation.before.length === 0 ? (
                <div className='text-cyan-100/50 italic'>No issues detected.</div>
              ) : (
                <div className='space-y-1.5'>
                  {previewValidation.before.slice(0, 6).map((issue, index) => (
                    <div key={`before-${issue.ruleId ?? index}`} className='rounded border border-cyan-500/10 bg-black/20 px-2 py-1.5'>
                      <div className='text-cyan-100 font-medium'>{issue.title ?? issue.ruleId ?? 'Issue'}</div>
                      <div className='text-cyan-100/60 leading-relaxed'>{issue.message ?? ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className='space-y-2'>
              <div className='font-bold uppercase tracking-wide text-cyan-400'>Validation After: {previewValidation.after.length}</div>
              {previewValidation.after.length === 0 ? (
                <div className='text-cyan-100/50 italic'>No issues detected.</div>
              ) : (
                <div className='space-y-1.5'>
                  {previewValidation.after.slice(0, 6).map((issue, index) => (
                    <div key={`after-${issue.ruleId ?? index}`} className='rounded border border-cyan-500/10 bg-black/20 px-2 py-1.5'>
                      <div className='text-cyan-100 font-medium'>{issue.title ?? issue.ruleId ?? 'Issue'}</div>
                      <div className='text-cyan-100/60 leading-relaxed'>{issue.message ?? ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className='space-y-2'>
          <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>Extracted Parameters</Label>
          {previewLeaves.length > 0 ? (
            <div className='max-h-80 overflow-auto rounded-lg border border-border/60 bg-black/20'>
              <table className='w-full text-left border-collapse'>
                <thead className='bg-muted/30 sticky top-0'>
                  <tr className='text-[10px] uppercase font-bold text-muted-foreground'>
                    <th className='px-4 py-2 border-b border-border/50'>Path</th>
                    <th className='px-4 py-2 border-b border-border/50'>Value</th>
                    <th className='px-4 py-2 border-b border-border/50'>Selector</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/40'>
                  {previewLeaves.map((leaf) => (
                    <tr key={leaf.path} className='text-[11px] hover:bg-white/5 transition-colors'>
                      <td className='px-4 py-2 font-mono text-gray-200 truncate max-w-[200px]' title={leaf.path}>{leaf.path}</td>
                      <td className='px-4 py-2 text-gray-300 truncate max-w-[200px]' title={JSON.stringify(leaf.value)}>
                        {typeof leaf.value === 'string' ? leaf.value : JSON.stringify(leaf.value)}
                      </td>
                      <td className='px-4 py-2 text-gray-400'>{previewControls[leaf.path] ?? 'auto'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='rounded-lg border border-dashed border-border bg-card/20 py-12 text-center text-xs text-muted-foreground italic'>
              No parameters extracted yet. Use one of the extraction methods above.
            </div>
          )}
        </div>
      </div>
    </FormModal>
  );
}
