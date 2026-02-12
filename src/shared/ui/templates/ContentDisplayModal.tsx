'use client';

import React from 'react';

import { AppModal } from '../app-modal';

import type { ReactNode } from 'react';

export interface ContentDisplayModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'glass';
  padding?: 'default' | 'none';
  showClose?: boolean;
  className?: string;
}

/**
 * Reusable modal template for displaying read-only content.
 * Used for logs, previews, results, and other non-interactive modals.
 */
export function ContentDisplayModal({
  open,
  onOpenChange,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  variant = 'default',
  padding = 'default',
  showClose = true,
  className,
}: ContentDisplayModalProps): React.JSX.Element {
  const handleOpenChange = (newOpen: boolean): void => {
    if (!newOpen && onClose) {
      onClose();
    }
    onOpenChange?.(newOpen);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      subtitle={subtitle}
      showClose={showClose}
      size={size}
      variant={variant}
      padding={padding}
      className={className}
    >
      <div className='max-h-[60vh] overflow-y-auto'>{children}</div>
    </AppModal>
  );
}
