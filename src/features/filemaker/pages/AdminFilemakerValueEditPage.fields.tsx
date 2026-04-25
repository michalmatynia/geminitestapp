'use client';

import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Input, Textarea } from '@/shared/ui/primitives.public';

import type { ValueDraft } from './AdminFilemakerValueEditPage.helpers';

type ValueEditFieldsProps = {
  draft: ValueDraft;
  parentOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  setDraft: React.Dispatch<React.SetStateAction<ValueDraft>>;
};

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
