'use client';

import React from 'react';
import { Link2, Plus, Trash2 } from 'lucide-react';

import {
  Button,
  Card,
  EmptyState,
  FormSection,
  Hint,
  Input,
  Label,
  SelectSimple,
  SimpleSettingsList,
  Textarea,
  useToast,
} from '@/shared/ui';

import { SegmentDetailEditor } from '../../components/segment-editor/SegmentDetailEditor';
import { PromptExploderSegmentsTreeEditor } from '../../components/tree/PromptExploderSegmentsTreeEditor';
import { useBindingsActions, useBindingsState } from '../../context/BindingsContext';
import { useDocumentActions, useDocumentState } from '../../context/DocumentContext';
import { useLibraryActions, useLibraryState } from '../../context/LibraryContext';
import { useSettingsState } from '../../context/SettingsContext';
import { promptExploderFormatTimestamp } from '../../helpers/formatting';
import { promptExploderFormatSubsectionLabel } from '../../helpers/segment-helpers';
import { BINDING_TYPE_OPTIONS } from './PromptExploder.Constants';
import type { PromptExploderLibraryItem } from '../../prompt-library';
import type {
  PromptExploderBinding,
  PromptExploderSubsection,
  PromptExploderBindingType,
} from '../../types';

export function SourcePromptPanel(): React.JSX.Element {
  const { promptText, returnTarget } = useDocumentState();
  const { setPromptText, handleExplode, handleApplyToImageStudio } = useDocumentActions();
  const { captureSegmentationRecordOnApply } = useLibraryActions();
  const { runtimeGuardrailIssue, promptExploderSettings } = useSettingsState();
  const { toast } = useToast();
  const caseResolverExtractionModeLabel =
    promptExploderSettings.runtime.caseResolverExtractionMode === 'rules_with_heuristics'
      ? 'Rules + Heuristics'
      : 'Rules Only';

  const handleApply = async (): Promise<void> => {
    const captureResult = await captureSegmentationRecordOnApply();
    if (!captureResult.captured) {
      toast('Segmentation context capture skipped (missing prompt or document).', {
        variant: 'warning',
      });
    }
    await handleApplyToImageStudio();
  };

  return (
    <FormSection
      title='Source Prompt'
      description='Paste a prompt and explode it into structured segments.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex items-center gap-2'>
          <Button type='button' onClick={handleExplode} disabled={Boolean(runtimeGuardrailIssue)}>
            Explode Prompt
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleApply();
            }}
          >
            {returnTarget === 'case-resolver' ? 'Apply to Case Resolver' : 'Apply to Image Studio'}
          </Button>
        </div>
      }
    >
      <div className='mt-3 space-y-2'>
        {runtimeGuardrailIssue ? (
          <Card variant='danger' padding='sm' className='border-rose-500/40 text-xs'>
            {runtimeGuardrailIssue}
          </Card>
        ) : null}
        {returnTarget === 'case-resolver' ? (
          <Card
            variant='info'
            padding='sm'
            className='border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-100'
          >
            Case Resolver extraction mode: {caseResolverExtractionModeLabel}
          </Card>
        ) : null}
        <Textarea
          className='min-h-[280px] font-mono text-[12px]'
          value={promptText}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
            setPromptText(event.target.value);
          }}
          aria-label='Source prompt'
          placeholder='Paste prompt text...'
         title='Paste prompt text...'/>
      </div>
    </FormSection>
  );
}

export function ExplosionMetricsPanel(): React.JSX.Element {
  const { explosionMetrics } = useDocumentState();

  return (
    <FormSection
      title='Explosion Metrics'
      description='Observability metrics for current segmentation quality.'
      variant='subtle'
      className='p-4'
    >
      {!explosionMetrics ? (
        <div className='text-xs text-gray-500'>Run Prompt Exploder to generate metrics.</div>
      ) : (
        <div className='space-y-2 text-xs text-gray-300'>
          <div>
            Segments: {explosionMetrics.total} · avg confidence{' '}
            {(explosionMetrics.avgConfidence * 100).toFixed(1)}% · low confidence ({'<'}
            {explosionMetrics.lowConfidenceThreshold.toFixed(2)}):{' '}
            {explosionMetrics.lowConfidenceCount}
          </div>
          <div>Typed coverage: {(explosionMetrics.typedCoverage * 100).toFixed(1)}%</div>
          <div className='rounded border border-border/50 bg-card/20 p-2'>
            {Object.entries(explosionMetrics.typeCounts)
              .sort((left, right) => (right[1] as any) - (left[1] as any))
              .map(([type, count]) => (
                <div key={type}>
                  {type}: {count as any}
                </div>
              ))}
          </div>
        </div>
      )}
    </FormSection>
  );
}

export function WarningsPanel(): React.JSX.Element {
  const { documentState } = useDocumentState();

  return (
    <FormSection
      title='Warnings'
      description='Quality checks from the exploder runtime.'
      variant='subtle'
      className='p-4'
    >
      {!documentState?.warnings || documentState.warnings.length === 0 ? (
        <div className='text-xs text-gray-500'>No warnings.</div>
      ) : (
        <Card variant='warning' padding='md' className='border-amber-500/20'>
          <ul className='list-disc pl-5 text-xs text-amber-200'>
            {documentState.warnings.map((warning: unknown) => (
              <li key={String(warning)}>{String(warning)}</li>
            ))}
          </ul>
        </Card>
      )}
    </FormSection>
  );
}

export function PromptProjectsPanel(): React.JSX.Element {
  const { promptText, documentState } = useDocumentState();
  const { isBusy } = useSettingsState();
  const { selectedLibraryItemId, libraryNameDraft, promptLibraryItems, selectedLibraryItem } =
    useLibraryState();
  const {
    setLibraryNameDraft,
    handleNewLibraryEntry,
    handleSaveLibraryItem,
    handleLoadLibraryItem,
    handleDeleteLibraryItem,
  } = useLibraryActions();

  return (
    <FormSection
      title='Prompt Exploder Projects'
      description='Manage all Prompt Exploder projects and their saved explosions.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleSaveLibraryItem();
            }}
            disabled={isBusy}
          >
            Save Project
          </Button>
          <Button type='button' variant='outline' onClick={handleNewLibraryEntry}>
            New Project
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              if (!selectedLibraryItemId) return;
              void handleDeleteLibraryItem(selectedLibraryItemId);
            }}
            disabled={!selectedLibraryItemId || isBusy}
          >
            Delete Project
          </Button>
        </div>
      }
    >
      <div className='grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]'>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Projects</Label>
          <div className='max-h-[280px] overflow-auto rounded border border-border/50 bg-card/20'>
            <SimpleSettingsList
              items={promptLibraryItems.map((item: PromptExploderLibraryItem) => ({
                id: item.id,
                title: item.name,
                description: item.prompt,
                subtitle: `segments ${item.document?.segments.length ?? 0} · updated ${promptExploderFormatTimestamp(item.updatedAt)}`,
                original: item,
              })) as any}
              selectedId={selectedLibraryItemId ?? undefined}
              onSelect={(item: any) => handleLoadLibraryItem(item.id)}
              emptyMessage='No projects saved yet.'
              padding='sm'
            />
          </div>
        </div>
        <div className='space-y-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Project Name</Label>
            <Input
              value={libraryNameDraft}
              onChange={(event) => {
                setLibraryNameDraft(event.target.value);
              }}
              aria-label='Project name'
              placeholder='Project name'
             title='Project name'/>
          </div>
          <div className='rounded border border-border/50 bg-card/20 p-2 text-xs text-gray-500'>
            <div>
              Active project:{' '}
              <span className='text-gray-300'>{selectedLibraryItem?.name ?? 'Unsaved draft'}</span>
            </div>
            <div>
              Prompt length: <span className='text-gray-300'>{promptText.length}</span>
            </div>
            <div>
              Saved segments:{' '}
              <span className='text-gray-300'>
                {selectedLibraryItem?.document?.segments.length ?? 0}
              </span>
            </div>
            <div>
              Current segments:{' '}
              <span className='text-gray-300'>{documentState?.segments.length ?? 0}</span>
            </div>
          </div>
          <div className='text-[11px] text-gray-500'>
            Save Project stores both prompt text and the current exploded document.
          </div>
        </div>
      </div>
    </FormSection>
  );
}

export function SegmentEditorPanel(): React.JSX.Element {
  const { documentState } = useDocumentState();

  return (
    <FormSection
      title='Segments'
      description='Edit segment content and ordering before reassembly.'
      variant='subtle'
      className='p-4'
    >
      {!documentState?.segments?.length ? (
        <EmptyState
          title='No segments yet'
          description='Run Prompt Exploder to generate editable segments.'
        />
      ) : (
        <div className='mt-3 grid gap-3 lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)]'>
          <PromptExploderSegmentsTreeEditor />
          <SegmentDetailEditor />
        </div>
      )}
    </FormSection>
  );
}

export function BindingsPanel(): React.JSX.Element {
  const { documentState, segmentOptions, segmentById } = useDocumentState();
  const { bindingDraft, fromSubsectionOptions, toSubsectionOptions } = useBindingsState();
  const { setBindingDraft, handleAddManualBinding, handleRemoveManualBinding } =
    useBindingsActions();

  const describeBindingEndpoint = (
    segmentId: string,
    subsectionId: string | null | undefined
  ): string => {
    const segment = segmentById.get(segmentId);
    if (!segment) return 'Unknown segment';
    if (!subsectionId) return segment.title || 'Untitled';
    const subsection = (segment.subsections || []).find(
      (candidate: PromptExploderSubsection) => candidate.id === subsectionId
    );
    if (!subsection) return segment.title || 'Untitled';
    return `${segment.title || 'Untitled'} · ${promptExploderFormatSubsectionLabel(subsection)}`;
  };

  return (
    <FormSection
      title='Bindings'
      description='Auto-detected links between references and parameter usage.'
      variant='subtle'
      className='p-4'
    >
      {!documentState ? (
        <div className='text-xs text-gray-500'>Explode a prompt to manage bindings.</div>
      ) : (
        <div className='space-y-3'>
          <div className='rounded border border-border/50 bg-card/20 p-2'>
            <div className='grid gap-2'>
              <div className='grid gap-2 md:grid-cols-3'>
                <SelectSimple
                  size='sm'
                  value={bindingDraft.type}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous: any) => ({
                      ...previous,
                      type: value as PromptExploderBindingType,
                    }));
                  }}
                  options={BINDING_TYPE_OPTIONS}
                 ariaLabel='Select option' title='Select option'/>
                <SelectSimple
                  size='sm'
                  value={bindingDraft.fromSegmentId}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      fromSegmentId: value,
                      fromSubsectionId: '',
                    }));
                  }}
                  options={segmentOptions}
                 ariaLabel='Select option' title='Select option'/>
                <SelectSimple
                  size='sm'
                  value={bindingDraft.fromSubsectionId}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      fromSubsectionId: value,
                    }));
                  }}
                  options={fromSubsectionOptions}
                 ariaLabel='Select option' title='Select option'/>
              </div>
              <div className='grid gap-2 md:grid-cols-2'>
                <SelectSimple
                  size='sm'
                  value={bindingDraft.toSegmentId}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      toSegmentId: value,
                      toSubsectionId: '',
                    }));
                  }}
                  options={segmentOptions}
                 ariaLabel='Select option' title='Select option'/>
                <SelectSimple
                  size='sm'
                  value={bindingDraft.toSubsectionId}
                  onValueChange={(value: string) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      toSubsectionId: value,
                    }));
                  }}
                  options={toSubsectionOptions}
                 ariaLabel='Select option' title='Select option'/>
              </div>
              <div className='grid gap-2 md:grid-cols-2'>
                <Input
                  value={bindingDraft.sourceLabel}
                  onChange={(event) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      sourceLabel: event.target.value,
                    }));
                  }}
                  placeholder='Source label (optional)'
                 aria-label='Source label (optional)' title='Source label (optional)'/>
                <Input
                  value={bindingDraft.targetLabel}
                  onChange={(event) => {
                    setBindingDraft((previous) => ({
                      ...previous,
                      targetLabel: event.target.value,
                    }));
                  }}
                  placeholder='Target label (optional)'
                 aria-label='Target label (optional)' title='Target label (optional)'/>
              </div>
              <div className='flex justify-end'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleAddManualBinding}
                  disabled={segmentOptions.length === 0}
                >
                  <Plus className='mr-2 size-3.5' />
                  Add Manual Binding
                </Button>
              </div>
            </div>
          </div>

          {documentState.bindings.length === 0 ? (
            <div className='text-xs text-gray-500'>No bindings detected.</div>
          ) : (
            <div className='max-h-[280px] space-y-2 overflow-auto'>
              {documentState.bindings.map((binding: PromptExploderBinding) => (
                <div
                  key={binding.id}
                  className='rounded border border-border/50 bg-card/20 p-2 text-xs'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-2 text-gray-200'>
                      <Link2 className='size-3.5' />
                      <span className='uppercase text-[10px] tracking-wide text-gray-500'>
                        {(binding.type || '').replaceAll('_', ' ')}
                      </span>{' '}
                      <span className='rounded border border-border/60 px-1 py-0.5 text-[9px] uppercase text-gray-400'>
                        {binding.origin}
                      </span>
                    </div>
                    {binding.origin === 'manual' ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => handleRemoveManualBinding(binding.id ?? '')}
                        title='Remove manual binding'
                        aria-label='Remove manual binding'
                      >
                        <Trash2 className='size-3.5' />
                      </Button>
                    ) : null}
                  </div>
                  <div className='mt-1 text-gray-300'>
                    {binding.sourceLabel} → {binding.targetLabel}
                  </div>
                  <div className='mt-1 text-[10px] text-gray-500'>
                    {describeBindingEndpoint(binding.fromSegmentId ?? '', binding.fromSubsectionId)}{' '}
                    → {describeBindingEndpoint(binding.toSegmentId ?? '', binding.toSubsectionId)}
                  </div>{' '}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
}

export function ReassembledPromptPanel(): React.JSX.Element {
  const { documentState, returnTarget } = useDocumentState();
  const { handleApplyToImageStudio } = useDocumentActions();
  const { captureSegmentationRecordOnApply } = useLibraryActions();
  const { toast } = useToast();

  const handleApply = async (): Promise<void> => {
    const captureResult = await captureSegmentationRecordOnApply();
    if (!captureResult.captured) {
      toast('Segmentation context capture skipped (missing prompt or document).', {
        variant: 'warning',
      });
    }
    await handleApplyToImageStudio();
  };

  return (
    <FormSection
      title='Reassembled Prompt'
      description='Preview final output after include/omit and reorder edits.'
      variant='subtle'
      className='p-4'
      actions={
        <Button
          type='button'
          variant='outline'
          onClick={(): void => {
            void handleApply();
          }}
        >
          {returnTarget === 'case-resolver' ? 'Apply to Case Resolver' : 'Apply to Image Studio'}
        </Button>
      }
    >
      <div className='mt-2'>
        <Textarea
          className='min-h-[420px] font-mono text-[11px]'
          value={documentState?.reassembledPrompt ?? ''}
          readOnly
          aria-label='Reassembled prompt'
         title='Textarea'/>
      </div>
    </FormSection>
  );
}
