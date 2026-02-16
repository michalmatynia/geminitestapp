'use client';

import React from 'react';

import type { EntityModalProps } from '@/shared/types/modal-props';
import { FormField, FormModal, Input, SelectSimple } from '@/shared/ui';

import type { CaseResolverIdentifier } from '../../types';

type CaseIdentifierFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

interface CaseResolverIdentifierModalProps
  extends EntityModalProps<CaseResolverIdentifier> {
  formData: CaseIdentifierFormData;
  setFormData: React.Dispatch<React.SetStateAction<CaseIdentifierFormData>>;
  parentIdentifierOptions: { value: string; label: string }[];
  isSaving: boolean;
  onSave: () => void;
}

export function CaseResolverIdentifierModal({
  isOpen,
  onClose,
  item: editingIdentifier,
  formData,
  setFormData,
  parentIdentifierOptions,
  isSaving,
  onSave,
}: CaseResolverIdentifierModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={editingIdentifier ? 'Edit Case Identifier' : 'Create Case Identifier'}
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
              setFormData((current: CaseIdentifierFormData) => ({
                ...current,
                name: event.target.value,
              }));
            }}
            placeholder='Case identifier name'
          />
        </FormField>
        <FormField label='Color'>
          <div className='flex items-center gap-3'>
            <Input
              type='color'
              className='h-10 w-20 cursor-pointer rounded border border-border bg-gray-900 p-0'
              value={formData.color}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                setFormData((current: CaseIdentifierFormData) => ({
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
                setFormData((current: CaseIdentifierFormData) => ({
                  ...current,
                  color: event.target.value,
                }));
              }}
              placeholder='#f59e0b'
            />
          </div>
        </FormField>
        <FormField label='Parent Case Identifier'>
          <SelectSimple
            size='sm'
            value={formData.parentId ?? '__none__'}
            onValueChange={(value: string): void => {
              setFormData((current: CaseIdentifierFormData) => ({
                ...current,
                parentId: value === '__none__' ? null : value,
              }));
            }}
            options={[
              { value: '__none__', label: 'No parent (root identifier)' },
              ...parentIdentifierOptions,
            ]}
            placeholder='Select parent case identifier'
            triggerClassName='h-9 border-border bg-card/60 text-xs text-white'
          />
        </FormField>
      </div>
    </FormModal>
  );
}
