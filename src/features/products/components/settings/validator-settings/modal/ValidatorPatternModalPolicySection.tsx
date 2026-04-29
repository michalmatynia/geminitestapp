'use client';

import React from 'react';

import type { PatternFormData } from '@/shared/contracts/products/drafts';
import { normalizeProductValidationPatternReplacementScopes } from '@/shared/lib/products/utils/validator-instance-behavior';
import { FormField } from '@/shared/ui/form-section';
import { MultiSelect } from '@/shared/ui/multi-select';
import { SelectSimple } from '@/shared/ui/select-simple';
import { ToggleRow } from '@/shared/ui/toggle-row';

import { PATTERN_SCOPE_OPTIONS } from '../constants';
import {
  DENY_BEHAVIOR_OVERRIDE_OPTIONS,
  POST_ACCEPT_BEHAVIOR_OPTIONS,
} from '../validator-pattern-modal-options';
import { ValidatorDocTooltip } from '../ValidatorDocsTooltips';
import { useValidatorSettingsContext } from '../ValidatorSettingsContext';

function ReplacementScopesField(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <FormField
      label='Replacement Applies In Forms'
      description='Controls where replacement proposals/auto-apply are allowed.'
    >
      <MultiSelect
        options={PATTERN_SCOPE_OPTIONS}
        selected={normalizeProductValidationPatternReplacementScopes(
          formData.replacementAppliesToScopes
        )}
        onChange={(values: string[]) =>
          setFormData((prev: PatternFormData) => ({
            ...prev,
            replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(values),
          }))
        }
        placeholder='Follow pattern scopes'
        searchPlaceholder='Search replacement scope...'
        emptyMessage='No form scopes found.'
      />
    </FormField>
  );
}

function PostAcceptBehaviorField(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <FormField label='After Replace Is Accepted'>
      <SelectSimple
        size='sm'
        value={formData.postAcceptBehavior}
        onValueChange={(value: string): void =>
          setFormData((prev: PatternFormData) => ({
            ...prev,
            postAcceptBehavior: value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate',
          }))
        }
        options={POST_ACCEPT_BEHAVIOR_OPTIONS}
        ariaLabel='After Replace Is Accepted'
        title='After Replace Is Accepted'
      />
    </FormField>
  );
}

function DenyPolicyOverrideField(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
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
            denyBehaviorOverride: value === 'ask_again' || value === 'mute_session' ? value : 'inherit',
          }))
        }
        options={DENY_BEHAVIOR_OVERRIDE_OPTIONS}
        ariaLabel='Deny Policy Override'
        title='Deny Policy Override'
      />
    </FormField>
  );
}

function PatternEnabledToggle(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <ToggleRow
      label='Pattern enabled'
      checked={formData.enabled}
      onCheckedChange={(enabled: boolean): void =>
        setFormData((prev: PatternFormData) => ({ ...prev, enabled }))
      }
      variant='switch'
      className='bg-gray-900/70 border-border'
      labelClassName='text-xs text-gray-300'
    />
  );
}

function ReplacementEnabledToggle(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <ToggleRow
      label='Replacer enabled'
      checked={formData.replacementEnabled}
      onCheckedChange={(replacementEnabled: boolean): void =>
        setFormData((prev: PatternFormData) => ({
          ...prev,
          replacementEnabled,
          replacementAutoApply: replacementEnabled ? prev.replacementAutoApply : false,
        }))
      }
      variant='switch'
      className='bg-gray-900/70 border-border'
      labelClassName='text-xs text-gray-300'
      controlWrapper={(control) => (
        <ValidatorDocTooltip docId='validator.modal.replacement.toggle'>
          {control}
        </ValidatorDocTooltip>
      )}
    />
  );
}

function AutoApplyToggle(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <ToggleRow
      label='Auto-apply replacer'
      description='OFF keeps it as a proposal only.'
      checked={formData.replacementAutoApply}
      onCheckedChange={(replacementAutoApply: boolean): void =>
        setFormData((prev: PatternFormData) => ({ ...prev, replacementAutoApply }))
      }
      disabled={!formData.replacementEnabled}
      variant='switch'
      className='bg-gray-900/70 border-border'
      labelClassName='text-xs text-gray-300'
      controlWrapper={(control) => (
        <ValidatorDocTooltip docId='validator.modal.replacement.autoApply'>
          {control}
        </ValidatorDocTooltip>
      )}
    />
  );
}

function SkipNoopToggle(): React.JSX.Element {
  const { formData, setFormData } = useValidatorSettingsContext();

  return (
    <ToggleRow
      label='Skip same-value proposals'
      description='Hide replacement proposals when replacement equals current value.'
      checked={formData.skipNoopReplacementProposal}
      onCheckedChange={(skipNoopReplacementProposal: boolean): void =>
        setFormData((prev: PatternFormData) => ({ ...prev, skipNoopReplacementProposal }))
      }
      disabled={!formData.replacementEnabled}
      variant='switch'
      className='bg-gray-900/70 border-border'
      labelClassName='text-xs text-gray-300'
      controlWrapper={(control) => (
        <ValidatorDocTooltip docId='validator.modal.replacement.skipNoop'>
          {control}
        </ValidatorDocTooltip>
      )}
    />
  );
}

function ReplacementPolicyToggles(): React.JSX.Element {
  return (
    <div className='space-y-2 pt-2'>
      <PatternEnabledToggle />
      <ReplacementEnabledToggle />
      <AutoApplyToggle />
      <SkipNoopToggle />
    </div>
  );
}

export function ValidatorPatternModalPolicySection(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <ReplacementScopesField />
      <PostAcceptBehaviorField />
      <DenyPolicyOverrideField />
      <ReplacementPolicyToggles />
    </div>
  );
}
