'use client';

import { Loader2, Zap, Cpu, Sparkles, Wand2 } from 'lucide-react';
import React from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui';
import { FormModal, Button, Label, Textarea, StandardDataTablePanel, EmptyState } from '@/shared/ui';

import type {
  PromptExtractHistoryEntry,
  PromptDiffLine,
} from '../studio-modals/prompt-extract-utils';
import { useStudioInlineEdit } from '../studio-modals/StudioInlineEditContext';
import type { ColumnDef } from '@tanstack/react-table';

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

export function ExtractPromptParamsModal({
  isOpen,
  onClose,
}: ModalStateProps): React.JSX.Element {
  const {
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
  } = useStudioInlineEdit();

  const columns = React.useMemo<ColumnDef<{ path: string; value: unknown }>[]>(
    () => [
      {
        accessorKey: 'path',
        header: 'Path',
        cell: ({ row }) => (
          <div className='font-mono text-gray-200 truncate max-w-[200px]' title={row.original.path}>
            {row.original.path}
          </div>
        ),
      },
      {
        accessorKey: 'value',
        header: 'Value',
        cell: ({ row }) => (
          <div className='text-gray-300 truncate max-w-[200px]' title={JSON.stringify(row.original.value)}>
            {typeof row.original.value === 'string' ? row.original.value : JSON.stringify(row.original.value)}
          </div>
        ),
      },
      {
        id: 'selector',
        header: 'Selector',
        cell: ({ row }) => <div className='text-gray-400'>{previewControls[row.original.path] ?? 'auto'}</div>,
      },
    ],
    [previewControls]
  );

  const actions = (
    <>
      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          void handleSmartExtraction();
        }}
        disabled={extractBusy !== 'none'}
        className='gap-2'
        loading={extractBusy === 'smart'}
      >
        <Zap className='size-4' />
                Smart
      </Button>      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          void handleProgrammaticExtraction();
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
          void handleAiExtraction();
        }}
        disabled={extractBusy !== 'none'}
        className='gap-2'
        loading={extractBusy === 'ai'}
      >
        <Sparkles className='size-4' />
                AI Only
      </Button>      <Button
        size='sm'
        variant='outline'
        onClick={() => {
          void handleSuggestUiControls();
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
            <StandardDataTablePanel
              columns={columns}
              data={previewLeaves}
              variant='flat'
              maxHeight='20rem'
            />
          ) : (
            <EmptyState
              title='No parameters'
              description='No parameters extracted yet. Use one of the extraction methods above.'
              variant='compact'
              className='bg-card/20 border-dashed border-border py-12'
            />
          )}
        </div>
      </div>
    </FormModal>
  );
}
