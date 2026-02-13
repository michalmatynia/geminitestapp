'use client';

import React from 'react';

import { FormModal } from '../FormModal';

import type { ReactNode } from 'react';

export interface SettingsFormModalProps {
  open: boolean;
  onClose: () => void;
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
      <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
        {children}
      </div>
    </FormModal>
  );
}
