'use client';

import type { JSX } from 'react';

import { ConfirmModal } from './templates/modals/ConfirmModal';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'success';
  loading?: boolean;
}

/**
 * ConfirmDialog - A simplified wrapper for the unified ConfirmModal.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps): JSX.Element {
  return (
    <ConfirmModal
      isOpen={open}
      onClose={() => {
        onOpenChange(false);
        onCancel?.();
      }}
      onConfirm={onConfirm}
      title={title}
      message={description}
      confirmText={confirmText}
      cancelText={cancelText}
      isDangerous={variant === 'destructive'}
      loading={loading}
    />
  );
}
