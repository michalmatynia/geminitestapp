'use client';

import { Zap, Cpu, Sparkles, Wand2 } from 'lucide-react';
import React from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui';
import { FormModal, Label, StandardDataTablePanel, EmptyState } from '@/shared/ui';

import { PromptExtractionHistoryPanel } from '../studio-modals/PromptExtractionHistoryPanel';
import { useStudioInlineEdit } from '../studio-modals/StudioInlineEditContext';
import { StudioActionButtonRow, type StudioActionButtonConfig } from './StudioActionButtonRow';
import { StudioPromptTextSection } from './StudioPromptTextSection';
import type { ColumnDef } from '@tanstack/react-table';

export function ExtractPromptParamsModal(props: ModalStateProps): React.JSX.Element {
  const { isOpen, onClose } = props;

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
          <div
            className='text-gray-300 truncate max-w-[200px]'
            title={JSON.stringify(row.original.value)}
          >
            {typeof row.original.value === 'string'
              ? row.original.value
              : JSON.stringify(row.original.value)}
          </div>
        ),
      },
      {
        id: 'selector',
        header: 'Selector',
        cell: ({ row }) => (
          <div className='text-gray-400'>{previewControls[row.original.path] ?? 'auto'}</div>
        ),
      },
    ],
    [previewControls]
  );

  const actionButtons = React.useMemo<StudioActionButtonConfig[]>(
    () => [
      {
        key: 'smart-extract',
        label: 'Smart',
        onClick: () => {
          void handleSmartExtraction();
        },
        disabled: extractBusy !== 'none',
        loading: extractBusy === 'smart',
        icon: <Zap className='size-4' />,
      },
      {
        key: 'programmatic-extract',
        label: 'Programmatic',
        onClick: () => {
          void handleProgrammaticExtraction();
        },
        disabled: extractBusy !== 'none',
        loading: extractBusy === 'programmatic',
        icon: <Cpu className='size-4' />,
      },
      {
        key: 'ai-extract',
        label: 'AI Only',
        onClick: () => {
          void handleAiExtraction();
        },
        disabled: extractBusy !== 'none',
        loading: extractBusy === 'ai',
        icon: <Sparkles className='size-4' />,
      },
      {
        key: 'suggest-controls',
        label: 'Suggest',
        onClick: () => {
          void handleSuggestUiControls();
        },
        disabled: !previewParams || extractBusy !== 'none',
        loading: extractBusy === 'ui',
        icon: <Wand2 className='size-4' />,
      },
    ],
    [
      extractBusy,
      handleAiExtraction,
      handleProgrammaticExtraction,
      handleSmartExtraction,
      handleSuggestUiControls,
      previewParams,
    ]
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
      actions={<StudioActionButtonRow actions={actionButtons} />}
    >
      <div className='space-y-6'>
        <StudioPromptTextSection
          label='Prompt Source'
          value={extractDraftPrompt}
          onValueChange={setExtractDraftPrompt}
          labelClassName='font-bold uppercase tracking-wider text-muted-foreground ml-1'
          textareaClassName='h-40 bg-black/20'
          placeholder='Paste prompt text with params object...'
        />

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
              <div className='font-bold uppercase tracking-wide text-cyan-400'>
                Validation Before: {previewValidation.before.length}
              </div>
              {previewValidation.before.length === 0 ? (
                <div className='text-cyan-100/50 italic'>No issues detected.</div>
              ) : (
                <div className='space-y-1.5'>
                  {previewValidation.before.slice(0, 6).map((issue, index) => (
                    <div
                      key={`before-${issue.ruleId ?? index}`}
                      className='rounded border border-cyan-500/10 bg-black/20 px-2 py-1.5'
                    >
                      <div className='text-cyan-100 font-medium'>
                        {issue.title ?? issue.ruleId ?? 'Issue'}
                      </div>
                      <div className='text-cyan-100/60 leading-relaxed'>{issue.message ?? ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className='space-y-2'>
              <div className='font-bold uppercase tracking-wide text-cyan-400'>
                Validation After: {previewValidation.after.length}
              </div>
              {previewValidation.after.length === 0 ? (
                <div className='text-cyan-100/50 italic'>No issues detected.</div>
              ) : (
                <div className='space-y-1.5'>
                  {previewValidation.after.slice(0, 6).map((issue, index) => (
                    <div
                      key={`after-${issue.ruleId ?? index}`}
                      className='rounded border border-cyan-500/10 bg-black/20 px-2 py-1.5'
                    >
                      <div className='text-cyan-100 font-medium'>
                        {issue.title ?? issue.ruleId ?? 'Issue'}
                      </div>
                      <div className='text-cyan-100/60 leading-relaxed'>{issue.message ?? ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className='space-y-2'>
          <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>
            Extracted Parameters
          </Label>
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
