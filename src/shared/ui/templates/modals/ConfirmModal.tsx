'use client';

import React from 'react';

import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';

import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  subtitle?: string;
  message?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  extraAction?: React.ReactNode;
  loading?: boolean;
  isDangerous?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  confirmPassword?: string;
  onConfirmPasswordChange?: (value: string) => void;
  confirmPasswordLabel?: string;
  children?: React.ReactNode;
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
  extraAction,
  loading = false,
  isDangerous = false,
  size = 'sm',
  confirmPassword,
  onConfirmPasswordChange,
  confirmPasswordLabel = 'Confirm with your user password',
  children,
}: ConfirmModalProps) {
  const handleConfirm = async () => {
    try {
      await Promise.resolve(onConfirm());
      onClose();
    } catch (error) {
      console.error('Confirmation error:', error);
    }
  };

  const isConfirmDisabled = loading || (onConfirmPasswordChange !== undefined && !confirmPassword?.trim());

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
        <div className='flex gap-2 w-full'>
          {extraAction}
          <div className='flex-1' />
          <Button onClick={onClose} variant='outline' disabled={loading}>
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              void handleConfirm();
            }}
            variant={isDangerous ? 'destructive' : 'primary'}
            disabled={isConfirmDisabled}
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        {message && (
          <div className='text-sm text-muted-foreground whitespace-pre-wrap'>{message}</div>
        )}

        {onConfirmPasswordChange && (
          <div className='space-y-2'>
            <Label className='text-xs font-medium text-gray-300'>
              {confirmPasswordLabel}
            </Label>
            <Input
              type='password'
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder='Enter your password'
              disabled={loading}
              autoFocus
            />
          </div>
        )}

        {children}
      </div>
    </AppModal>
  );
}
