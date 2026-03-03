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
export function PromptModal({
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
}: PromptModalProps): React.JSX.Element {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleConfirm = () => {
    if (required && !value.trim()) return;
    void onConfirm(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      size='sm'
      onSave={handleConfirm}
      isSaving={isLoading}
      isSaveDisabled={required && !value.trim()}
      saveText={confirmText}
      cancelText={cancelText}
    >
      <div className='space-y-4 py-2'>
        {message && <p className='text-sm text-gray-400'>{message}</p>}
        <div className='space-y-2'>
          {label && <Label className='text-xs font-medium text-gray-300'>{label}</Label>}
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className='h-9'
            disabled={isLoading}
          />
        </div>
      </div>
    </FormModal>
  );
}
