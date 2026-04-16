'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, type KeyboardEvent, memo } from 'react';

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

function patchProductListCacheValue(
  cacheValue: ProductListCacheValue,
  productId: string,
  field: EditableCellProps['field'],
  value: number
): ProductListCacheValue {
  if (cacheValue === null || cacheValue === undefined) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === productId ? { ...product, [field]: value } : product
    );
  }
  if ('items' in cacheValue && Array.isArray(cacheValue.items)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === productId ? { ...product, [field]: value } : product
      ),
    };
  }
  return cacheValue;
}

function resolveEditValue(value: number | null): string {
  return value !== null ? String(value) : '';
}

function useEditableCellState(value: number | null) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(() => resolveEditValue(value));
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const [isSaving, setIsSaving] = useState(false);

  return { isEditing, setIsEditing, editValue, setEditValue, displayValue, setDisplayValue, isSaving, setIsSaving };
}

function updateCache(queryClient: QueryClient, productId: string, field: EditableCellProps['field'], numValue: number): void {
  queryClient.setQueriesData({ queryKey: QUERY_KEYS.products.lists() }, (old: ProductListCacheValue) =>
    patchProductListCacheValue(old, productId, field, numValue)
  );
  queryClient.setQueryData(QUERY_KEYS.products.detail(productId), (old: ProductWithImages | undefined) =>
    old !== undefined ? { ...old, [field]: numValue } : old
  );
  queryClient.setQueryData(QUERY_KEYS.products.detailEdit(productId), (old: ProductWithImages | undefined) =>
    old !== undefined ? { ...old, [field]: numValue } : old
  );
}

export const EditableCell = memo(
  ({ value, productId, field, onUpdate }: EditableCellProps): React.JSX.Element => {
    const { isEditing, setIsEditing, editValue, setEditValue, displayValue, setDisplayValue, isSaving, setIsSaving } = useEditableCellState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect((): void => {
      if (isEditing && inputRef.current !== null) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    useEffect((): void => {
      if (!isEditing) {
        setEditValue(resolveEditValue(value));
        setDisplayValue(value);
      }
    }, [isEditing, value, setEditValue, setDisplayValue]);

    const handleSave = async (): Promise<void> => {
      if (isSaving) return;
      const numValue = parseFloat(editValue);
      const isInvalidStock = field === 'stock' && !Number.isInteger(numValue);
      if (isNaN(numValue) || numValue < 0 || isInvalidStock) {
        toast(`Invalid ${field} value`, { variant: 'error' });
        setEditValue(resolveEditValue(value));
        setIsEditing(false);
        return;
      }
      if (numValue === value) {
        setIsEditing(false);
        return;
      }

      try {
        setIsSaving(true);
        await api.patch<ProductWithImages>(`/api/v2/products/${productId}`, { [field]: numValue });
        updateCache(queryClient, productId, field, numValue);
        setDisplayValue(numValue);
        toast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`, { variant: 'success' });
        setIsEditing(false);
        onUpdate(numValue);
      } catch (error) {
        logClientCatch(error, { source: 'EditableCell', action: 'save', field, productId });
        const msg = error instanceof Error ? error.message : `Failed to update ${field}`;
        toast(msg, { variant: 'error' });
        setEditValue(resolveEditValue(value));
        setIsEditing(false);
      } finally {
        setIsSaving(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        handleSave().catch(() => { /* silent */ });
      } else if (e.key === 'Escape') {
        setEditValue(resolveEditValue(value));
        setIsEditing(false);
      }
    };

    if (isEditing === true) {
      return (
        <Input ref={inputRef} type='number' step={field === 'price' ? '0.01' : '1'} min='0' value={editValue} aria-label={field === 'price' ? 'Price' : 'Stock'} onChange={(e) => setEditValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={() => { if (!isSaving) handleSave().catch(() => { /* silent */ }); }} disabled={isSaving} className='h-8 w-24 text-sm' title='Input field' />
      );
    }

    const display = displayValue !== null ? (field === 'price' ? displayValue.toFixed(2) : displayValue) : '-';
    return (
      <div onDoubleClick={() => { setIsEditing(true); setEditValue(resolveEditValue(value)); }} className='cursor-pointer rounded px-2 py-1 hover:bg-muted/50/50 transition-colors' title={`Double-click to edit ${field}`}>
        {display}
      </div>
    );
  },
  (prev, next) => prev.value === next.value && prev.productId === next.productId && prev.field === next.field
);
