'use client';

import { AppModal } from './app-modal';
import { Button } from './button';

import type { ReactNode } from 'react';

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onSave: () => void;
  isSaving?: boolean;
  saveText?: string;
  cancelText?: string;
  formRef?: React.RefObject<HTMLFormElement | null>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'glass';
  padding?: 'default' | 'none';
  actions?: ReactNode;
}

export function FormModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  onSave,
  isSaving = false,
  saveText = 'Save',
  cancelText = 'Cancel',
  formRef,
  size = 'md',
  variant = 'default',
  padding = 'default',
  actions,
}: FormModalProps): React.JSX.Element | null {
  if (!open) return null;

  const saveButton = formRef ? (
    <Button
      type='button'
      onClick={() => formRef.current?.requestSubmit()}
      disabled={isSaving}
      variant='default'
      className='min-w-[100px]'
    >
      {isSaving ? 'Saving...' : saveText}
    </Button>
  ) : (
    <Button
      onClick={onSave}
      disabled={isSaving}
      variant='default'
      className='min-w-[100px]'
    >
      {isSaving ? 'Saving...' : saveText}
    </Button>
  );

  const headerActions = (
    <>
      {saveButton}
      {actions}
      <Button
        type='button'
        onClick={onClose}
        variant='outline'
        className='min-w-[100px]'
      >
        {cancelText}
      </Button>
    </>
  );

  return (
    <AppModal
      open={open}
      onOpenChange={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      variant={variant}
      padding={padding}
      headerActions={headerActions}
    >
      {children}
    </AppModal>
  );
}
