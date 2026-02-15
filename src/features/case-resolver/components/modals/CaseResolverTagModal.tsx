'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import { FormField, FormModal, Input, SelectSimple } from '@/shared/ui';

import type { CaseResolverTag } from '../../types';

type TagFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

interface CaseResolverTagModalProps extends EntityModalProps<CaseResolverTag> {
  formData: TagFormData;
  setFormData: React.Dispatch<React.SetStateAction<TagFormData>>;
  parentTagOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverTagModal({
  isOpen,
  onClose,
  item: editingTag,
  formData,
  setFormData,
  parentTagOptions,
  isSaving,
  onSave,
}: CaseResolverTagModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={editingTag ? 'Edit Tag' : 'Create Tag'}
      onSave={onSave}
      isSaving={isSaving}
      size='md'
    >
      <div className='space-y-4'>
        <FormField label='Name'>
          <Input
            className='h-9'
            value={formData.name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setFormData((current: TagFormData) => ({
                ...current,
                name: event.target.value,
              }));
            }}
            placeholder='Tag name'
          />
        </FormField>
        <FormField label='Color'>
          <div className='flex items-center gap-3'>
            <Input
              type='color'
              className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900 p-0'
              value={formData.color}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setFormData((current: TagFormData) => ({
                  ...current,
                  color: event.target.value,
                }));
              }}
            />
            <Input
              type='text'
              className='h-10 flex-1 font-mono'
              value={formData.color}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setFormData((current: TagFormData) => ({
                  ...current,
                  color: event.target.value,
                }));
              }}
              placeholder='#38bdf8'
            />
          </div>
        </FormField>
        <FormField label='Parent Tag'>
          <SelectSimple
            size='sm'
            value={formData.parentId ?? '__none__'}
            onValueChange={(value: string): void => {
              setFormData((current: TagFormData) => ({
                ...current,
                parentId: value === '__none__' ? null : value,
              }));
            }}
            options={[
              { value: '__none__', label: 'No parent (root tag)' },
              ...parentTagOptions,
            ]}
            placeholder='Select parent tag'
            triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
          />
        </FormField>
      </div>
    </FormModal>
  );
}
