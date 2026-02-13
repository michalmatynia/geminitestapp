'use client';

import React from 'react';

import { AppModal } from '@/shared/ui/app-modal';

export interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  maxHeight?: string;
}

/**
 * Reusable modal template for displaying detailed information.
 * Used for logs, previews, and read-only detail views.
 * Consolidates *DetailModal, *PreviewModal, LogModal patterns.
 */
export function DetailModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  maxHeight = 'max-h-[70vh]',
}: DetailModalProps) {
  return (
    <AppModal
      open={open}
      onOpenChange={onClose}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      footer={footer}
      bodyClassName={`${maxHeight} overflow-y-auto`}
    >
      {children}
    </AppModal>
  );
}
