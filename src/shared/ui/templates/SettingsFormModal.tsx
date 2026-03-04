'use client';

import React, { useMemo } from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import { FormModal } from '../FormModal';

import type { ReactNode } from 'react';

export interface SettingsFormModalProps extends Omit<ModalStateProps, 'isOpen'> {
  open: boolean;
  onSave: () => Promise<void>;
  title: string;
  subtitle?: string;
  children: ReactNode;
  isSaving?: boolean;
  isLoading?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'glass';
  padding?: 'default' | 'none';
}

type SettingsFormModalRuntimeValue = {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  title: string;
  subtitle?: string;
  children: ReactNode;
  isSaving: boolean;
  isLoading: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  size: 'sm' | 'md' | 'lg' | 'xl';
  variant: 'default' | 'glass';
  padding: 'default' | 'none';
};

const {
  Context: SettingsFormModalRuntimeContext,
  useStrictContext: useSettingsFormModalRuntime,
} = createStrictContext<SettingsFormModalRuntimeValue>({
  hookName: 'useSettingsFormModalRuntime',
  providerName: 'SettingsFormModalRuntimeProvider',
  displayName: 'SettingsFormModalRuntimeContext',
});

function SettingsFormModalRuntime(): React.JSX.Element {
  const {
    open,
    onClose,
    onSave,
    title,
    subtitle,
    children,
    isSaving,
    isLoading,
    formRef,
    size,
    variant,
    padding,
  } = useSettingsFormModalRuntime();
  const handleSave = (): void => {
    void onSave();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title={title}
      isSaving={isSaving}
      saveText={isSaving ? 'Saving...' : 'Save'}
      size={size}
      variant={variant}
      padding={padding}
      {...(subtitle !== undefined ? { subtitle } : {})}
      {...(formRef !== undefined ? { formRef } : {})}
    >
      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>{children}</div>
    </FormModal>
  );
}

/**
 * Reusable modal template for CRUD settings forms.
 * Simplifies creation of consistent settings modals across features.
 */
export function SettingsFormModal({
  open,
  onClose,
  onSave,
  title,
  subtitle,
  children,
  isSaving = false,
  isLoading = false,
  formRef,
  size = 'md',
  variant = 'default',
  padding = 'default',
}: SettingsFormModalProps): React.JSX.Element {
  const runtimeValue = useMemo(
    () => ({
      open,
      onClose,
      onSave,
      title,
      subtitle,
      children,
      isSaving,
      isLoading,
      formRef,
      size,
      variant,
      padding,
    }),
    [
      children,
      formRef,
      isLoading,
      isSaving,
      onClose,
      onSave,
      open,
      padding,
      size,
      subtitle,
      title,
      variant,
    ]
  );

  return (
    <SettingsFormModalRuntimeContext.Provider value={runtimeValue}>
      <SettingsFormModalRuntime />
    </SettingsFormModalRuntimeContext.Provider>
  );
}
