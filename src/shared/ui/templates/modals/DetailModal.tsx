'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui';
import { AppModal } from '@/shared/ui/app-modal';
import { cn } from '@/shared/utils';

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
  closeOnOutside?: boolean | undefined;
  closeOnEscape?: boolean | undefined;
  onInteractOutside?: ((event: Event) => void) | undefined;
  onEscapeKeyDown?: ((event: KeyboardEvent) => void) | undefined;
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
  closeOnOutside,
  closeOnEscape,
  onInteractOutside,
  onEscapeKeyDown,
}: DetailModalProps): React.JSX.Element {
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
      bodyClassName={cn(maxHeight, 'overflow-y-auto', bodyClassName)}
      showClose={showClose}
      closeOnOutside={closeOnOutside}
      closeOnEscape={closeOnEscape}
      onInteractOutside={onInteractOutside}
      onEscapeKeyDown={onEscapeKeyDown}
    >
      {children}
    </AppModal>
  );
}
