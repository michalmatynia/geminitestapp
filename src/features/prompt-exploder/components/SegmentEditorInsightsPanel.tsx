'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Button, Input, Label, SelectSimple, StatusToggle, Textarea, Card } from '@/shared/ui';

import { useDocumentState } from '../context/hooks/useDocument';
import { useSegmentEditorActions, useSegmentEditorState } from '../context/hooks/useSegmentEditor';
import { useSettingsState } from '../context/hooks/useSettings';
import { promptExploderClampNumber } from '../helpers/formatting';
import { promptExploderCreateApprovalDraftFromSegment } from '../helpers/segment-helpers';

import type { TemplateMergeMode } from '../template-learning';
import type { PromptExploderSegment } from '../types';

const TEMPLATE_MERGE_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto (exact/similar)' },
  { value: 'new', label: 'Force New Template' },
  { value: 'target', label: 'Merge Into Selected Template' },
] as const satisfies ReadonlyArray<LabeledOptionDto<TemplateMergeMode>>;

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
] as const satisfies ReadonlyArray<LabeledOptionDto<PromptExploderSegment['type']>>;

const EMPTY_TEMPLATE_TARGET_OPTION: LabeledOptionDto<string> = {
  value: '',
  label: 'No templates for this type',
};

export function SegmentEditorInsightsPanel(): React.JSX.Element | null {
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
              options={[...TEMPLATE_MERGE_MODE_OPTIONS]}
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
              options={[...SEGMENT_TYPE_OPTIONS]}
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
