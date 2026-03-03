'use client';

import React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/utils';

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
 * Refactored to leverage AlertDialog primitive for better accessibility.
 * Consolidates destructive action confirmations across features.
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
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await Promise.resolve(onConfirm());
      onClose();
    } catch (error) {
      console.error('Confirmation error:', error);
    }
  };

  const isConfirmDisabled = loading || (onConfirmPasswordChange !== undefined && !confirmPassword?.trim());

  const sizeClasses = {
    sm: 'sm:max-w-[425px]',
    md: 'sm:max-w-[600px]',
    lg: 'sm:max-w-[800px]',
    xl: 'sm:max-w-[1000px]',
  }[size];

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className={cn(sizeClasses)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {subtitle && <AlertDialogDescription>{subtitle}</AlertDialogDescription>}
        </AlertDialogHeader>

        <div className='py-4 space-y-4'>
          {message && (
            <div className='text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed'>
              {message}
            </div>
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

        <AlertDialogFooter>
          <div className='flex gap-2 w-full'>
            {extraAction}
            <div className='flex-1' />
            <AlertDialogCancel asChild>
              <Button variant='outline' disabled={loading} onClick={onClose}>
                {cancelText}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={handleConfirm}
                variant={isDangerous ? 'destructive' : 'primary'}
                disabled={isConfirmDisabled}
                loading={loading}
              >
                {confirmText}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
