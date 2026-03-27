'use client';

import { type VariantProps } from 'class-variance-authority';

import type { ModalStateProps } from '@/shared/contracts/ui';

import { AppModal } from './app-modal';
import { buttonVariants } from './button';
import { FormActions } from './FormActions';

import type { ReactNode } from 'react';

interface FormModalProps extends Partial<ModalStateProps> {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  titleTestId?: string;
  subtitle?: string;
  children: ReactNode;
  onSave: () => void;
  isSaving?: boolean;
  disableCloseWhileSaving?: boolean;
  isSaveDisabled?: boolean;
  hasUnsavedChanges?: boolean;
  saveText?: string;
  cancelText?: string;
  saveVariant?: VariantProps<typeof buttonVariants>['variant'];
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

type FormModalHeaderProps = {
  title: string;
  titleTestId?: string;
  subtitle?: string;
  showSaveButton: boolean;
  onSave: () => void;
  saveText: string;
  saveVariant: VariantProps<typeof buttonVariants>['variant'];
  saveIcon?: ReactNode;
  isSaving: boolean;
  isSaveButtonDisabled: boolean;
  actions?: ReactNode;
  showCancelButton: boolean;
  onClose: () => void;
  cancelText: string;
  isCloseLocked: boolean;
};

const renderFormModalHeaderContent = ({
  title,
  titleTestId,
  subtitle,
  showSaveButton,
  onSave,
  saveText,
  saveVariant,
  saveIcon,
  isSaving,
  isSaveButtonDisabled,
  actions,
  showCancelButton,
  onClose,
  cancelText,
  isCloseLocked,
}: FormModalHeaderProps): React.JSX.Element => (
  <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
    <div className='min-w-0'>
      <div className='flex min-w-0 items-center gap-2'>
        {showSaveButton ? (
          <FormActions
            onSave={onSave}
            saveText={saveText}
            saveVariant={saveVariant}
            saveIcon={saveIcon}
            isSaving={isSaving}
            isDisabled={isSaveButtonDisabled}
            className='mr-2'
          />
        ) : null}
        <h2
          data-testid={titleTestId}
          className='truncate text-2xl font-bold tracking-tight text-white'
        >
          {title}
        </h2>
      </div>
      {subtitle ? <p className='mt-1 text-sm text-gray-400'>{subtitle}</p> : null}
    </div>
    <div className='flex flex-wrap items-center justify-end gap-2'>
      {actions}
      {showCancelButton ? (
        <FormActions
          onCancel={onClose}
          cancelText={cancelText}
          isSaving={isSaving}
          isDisabled={isCloseLocked}
        />
      ) : null}
    </div>
  </div>
);

export function FormModal(props: FormModalProps): React.JSX.Element | null {
  const {
    open,
    isOpen,
    onClose,
    title,
    titleTestId,
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
  } = props;

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

  return (
    <AppModal
      open={isCurrentlyOpen}
      onOpenChange={handleOpenChange}
      title={title}
      subtitle={subtitle}
      size={size}
      variant={variant}
      padding={padding}
      header={
        renderFormModalHeaderContent({
          title,
          titleTestId,
          subtitle,
          showSaveButton,
          onSave: handleSave,
          saveText,
          saveVariant: resolvedSaveVariant,
          saveIcon,
          isSaving,
          isSaveButtonDisabled,
          actions,
          showCancelButton,
          onClose: handleRequestClose,
          cancelText,
          isCloseLocked,
        })
      }
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
