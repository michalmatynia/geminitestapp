'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { PromptExploderParamEntry } from '@/shared/contracts/prompt-exploder';
import { Button, Card, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { FormField, SelectSimple, StatusToggle } from '@/shared/ui/forms-and-actions.public';
import { extractParamsFromPrompt } from '@/shared/utils/prompt-params';

import {
  useDocumentActions,
  useDocumentState,
  useSegmentEditorActions,
  useSegmentEditorState,
  useSettingsState,
} from '../../context';
import {
  promptExploderClampNumber,
  promptExploderInferParamTypeLabel,
  promptExploderSafeJsonStringify,
} from '../../helpers/formatting';
import { promptExploderCreateApprovalDraftFromSegment } from '../../helpers/segment-helpers';
import {
  buildPromptExploderParamEntries,
  promptExploderParamUiControlLabel,
  sanitizeParamJsonValue,
} from '../../params-editor';
import type { TemplateMergeMode } from '../../template-learning';
import type { PromptExploderSegment, PromptExploderSegmentType } from '../../types';
import {
  PromptExploderHierarchyTreeEditor,
  PromptExploderHierarchyTreeProvider,
} from '../PromptExploderHierarchyTreeEditor';
import { SegmentEditorListItemLogicalEditor } from '../SegmentEditorListItemLogicalEditor';
import { PromptExploderSubsectionsTreeEditor } from '../tree/PromptExploderSubsectionsTreeEditor';

const SEGMENT_TYPE_OPTIONS = [
  { value: 'metadata', label: 'Metadata' },
  { value: 'assigned_text', label: 'Assigned Text' },
  { value: 'list', label: 'List' },
  { value: 'parameter_block', label: 'Parameter Block' },
  { value: 'referential_list', label: 'Referential List' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'hierarchical_list', label: 'Hierarchical List' },
  { value: 'conditional_list', label: 'Conditional List' },
  { value: 'qa_matrix', label: 'QA Matrix' },
] as const satisfies ReadonlyArray<LabeledOptionDto<PromptExploderSegmentType>>;

const TEMPLATE_MERGE_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto (exact/similar)' },
  { value: 'new', label: 'Force New Template' },
  { value: 'target', label: 'Merge Into Selected Template' },
] as const satisfies ReadonlyArray<LabeledOptionDto<TemplateMergeMode>>;

const EMPTY_TEMPLATE_TARGET_OPTION: LabeledOptionDto<string> = {
  value: '',
  label: 'No templates for this type',
};

const promptExploderSupportsSegmentTextSplit = (segment: PromptExploderSegment | null): boolean =>
  Boolean(
    segment &&
    (segment.type === 'assigned_text' ||
      segment.type === 'metadata' ||
      segment.type === 'parameter_block')
  );

const buildSelectorOptions = (
  entry: PromptExploderParamEntry
): Array<LabeledOptionDto<string>> =>
  entry.selectorOptions.map((option) => ({
    value: option,
    label:
      option === 'auto'
        ? `Auto (${promptExploderParamUiControlLabel(entry.recommendation.recommended)})`
        : promptExploderParamUiControlLabel(option),
  }));

export function SegmentDetailEditor(): React.JSX.Element {
  const { documentState, selectedSegmentId, selectedSegment } = useDocumentState();
  const { updateSegment } = useDocumentActions();
  const {
    addSegmentRelative,
    removeSegment,
    splitSegment,
    mergeSegmentWithPrevious,
    mergeSegmentWithNext,
  } = useSegmentEditorActions();

  if (!selectedSegment) {
    return (
      <Card variant='subtle' padding='md' className='max-h-[65vh] bg-card/20'>
        <div className='text-sm text-gray-500'>Select a segment to edit.</div>
      </Card>
    );
  }

  const segments = documentState?.segments || [];
  const selectedSegmentIndex = segments.findIndex((s) => s.id === selectedSegmentId);
  const canMergeSelectedWithPrevious = selectedSegmentIndex > 0;
  const canMergeSelectedWithNext =
    selectedSegmentIndex >= 0 && selectedSegmentIndex < segments.length - 1;
  const canSplitSelectedSegment = promptExploderSupportsSegmentTextSplit(selectedSegment);

  const segment = selectedSegment;

  return (
    <Card variant='subtle' padding='md' className='max-h-[65vh] space-y-3 overflow-auto bg-card/20'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => addSegmentRelative(segment.id, 'before')}
        >
          Add Above
        </Button>
        <Button variant='outline' size='sm' onClick={() => addSegmentRelative(segment.id, 'after')}>
          Add Below
        </Button>
        <Button
          variant='outline'
          size='sm'
          disabled={!canSplitSelectedSegment}
          onClick={() =>
            splitSegment(segment.id, (segment.text ?? '').length, (segment.text ?? '').length)
          }
        >
          Split at End
        </Button>
        <Button
          variant='outline'
          size='sm'
          disabled={!canMergeSelectedWithPrevious}
          onClick={() => mergeSegmentWithPrevious(segment.id)}
        >
          Merge Prev
        </Button>
        <Button
          variant='outline'
          size='sm'
          disabled={!canMergeSelectedWithNext}
          onClick={() => mergeSegmentWithNext(segment.id)}
        >
          Merge Next
        </Button>
        <Button variant='destructive' size='sm' onClick={() => removeSegment(segment.id)}>
          Remove
        </Button>
      </div>

      <div className='grid gap-3 md:grid-cols-2'>
        <FormField label='Type'>
          <SelectSimple
            size='sm'
            value={segment.type}
            onValueChange={(val) => {
              updateSegment(segment.id, (c: PromptExploderSegment) => ({
                ...c,
                type: val as PromptExploderSegmentType,
              }));
            }}
            options={SEGMENT_TYPE_OPTIONS}
           ariaLabel='Type' title='Type'/>
        </FormField>
        <FormField label='Include In Output'>
          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
            <StatusToggle
              enabled={segment.includeInOutput}
              onToggle={() => {
                updateSegment(segment.id, (c: PromptExploderSegment) => ({
                  ...c,
                  includeInOutput: !c.includeInOutput,
                }));
              }}
            />
          </div>
        </FormField>
      </div>

      {segment.type === 'parameter_block' && <ParameterBlockEditor />}

      {['list', 'referential_list', 'conditional_list'].includes(segment.type) && (
        <ListItemsEditor />
      )}

      {segment.type === 'hierarchical_list' && (
        <PromptExploderHierarchyTreeProvider
          value={{
            items: segment.listItems,
            onChange: (next) =>
              updateSegment(segment.id, (c: PromptExploderSegment) => ({ ...c, listItems: next })),
            renderLogicalEditor: ({ item, onChange }) => (
              <SegmentEditorListItemLogicalEditor item={item} onChange={onChange} />
            ),
            emptyLabel: 'No hierarchy items detected.',
          }}
        >
          <PromptExploderHierarchyTreeEditor />
        </PromptExploderHierarchyTreeProvider>
      )}

      {(segment.type === 'sequence' || segment.type === 'qa_matrix') && (
        <PromptExploderSubsectionsTreeEditor />
      )}

      {segment.type === 'assigned_text' && (
        <FormField label='Body'>
          <Textarea
            className='min-h-[180px] font-mono text-[12px]'
            value={segment.text ?? ''}
            onChange={(e) =>
              updateSegment(segment.id, (c: PromptExploderSegment) => ({
                ...c,
                text: e.target.value,
                raw: e.target.value,
              }))
            }
           aria-label='Body' title='Body'/>
        </FormField>
      )}

      <SegmentEditorInsightsPanel />
    </Card>
  );
}

function ListItemsEditor(): React.JSX.Element {
  const { selectedSegment } = useDocumentState();
  const { updateSegment } = useDocumentActions();

  if (!selectedSegment) return <></>;

  return (
    <FormField label='List Items'>
      <PromptExploderHierarchyTreeProvider
        value={{
          items: selectedSegment.listItems,
          onChange: (next) =>
            updateSegment(selectedSegment.id, (current: PromptExploderSegment) => ({
              ...current,
              listItems: next,
            })),
          renderLogicalEditor: ({ item, onChange }) => (
            <SegmentEditorListItemLogicalEditor item={item} onChange={onChange} />
          ),
          emptyLabel: 'No list items detected.',
        }}
      >
        <PromptExploderHierarchyTreeEditor />
      </PromptExploderHierarchyTreeProvider>
    </FormField>
  );
}

function ParameterBlockEditor(): React.JSX.Element {
  const { selectedSegment, selectedParamEntriesState } = useDocumentState();
  const { updateSegment, updateParameterValue, updateParameterSelector } = useDocumentActions();

  if (!selectedSegment) return <></>;

  return (
    <div className='space-y-3'>
      <div className='space-y-2 rounded border border-border/50 bg-card/20 p-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-[11px] uppercase tracking-wide text-gray-400'>Parameters</Label>
          <span className='text-[10px] text-gray-500'>
            {selectedParamEntriesState?.entries.length ?? 0} extracted
          </span>
        </div>

        {selectedSegment.paramsObject && selectedParamEntriesState ? (
          selectedParamEntriesState.entries.length > 0 ? (
            <div className='max-h-[42vh] space-y-2 overflow-auto pr-1'>
              {selectedParamEntriesState.entries.map((entry) => (
                <div
                  key={entry.path}
                  className='space-y-2 rounded border border-border/50 bg-card/20 p-2'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='truncate font-mono text-[11px] text-gray-200'>{entry.path}</div>
                    <div className='text-[10px] uppercase text-gray-500'>
                      {promptExploderInferParamTypeLabel(entry)}
                    </div>
                  </div>

                  <div className='grid gap-2 lg:grid-cols-[220px_minmax(0,1fr)]'>
                    <FormField label='Selector'>
                      <SelectSimple
                        size='sm'
                        value={entry.selector}
                        onValueChange={(next) =>
                          updateParameterSelector(selectedSegment.id, entry.path, next)
                        }
                        options={buildSelectorOptions(entry)}
                       ariaLabel='Selector' title='Selector'/>
                    </FormField>
                    <FormField label='Value'>
                      <Textarea
                        className='min-h-[86px] font-mono text-[11px]'
                        value={promptExploderSafeJsonStringify(entry.value)}
                        onChange={(e) =>
                          updateParameterValue(
                            selectedSegment.id,
                            entry.path,
                            sanitizeParamJsonValue(e.target.value, entry.value)
                          )
                        }
                       aria-label='Value' title='Value'/>
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-xs text-gray-500'>No leaf parameters detected.</div>
          )
        ) : (
          <div className='text-xs text-gray-500'>No parseable params object detected.</div>
        )}
      </div>

      <FormField label='Parameters Text'>
        <Textarea
          className='min-h-[220px] font-mono text-[12px]'
          value={selectedSegment.paramsText || (selectedSegment.text ?? '')}
          onChange={(e) => {
            const nextText = e.target.value;
            updateSegment(selectedSegment.id, (c: PromptExploderSegment) => {
              const extracted = extractParamsFromPrompt(nextText);
              if (!extracted.ok) {
                return {
                  ...c,
                  paramsText: nextText,
                  text: nextText,
                  raw: nextText,
                  paramsObject: null,
                };
              }
              const nextParamState = buildPromptExploderParamEntries({
                paramsObject: extracted.params,
                paramsText: nextText,
                paramUiControls: c.paramUiControls ?? null,
                paramComments: c.paramComments ?? null,
                paramDescriptions: c.paramDescriptions ?? null,
              });
              return {
                ...c,
                paramsText: nextText,
                text: nextText,
                raw: nextText,
                paramsObject: extracted.params,
                ...nextParamState,
              };
            });
          }}
         aria-label='Parameters Text' title='Parameters Text'/>
      </FormField>
    </div>
  );
}

function SegmentEditorInsightsPanel(): React.JSX.Element | null {
  const { selectedSegment } = useDocumentState();

  const { effectiveLearnedTemplates, templateMergeThreshold, isBusy } = useSettingsState();
  const { approvalDraft, matchedRuleDetails, similarTemplateCandidates, templateTargetOptions } =
    useSegmentEditorState();
  const { setApprovalDraft, handleApproveSelectedSegmentPattern } = useSegmentEditorActions();

  if (!selectedSegment) return null;

  const onApprovePattern = () => {
    void handleApproveSelectedSegmentPattern();
  };

  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className='space-y-3 bg-card/30 text-[11px] text-gray-400'
    >
      <div className='text-[11px] uppercase tracking-wide text-gray-400'>Matched Rule Insights</div>
      {matchedRuleDetails.length === 0 ? (
        <div className='text-[11px] text-gray-500'>No matched patterns for this segment.</div>
      ) : (
        <div className='space-y-2'>
          {matchedRuleDetails.map((matchedRule) => (
            <Card
              key={matchedRule.id}
              variant='subtle-compact'
              padding='sm'
              className='border-border/50 bg-card/20'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='truncate text-[11px] font-medium text-gray-200'>
                  {matchedRule.title}
                </span>
                <span className='rounded border border-border/50 bg-card/40 px-1 py-0.5 text-[10px] text-gray-300'>
                  {matchedRule.segmentType ?? 'no type hint'}
                </span>
              </div>
              <div className='mt-1 text-[10px] text-gray-500'>
                id: <span className='font-mono'>{matchedRule.id}</span> · priority{' '}
                {matchedRule.priority} · boost {matchedRule.confidenceBoost.toFixed(2)} · heading{' '}
                {matchedRule.treatAsHeading ? 'yes' : 'no'}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className='border-t border-border/60 pt-3'>
        <div className='mb-1 text-[11px] uppercase tracking-wide text-gray-400'>
          Similar Learned Templates
        </div>
        <div className='grid gap-2 md:grid-cols-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Template Merge Mode</Label>
            <SelectSimple
              size='sm'
              value={approvalDraft.templateMergeMode}
              onValueChange={(value: string) => {
                const nextMode = value as TemplateMergeMode;
                setApprovalDraft((previous) => ({
                  ...previous,
                  templateMergeMode: nextMode,
                  templateTargetId:
                    nextMode === 'target'
                      ? previous.templateTargetId || templateTargetOptions[0]?.value || ''
                      : '',
                }));
              }}
              options={TEMPLATE_MERGE_MODE_OPTIONS}
             ariaLabel='Select option' title='Select option'/>
          </div>
          {approvalDraft.templateMergeMode === 'target' ? (
            <div className='space-y-1'>
              <Label className='text-[11px] text-gray-400'>Merge Target Template</Label>
              <SelectSimple
                size='sm'
                value={approvalDraft.templateTargetId}
                onValueChange={(value: string) => {
                  setApprovalDraft((previous) => ({
                    ...previous,
                    templateTargetId: value,
                  }));
                }}
                options={
                  templateTargetOptions.length > 0
                    ? templateTargetOptions
                    : [EMPTY_TEMPLATE_TARGET_OPTION]
                }
               ariaLabel='Select option' title='Select option'/>
            </div>
          ) : null}
        </div>
        <div className='mb-2 text-[10px] text-gray-500'>
          Merge eligibility: same segment type + score &gt;= {templateMergeThreshold.toFixed(2)}
        </div>
        {similarTemplateCandidates.length === 0 ? (
          <div className='text-[11px] text-gray-500'>
            No nearby learned templates for this segment yet.
          </div>
        ) : (
          <div className='space-y-2'>
            {similarTemplateCandidates.map((candidate) => (
              <Card
                key={candidate.id}
                variant='subtle-compact'
                padding='sm'
                className='border-border/50 bg-card/20'
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='truncate text-[11px] font-medium text-gray-200'>
                    {candidate.title}
                  </span>
                  <span
                    className={`rounded border px-1 py-0.5 text-[10px] ${
                      candidate.mergeEligible
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-border/50 bg-card/40 text-gray-300'
                    }`}
                  >
                    {candidate.mergeEligible ? 'merge target' : 'candidate'}
                  </span>
                </div>
                <div className='mt-1 text-[10px] text-gray-500'>
                  score {(candidate.score * 100).toFixed(1)}% · type {candidate.segmentType} · state{' '}
                  {(candidate.state as string) || 'candidate'} · approvals{' '}
                  {typeof candidate.approvals === 'number' ? candidate.approvals : 0}
                </div>{' '}
                <div className='mt-1 flex justify-end'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      setApprovalDraft((previous) => ({
                        ...previous,
                        templateMergeMode: 'target',
                        templateTargetId: candidate.id,
                      }));
                    }}
                  >
                    Use Target
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className='border-t border-border/60 pt-3'>
        <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
          Approval Rule Draft
        </div>
        <div className='grid gap-2 md:grid-cols-2'>
          <div className='space-y-1 md:col-span-2'>
            <Label className='text-[11px] text-gray-400'>Rule Title</Label>
            <Input
              value={approvalDraft.ruleTitle}
              onChange={(event) => {
                setApprovalDraft((previous) => ({
                  ...previous,
                  ruleTitle: event.target.value,
                }));
              }}
             aria-label='Input field' title='Input field'/>
          </div>
          <div className='space-y-1 md:col-span-2'>
            <Label className='text-[11px] text-gray-400'>Rule Pattern</Label>
            <Textarea
              className='min-h-[70px] font-mono text-[12px]'
              value={approvalDraft.rulePattern}
              onChange={(event) => {
                setApprovalDraft((previous) => ({
                  ...previous,
                  rulePattern: event.target.value,
                }));
              }}
             aria-label='Textarea' title='Textarea'/>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Segment Type Hint</Label>
            <SelectSimple
              size='sm'
              value={approvalDraft.ruleSegmentType}
              onValueChange={(value: string) => {
                const nextSegmentType = value as PromptExploderSegment['type'];
                setApprovalDraft((previous) => ({
                  ...previous,
                  ruleSegmentType: nextSegmentType,
                  templateTargetId:
                    previous.templateMergeMode === 'target'
                      ? (effectiveLearnedTemplates.find(
                        (template) =>
                          template.id === previous.templateTargetId &&
                            template.segmentType === nextSegmentType
                      )?.id ??
                        effectiveLearnedTemplates.find(
                          (template) => template.segmentType === nextSegmentType
                        )?.id ??
                        '')
                      : previous.templateTargetId,
                  templateMergeMode:
                    previous.templateMergeMode === 'target' &&
                    !effectiveLearnedTemplates.some(
                      (template) =>
                        template.id === previous.templateTargetId &&
                        template.segmentType === nextSegmentType
                    ) &&
                    !effectiveLearnedTemplates.some(
                      (template) => template.segmentType === nextSegmentType
                    )
                      ? 'auto'
                      : previous.templateMergeMode,
                }));
              }}
              options={SEGMENT_TYPE_OPTIONS}
             ariaLabel='Select option' title='Select option'/>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Priority</Label>
            <Input
              type='number'
              min={-50}
              max={50}
              step={1}
              value={String(approvalDraft.rulePriority)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setApprovalDraft((previous) => ({
                  ...previous,
                  rulePriority: promptExploderClampNumber(Math.floor(value), -50, 50),
                }));
              }}
             aria-label='Input field' title='Input field'/>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Confidence Boost</Label>
            <Input
              type='number'
              min={0}
              max={0.5}
              step={0.05}
              value={approvalDraft.ruleConfidenceBoost.toFixed(2)}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (!Number.isFinite(value)) return;
                setApprovalDraft((previous) => ({
                  ...previous,
                  ruleConfidenceBoost: promptExploderClampNumber(value, 0, 0.5),
                }));
              }}
             aria-label='Input field' title='Input field'/>
          </div>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Treat As Heading</Label>
            <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
              <StatusToggle
                enabled={approvalDraft.ruleTreatAsHeading}
                onToggle={() => {
                  setApprovalDraft((previous) => ({
                    ...previous,
                    ruleTreatAsHeading: !previous.ruleTreatAsHeading,
                  }));
                }}
              />
            </div>
          </div>
        </div>
        <div className='mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-500'>
          <span>
            Approvals train fuzzy recognition and save this rule draft into validator patterns.
          </span>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                setApprovalDraft(promptExploderCreateApprovalDraftFromSegment(selectedSegment));
              }}
            >
              Reset Draft
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                onApprovePattern();
              }}
              disabled={isBusy}
            >
              Approve Pattern
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
