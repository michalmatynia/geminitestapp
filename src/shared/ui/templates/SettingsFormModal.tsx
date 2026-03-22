'use client';

import type { JSX, ReactNode, RefObject } from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui';

import { FormModal } from '../FormModal';

export interface SettingsFormModalProps extends Omit<ModalStateProps, 'isOpen'> {
  open: boolean;
  onSave: () => Promise<void>;
  title: string;
  subtitle?: string;
  children: ReactNode;
  isSaving?: boolean;
  isLoading?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'glass';
  padding?: 'default' | 'none';
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
}: SettingsFormModalProps): JSX.Element {
  const handleSave = (): void => {
    void onSave();
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSave={handleSave}
      title={title}
      subtitle={subtitle}
      isSaving={isSaving}
      saveText={isSaving ? 'Saving...' : 'Save'}
      size={size}
      variant={variant}
      padding={padding}
      formRef={formRef}
    >
      <div className={isLoading ? 'pointer-events-none opacity-50' : ''}>{children}</div>
    </FormModal>
  );
}
