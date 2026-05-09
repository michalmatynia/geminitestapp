'use client';

import React from 'react';

import type { BrainModelVendor } from '@/shared/contracts/ai-brain';
import { Input, Label } from '@/shared/ui/primitives.public';

import type { AiBrainAssignment } from '../settings';
import { API_KEY_PLACEHOLDERS, type AssignmentPatchHandler } from './AssignmentEditor.helpers';

const hasApiKeyOverride = (assignment: AiBrainAssignment): boolean =>
  typeof assignment.apiKey === 'string' && assignment.apiKey.trim().length > 0;

export function ApiKeyField(props: {
  assignment: AiBrainAssignment;
  disabled: boolean;
  selectedVendor: BrainModelVendor;
  updateField: AssignmentPatchHandler;
}): React.JSX.Element {
  const { assignment, disabled, selectedVendor, updateField } = props;
  const overrideActive = hasApiKeyOverride(assignment);
  const helpText = overrideActive
    ? 'Route API key override is active. This takes precedence over AI Brain provider settings and OPENAI_API_KEY.'
    : 'No route API key override is set. Brain will use provider settings, then OPENAI_API_KEY.';
  return (
    <div className='space-y-2 md:col-span-2'>
      <Label className='text-xs text-gray-400'>
        API key override{' '}
        <span className='font-normal text-gray-500'>(leave blank to use Brain global key)</span>
      </Label>
      <Input
        type='password'
        value={assignment.apiKey ?? ''}
        aria-label='API key override'
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          updateField({ apiKey: e.target.value === '' ? undefined : e.target.value })
        }
        placeholder={API_KEY_PLACEHOLDERS[selectedVendor]}
        disabled={disabled}
        title='API key override for this capability'
      />
      <div className='flex flex-wrap items-center justify-between gap-2 text-[11px]'>
        <span className={overrideActive ? 'text-amber-300' : 'text-gray-500'}>{helpText}</span>
        {overrideActive ? (
          <button
            type='button'
            className='rounded border border-amber-500/40 px-2 py-1 text-amber-200 hover:bg-amber-500/10 disabled:opacity-60'
            disabled={disabled}
            onClick={() => updateField({ apiKey: undefined })}
          >
            Clear route API key override
          </button>
        ) : null}
      </div>
    </div>
  );
}
