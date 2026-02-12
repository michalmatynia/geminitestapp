'use client';

import React from 'react';

import { AppModal } from '../app-modal';

import type { ReactNode } from 'react';

export interface ContentDisplayModalProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showClose?: boolean;
  className?: string;
}

/**
 * Reusable modal template for displaying read-only content.
 * Used for logs, previews, results, and other non-interactive modals.
 *
 * Usage:
 * ```tsx
 * <ContentDisplayModal
 *   open={isOpen}
 *   onClose={handleClose}
 *   title="View Log"
 * >
 *   <LogContent />
 * </ContentDisplayModal>
 * ```
 */
export function ContentDisplayModal({
  open,
  onOpenChange,
  onClose,
  title,
  children,
  size = 'md',
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
      showClose={showClose}
      size={size}
      className={className}
    >
      <div className='max-h-[60vh] overflow-y-auto'>{children}</div>
    </AppModal>
  );
}
