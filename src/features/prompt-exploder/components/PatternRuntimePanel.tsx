'use client';

import React from 'react';

import { Button, FormSection, Input, Label, StatusToggle, SelectSimple } from '@/shared/ui';

import { useBenchmarkState } from '../context/hooks/useBenchmark';
import { useSettingsState, useSettingsActions } from '../context/hooks/useSettings';
import { promptExploderClampNumber } from '../helpers/formatting';
import { PROMPT_EXPLODER_VALIDATION_RULE_STACK_OPTIONS } from '../validation-stack';

import type { PromptExploderLearnedTemplate } from '../types';

export function PatternRuntimePanel(): React.JSX.Element {
  const {
    runtimeValidationRules,
    activeValidationRuleStack,
    effectiveLearnedTemplates,
    runtimeLearnedTemplates,
    templateMergeThreshold,
    learningDraft,
    snapshotDraftName,
    selectedSnapshotId,
    availableSnapshots,
    selectedSnapshot,
    isBusy,
  } = useSettingsState();
  const {
    setLearningDraft,
    setSnapshotDraftName,
    setSelectedSnapshotId,
    handleSaveLearningSettings,
    handleCapturePatternSnapshot,
    handleRestorePatternSnapshot,
    handleDeletePatternSnapshot,
    handleTemplateStateChange,
    handleDeleteTemplate,
  } = useSettingsActions();
  const {
    benchmarkSuiteDraft,
    benchmarkLowConfidenceThresholdDraft,
    benchmarkSuggestionLimitDraft,
  } = useBenchmarkState();

  return (
    <FormSection
      title='Pattern Runtime'
      description='Prompt Exploder uses Prompt Validator rules from the selected validation stack.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='text-xs text-gray-400'>
          Active rules: <span className='text-gray-200'>{runtimeValidationRules.length}</span> ·
          learned templates:{' '}
          <span className='text-gray-200'>{effectiveLearnedTemplates.length}</span>
          {' '}· runtime templates:{' '}
          <span className='text-gray-200'>{runtimeLearnedTemplates.length}</span>
          {' '}· profile:{' '}
          <span className='text-gray-200'>{learningDraft.runtimeRuleProfile}</span>
          {' '}· stack:{' '}
          <span className='text-gray-200'>
            {PROMPT_EXPLODER_VALIDATION_RULE_STACK_OPTIONS.find(
              (option) => option.value === activeValidationRuleStack
            )?.label ?? activeValidationRuleStack}
          </span>
          {' '}· merge:{' '}
          <span className='text-gray-200'>{templateMergeThreshold.toFixed(2)}</span>
          {' '}· bench template upsert:{' '}
          <span className='text-gray-200'>
            {learningDraft.benchmarkSuggestionUpsertTemplates ? 'on' : 'off'}
          </span>
          {' '}· benchmark:{' '}
          <span className='text-gray-200'>{benchmarkSuiteDraft}</span>
          {' '}· low conf:{' '}
          <span className='text-gray-200'>
            {promptExploderClampNumber(benchmarkLowConfidenceThresholdDraft, 0.3, 0.9).toFixed(2)}
          </span>
          {' '}· suggestion cap:{' '}
          <span className='text-gray-200'>
            {promptExploderClampNumber(Math.floor(benchmarkSuggestionLimitDraft), 1, 20)}
          </span>
        </div>
      }
    >
      <div className='mt-3 grid gap-2 md:grid-cols-9'>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Validation Stack</Label>
          <SelectSimple
            size='sm'
            value={learningDraft.runtimeValidationRuleStack}
            onValueChange={(value: string) => {
              setLearningDraft((previous) => ({
                ...previous,
                runtimeValidationRuleStack: value,
              }));
            }}
            options={PROMPT_EXPLODER_VALIDATION_RULE_STACK_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Runtime Rule Profile</Label>
          <SelectSimple size='sm'
            value={learningDraft.runtimeRuleProfile}
            onValueChange={(value: string) => {
              setLearningDraft((previous) => ({
                ...previous,
                runtimeRuleProfile: value as 'all' | 'pattern_pack' | 'learned_only',
              }));
            }}
            options={[
              { value: 'all', label: 'All Rules' },
              { value: 'pattern_pack', label: 'Pattern Pack Only' },
              { value: 'learned_only', label: 'Learned Rules Only' },
            ]}
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Learning</Label>
          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
            <StatusToggle
              enabled={learningDraft.enabled}
              onToggle={() => {
                setLearningDraft((previous) => ({
                  ...previous,
                  enabled: !previous.enabled,
                }));
              }}
            />
          </div>
        </div>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Similarity Threshold</Label>
          <Input
            type='number'
            min={0.3}
            max={0.95}
            step={0.01}
            value={learningDraft.similarityThreshold.toFixed(2)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous) => ({
                ...previous,
                similarityThreshold: promptExploderClampNumber(value, 0.3, 0.95),
              }));
            }}
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Template Merge Threshold</Label>
          <Input
            type='number'
            min={0.3}
            max={0.95}
            step={0.01}
            value={learningDraft.templateMergeThreshold.toFixed(2)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous) => ({
                ...previous,
                templateMergeThreshold: promptExploderClampNumber(value, 0.3, 0.95),
              }));
            }}
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Min Approvals For Match</Label>
          <Input
            type='number'
            min={1}
            max={20}
            step={1}
            value={String(learningDraft.minApprovalsForMatching)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous) => ({
                ...previous,
                minApprovalsForMatching: promptExploderClampNumber(Math.floor(value), 1, 20),
              }));
            }}
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Runtime Template Cap</Label>
          <Input
            type='number'
            min={50}
            max={5000}
            step={10}
            value={String(learningDraft.maxTemplates)}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              setLearningDraft((previous) => ({
                ...previous,
                maxTemplates: promptExploderClampNumber(Math.floor(value), 50, 5000),
              }));
            }}
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Auto Activate Learned</Label>
          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
            <StatusToggle
              enabled={learningDraft.autoActivateLearnedTemplates}
              onToggle={() => {
                setLearningDraft((previous) => ({
                  ...previous,
                  autoActivateLearnedTemplates: !previous.autoActivateLearnedTemplates,
                }));
              }}
            />
          </div>
        </div>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Benchmark Template Upsert</Label>
          <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
            <StatusToggle
              enabled={learningDraft.benchmarkSuggestionUpsertTemplates}
              onToggle={() => {
                setLearningDraft((previous) => ({
                  ...previous,
                  benchmarkSuggestionUpsertTemplates:
                    !previous.benchmarkSuggestionUpsertTemplates,
                }));
              }}
            />
          </div>
        </div>
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            void handleSaveLearningSettings();
          }}
          disabled={isBusy}
        >
          Save Learning Settings
        </Button>
        <div className='text-xs text-gray-500'>
          Current runtime: similarity {learningDraft.similarityThreshold.toFixed(2)}, merge {learningDraft.templateMergeThreshold.toFixed(2)}, min approvals {learningDraft.minApprovalsForMatching}, cap {learningDraft.maxTemplates}, auto-activate {learningDraft.autoActivateLearnedTemplates ? 'on' : 'off'}, benchmark template upsert {learningDraft.benchmarkSuggestionUpsertTemplates ? 'on' : 'off'}.
          {' '}Benchmark suite {benchmarkSuiteDraft}
        </div>
      </div>
      <div className='mt-4 rounded border border-border/60 bg-card/20 p-3'>
        <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
          Pattern Snapshot Governance
        </div>
        <div className='grid gap-2 md:grid-cols-4'>
          <Input
            className='md:col-span-2'
            value={snapshotDraftName}
            onChange={(event) => setSnapshotDraftName(event.target.value)}
            placeholder='Snapshot name (optional)'
          />
          <SelectSimple size='sm'
            value={selectedSnapshotId}
            onValueChange={setSelectedSnapshotId}
            options={
              availableSnapshots.length > 0
                ? availableSnapshots.map((snapshot) => ({
                  value: snapshot.id,
                  label: `${snapshot.name} (${snapshot.ruleCount})`,
                }))
                : [{ value: '', label: 'No snapshots' }]
            }
          />
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleCapturePatternSnapshot();
              }}
              disabled={isBusy}
            >
              Capture
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleRestorePatternSnapshot();
              }}
              disabled={isBusy || !selectedSnapshot}
            >
              Restore
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                void handleDeletePatternSnapshot();
              }}
              disabled={isBusy || !selectedSnapshot}
            >
              Delete
            </Button>
          </div>
        </div>
        {selectedSnapshot ? (
          <div className='mt-2 text-xs text-gray-500'>
            Selected snapshot: {selectedSnapshot.name} · created {selectedSnapshot.createdAt} · rules {selectedSnapshot.ruleCount}
          </div>
        ) : (
          <div className='mt-2 text-xs text-gray-500'>
            No snapshot selected.
          </div>
        )}
      </div>
      <div className='mt-4 rounded border border-border/60 bg-card/20 p-3'>
        <div className='mb-2 text-[11px] uppercase tracking-wide text-gray-400'>
          Learned Template Lifecycle
        </div>
        {effectiveLearnedTemplates.length === 0 ? (
          <div className='text-xs text-gray-500'>No learned templates yet.</div>
        ) : (
          <div className='max-h-[220px] space-y-2 overflow-auto'>
            {effectiveLearnedTemplates.slice(0, 20).map((template) => (
              <div key={template.id} className='rounded border border-border/50 bg-card/30 p-2'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='truncate text-xs text-gray-200'>
                    {template.title}
                  </div>
                  <div className='text-[10px] text-gray-500'>
                    {template.segmentType} · approvals {template.approvals}
                  </div>
                </div>
                <div className='mt-1 flex items-center justify-between gap-2'>
                  <SelectSimple size='sm'
                    value={template.state}
                    onValueChange={(value: string) => {
                      void handleTemplateStateChange(
                        template.id,
                        value as PromptExploderLearnedTemplate['state']
                      );
                    }}
                    options={[
                      { value: 'draft', label: 'Draft' },
                      { value: 'candidate', label: 'Candidate' },
                      { value: 'active', label: 'Active' },
                      { value: 'disabled', label: 'Disabled' },
                    ]}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      void handleDeleteTemplate(template.id);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormSection>
  );
}
