'use client';

import { Loader2 } from 'lucide-react';
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
  cancelVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | undefined;
  children?: React.ReactNode | undefined;
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
  children,
}: FormActionsProps): React.JSX.Element {
  return (
    <div className={cn('flex items-center justify-end gap-3', className)}>
      {children}
      {onCancel && (
        <Button
          type='button'
          variant={cancelVariant}
          size='sm'
          onClick={onCancel}
          disabled={isSaving}
        >
          {cancelText}
        </Button>
      )}
      {onSave && (
        <Button
          type='submit'
          variant={saveVariant}
          size='sm'
          onClick={onSave}
          disabled={isDisabled || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className='mr-2 size-4 animate-spin' />
              Saving...
            </>
          ) : (
            saveText
          )}
        </Button>
      )}
    </div>
  );
}
