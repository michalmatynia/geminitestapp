'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { AppModal } from '@/shared/ui/app-modal';


export interface DetailModalProps extends ModalStateProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  header?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  padding?: 'default' | 'none';
  maxHeight?: string;
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
  showClose?: boolean;
}

/**
 * Reusable modal template for displaying detailed information.
 * Used for logs, previews, and read-only detail views.
 * Consolidates *DetailModal, *PreviewModal, LogModal patterns.
 */
export function DetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  header,
  headerActions,
  children,
  footer,
  size = 'md',
  padding = 'default',
  maxHeight = 'max-h-[70vh]',
  className,
  contentClassName,
  bodyClassName,
  showClose,
}: DetailModalProps) {
  return (
    <AppModal
      open={isOpen}
      onOpenChange={onClose}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      header={header}
      headerActions={headerActions}
      size={size}
      padding={padding}
      footer={footer}
      className={className}
      contentClassName={contentClassName}
      showClose={showClose}
      bodyClassName={`${maxHeight} overflow-y-auto ${bodyClassName ?? ''}`.trim()}
    >
      {children}
    </AppModal>
  );
}
