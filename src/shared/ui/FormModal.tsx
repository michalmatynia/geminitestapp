'use client';

import type { ModalStateProps } from '@/shared/contracts/ui';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { type VariantProps } from 'class-variance-authority';
import { useMemo } from 'react';

import { AppModal } from './app-modal';
import { FormActions } from './FormActions';
import { buttonVariants } from './button';

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

type FormModalHeaderRuntimeValue = {
  title: string;
  titleTestId?: string;
  subtitle?: string;
  showSaveButton: boolean;
  handleSave: () => void;
  saveText: string;
  resolvedSaveVariant: VariantProps<typeof buttonVariants>['variant'];
  saveIcon?: ReactNode;
  isSaving: boolean;
  isSaveButtonDisabled: boolean;
  actions?: ReactNode;
  showCancelButton: boolean;
  handleRequestClose: () => void;
  cancelText: string;
  isCloseLocked: boolean;
};

const { Context: FormModalHeaderRuntimeContext, useStrictContext: useFormModalHeaderRuntime } =
  createStrictContext<FormModalHeaderRuntimeValue>({
    hookName: 'useFormModalHeaderRuntime',
    providerName: 'FormModalHeaderRuntimeProvider',
    displayName: 'FormModalHeaderRuntimeContext',
  });

type FormModalHeaderRuntimeProviderProps = {
  value: FormModalHeaderRuntimeValue;
  children: ReactNode;
};

function FormModalHeaderRuntimeProvider(
  props: FormModalHeaderRuntimeProviderProps
): React.JSX.Element {
  const { value, children } = props;

  return (
    <FormModalHeaderRuntimeContext.Provider value={value}>
      {children}
    </FormModalHeaderRuntimeContext.Provider>
  );
}

function FormModalHeaderContent(): React.JSX.Element {
  const runtime = useFormModalHeaderRuntime();

  return (
    <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
      <div className='min-w-0'>
        <div className='flex min-w-0 items-center gap-2'>
          {runtime.showSaveButton ? (
            <FormActions
              onSave={runtime.handleSave}
              saveText={runtime.saveText}
              saveVariant={runtime.resolvedSaveVariant}
              saveIcon={runtime.saveIcon}
              isSaving={runtime.isSaving}
              isDisabled={runtime.isSaveButtonDisabled}
              className='mr-2'
            />
          ) : null}
          <h2 data-testid={runtime.titleTestId} className='truncate text-2xl font-bold tracking-tight text-white'>{runtime.title}</h2>
        </div>
        {runtime.subtitle ? <p className='mt-1 text-sm text-gray-400'>{runtime.subtitle}</p> : null}
      </div>
      <div className='flex flex-wrap items-center justify-end gap-2'>
        {runtime.actions}
        {runtime.showCancelButton ? (
          <FormActions
            onCancel={runtime.handleRequestClose}
            cancelText={runtime.cancelText}
            isSaving={runtime.isSaving}
            isDisabled={runtime.isCloseLocked}
          />
        ) : null}
      </div>
    </div>
  );
}

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

  const headerRuntimeValue = useMemo<FormModalHeaderRuntimeValue>(
    () => ({
      title,
      titleTestId,
      subtitle,
      showSaveButton,
      handleSave,
      saveText,
      resolvedSaveVariant,
      saveIcon,
      isSaving,
      isSaveButtonDisabled,
      actions,
      showCancelButton,
      handleRequestClose,
      cancelText,
      isCloseLocked,
    }),
    [
      title,
      titleTestId,
      subtitle,
      showSaveButton,
      handleSave,
      saveText,
      resolvedSaveVariant,
      saveIcon,
      isSaving,
      isSaveButtonDisabled,
      actions,
      showCancelButton,
      handleRequestClose,
      cancelText,
      isCloseLocked,
    ]
  );

  const header = (
    <FormModalHeaderRuntimeProvider value={headerRuntimeValue}>
      <FormModalHeaderContent />
    </FormModalHeaderRuntimeProvider>
  );

  return (
    <AppModal
      open={isCurrentlyOpen}
      onOpenChange={handleOpenChange}
      title={headerRuntimeValue.title}
      subtitle={headerRuntimeValue.subtitle}
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
