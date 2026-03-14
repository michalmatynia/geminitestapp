'use client';

import React from 'react';

import { Button, Card, Input, Label, SelectSimple } from '@/shared/ui';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';

const VALIDATION_POLICY_OPTIONS = [
  { value: 'block_below_threshold', label: 'Block Below Threshold' },
  { value: 'warn_below_threshold', label: 'Warn Below Threshold' },
  { value: 'report_only', label: 'Report Only' },
];

const ENABLE_OPTIONS = [
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
];

export function ValidationEnginePanel(): React.JSX.Element {
  const {
    validationDraft,
    updateDraft,
    validationPolicyValue,
    handleResetToDefaults,
    handleRebuildRulesFromDocs,
  } = useAdminAiPathsValidationContext();
  const fieldId = React.useId().replace(/:/g, '');
  const baseScoreId = `validation-base-score-${fieldId}`;
  const warnThresholdId = `validation-warn-threshold-${fieldId}`;
  const blockThresholdId = `validation-block-threshold-${fieldId}`;
  const schemaVersionId = `validation-schema-version-${fieldId}`;

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-white'>Validation Engine</h3>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' size='sm' onClick={handleResetToDefaults}>
            Reset To Defaults
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={handleRebuildRulesFromDocs}>
            Rebuild Rules From Docs
          </Button>
        </div>
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        <div>
          <Label className='text-xs text-gray-400'>Status</Label>
          <SelectSimple
            size='sm'
            value={validationDraft.enabled === false ? 'disabled' : 'enabled'}
            onValueChange={(value: string) => updateDraft({ enabled: value !== 'disabled' })}
            options={ENABLE_OPTIONS}
            className='mt-2'
            ariaLabel='Status'
           title="Select option"/>
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Policy</Label>
          <SelectSimple
            size='sm'
            value={validationPolicyValue}
            onValueChange={(value: string) => {
              updateDraft({
                policy:
                  value === 'report_only'
                    ? 'report_only'
                    : value === 'warn_below_threshold'
                      ? 'warn_below_threshold'
                      : 'block_below_threshold',
              });
            }}
            options={VALIDATION_POLICY_OPTIONS}
            className='mt-2'
            ariaLabel='Policy'
           title="Select option"/>
        </div>
        <div>
          <Label htmlFor={baseScoreId} className='text-xs text-gray-400'>
            Base Score
          </Label>
          <Input
            id={baseScoreId}
            type='number'
            min={0}
            max={100}
            className='mt-2 h-9'
            value={String(validationDraft.baseScore ?? 100)}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (!Number.isFinite(parsed)) return;
              updateDraft({ baseScore: Math.max(0, Math.min(100, parsed)) });
            }}
           aria-label={baseScoreId} title={baseScoreId}/>
        </div>
        <div>
          <Label htmlFor={warnThresholdId} className='text-xs text-gray-400'>
            Warn Threshold
          </Label>
          <Input
            id={warnThresholdId}
            type='number'
            min={0}
            max={100}
            className='mt-2 h-9'
            value={String(validationDraft.warnThreshold ?? 70)}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (!Number.isFinite(parsed)) return;
              updateDraft({ warnThreshold: Math.max(0, Math.min(100, parsed)) });
            }}
           aria-label={warnThresholdId} title={warnThresholdId}/>
        </div>
        <div>
          <Label htmlFor={blockThresholdId} className='text-xs text-gray-400'>
            Block Threshold
          </Label>
          <Input
            id={blockThresholdId}
            type='number'
            min={0}
            max={100}
            className='mt-2 h-9'
            value={String(validationDraft.blockThreshold ?? 50)}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              if (!Number.isFinite(parsed)) return;
              updateDraft({ blockThreshold: Math.max(0, Math.min(100, parsed)) });
            }}
           aria-label={blockThresholdId} title={blockThresholdId}/>
        </div>
        <div>
          <Label htmlFor={schemaVersionId} className='text-xs text-gray-400'>
            Schema Version
          </Label>
          <Input
            id={schemaVersionId}
            className='mt-2 h-9'
            value={String(validationDraft.schemaVersion ?? 2)}
            readOnly={true}
           aria-label={schemaVersionId} title={schemaVersionId}/>
        </div>
      </div>
    </Card>
  );
}
