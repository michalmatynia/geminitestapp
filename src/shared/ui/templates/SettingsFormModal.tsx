'use client';

import React from 'react';

import { FormModal } from '../FormModal';

import type { ReactNode } from 'react';

export interface SettingsFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  title: string;
  children: ReactNode;
  isSaving?: boolean;
  isLoading?: boolean;
  formRef?: React.RefObject<HTMLFormElement | null>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Reusable modal template for CRUD settings forms.
 * Simplifies creation of consistent settings modals across features.
 *
 * Usage:
 * ```tsx
 * <SettingsFormModal
 *   open={isOpen}
 *   onClose={handleClose}
 *   onSave={handleSave}
 *   title="Edit Country"
 * >
 *   <FormField>...</FormField>
 *   <FormField>...</FormField>
 * </SettingsFormModal>
 * ```
 */
export function SettingsFormModal({
  open,
  onClose,
  onSave,
  title,
  children,
  isSaving = false,
  isLoading = false,
  formRef,
  size = 'md',
}: SettingsFormModalProps): React.JSX.Element {
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
      formRef={formRef}
      size={size}
    >
      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        {children}
      </div>
    </FormModal>
  );
}
