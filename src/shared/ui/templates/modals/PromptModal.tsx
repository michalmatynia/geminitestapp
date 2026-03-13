'use client';

import React, { useState, useEffect } from 'react';

import { FormModal } from '@/shared/ui/FormModal';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export interface PromptModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  required?: boolean;
}

/**
 * A standard modal for requesting a single text input from the user.
 * Refactored to leverage FormModal for consistent action handling.
 */
export function PromptModal(props: PromptModalProps): React.JSX.Element {
  const {
    open,
    onClose,
    onConfirm,
    title,
    message,
    label,
    defaultValue = '',
    placeholder,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
    required = false,
  } = props;

  const [value, setValue] = useState(defaultValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const inputId = React.useId().replace(/:/g, '');
  const resolvedAriaLabel = label ? undefined : placeholder ?? title ?? 'Input value';

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setIsSubmitting(false);
    }
  }, [open, defaultValue]);

  useEffect(() => {
    if (open && !isLoading) {
      inputRef.current?.focus();
    }
  }, [open, isLoading]);

  const handleConfirm = async (): Promise<void> => {
    if (isLoading || isSubmitting) return;
    if (required && !value.trim()) return;
    setIsSubmitting(true);
    try {
      await onConfirm(value);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleConfirm();
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      size='sm'
      onSave={() => {
        void handleConfirm();
      }}
      isSaving={isLoading || isSubmitting}
      isSaveDisabled={required && !value.trim()}
      saveText={confirmText}
      cancelText={cancelText}
    >
      <div className='space-y-4 py-2'>
        {message && <p className='text-sm text-gray-400'>{message}</p>}
        <div className='space-y-2'>
          {label && (
            <Label htmlFor={inputId} className='text-xs font-medium text-gray-300'>
              {label}
            </Label>
          )}
          <Input
            id={inputId}
            ref={inputRef}
            value={value}
            aria-label={resolvedAriaLabel}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className='h-9'
            disabled={isLoading || isSubmitting}
          />
        </div>
      </div>
    </FormModal>
  );
}
