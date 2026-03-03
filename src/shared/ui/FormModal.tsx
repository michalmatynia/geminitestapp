'use client';

import type { ModalStateProps } from '@/shared/contracts/ui';

import { AppModal } from './app-modal';
import { FormActions } from './FormActions';

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
  disableCloseWhileSaving?: boolean;
  isSaveDisabled?: boolean;
  hasUnsavedChanges?: boolean;
  saveText?: string;
  cancelText?: string;
  saveVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  saveIcon?: ReactNode;
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
  disableCloseWhileSaving = false,
  isSaveDisabled = false,
  hasUnsavedChanges,
  saveText = 'Save',
  cancelText = 'Cancel',
  saveVariant,
  saveIcon,
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
  const isCloseLocked = disableCloseWhileSaving && isSaving;
  const handleRequestClose = (): void => {
    if (isCloseLocked) return;
    onClose();
  };
  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      handleRequestClose();
    }
  };

  const shouldHighlightSave = hasUnsavedChanges ?? !isSaveDisabled;
  const isSaveButtonDisabled = isSaveDisabled || hasUnsavedChanges === false;

  const resolvedSaveVariant = saveVariant ?? (shouldHighlightSave ? 'success' : 'outline');

  const handleSave = (): void => {
    if (formRef) {
      formRef.current?.requestSubmit();
    } else {
      onSave();
    }
  };

  const header = (
    <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
      <div className='min-w-0'>
        <div className='flex min-w-0 items-center gap-2'>
          {showSaveButton && (
            <FormActions
              onSave={handleSave}
              saveText={saveText}
              saveVariant={resolvedSaveVariant as any}
              saveIcon={saveIcon}
              isSaving={isSaving}
              isDisabled={isSaveButtonDisabled}
              className='mr-2'
            />
          )}
          <h2 className='truncate text-2xl font-bold tracking-tight text-white'>{title}</h2>
        </div>
        {subtitle ? <p className='mt-1 text-sm text-gray-400'>{subtitle}</p> : null}
      </div>
      <div className='flex flex-wrap items-center justify-end gap-2'>
        {actions}
        {showCancelButton ? (
          <FormActions
            onCancel={handleRequestClose}
            cancelText={cancelText}
            isSaving={isSaving}
            isDisabled={isCloseLocked}
          />
        ) : null}
      </div>
    </div>
  );

  return (
    <AppModal
      open={isCurrentlyOpen}
      onOpenChange={handleOpenChange}
      title={title}
      subtitle={subtitle}
      size={size}
      variant={variant}
      padding={padding}
      header={header}
      showClose={false}
      lockClose={isCloseLocked}
      closeOnOutside={!isCloseLocked}
      closeOnEscape={!isCloseLocked}
      className={className}
    >
      {children}
    </AppModal>
  );
}
