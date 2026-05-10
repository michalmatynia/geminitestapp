'use client';

import React, { useState } from 'react';

import {
  type FilemakerLinkedRecordDraft,
  LinkedRecordDeleteButton,
  LinkedRecordEditDialog,
} from './FilemakerLinkedRecordActions.parts';

export type FilemakerLinkedRecordEditField = {
  key: string;
  label: string;
  parse?: (value: boolean | string) => unknown;
  placeholder?: string;
  rows?: number;
  type?: 'checkbox' | 'text' | 'textarea';
  value: boolean | string;
};

export type FilemakerLinkedRecordActionsProps = {
  deleteLabel: string;
  editTitle: string;
  fields: FilemakerLinkedRecordEditField[];
  isSaving?: boolean;
  onDelete?: () => Promise<void> | void;
  onSave?: (patch: Record<string, unknown>) => Promise<void> | void;
};

const buildInitialDraft = (
  fields: FilemakerLinkedRecordEditField[]
): FilemakerLinkedRecordDraft =>
  Object.fromEntries(
    fields.map((field: FilemakerLinkedRecordEditField): [string, boolean | string] => [
      field.key,
      field.value,
    ])
  );

const buildPatch = (
  fields: FilemakerLinkedRecordEditField[],
  draft: FilemakerLinkedRecordDraft
): Record<string, unknown> =>
  Object.fromEntries(
    fields.map((field: FilemakerLinkedRecordEditField): [string, unknown] => {
      const value = draft[field.key] ?? field.value;
      return [field.key, field.parse ? field.parse(value) : value];
    })
  );

export function FilemakerLinkedRecordActions({
  deleteLabel,
  editTitle,
  fields,
  isSaving = false,
  onDelete,
  onSave,
}: FilemakerLinkedRecordActionsProps): React.JSX.Element | null {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [draft, setDraft] = useState<FilemakerLinkedRecordDraft>(() => buildInitialDraft(fields));

  if (onDelete === undefined && onSave === undefined) return null;

  const openEditDialog = (): void => {
    setDraft(buildInitialDraft(fields));
    setIsEditOpen(true);
  };

  const handleSave = async (): Promise<void> => {
    if (onSave === undefined) return;
    try {
      await onSave(buildPatch(fields, draft));
      setIsEditOpen(false);
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : 'Failed to save linked record.');
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (onDelete === undefined) return;
    if (!window.confirm(`Delete ${deleteLabel}? This cannot be undone.`)) return;
    try {
      await onDelete();
    } catch (error: unknown) {
      window.alert(error instanceof Error ? error.message : 'Failed to delete linked record.');
    }
  };

  return (
    <div className='flex shrink-0 items-center gap-1'>
      {onSave === undefined ? null : (
        <LinkedRecordEditDialog
          deleteLabel={deleteLabel}
          draft={draft}
          editTitle={editTitle}
          fields={fields}
          handleSave={handleSave}
          isEditOpen={isEditOpen}
          isSaving={isSaving}
          openEditDialog={openEditDialog}
          setDraft={setDraft}
          setIsEditOpen={setIsEditOpen}
        />
      )}
      {onDelete === undefined ? null : (
        <LinkedRecordDeleteButton
          deleteLabel={deleteLabel}
          handleDelete={handleDelete}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
