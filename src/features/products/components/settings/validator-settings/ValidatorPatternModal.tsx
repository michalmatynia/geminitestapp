'use client';

import React from 'react';

import type { PatternFormData } from '@/shared/contracts/products/drafts';
import { getProductValidationSemanticOperationUiMetadata } from '@/shared/lib/products/utils/validator-semantic-operations';
import { FormField } from '@/shared/ui/form-section';
import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { MultiSelect } from '@/shared/ui/multi-select';
import { SelectSimple } from '@/shared/ui/select-simple';
import { StatusToggle } from '@/shared/ui/status-toggle';
import { Textarea } from '@/shared/ui/textarea';

import { ValidatorPatternModalBasicSection } from './modal/ValidatorPatternModalBasicSection';
import { ValidatorPatternModalDynamicSection } from './modal/ValidatorPatternModalDynamicSection';
import { ValidatorPatternModalLaunchSection } from './modal/ValidatorPatternModalLaunchSection';
import { ValidatorPatternModalPolicySection } from './modal/ValidatorPatternModalPolicySection';
import { ValidatorPatternModalRuntimeSection } from './modal/ValidatorPatternModalRuntimeSection';
import { ValidatorPatternModalSimulatorSection } from './modal/ValidatorPatternModalSimulatorSection';
import { CHAIN_MODE_OPTIONS } from './validator-pattern-modal-options';
import { buildSemanticTransitionNotice } from './ValidatorPatternModal.helpers';
import { ValidatorDocTooltip } from './ValidatorDocsTooltips';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.validatorpatternmodal
 */
export function ValidatorPatternModal(): React.JSX.Element | null {
  const {
    showModal,
    editingPattern,
    modalSemanticState,
    modalSemanticTransition,
    formData,
    setFormData,
    replacementFieldOptions,
    createPatternPending,
    updatePatternPending,
    closeModal,
    handleSave,
    normalizeReplacementFields,
    sequenceGroups,
  } = useValidatorSettingsContext();
  if (!showModal) return null;

  const semanticUi = React.useMemo(
    () => getProductValidationSemanticOperationUiMetadata(modalSemanticState?.operation),
    [modalSemanticState?.operation]
  );
  const previousSemanticUi = React.useMemo(
    () => getProductValidationSemanticOperationUiMetadata(modalSemanticTransition.previous?.operation),
    [modalSemanticTransition.previous?.operation]
  );
  const transitionNotice = React.useMemo(
    () =>
      buildSemanticTransitionNotice({
        kind: modalSemanticTransition.kind,
        previousTitle: previousSemanticUi?.title ?? null,
        currentTitle: semanticUi?.title ?? null,
      }),
    [modalSemanticTransition.kind, previousSemanticUi?.title, semanticUi?.title]
  );

  const sequenceGroupOptions = [
    {
      value: '__none__',
      label: 'No sequence group',
      description: 'Run this pattern independently.',
    },
    ...Array.from(sequenceGroups.values())
      .sort((a, b) => {
        const labelCompare = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
        if (labelCompare !== 0) return labelCompare;
        return a.id.localeCompare(b.id);
      })
      .map((group) => ({
        value: group.id,
        label: group.label,
        description: `${group.patternIds.length} pattern${group.patternIds.length === 1 ? '' : 's'}`,
      })),
  ];

  return (
    <FormModal
      open={showModal}
      onClose={closeModal}
      title={editingPattern ? 'Edit Validator Pattern' : 'Create Validator Pattern'}
      onSave={(): void => {
        void handleSave();
      }}
      isSaving={createPatternPending || updatePatternPending}
      size='lg'
    >
      <div className='space-y-4'>
        {semanticUi ? (
          <div className='rounded-md border border-emerald-500/30 bg-emerald-950/40 px-4 py-3'>
            <p className='text-sm font-semibold text-emerald-100'>{semanticUi.title}</p>
            <p className='mt-1 text-sm text-emerald-200/85'>{semanticUi.description}</p>
          </div>
        ) : null}

        {transitionNotice ? (
          <div
            className={
              transitionNotice.tone === 'warning'
                ? 'rounded-md border border-amber-500/30 bg-amber-950/40 px-4 py-3'
                : 'rounded-md border border-sky-500/30 bg-sky-950/40 px-4 py-3'
            }
          >
            <p
              className={
                transitionNotice.tone === 'warning'
                  ? 'text-sm font-semibold text-amber-100'
                  : 'text-sm font-semibold text-sky-100'
              }
            >
              {transitionNotice.title}
            </p>
            <p
              className={
                transitionNotice.tone === 'warning'
                  ? 'mt-1 text-sm text-amber-200/85'
                  : 'mt-1 text-sm text-sky-200/85'
              }
            >
              {transitionNotice.body}
            </p>
          </div>
        ) : null}

        <ValidatorPatternModalBasicSection />

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField
            label='Sequence Group'
            description='Attach this pattern to an existing sequence from the current list.'
          >
            <SelectSimple
              size='sm'
              value={formData.sequenceGroupId || '__none__'}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  sequenceGroupId: value === '__none__' ? '' : value,
                }))
              }
              options={sequenceGroupOptions}
             ariaLabel='Sequence Group' title='Sequence Group'/>
          </FormField>
          <FormField label='Sequence'>
            <Input
              className='h-9'
              value={formData.sequence}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  sequence: event.target.value,
                }))
              }
              placeholder='10'
             aria-label='10' title='10'/>
          </FormField>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <FormField label='Chain Mode'>
            <SelectSimple
              size='sm'
              value={formData.chainMode}
              onValueChange={(value: string): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  chainMode: value as PatternFormData['chainMode'],
                }))
              }
              options={CHAIN_MODE_OPTIONS}
             ariaLabel='Chain Mode' title='Chain Mode'/>
          </FormField>
          <FormField label='Max Executions'>
            <Input
              className='h-9'
              value={formData.maxExecutions}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  maxExecutions: event.target.value,
                }))
              }
              placeholder='1'
             aria-label='1' title='1'/>
          </FormField>
          <FormField label='Pass Output'>
            <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2 h-9'>
              <span className='text-[10px] text-gray-400 uppercase font-semibold'>To Next</span>
              <StatusToggle
                enabled={formData.passOutputToNext}
                onToggle={() =>
                  setFormData((prev: PatternFormData) => ({
                    ...prev,
                    passOutputToNext: !prev.passOutputToNext,
                  }))
                }
              />
            </div>
          </FormField>
        </div>

        <ValidatorPatternModalLaunchSection />

        <ValidatorPatternModalRuntimeSection />

        <ValidatorPatternModalDynamicSection />

        <ValidatorPatternModalSimulatorSection />

        <FormField
          label='Replacer Fields'
          description='Leave empty to apply replacement globally on all matching fields.'
        >
          <ValidatorDocTooltip docId='validator.modal.replacement.toggle'>
            <MultiSelect
              options={replacementFieldOptions}
              selected={formData.replacementFields}
              onChange={(values: string[]) =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  replacementFields: normalizeReplacementFields(values),
                }))
              }
              placeholder='All matching fields (global)'
              searchPlaceholder='Search fields...'
              emptyMessage='No fields found.'
            />
          </ValidatorDocTooltip>
        </FormField>

        <ValidatorPatternModalPolicySection />

        <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px_170px]'>
          <FormField label='Regex'>
            <ValidatorDocTooltip docId='validator.modal.regex'>
              <Input
                className='h-9 font-mono'
                value={formData.regex}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setFormData((prev: PatternFormData) => ({ ...prev, regex: event.target.value }))
                }
                placeholder='\\s{2,}|\\*{2,}'
               aria-label='\\\\s{2,}|\\\\*{2,}' title='\\\\s{2,}|\\\\*{2,}'/>
            </ValidatorDocTooltip>
          </FormField>
          <FormField label='Flags'>
            <Input
              className='h-9 font-mono'
              value={formData.flags}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({ ...prev, flags: event.target.value }))
              }
              placeholder='gim'
             aria-label='gim' title='gim'/>
          </FormField>
          <FormField label='Debounce (ms)'>
            <Input
              className='h-9'
              type='number'
              min={0}
              max={30000}
              value={formData.validationDebounceMs}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  validationDebounceMs: event.target.value,
                }))
              }
              placeholder='0'
             aria-label='0' title='0'/>
          </FormField>
        </div>

        <FormField label='Message'>
          <Textarea
            className='min-h-[90px]'
            value={formData.message}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              setFormData((prev: PatternFormData) => ({ ...prev, message: event.target.value }))
            }
            placeholder={semanticUi?.messagePlaceholder ?? 'Remove duplicate spaces from product name.'}
           aria-label={semanticUi?.messagePlaceholder ?? 'Remove duplicate spaces from product name.'} title={semanticUi?.messagePlaceholder ?? 'Remove duplicate spaces from product name.'}/>
        </FormField>
      </div>
    </FormModal>
  );
}
