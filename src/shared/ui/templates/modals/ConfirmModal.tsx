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
import { cn } from '@/shared/utils/ui-utils';
import { logSystemEvent } from '@/shared/lib/observability/system-logger-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => boolean | void | Promise<boolean | void>;
  title: string;
  subtitle?: string;
  message?: React.ReactNode;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  extraAction?: React.ReactNode;
  loading?: boolean;
  confirmDisabled?: boolean;
  isDangerous?: boolean;
  variant?: 'default' | 'danger' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  confirmPassword?: string;
  onConfirmPasswordChange?: (value: string) => void;
  confirmPasswordLabel?: string;
  children?: React.ReactNode;
}

type ConfirmModalDescriptionProps = {
  description: string;
  hasSubtitle: boolean;
};

function ConfirmModalDescription({
  description,
  hasSubtitle,
}: ConfirmModalDescriptionProps): React.JSX.Element {
  return (
    <AlertDialogDescription className={hasSubtitle ? undefined : 'sr-only'}>
      {description}
    </AlertDialogDescription>
  );
}

type ConfirmModalResolvedProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  resolvedDescription: string;
  modalSubtitle?: string;
  message?: React.ReactNode;
  onConfirmPasswordChange?: (value: string) => void;
  passwordInputId: string;
  passwordInputRef: React.RefObject<HTMLInputElement | null>;
  confirmPassword?: string;
  loading: boolean;
  confirmPasswordLabel: string;
  children?: React.ReactNode;
  extraAction?: React.ReactNode;
  cancelText: string;
  isDangerous: boolean;
  isConfirmDisabled: boolean;
  handleConfirm: (event: React.MouseEvent) => Promise<void>;
  confirmText: string;
  sizeClasses: string;
};

const renderConfirmModal = ({
  isOpen,
  onClose,
  title,
  resolvedDescription,
  modalSubtitle,
  message,
  onConfirmPasswordChange,
  passwordInputId,
  passwordInputRef,
  confirmPassword,
  loading,
  confirmPasswordLabel,
  children,
  extraAction,
  cancelText,
  isDangerous,
  isConfirmDisabled,
  handleConfirm,
  confirmText,
  sizeClasses,
}: ConfirmModalResolvedProps): React.JSX.Element => (
  <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <AlertDialogContent className={cn(sizeClasses)}>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <ConfirmModalDescription
          description={resolvedDescription}
          hasSubtitle={Boolean(modalSubtitle)}
        />
      </AlertDialogHeader>

      <div className='space-y-4 py-4'>
        {message ? (
          <div className='whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground'>
            {message}
          </div>
        ) : null}

        {onConfirmPasswordChange ? (
          <div className='space-y-2'>
            <Label htmlFor={passwordInputId} className='text-xs font-medium text-gray-300'>
              {confirmPasswordLabel}
            </Label>
            <Input
              id={passwordInputId}
              ref={passwordInputRef}
              type='password'
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              placeholder='Enter your password'
              disabled={loading}
              aria-label='Enter your password'
              title='Enter your password'
            />
          </div>
        ) : null}

        {children}
      </div>

      <AlertDialogFooter>
        <div className='flex w-full gap-2'>
          {extraAction}
          <div className='flex-1' />
          <AlertDialogCancel asChild>
            <Button variant='outline' disabled={loading} onClick={onClose}>
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={(event) => {
                void handleConfirm(event);
              }}
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

/**
 * Reusable modal template for confirmation dialogs.
 * Refactored to leverage AlertDialog primitive for better accessibility.
 * Consolidates destructive action confirmations across features.
 */
export function ConfirmModal(props: ConfirmModalProps): React.JSX.Element {
  const {
    isOpen,
    onClose,
    onConfirm,
    title,
    subtitle: modalSubtitle,
    message,
    confirmText = 'Confirm',
    confirmLabel,
    cancelText = 'Cancel',
    extraAction,
    loading = false,
    confirmDisabled = false,
    isDangerous = false,
    variant = 'default',
    size = 'sm',
    confirmPassword,
    onConfirmPasswordChange,
    confirmPasswordLabel = 'Confirm with your user password',
    children,
  } = props;
  const passwordInputRef = React.useRef<HTMLInputElement | null>(null);
  const passwordInputId = React.useId().replace(/:/g, '');

  React.useEffect(() => {
    if (!loading) {
      passwordInputRef.current?.focus();
    }
  }, [loading]);

  const handleConfirm = async (event: React.MouseEvent): Promise<void> => {
    event.preventDefault();

    try {
      const result = await Promise.resolve(onConfirm());
      if (result !== false) {
        onClose();
      }
    } catch (error) {
      logClientCatch(error, {
        source: 'ConfirmModal',
        action: 'confirm',
        level: 'warn',
      });
      void logSystemEvent({
        level: 'error',
        source: 'ConfirmModal',
        message: 'Confirmation handler failed',
        error,
      });
    }
  };

  const isConfirmDisabled =
    loading ||
    confirmDisabled ||
    (onConfirmPasswordChange !== undefined && !confirmPassword?.trim());
  const isDestructiveVariant = variant === 'danger' || variant === 'destructive';
  const resolvedDescription =
    modalSubtitle ??
    (typeof message === 'string' && message.trim().length > 0 ? message : 'Confirm this action.');
  const sizeClasses = {
    sm: 'sm:max-w-[425px]',
    md: 'sm:max-w-[600px]',
    lg: 'sm:max-w-[800px]',
    xl: 'sm:max-w-[1000px]',
  }[size];

  return renderConfirmModal({
    isOpen,
    onClose,
    title,
    resolvedDescription,
    modalSubtitle,
    message,
    onConfirmPasswordChange,
    passwordInputId,
    passwordInputRef,
    confirmPassword,
    loading,
    confirmPasswordLabel,
    children,
    extraAction,
    cancelText,
    isDangerous: isDangerous || isDestructiveVariant,
    isConfirmDisabled,
    handleConfirm,
    confirmText: confirmLabel ?? confirmText,
    sizeClasses,
  });
}
