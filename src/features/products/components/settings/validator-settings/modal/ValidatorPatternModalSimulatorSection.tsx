'use client';

import React from 'react';

import { getProductValidationSemanticOperationUiMetadata } from '@/shared/lib/products/utils/validator-semantic-operations';
import { Alert } from '@/shared/ui/alert';
import { FormField, FormSection } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Textarea } from '@/shared/ui/textarea';

import { useValidatorSettingsContext } from '../ValidatorSettingsContext';
import {
  buildValidatorPatternSimulatorInputs,
  type ValidatorPatternSimulationResult,
} from '../validator-pattern-simulator';

const VALIDATION_SCOPE_OPTIONS = [
  { value: 'draft_template', label: 'Draft Template' },
  { value: 'product_create', label: 'Product Create' },
  { value: 'product_edit', label: 'Product Edit' },
] as const;

const formatTraceSkipReason = (
  skipReason: ValidatorPatternSimulationResult['sequenceTrace'][number]['skipReason']
): string | null => {
  switch (skipReason) {
    case 'disabled':
      return 'Disabled';
    case 'out_of_scope':
      return 'Out of Scope';
    case 'launch_blocked':
      return 'Launch Blocked';
    case 'regex_no_match':
      return 'Regex No Match';
    case 'replacement_disabled':
      return 'Replacement Disabled';
    case 'replacement_unresolved':
      return 'Replacement Unresolved';
    default:
      return null;
  }
};

const formatTraceStopReason = (
  stopReason: ValidatorPatternSimulationResult['sequenceTrace'][number]['stopReason']
): string | null => {
  switch (stopReason) {
    case 'chain_stop_on_match':
      return 'Stopped on Match';
    case 'chain_stop_on_replace':
      return 'Stopped on Replace';
    case 'pass_output_disabled':
      return 'Pass Output Off';
    default:
      return null;
  }
};

const renderResultStatus = (result: ValidatorPatternSimulationResult): React.JSX.Element => {
  if (result.status === 'invalid') {
    return (
      <Alert variant='error' className='text-xs'>
        {result.error}
      </Alert>
    );
  }

  const replacementText = result.replacementValue?.trim() || '(none)';
  const outputText = result.outputDisplayValue?.trim() || '(unchanged)';
  const regexLabel = result.allowWithoutRegexMatch
    ? result.regexMatched
      ? 'Matched'
      : 'Skipped'
    : result.regexMatched
      ? 'Matched'
      : 'No match';

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2'>
        <StatusBadge status={result.launchMatched ? 'Launch matched' : 'Launch blocked'} variant={result.launchMatched ? 'success' : 'warning'} size='sm' />
        <StatusBadge status={`Regex: ${regexLabel}`} variant={result.regexMatched ? 'success' : 'warning'} size='sm' />
        <StatusBadge
          status={result.patternEnabledForScope ? 'Pattern enabled' : 'Pattern out of scope'}
          variant={result.patternEnabledForScope ? 'info' : 'warning'}
          size='sm'
        />
        <StatusBadge
          status={result.replacementEnabledForScope ? 'Replacement active' : 'Replacement out of scope'}
          variant={result.replacementEnabledForScope ? 'info' : 'warning'}
          size='sm'
        />
      </div>

      <div className='grid grid-cols-1 gap-3 text-xs md:grid-cols-3'>
        <div className='rounded-md border border-border bg-gray-950/40 p-3'>
          <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
            Field
          </div>
          <div className='text-gray-100'>{result.fieldLabel}</div>
        </div>
        <div className='rounded-md border border-border bg-gray-950/40 p-3'>
          <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
            Resolved Replacement
          </div>
          <div className='break-all font-mono text-gray-100'>{replacementText}</div>
        </div>
        <div className='rounded-md border border-border bg-gray-950/40 p-3'>
          <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
            Applied Output
          </div>
          <div className='break-all font-mono text-gray-100'>{outputText}</div>
          {result.outputValue !== null &&
          String(result.outputValue) !== String(result.outputDisplayValue ?? '') ? (
            <div className='mt-1 text-[10px] text-gray-400'>Stored value: {String(result.outputValue)}</div>
          ) : null}
        </div>
      </div>

      {result.notes.length > 0 ? (
        <Alert variant='info' className='text-xs'>
          <ul className='list-disc space-y-1 pl-4'>
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Alert>
      ) : null}
    </div>
  );
};

const renderSequenceTrace = (result: ValidatorPatternSimulationResult): React.JSX.Element | null => {
  if (result.status !== 'ready' || result.sequenceTrace.length === 0) return null;

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-[11px] font-semibold uppercase tracking-wide text-gray-400'>
          Sequence Trace
        </div>
        {result.sequenceGroupLabel ? (
          <div className='text-[11px] text-gray-500'>{result.sequenceGroupLabel}</div>
        ) : null}
      </div>
      <div className='space-y-2'>
        {result.sequenceTrace.map((step, index) => {
          const skipLabel = formatTraceSkipReason(step.skipReason);
          const stopLabel = formatTraceStopReason(step.stopReason);
          return (
            <div
              key={`${step.patternId}:${index}`}
              className='rounded-md border border-border bg-gray-950/40 p-3'
            >
              <div className='flex flex-wrap items-center gap-2'>
                <div className='text-sm font-medium text-gray-100'>
                  {index + 1}. {step.label}
                </div>
                {step.isPreviewPattern ? (
                  <StatusBadge status='Preview' variant='info' size='sm' />
                ) : null}
                {step.sequence !== null ? (
                  <StatusBadge status={`Seq ${step.sequence}`} variant='neutral' size='sm' />
                ) : null}
                {step.applied ? (
                  <StatusBadge status='Applied' variant='success' size='sm' />
                ) : (
                  <StatusBadge status='No Change' variant='warning' size='sm' />
                )}
                {skipLabel ? <StatusBadge status={skipLabel} variant='warning' size='sm' /> : null}
                {stopLabel ? <StatusBadge status={stopLabel} variant='info' size='sm' /> : null}
              </div>
              <div className='mt-2 grid grid-cols-1 gap-2 text-xs md:grid-cols-3'>
                <div>
                  <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                    Input
                  </div>
                  <div className='break-all font-mono text-gray-100'>{step.inputValue || '(empty)'}</div>
                </div>
                <div>
                  <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                    Replacement
                  </div>
                  <div className='break-all font-mono text-gray-100'>
                    {step.replacementValue || '(none)'}
                  </div>
                </div>
                <div>
                  <div className='mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
                    Output
                  </div>
                  <div className='break-all font-mono text-gray-100'>{step.outputValue || '(empty)'}</div>
                </div>
              </div>
              <div className='mt-2 flex flex-wrap gap-2'>
                <StatusBadge
                  status={step.launchMatched ? 'Launch matched' : 'Launch blocked'}
                  variant={step.launchMatched ? 'success' : 'warning'}
                  size='sm'
                />
                <StatusBadge
                  status={
                    step.allowWithoutRegexMatch && !step.regexMatched
                      ? 'Regex skipped'
                      : step.regexMatched
                        ? 'Regex matched'
                        : 'Regex no match'
                  }
                  variant={step.regexMatched ? 'success' : 'warning'}
                  size='sm'
                />
                <StatusBadge
                  status={step.replacementEnabledForScope ? 'Replacement active' : 'Replacement off'}
                  variant={step.replacementEnabledForScope ? 'info' : 'warning'}
                  size='sm'
                />
                <StatusBadge status={`Executions ${step.executions}`} variant='neutral' size='sm' />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function ValidatorPatternModalSimulatorSection(): React.JSX.Element {
  const {
    formData,
    modalSemanticState,
    testResult,
    simulatorScope,
    setSimulatorScope,
    simulatorValues,
    setSimulatorValue,
    simulatorCategoryFixtures,
    setSimulatorCategoryFixtures,
  } = useValidatorSettingsContext();

  const simulatorInputs = React.useMemo(
    () => buildValidatorPatternSimulatorInputs(formData),
    [formData]
  );
  const semanticUi = React.useMemo(
    () => getProductValidationSemanticOperationUiMetadata(modalSemanticState?.operation),
    [modalSemanticState?.operation]
  );
  const result = testResult as ValidatorPatternSimulationResult;

  return (
    <FormSection
      title='Simulator'
      description={
        semanticUi?.simulatorDescription ??
        'Preview how the current pattern would resolve and apply without touching live product data.'
      }
      variant='subtle'
      className='p-4'
    >
      <div className='space-y-4'>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField label='Validation Scope'>
            <SelectSimple
              size='sm'
              value={simulatorScope}
              onValueChange={(value: string): void => setSimulatorScope(value as typeof simulatorScope)}
              options={[...VALIDATION_SCOPE_OPTIONS]}
              ariaLabel='Validation Scope'
              title='Validation Scope'
            />
          </FormField>
          {simulatorInputs.map((input) => (
            <FormField key={input.key} label={input.label}>
              <Input
                className='h-9'
                value={simulatorValues[input.key] ?? ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setSimulatorValue(input.key, event.target.value)
                }
                placeholder={input.placeholder}
                aria-label={input.label}
                title={input.label}
              />
            </FormField>
          ))}
        </div>

        {formData.target === 'category' ? (
          <FormField
            label={semanticUi?.categoryFixturesLabel ?? 'Category Fixtures'}
            description={
              semanticUi?.categoryFixturesDescription ??
              'Optional. One category per line: `id|name|name_en|name_pl|name_de`.'
            }
          >
            <Textarea
              className='min-h-[88px] font-mono text-[12px]'
              value={simulatorCategoryFixtures}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                setSimulatorCategoryFixtures(event.target.value)
              }
              placeholder={
                semanticUi?.categoryFixturesPlaceholder ??
                'category-1|Keychains|Keychains|Breloki|Schlusselanhanger'
              }
              aria-label={semanticUi?.categoryFixturesLabel ?? 'Category Fixtures'}
              title={semanticUi?.categoryFixturesLabel ?? 'Category Fixtures'}
            />
          </FormField>
        ) : null}

        {renderResultStatus(result)}
        {renderSequenceTrace(result)}
      </div>
    </FormSection>
  );
}
