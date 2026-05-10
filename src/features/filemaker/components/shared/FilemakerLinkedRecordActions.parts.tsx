'use client';

import { Edit3, Trash2 } from 'lucide-react';
import React from 'react';

import type { FilemakerLinkedRecordEditField } from './FilemakerLinkedRecordActions';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
} from '@/shared/ui/primitives.public';

export type FilemakerLinkedRecordDraft = Record<string, boolean | string>;
type FilemakerLinkedRecordDraftSetter = React.Dispatch<
  React.SetStateAction<FilemakerLinkedRecordDraft>
>;

const setDraftValue = (
  setDraft: FilemakerLinkedRecordDraftSetter,
  key: string,
  value: boolean | string
): void => {
  setDraft((current: FilemakerLinkedRecordDraft) => ({
    ...current,
    [key]: value,
  }));
};

function LinkedRecordEditField({
  draft,
  field,
  setDraft,
}: {
  draft: FilemakerLinkedRecordDraft;
  field: FilemakerLinkedRecordEditField;
  setDraft: FilemakerLinkedRecordDraftSetter;
}): React.JSX.Element {
  const value = draft[field.key] ?? field.value;

  if (field.type === 'checkbox') {
    return (
      <label key={field.key} className='flex items-center gap-2 text-xs text-gray-200'>
        <input
          aria-label={field.label}
          type='checkbox'
          checked={value === true}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraftValue(setDraft, field.key, event.target.checked);
          }}
        />
        {field.label}
      </label>
    );
  }

  return (
    <FormField key={field.key} label={field.label}>
      {field.type === 'textarea' ? (
        <Textarea
          value={String(value)}
          rows={field.rows}
          placeholder={field.placeholder}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
            setDraftValue(setDraft, field.key, event.target.value);
          }}
        />
      ) : (
        <Input
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setDraftValue(setDraft, field.key, event.target.value);
          }}
        />
      )}
    </FormField>
  );
}

function LinkedRecordEditFields({
  draft,
  fields,
  setDraft,
}: {
  draft: FilemakerLinkedRecordDraft;
  fields: FilemakerLinkedRecordEditField[];
  setDraft: FilemakerLinkedRecordDraftSetter;
}): React.JSX.Element {
  return (
    <div className='grid gap-3'>
      {fields.map((field: FilemakerLinkedRecordEditField) => (
        <LinkedRecordEditField
          key={field.key}
          draft={draft}
          field={field}
          setDraft={setDraft}
        />
      ))}
    </div>
  );
}

function LinkedRecordEditFooter({
  handleSave,
  isSaving,
  setIsEditOpen,
}: {
  handleSave: () => Promise<void>;
  isSaving: boolean;
  setIsEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
}): React.JSX.Element {
  return (
    <DialogFooter>
      <Button
        type='button'
        variant='outline'
        onClick={() => setIsEditOpen(false)}
        disabled={isSaving}
      >
        Cancel
      </Button>
      <Button
        type='button'
        variant='solid'
        onClick={() => {
          void handleSave();
        }}
        disabled={isSaving}
      >
        Save
      </Button>
    </DialogFooter>
  );
}

export function LinkedRecordEditDialog({
  deleteLabel,
  draft,
  editTitle,
  fields,
  handleSave,
  isEditOpen,
  isSaving,
  openEditDialog,
  setDraft,
  setIsEditOpen,
}: {
  deleteLabel: string;
  draft: FilemakerLinkedRecordDraft;
  editTitle: string;
  fields: FilemakerLinkedRecordEditField[];
  handleSave: () => Promise<void>;
  isEditOpen: boolean;
  isSaving: boolean;
  openEditDialog: () => void;
  setDraft: FilemakerLinkedRecordDraftSetter;
  setIsEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
}): React.JSX.Element {
  return (
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='size-7'
        aria-label={`Edit ${deleteLabel}`}
        title={`Edit ${deleteLabel}`}
        disabled={isSaving}
        onClick={openEditDialog}
      >
        <Edit3 className='size-3.5' />
      </Button>
      <DialogContent className='max-h-[88vh] overflow-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{editTitle}</DialogTitle>
          <DialogDescription>Edit the selected linked record.</DialogDescription>
        </DialogHeader>
        <LinkedRecordEditFields draft={draft} fields={fields} setDraft={setDraft} />
        <LinkedRecordEditFooter
          handleSave={handleSave}
          isSaving={isSaving}
          setIsEditOpen={setIsEditOpen}
        />
      </DialogContent>
    </Dialog>
  );
}

export function LinkedRecordDeleteButton({
  deleteLabel,
  handleDelete,
  isSaving,
}: {
  deleteLabel: string;
  handleDelete: () => Promise<void>;
  isSaving: boolean;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='size-7 text-red-300 hover:text-red-200'
      aria-label={`Delete ${deleteLabel}`}
      title={`Delete ${deleteLabel}`}
      disabled={isSaving}
      onClick={() => {
        void handleDelete();
      }}
    >
      <Trash2 className='size-3.5' />
    </Button>
  );
}
