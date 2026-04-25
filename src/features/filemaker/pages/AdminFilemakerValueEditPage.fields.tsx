'use client';

import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { FormField, FormSection, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Input, Textarea } from '@/shared/ui/primitives.public';

import type { FilemakerValue } from '../types';
import type { ValueDraft } from './AdminFilemakerValueEditPage.helpers';
import { formatTimestamp } from './filemaker-page-utils';

type ValueEditFieldsProps = {
  draft: ValueDraft;
  parentOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  setDraft: React.Dispatch<React.SetStateAction<ValueDraft>>;
};

const missingMetadataValue = 'Not imported';

function MetadataInput(props: { label: string; value: string }): React.JSX.Element {
  return (
    <FormField label={props.label}>
      <Input
        value={props.value}
        readOnly
        className='font-mono text-xs'
        aria-label={props.label}
        title={props.value}
      />
    </FormField>
  );
}

export function ValueMetadataFields(props: {
  value: FilemakerValue | null;
}): React.JSX.Element | null {
  if (props.value === null) return null;
  return (
    <FormSection title='Record Metadata' className='space-y-4 p-4'>
      <div className='grid gap-3 md:grid-cols-2'>
        <MetadataInput label='Legacy UUID' value={props.value.legacyUuid ?? missingMetadataValue} />
        <MetadataInput label='New ID' value={props.value.id} />
        <MetadataInput label='Created' value={formatTimestamp(props.value.createdAt)} />
        <MetadataInput label='Modified' value={formatTimestamp(props.value.updatedAt)} />
        <MetadataInput label='Created By' value={props.value.createdBy ?? missingMetadataValue} />
        <MetadataInput label='Modified By' value={props.value.updatedBy ?? missingMetadataValue} />
      </div>
    </FormSection>
  );
}

function ValueIdentityFields(props: {
  draft: ValueDraft;
  updateDraft: (patch: Partial<ValueDraft>) => void;
}): React.JSX.Element {
  return (
    <>
      <FormField label='Label'>
        <Input
          value={props.draft.label}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.updateDraft({ label: event.target.value });
          }}
          placeholder='Display label'
          aria-label='Value label'
          title='Value label'
        />
      </FormField>
      <FormField label='Value'>
        <Input
          value={props.draft.value}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.updateDraft({ value: event.target.value });
          }}
          placeholder='Stored value'
          aria-label='Stored value'
          title='Stored value'
        />
      </FormField>
    </>
  );
}

function ValueHierarchyFields(props: {
  draft: ValueDraft;
  parentOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  updateDraft: (patch: Partial<ValueDraft>) => void;
}): React.JSX.Element {
  return (
    <>
      <FormField label='Parent'>
        <SelectSimple
          value={props.draft.parentId}
          onValueChange={(parentId: string): void => props.updateDraft({ parentId })}
          options={props.parentOptions}
          placeholder='Select parent value'
          ariaLabel='Select parent value'
          title='Select parent value'
        />
      </FormField>
      <FormField label='Sort Order'>
        <Input
          type='number'
          min={0}
          value={props.draft.sortOrder}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            props.updateDraft({ sortOrder: event.target.value });
          }}
          placeholder='0'
          aria-label='Sort order'
          title='Sort order'
        />
      </FormField>
    </>
  );
}

function ValueDescriptionField(props: {
  draft: ValueDraft;
  updateDraft: (patch: Partial<ValueDraft>) => void;
}): React.JSX.Element {
  return (
    <FormField label='Description'>
      <Textarea
        value={props.draft.description}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
          props.updateDraft({ description: event.target.value });
        }}
        placeholder='Optional description'
        aria-label='Value description'
        title='Value description'
        rows={4}
      />
    </FormField>
  );
}

export function ValueEditFields(props: ValueEditFieldsProps): React.JSX.Element {
  const updateDraft = (patch: Partial<ValueDraft>): void => {
    props.setDraft((current: ValueDraft) => ({ ...current, ...patch }));
  };

  return (
    <>
      <ValueIdentityFields draft={props.draft} updateDraft={updateDraft} />
      <ValueHierarchyFields
        draft={props.draft}
        parentOptions={props.parentOptions}
        updateDraft={updateDraft}
      />
      <ValueDescriptionField draft={props.draft} updateDraft={updateDraft} />
    </>
  );
}
