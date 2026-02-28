'use client';

import React from 'react';
import { MultiSelect, SelectSimple, StatusToggle, FormField } from '@/shared/ui';
import { PATTERN_SCOPE_OPTIONS } from '../constants';
import {
  DENY_BEHAVIOR_OVERRIDE_OPTIONS,
  POST_ACCEPT_BEHAVIOR_OPTIONS,
} from '../validator-pattern-modal-options';
import { ValidatorDocTooltip } from '../ValidatorDocsTooltips';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';
import { normalizeProductValidationPatternReplacementScopes } from '@/features/products/utils/validator-instance-behavior';
import type { PatternFormData } from '@/shared/contracts/products';

export function ValidatorPatternModalPolicySection(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <div className='space-y-4'>
      <FormField
        label='Replacement Applies In Forms'
        description='Controls where replacement proposals/auto-apply are allowed.'
      >
        <MultiSelect
          options={PATTERN_SCOPE_OPTIONS}
          selected={normalizeProductValidationPatternReplacementScopes(
            formData.replacementAppliesToScopes,
            formData.appliesToScopes
          )}
          onChange={(values: string[]) =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
                values,
                prev.appliesToScopes
              ),
            }))
          }
          placeholder='Follow pattern scopes'
          searchPlaceholder='Search replacement scope...'
          emptyMessage='No form scopes found.'
        />
      </FormField>

      <FormField label='After Replace Is Accepted'>
        <SelectSimple
          size='sm'
          value={formData.postAcceptBehavior}
          onValueChange={(value: string): void =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              postAcceptBehavior:
                value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate',
            }))
          }
          options={POST_ACCEPT_BEHAVIOR_OPTIONS}
        />
      </FormField>

      <FormField
        label='Deny Policy Override'
        description='Override form-level deny policy for this pattern only.'
      >
        <SelectSimple
          size='sm'
          value={formData.denyBehaviorOverride}
          onValueChange={(value: string): void =>
            setFormData((prev: PatternFormData) => ({
              ...prev,
              denyBehaviorOverride:
                value === 'ask_again' || value === 'mute_session' ? value : 'inherit',
            }))
          }
          options={DENY_BEHAVIOR_OVERRIDE_OPTIONS}
        />
      </FormField>

      <div className='space-y-2'>
        <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
          <span className='text-xs text-gray-300'>Pattern enabled</span>
          <StatusToggle
            enabled={formData.enabled}
            onToggle={() =>
              setFormData((prev: PatternFormData) => ({
                ...prev,
                enabled: !prev.enabled,
              }))
            }
          />
        </div>

        <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
          <span className='text-xs text-gray-300'>Replacer enabled</span>
          <ValidatorDocTooltip docId='validator.modal.replacement.toggle'>
            <StatusToggle
              enabled={formData.replacementEnabled}
              onToggle={() =>
                setFormData((prev: PatternFormData) => {
                  const nextReplacementEnabled = !prev.replacementEnabled;
                  return {
                    ...prev,
                    replacementEnabled: nextReplacementEnabled,
                    replacementAutoApply: nextReplacementEnabled
                      ? prev.replacementAutoApply
                      : false,
                  };
                })
              }
            />
          </ValidatorDocTooltip>
        </div>

        <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
          <div>
            <span className='text-xs text-gray-300'>Auto-apply replacer</span>
            <p className='text-[11px] text-gray-500'>OFF keeps it as a proposal only.</p>
          </div>
          <ValidatorDocTooltip docId='validator.modal.replacement.autoApply'>
            <StatusToggle
              enabled={formData.replacementAutoApply}
              disabled={!formData.replacementEnabled}
              onToggle={() =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  replacementAutoApply: !prev.replacementAutoApply,
                }))
              }
            />
          </ValidatorDocTooltip>
        </div>

        <div className='flex items-center justify-between rounded-md border border-border bg-gray-900/70 px-3 py-2'>
          <div>
            <span className='text-xs text-gray-300'>Skip same-value proposals</span>
            <p className='text-[11px] text-gray-500'>
              Hide replacement proposals when replacement equals current value.
            </p>
          </div>
          <ValidatorDocTooltip docId='validator.modal.replacement.skipNoop'>
            <StatusToggle
              enabled={formData.skipNoopReplacementProposal}
              disabled={!formData.replacementEnabled}
              onToggle={() =>
                setFormData((prev: PatternFormData) => ({
                  ...prev,
                  skipNoopReplacementProposal: !prev.skipNoopReplacementProposal,
                }))
              }
            />
          </ValidatorDocTooltip>
        </div>
      </div>
    </div>
  );
}
