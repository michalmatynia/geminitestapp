'use client';

import React, { useState, useRef } from 'react';
import type { JSX } from 'react';
import { Input } from '@/shared/ui/primitives.public';
import { FormField, FormModal, StatusBadge } from '@/shared/ui/forms-and-actions.public';
import type { DatabaseColumnInfo } from '@/shared/contracts/database';
import { formatDatabaseCellValue, parseInputValue } from '../utils/database-utils';

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

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const col of columns) {
      const val = initialData?.[col.name];
      initial[col.name] = (typeof val === 'string' || typeof val === 'number') 
        ? String(val) 
        : '';
    }
    return initial;
  });

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const parsed: Record<string, unknown> = {};
    for (const col of columns) {
      const val = formData[col.name] ?? '';
      const isAutoPK = mode === 'add' && col.isPrimaryKey && typeof col.defaultValue !== 'undefined' && col.defaultValue !== null && val === '';
      if (!isAutoPK) {
        parsed[col.name] = parseInputValue(val, col.type);
      }
    }
    onSubmit(parsed);
  };

  const getPlaceholder = (col: DatabaseColumnInfo): string => {
    if (typeof col.defaultValue === 'string') return col.defaultValue;
    return col.nullable ? 'NULL' : 'required';
  };

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
                onChange={(e) => setFormData((prev) => ({ ...prev, [col.name]: e.target.value }))}
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
