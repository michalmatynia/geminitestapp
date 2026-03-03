'use client';

import React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';

interface FormActionsProps {
  onCancel?: (() => void) | undefined;
  onSave?: (() => void) | undefined;
  cancelText?: string | undefined;
  saveText?: string | undefined;
  isSaving?: boolean | undefined;
  isDisabled?: boolean | undefined;
  className?: string | undefined;
  saveVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | undefined;
  cancelVariant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | undefined;
  saveIcon?: React.ReactNode | undefined;
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
          loadingText='Saving...'
        >
          {saveIcon && !isSaving && <span className='mr-2'>{saveIcon}</span>}
          {!isSaving && saveText}
        </Button>
      )}
    </div>
  );
}
