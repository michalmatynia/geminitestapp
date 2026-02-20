'use client';

import type { ModalStateProps } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils';

import { AppModal } from './app-modal';
import { Button } from './button';

import type { ReactNode } from 'react';

interface FormModalProps extends Partial<ModalStateProps> {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSave: () => void;
  isSaving?: boolean;
  isSaveDisabled?: boolean;
  hasUnsavedChanges?: boolean;
  saveText?: string;
  cancelText?: string;
  showSaveButton?: boolean;
  showCancelButton?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'glass';
  padding?: 'default' | 'none';
  actions?: ReactNode;
  className?: string;
}

export function FormModal({
  open,
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
  hasUnsavedChanges,
  saveText = 'Save',
  cancelText = 'Cancel',
  showSaveButton = true,
  showCancelButton = true,
  formRef,
  size = 'md',
  variant = 'default',
  padding = 'default',
  actions,
  className,
}: FormModalProps): React.JSX.Element | null {
  const isCurrentlyOpen = isOpen ?? open;
  if (!isCurrentlyOpen) return null;
  const shouldHighlightSave = hasUnsavedChanges ?? !isSaveDisabled;
  const isSaveButtonDisabled =
    isSaving || isSaveDisabled || hasUnsavedChanges === false;
  const saveButtonClassName = cn(
    'min-w-[100px] rounded-md border text-xs transition-colors',
    shouldHighlightSave
      ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
      : 'border-border/60 text-gray-500 hover:bg-transparent'
  );

  const saveButton = formRef ? (
    <Button
      type='button'
      onClick={() => formRef.current?.requestSubmit()}
      disabled={isSaveButtonDisabled}
      size='sm'
      className={saveButtonClassName}
    >
      {isSaving ? 'Saving...' : saveText}
    </Button>
  ) : (
    <Button
      onClick={onSave}
      disabled={isSaveButtonDisabled}
      size='sm'
      className={saveButtonClassName}
    >
      {isSaving ? 'Saving...' : saveText}
    </Button>
  );

  const header = (
    <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
      <div className='min-w-0'>
        <div className='flex min-w-0 items-center gap-2'>
          {showSaveButton ? saveButton : null}
          <h2 className='truncate text-2xl font-bold tracking-tight text-white'>{title}</h2>
        </div>
        {subtitle ? <p className='mt-1 text-sm text-gray-400'>{subtitle}</p> : null}
      </div>
      <div className='flex flex-wrap items-center justify-end gap-2'>
        {actions}
        {showCancelButton ? (
          <Button
            type='button'
            onClick={onClose}
            variant='outline'
            className='min-w-[100px]'
          >
            {cancelText}
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <AppModal
      open={isCurrentlyOpen}
      onOpenChange={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      variant={variant}
      padding={padding}
      header={header}
      showClose={false}
      className={className}
    >
      {children}
    </AppModal>
  );
}
