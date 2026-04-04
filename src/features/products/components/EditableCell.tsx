'use client';

import React, { useState, useEffect, useRef, KeyboardEvent, memo } from 'react';

import { useUpdateProductField } from '@/features/products/hooks/useProductsMutations';
import { Input } from '@/shared/ui/input';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type EditableCellProps = {
  value: number | null;
  productId: string;
  field: 'price' | 'stock';
  onUpdate: (nextValue: number) => void;
};

export const EditableCell = memo(
  function EditableCell({
    value,
    productId,
    field,
    onUpdate,
  }: EditableCellProps): React.JSX.Element {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(String(value ?? ''));
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { mutateAsync: updateField, isPending: isSaving } = useUpdateProductField();

    useEffect((): void => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    const handleDoubleClick = (): void => {
      setIsEditing(true);
      setEditValue(String(value ?? ''));
    };

    const handleSave = async (): Promise<void> => {
      if (isSaving) return;

      const numValue = parseFloat(editValue);
      const isInvalidStockValue = field === 'stock' && !Number.isInteger(numValue);
      if (isNaN(numValue) || numValue < 0 || isInvalidStockValue) {
        toast(`Invalid ${field} value`, { variant: 'error' });
        setEditValue(String(value ?? ''));
        setIsEditing(false);
        return;
      }

      // Don't save if value hasn't changed
      if (numValue === value) {
        setIsEditing(false);
        return;
      }

      try {
        await updateField({ id: productId, field, value: numValue });
        toast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`, { variant: 'success' });
        setIsEditing(false);
        onUpdate(numValue);
      } catch (error) {
        logClientCatch(error, {
          source: 'EditableCell',
          action: 'save',
          field,
          productId,
        });
        toast(error instanceof Error ? error.message : `Failed to update ${field}`, {
          variant: 'error',
        });
        setEditValue(String(value ?? ''));
        setIsEditing(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        void handleSave();
      } else if (e.key === 'Escape') {
        setEditValue(String(value ?? ''));
        setIsEditing(false);
      }
    };

    const handleBlur = (): void => {
      if (isSaving) return;
      void handleSave();
    };

    if (isEditing) {
      return (
        <Input
          ref={inputRef}
          type='number'
          step={field === 'price' ? '0.01' : '1'}
          min='0'
          value={editValue}
          aria-label={field === 'price' ? 'Price' : 'Stock'}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          className='h-8 w-24 text-sm'
          title='Input field'
        />
      );
    }

    return (
      <div
        onDoubleClick={handleDoubleClick}
        className='cursor-pointer rounded px-2 py-1 hover:bg-muted/50/50 transition-colors'
        title={`Double-click to edit ${field}`}
      >
        {value !== null ? (field === 'price' ? value.toFixed(2) : value) : '-'}
      </div>
    );
  },
  (prev: EditableCellProps, next: EditableCellProps): boolean =>
    prev.value === next.value && prev.productId === next.productId && prev.field === next.field
);
