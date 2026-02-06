'use client';

import { AppModal } from './app-modal';

import type { ReactNode } from 'react';

export type SharedModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  header?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
  children: ReactNode;
};

export function SharedModal({
  open,
  onClose,
  title,
  header,
  footer,
  size = 'md',
  showClose,
  children,
}: SharedModalProps): React.JSX.Element | null {
  if (!open) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      header={header}
      footer={footer}
      showClose={showClose}
    >
      {children}
    </AppModal>
  );
}
