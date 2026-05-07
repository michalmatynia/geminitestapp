'use client';

/* eslint-disable max-lines-per-function */
import { Edit3, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

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
import { FormField } from '@/shared/ui/forms-and-actions.public';

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
): Record<string, boolean | string> =>
  Object.fromEntries(
    fields.map((field: FilemakerLinkedRecordEditField): [string, boolean | string] => [
      field.key,
      field.value,
    ])
  );

const buildPatch = (
  fields: FilemakerLinkedRecordEditField[],
  draft: Record<string, boolean | string>
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
  const [draft, setDraft] = useState<Record<string, boolean | string>>(() =>
    buildInitialDraft(fields)
  );

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
            <div className='grid gap-3'>
              {fields.map((field: FilemakerLinkedRecordEditField) => {
                const value = draft[field.key] ?? field.value;
                if (field.type === 'checkbox') {
                  return (
                    <label
                      key={field.key}
                      className='flex items-center gap-2 text-xs text-gray-200'
                    >
                      <input
                        aria-label={field.label}
                        type='checkbox'
                        checked={value === true}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setDraft((current) => ({
                            ...current,
                            [field.key]: event.target.checked,
                          }));
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
                          setDraft((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }));
                        }}
                      />
                    ) : (
                      <Input
                        value={String(value)}
                        placeholder={field.placeholder}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                          setDraft((current) => ({
                            ...current,
                            [field.key]: event.target.value,
                          }));
                        }}
                      />
                    )}
                  </FormField>
                );
              })}
            </div>
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
          </DialogContent>
        </Dialog>
      )}
      {onDelete === undefined ? null : (
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
      )}
    </div>
  );
}
