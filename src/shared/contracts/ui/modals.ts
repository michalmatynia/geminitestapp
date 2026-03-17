import type { ReactNode } from 'react';
import type { ModalStateProps } from './base';

export interface EntityModalProps<T, TList = T> extends ModalStateProps {
  item?: T | null;
  items?: TList[];
  loading?: boolean;
  defaultId?: string;
  error?: string | null;
}

export interface ModalHeaderProps {
  title: string;
  isLoading?: boolean;
  showClose?: boolean;
  subtitle?: string;
}

export interface ModalFooterProps {
  saveLabel?: string;
  cancelLabel?: string;
  isSaveDisabled?: boolean;
  isLoading?: boolean;
  onSave?: () => void | Promise<void>;
}

export interface ModalContentProps {
  children: ReactNode;
  className?: string;
  isLoading?: boolean;
}

export interface SimpleModalProps extends ModalStateProps {
  title: string;
  isLoading?: boolean;
  error?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface MultiSectionModalProps extends ModalStateProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  error?: string | null;
}
