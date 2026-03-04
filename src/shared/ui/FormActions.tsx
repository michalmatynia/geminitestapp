'use client';

import React from 'react';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/utils';

import { Button, buttonVariants } from './button';

interface FormActionsProps {
  onCancel?: (() => void) | undefined;
  onSave?: (() => void) | undefined;
  cancelText?: string | undefined;
  saveText?: string | undefined;
  isSaving?: boolean | undefined;
  isDisabled?: boolean | undefined;
  className?: string | undefined;
  saveVariant?: VariantProps<typeof buttonVariants>['variant'];
  cancelVariant?: VariantProps<typeof buttonVariants>['variant'];
  saveIcon?: React.ReactNode | undefined;
  saveLoadingText?: string | undefined;
  children?: React.ReactNode | undefined;
  size?: 'default' | 'sm' | 'lg' | 'xs';
}

export function FormActions({
  onCancel,
  onSave,
  cancelText = 'Cancel',
  saveText = 'Save Changes',
  isSaving = false,
  isDisabled = false,
  className,
  saveVariant = 'default',
  cancelVariant = 'outline',
  saveIcon,
  saveLoadingText = 'Saving...',
  children,
  size = 'sm',
}: FormActionsProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-end gap-3', className)}>
      {children}
      {onCancel && (
        <Button
          type='button'
          variant={cancelVariant}
          size={size}
          onClick={onCancel}
          disabled={isSaving}
        >
          {cancelText}
        </Button>
      )}
      {onSave && (
        <Button
          type='button'
          variant={saveVariant}
          size={size}
          onClick={onSave}
          disabled={isDisabled || isSaving}
          loading={isSaving}
          loadingText={saveLoadingText}
        >
          {saveIcon && !isSaving && <span className='mr-2'>{saveIcon}</span>}
          {!isSaving && saveText}
        </Button>
      )}
    </div>
  );
}
