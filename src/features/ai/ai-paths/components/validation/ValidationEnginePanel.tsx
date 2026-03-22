'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Input, Label, SelectSimple, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { ValidationActionButton } from './ValidationActionButton';
import { ValidationPanel } from './ValidationPanel';
import { ValidationPanelHeader } from './ValidationPanelHeader';

const VALIDATION_POLICY_OPTIONS = [
  { value: 'block_below_threshold', label: 'Block Below Threshold' },
  { value: 'warn_below_threshold', label: 'Warn Below Threshold' },
  { value: 'report_only', label: 'Report Only' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

const ENABLE_OPTIONS = [
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

type ValidationNumericFieldKey = 'baseScore' | 'warnThreshold' | 'blockThreshold';

type ValidationEngineFieldProps = {
  label: string;
  children: React.ReactNode;
  htmlFor?: string;
};

const parseBoundedValidationNumber = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(100, parsed));
};

function ValidationEngineField({
  label,
  children,
  htmlFor,
}: ValidationEngineFieldProps): React.JSX.Element {
  return (
    <div>
      <Label htmlFor={htmlFor} className='text-xs text-gray-400'>
        {label}
      </Label>
      {children}
    </div>
  );
}

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
  const handleBoundedNumericChange = React.useCallback(
    (field: ValidationNumericFieldKey, value: string): void => {
      const parsed = parseBoundedValidationNumber(value);
      if (parsed === null) return;
      if (field === 'baseScore') {
        updateDraft({ baseScore: parsed });
        return;
      }
      if (field === 'warnThreshold') {
        updateDraft({ warnThreshold: parsed });
        return;
      }
      updateDraft({ blockThreshold: parsed });
    },
    [updateDraft]
  );

  return (
    <ValidationPanel>
      <ValidationPanelHeader
        title='Validation Engine'
        trailing={
          <div className='flex items-center gap-2'>
            <ValidationActionButton onClick={handleResetToDefaults}>
              Reset To Defaults
            </ValidationActionButton>
            <ValidationActionButton onClick={handleRebuildRulesFromDocs}>
              Rebuild Rules From Docs
            </ValidationActionButton>
          </div>
        }
      />
      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        <ValidationEngineField label='Status'>
          <SelectSimple
            size='sm'
            value={validationDraft.enabled === false ? 'disabled' : 'enabled'}
            onValueChange={(value: string) => updateDraft({ enabled: value !== 'disabled' })}
            options={ENABLE_OPTIONS}
            className='mt-2'
            ariaLabel='Status'
           title='Select option'/>
        </ValidationEngineField>
        <ValidationEngineField label='Policy'>
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
           title='Select option'/>
        </ValidationEngineField>
        <ValidationEngineField label='Base Score' htmlFor={baseScoreId}>
          <Input
            id={baseScoreId}
            type='number'
            min={0}
            max={100}
            className='mt-2 h-9'
            value={String(validationDraft.baseScore ?? 100)}
            onChange={(event) => handleBoundedNumericChange('baseScore', event.target.value)}
           aria-label={baseScoreId} title={baseScoreId}/>
        </ValidationEngineField>
        <ValidationEngineField label='Warn Threshold' htmlFor={warnThresholdId}>
          <Input
            id={warnThresholdId}
            type='number'
            min={0}
            max={100}
            className='mt-2 h-9'
            value={String(validationDraft.warnThreshold ?? 70)}
            onChange={(event) => handleBoundedNumericChange('warnThreshold', event.target.value)}
           aria-label={warnThresholdId} title={warnThresholdId}/>
        </ValidationEngineField>
        <ValidationEngineField label='Block Threshold' htmlFor={blockThresholdId}>
          <Input
            id={blockThresholdId}
            type='number'
            min={0}
            max={100}
            className='mt-2 h-9'
            value={String(validationDraft.blockThreshold ?? 50)}
            onChange={(event) => handleBoundedNumericChange('blockThreshold', event.target.value)}
           aria-label={blockThresholdId} title={blockThresholdId}/>
        </ValidationEngineField>
        <ValidationEngineField label='Schema Version' htmlFor={schemaVersionId}>
          <Input
            id={schemaVersionId}
            className='mt-2 h-9'
            value={String(validationDraft.schemaVersion ?? 2)}
            readOnly={true}
           aria-label={schemaVersionId} title={schemaVersionId}/>
        </ValidationEngineField>
      </div>
    </ValidationPanel>
  );
}
