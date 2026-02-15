'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import { FormField, FormModal, Input, SelectSimple, Textarea } from '@/shared/ui';

import type { CaseResolverCategory } from '../../types';

type CategoryFormData = {
  name: string;
  description: string;
  color: string;
  parentId: string | null;
};

interface CaseResolverCategoryModalProps extends EntityModalProps<CaseResolverCategory> {
  formData: CategoryFormData;
  setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
  parentOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverCategoryModal({
  isOpen,
  onClose,
  item: editableCategory,
  formData,
  setFormData,
  parentOptions,
  isSaving,
  onSave,
}: CaseResolverCategoryModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={editableCategory ? 'Edit Category' : 'Create Category'}
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
              setFormData((current: CategoryFormData) => ({
                ...current,
                name: event.target.value,
              }));
            }}
            placeholder='Category name'
          />
        </FormField>
        <FormField label='Parent Category'>
          <SelectSimple size='sm'
            value={formData.parentId ?? '__root__'}
            onValueChange={(value: string): void => {
              setFormData((current: CategoryFormData) => ({
                ...current,
                parentId: value === '__root__' ? null : value,
              }));
            }}
            options={[
              { value: '__root__', label: 'Root' },
              ...parentOptions,
            ]}
            placeholder='Root'
          />
        </FormField>
        <FormField label='Description'>
          <Textarea
            value={formData.description}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
              setFormData((current: CategoryFormData) => ({
                ...current,
                description: event.target.value,
              }));
            }}
            className='min-h-[88px]'
            placeholder='Optional description'
          />
        </FormField>
        <FormField label='Color'>
          <div className='flex items-center gap-3'>
            <Input
              type='color'
              className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900 p-0'
              value={formData.color}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setFormData((current: CategoryFormData) => ({
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
                setFormData((current: CategoryFormData) => ({
                  ...current,
                  color: event.target.value,
                }));
              }}
              placeholder='#10b981'
            />
          </div>
        </FormField>
      </div>
    </FormModal>
  );
}
