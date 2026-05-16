'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useRef, type KeyboardEvent, memo } from 'react';

import { api } from '@/shared/lib/api-client';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { Input } from '@/shared/ui/input';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  type EditableCellField,
  getEditableCellFieldLabel,
  isInvalidEditableCellValue,
  resolveEditableCellDisplayValue,
  resolveEditValue,
  updateEditableCellCache,
} from './EditableCell.cache';

type EditableCellProps = {
  value: number | null;
  productId: string;
  field: EditableCellField;
  onUpdate: (nextValue: number) => void;
};

type EditableCellState = {
  isEditing: boolean;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  editValue: string;
  setEditValue: React.Dispatch<React.SetStateAction<string>>;
  displayValue: number | null;
  setDisplayValue: React.Dispatch<React.SetStateAction<number | null>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
};

type EditableCellController = {
  isEditing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  editValue: string;
  setEditValue: React.Dispatch<React.SetStateAction<string>>;
  displayValue: number | null;
  isSaving: boolean;
  handleSave: () => Promise<void>;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  startEditing: () => void;
};

function useEditableCellState(value: number | null): EditableCellState {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(() => resolveEditValue(value));
  const [displayValue, setDisplayValue] = useState<number | null>(value);
  const [isSaving, setIsSaving] = useState(false);

  return {
    isEditing,
    setIsEditing,
    editValue,
    setEditValue,
    displayValue,
    setDisplayValue,
    isSaving,
    setIsSaving,
  };
}

function useEditableCellController({
  value,
  productId,
  field,
  onUpdate,
}: EditableCellProps): EditableCellController {
  const state = useEditableCellState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const handleSave = useEditableCellSaveHandler({ field, onUpdate, productId, queryClient, state, toast, value });

  useEffect((): void => {
    if (state.isEditing && inputRef.current !== null) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [state.isEditing]);

  useEffect((): void => {
    if (!state.isEditing) {
      state.setEditValue(resolveEditValue(value));
      state.setDisplayValue(value);
    }
  }, [state.isEditing, state.setDisplayValue, state.setEditValue, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      handleSave().catch(() => undefined);
    } else if (event.key === 'Escape') {
      state.setEditValue(resolveEditValue(value));
      state.setIsEditing(false);
    }
  };

  return {
    isEditing: state.isEditing,
    inputRef,
    editValue: state.editValue,
    setEditValue: state.setEditValue,
    displayValue: state.displayValue,
    isSaving: state.isSaving,
    handleSave,
    handleKeyDown,
    startEditing: () => {
      state.setIsEditing(true);
      state.setEditValue(resolveEditValue(value));
    },
  };
}

function useEditableCellSaveHandler({
  field,
  onUpdate,
  productId,
  queryClient,
  state,
  toast,
  value,
}: {
  field: EditableCellProps['field'];
  onUpdate: (nextValue: number) => void;
  productId: string;
  queryClient: QueryClient;
  state: EditableCellState;
  toast: ReturnType<typeof useToast>['toast'];
  value: number | null;
}): () => Promise<void> {
  return async (): Promise<void> => {
    if (state.isSaving) return;
    const numValue = parseFloat(state.editValue);
    if (isInvalidEditableCellValue(numValue, field)) {
      toast(`Invalid ${field} value`, { variant: 'error' });
      state.setEditValue(resolveEditValue(value));
      state.setIsEditing(false);
      return;
    }
    if (numValue === value) {
      state.setIsEditing(false);
      return;
    }
    await persistEditableCellValue({ field, numValue, onUpdate, productId, queryClient, state, toast, value });
  };
}

async function persistEditableCellValue({
  field,
  numValue,
  onUpdate,
  productId,
  queryClient,
  state,
  toast,
  value,
}: {
  field: EditableCellProps['field'];
  numValue: number;
  onUpdate: (nextValue: number) => void;
  productId: string;
  queryClient: QueryClient;
  state: EditableCellState;
  toast: ReturnType<typeof useToast>['toast'];
  value: number | null;
}): Promise<void> {
  try {
    state.setIsSaving(true);
    await api.patch<ProductWithImages>(`/api/v2/products/${productId}`, { [field]: numValue });
    updateEditableCellCache(queryClient, productId, field, numValue);
    state.setDisplayValue(numValue);
    toast(`${getEditableCellFieldLabel(field)} updated`, { variant: 'success' });
    state.setIsEditing(false);
    onUpdate(numValue);
  } catch (error) {
    logClientCatch(error, { source: 'EditableCell', action: 'save', field, productId });
    const msg = error instanceof Error ? error.message : `Failed to update ${field}`;
    toast(msg, { variant: 'error' });
    state.setEditValue(resolveEditValue(value));
    state.setIsEditing(false);
  } finally {
    state.setIsSaving(false);
  }
}

function EditableCellComponent(props: EditableCellProps): React.JSX.Element {
  const { field } = props;
  const controller = useEditableCellController(props);

  if (controller.isEditing) {
    return (
      <EditableCellInput
        inputRef={controller.inputRef}
        field={field}
        editValue={controller.editValue}
        setEditValue={controller.setEditValue}
        handleKeyDown={controller.handleKeyDown}
        handleSave={controller.handleSave}
        isSaving={controller.isSaving}
      />
    );
  }

  return (
      <EditableCellDisplay
        field={field}
        displayValue={controller.displayValue}
        startEditing={controller.startEditing}
      />
  );
}

export const EditableCell = memo(
  EditableCellComponent,
  (prev, next) => prev.value === next.value && prev.productId === next.productId && prev.field === next.field
);

function EditableCellInput({
  inputRef,
  field,
  editValue,
  setEditValue,
  handleKeyDown,
  handleSave,
  isSaving,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  field: EditableCellProps['field'];
  editValue: string;
  setEditValue: React.Dispatch<React.SetStateAction<string>>;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleSave: () => Promise<void>;
  isSaving: boolean;
}): React.JSX.Element {
  return (
    <Input
      ref={inputRef}
      type='number'
      step={field === 'price' ? '0.01' : '1'}
      min='0'
      value={editValue}
      aria-label={getEditableCellFieldLabel(field)}
      onChange={(event) => setEditValue(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        if (!isSaving) handleSave().catch(() => undefined);
      }}
      disabled={isSaving}
      className='h-8 w-24 text-sm'
      title='Input field'
    />
  );
}

function EditableCellDisplay({
  field,
  displayValue,
  startEditing,
}: {
  field: EditableCellProps['field'];
  displayValue: number | null;
  startEditing: () => void;
}): React.JSX.Element {
  return (
    <div
      onDoubleClick={startEditing}
      className='cursor-pointer rounded px-2 py-1 hover:bg-muted/50/50 transition-colors'
      title={`Double-click to edit ${field}`}
    >
      {resolveEditableCellDisplayValue(displayValue, field)}
    </div>
  );
}
