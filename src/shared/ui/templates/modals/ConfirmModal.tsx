'use client';

import React from 'react';

import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  isDangerous?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Reusable modal template for confirmation dialogs.
 * Consolidates delete/destructive action confirmations across features.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
  isDangerous = false,
  size = 'sm',
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    try {
      await Promise.resolve(onConfirm());
      onClose();
    } catch (error) {
      console.error('Confirmation error:', error);
    }
  };

  return (
    <AppModal
      open={isOpen}
      onOpenChange={onClose}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      showClose={false}
      footer={
        <div className='flex gap-2'>
          <Button
            onClick={onClose}
            variant='outline'
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => { void handleConfirm(); }}
            variant={isDangerous ? 'destructive' : 'primary'}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      }
    >
      {message && (
        <div className='text-sm text-muted-foreground whitespace-pre-wrap'>
          {message}
        </div>
      )}
    </AppModal>
  );
}
