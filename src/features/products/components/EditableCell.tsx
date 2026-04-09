'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, KeyboardEvent, memo } from 'react';

import { api } from '@/shared/lib/api-client';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Input } from '@/shared/ui/input';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

type EditableCellProps = {
  value: number | null;
  productId: string;
  field: 'price' | 'stock';
  onUpdate: (nextValue: number) => void;
};

type ProductListCacheValue =
  | ProductWithImages[]
  | { items: ProductWithImages[] }
  | null
  | undefined;

const patchProductListCacheValue = (
  cacheValue: ProductListCacheValue,
  productId: string,
  field: EditableCellProps['field'],
  value: number
): ProductListCacheValue => {
  if (!cacheValue) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === productId ? { ...product, [field]: value } : product
    );
  }
  if (Array.isArray(cacheValue.items)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === productId ? { ...product, [field]: value } : product
      ),
    };
  }
  return cacheValue;
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
    const [displayValue, setDisplayValue] = useState<number | null>(value);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect((): void => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    useEffect((): void => {
      if (!isEditing) {
        setEditValue(String(value ?? ''));
        setDisplayValue(value);
      }
    }, [isEditing, value]);

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
        setIsSaving(true);
        await api.patch<ProductWithImages>(`/api/v2/products/${productId}`, { [field]: numValue });
        queryClient.setQueriesData({ queryKey: QUERY_KEYS.products.lists() }, (old: ProductListCacheValue) =>
          patchProductListCacheValue(old, productId, field, numValue)
        );
        queryClient.setQueryData(QUERY_KEYS.products.detail(productId), (old: ProductWithImages | undefined) =>
          old ? { ...old, [field]: numValue } : old
        );
        queryClient.setQueryData(QUERY_KEYS.products.detailEdit(productId), (old: ProductWithImages | undefined) =>
          old ? { ...old, [field]: numValue } : old
        );
        setDisplayValue(numValue);
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
      } finally {
        setIsSaving(false);
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
        {displayValue !== null ? (field === 'price' ? displayValue.toFixed(2) : displayValue) : '-'}
      </div>
    );
  },
  (prev: EditableCellProps, next: EditableCellProps): boolean =>
    prev.value === next.value && prev.productId === next.productId && prev.field === next.field
);
