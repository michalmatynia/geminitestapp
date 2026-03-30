'use client';

import { type VariantProps } from 'class-variance-authority';
import React from 'react';

import { cn } from '@/shared/utils';

import { Button, buttonVariants } from './button';

interface FormActionsProps {
  onCancel?: (() => void) | undefined;
  onSave?: (() => void) | undefined;
  cancelText?: string | undefined;
  saveText?: string | undefined;
  saveTitle?: string | undefined;
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

export function FormActions(props: FormActionsProps): React.JSX.Element {
  const {
    onCancel,
    onSave,
    cancelText = 'Cancel',
    saveText = 'Save Changes',
    saveTitle,
    isSaving = false,
    isDisabled = false,
    className,
    saveVariant = 'default',
    cancelVariant = 'outline',
    saveIcon,
    saveLoadingText = 'Saving...',
    children,
    size = 'sm',
  } = props;

  const actionRuntime = React.useMemo(
    () => ({
      onCancel,
      onSave,
      cancelText,
      saveText,
      saveTitle,
      isSaving,
      isDisabled,
      saveVariant,
      cancelVariant,
      saveIcon,
      saveLoadingText,
      size,
    }),
    [
      onCancel,
      onSave,
      cancelText,
      saveText,
      saveTitle,
      isSaving,
      isDisabled,
      saveVariant,
      cancelVariant,
      saveIcon,
      saveLoadingText,
      size,
    ]
  );

  return (
    <div className={cn('flex items-center justify-end gap-3', className)}>
      {children}
      {actionRuntime.onCancel && (
        <Button
          type='button'
          variant={actionRuntime.cancelVariant}
          size={actionRuntime.size}
          onClick={actionRuntime.onCancel}
          disabled={actionRuntime.isSaving}
        >
          {actionRuntime.cancelText}
        </Button>
      )}
      {actionRuntime.onSave && (
        <Button
          type='button'
          variant={actionRuntime.saveVariant}
          size={actionRuntime.size}
          onClick={actionRuntime.onSave}
          disabled={actionRuntime.isDisabled || actionRuntime.isSaving}
          title={actionRuntime.saveTitle}
          loading={actionRuntime.isSaving}
          loadingText={actionRuntime.saveLoadingText}
        >
          {actionRuntime.saveIcon && !actionRuntime.isSaving && (
            <span className='mr-2'>{actionRuntime.saveIcon}</span>
          )}
          {!actionRuntime.isSaving && actionRuntime.saveText}
        </Button>
      )}
    </div>
  );
}
