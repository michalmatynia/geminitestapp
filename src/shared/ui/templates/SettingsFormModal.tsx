import type { JSX, ReactNode, RefObject } from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui/ui/base';

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

type SettingsFormModalResolvedProps = {
  open: boolean;
  onClose: () => void;
  handleSave: () => void;
  title: string;
  subtitle?: string;
  isSaving: boolean;
  size: 'sm' | 'md' | 'lg' | 'xl';
  variant: 'default' | 'glass';
  padding: 'default' | 'none';
  formRef?: RefObject<HTMLFormElement | null>;
  isLoading: boolean;
  children: ReactNode;
};

const renderSettingsFormModal = (props: SettingsFormModalResolvedProps): JSX.Element => {
  const {
    open,
    onClose,
    handleSave,
    title,
    subtitle,
    isSaving,
    size,
    variant,
    padding,
    formRef,
    isLoading,
    children,
  } = props;

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
};

/**
 * Reusable modal template for CRUD settings forms.
 * Simplifies creation of consistent settings modals across features.
 */
export function SettingsFormModal(props: SettingsFormModalProps): JSX.Element {
  const {
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
  } = props;

  const handleSave = (): void => {
    void onSave();
  };

  return renderSettingsFormModal({
    open,
    onClose,
    handleSave,
    title,
    subtitle,
    isSaving,
    size,
    variant,
    padding,
    formRef,
    isLoading,
    children,
  });
}
