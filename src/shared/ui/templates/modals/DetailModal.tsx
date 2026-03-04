'use client';

import React from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui';
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
}: DetailModalProps) {
  const appModalRuntime = React.useMemo(
    () => ({
      open: isOpen,
      onOpenChange: onClose,
      onClose,
      title,
      subtitle,
      header,
      headerActions,
      size,
      padding,
      footer,
      className,
      contentClassName,
      showClose,
      closeOnOutside,
      closeOnEscape,
      onInteractOutside,
      onEscapeKeyDown,
      bodyClassName: `${maxHeight} overflow-y-auto ${bodyClassName ?? ''}`.trim(),
    }),
    [
      isOpen,
      onClose,
      title,
      subtitle,
      header,
      headerActions,
      size,
      padding,
      footer,
      className,
      contentClassName,
      showClose,
      closeOnOutside,
      closeOnEscape,
      onInteractOutside,
      onEscapeKeyDown,
      maxHeight,
      bodyClassName,
    ]
  );

  return (
    <AppModal
      open={appModalRuntime.open}
      onOpenChange={appModalRuntime.onOpenChange}
      onClose={appModalRuntime.onClose}
      title={appModalRuntime.title}
      subtitle={appModalRuntime.subtitle}
      header={appModalRuntime.header}
      headerActions={appModalRuntime.headerActions}
      size={appModalRuntime.size}
      padding={appModalRuntime.padding}
      footer={appModalRuntime.footer}
      className={appModalRuntime.className}
      contentClassName={appModalRuntime.contentClassName}
      showClose={appModalRuntime.showClose}
      closeOnOutside={appModalRuntime.closeOnOutside}
      closeOnEscape={appModalRuntime.closeOnEscape}
      onInteractOutside={appModalRuntime.onInteractOutside}
      onEscapeKeyDown={appModalRuntime.onEscapeKeyDown}
      bodyClassName={appModalRuntime.bodyClassName}
    >
      {children}
    </AppModal>
  );
}
