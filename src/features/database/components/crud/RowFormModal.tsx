'use client';

import React from 'react';
import type { JSX } from 'react';
import { Input } from '@/shared/ui/primitives.public';
import { FormField, FormModal, StatusBadge } from '@/shared/ui/forms-and-actions.public';
import type { DatabaseColumnInfo } from '@/shared/contracts/database';
import { useRowForm } from '../../hooks/useRowForm';

interface RowFormModalProps {
  columns: DatabaseColumnInfo[];
  initialData?: Record<string, unknown>;
  mode: 'add' | 'edit';
  onSubmit: (data: Record<string, unknown>) => void;
  onClose: () => void;
  isPending: boolean;
}

export function RowFormModal(props: RowFormModalProps): JSX.Element {
  const { columns, initialData, mode, onSubmit, onClose, isPending } = props;
  const { formRef, formData, handleSubmit, setFieldValue, getPlaceholder } = useRowForm(
    columns,
    initialData,
    mode,
    onSubmit
  );

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title={mode === 'add' ? 'Add New Row' : 'Edit Row'}
      onSave={() => formRef.current?.requestSubmit()}
      isSaving={isPending}
      saveText={mode === 'add' ? 'Insert Row' : 'Update Row'}
      size='md'
    >
      <form ref={formRef} onSubmit={handleSubmit} className='space-y-4'>
        {columns.map((col) => (
          <FormField
            key={col.name}
            label={col.name}
            description={col.type}
            required={!col.nullable && !col.isPrimaryKey}
          >
            <div className='flex flex-col gap-1.5'>
              {col.isPrimaryKey && (
                <StatusBadge status='PK' variant='info' size='sm' className='font-bold mb-1' />
              )}
              <Input
                value={formData[col.name] ?? ''}
                onChange={(e) => setFieldValue(col.name, e.target.value)}
                placeholder={getPlaceholder(col)}
                className='font-mono text-xs'
                disabled={mode === 'edit' && col.isPrimaryKey}
                aria-label={col.name}
              />
            </div>
          </FormField>
        ))}
      </form>
    </FormModal>
  );
}
