'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
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
import { logSystemEvent } from '@/shared/lib/observability/system-logger-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


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
  confirmDisabled?: boolean;
  isDangerous?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  confirmPassword?: string;
  onConfirmPasswordChange?: (value: string) => void;
  confirmPasswordLabel?: string;
  children?: React.ReactNode;
}

type ConfirmModalRuntimeValue = {
  loading: boolean;
  onClose: () => void;
  handleConfirm: (event: React.MouseEvent) => void;
  cancelText: string;
  confirmText: string;
  isDangerous: boolean;
  isConfirmDisabled: boolean;
  extraAction?: React.ReactNode;
  onConfirmPasswordChange?: (value: string) => void;
  confirmPassword?: string;
  confirmPasswordLabel: string;
  resolvedDescription: string;
  hasSubtitle: boolean;
  confirmDisabled: boolean;
};

const { Context: ConfirmModalRuntimeContext, useStrictContext: useConfirmModalRuntime } =
  createStrictContext<ConfirmModalRuntimeValue>({
    hookName: 'useConfirmModalRuntime',
    providerName: 'ConfirmModalRuntimeProvider',
    displayName: 'ConfirmModalRuntimeContext',
  });

function ConfirmModalPasswordField(): React.JSX.Element | null {
  const runtime = useConfirmModalRuntime();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const inputId = React.useId().replace(/:/g, '');
  React.useEffect(() => {
    if (!runtime.loading) {
      inputRef.current?.focus();
    }
  }, [runtime.loading]);
  if (!runtime.onConfirmPasswordChange) return null;

  return (
    <div className='space-y-2'>
      <Label htmlFor={inputId} className='text-xs font-medium text-gray-300'>
        {runtime.confirmPasswordLabel}
      </Label>
      <Input
        id={inputId}
        ref={inputRef}
        type='password'
        value={runtime.confirmPassword}
        onChange={(event) => runtime.onConfirmPasswordChange?.(event.target.value)}
        placeholder='Enter your password'
        disabled={runtime.loading}
       aria-label='Enter your password' title='Enter your password'/>
    </div>
  );
}

function ConfirmModalFooterActions(): React.JSX.Element {
  const runtime = useConfirmModalRuntime();

  return (
    <div className='flex gap-2 w-full'>
      {runtime.extraAction}
      <div className='flex-1' />
      <AlertDialogCancel asChild>
        <Button variant='outline' disabled={runtime.loading} onClick={runtime.onClose}>
          {runtime.cancelText}
        </Button>
      </AlertDialogCancel>
      <AlertDialogAction asChild>
        <Button
          onClick={(event) => runtime.handleConfirm(event)}
          variant={runtime.isDangerous ? 'destructive' : 'primary'}
          disabled={runtime.isConfirmDisabled}
          loading={runtime.loading}
        >
          {runtime.confirmText}
        </Button>
      </AlertDialogAction>
    </div>
  );
}

function ConfirmModalDescription(): React.JSX.Element {
  const runtime = useConfirmModalRuntime();
  return (
    <AlertDialogDescription className={runtime.hasSubtitle ? undefined : 'sr-only'}>
      {runtime.resolvedDescription}
    </AlertDialogDescription>
  );
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
  subtitle: modalSubtitle,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  extraAction,
  loading = false,
  confirmDisabled = false,
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
    loading || confirmDisabled || (onConfirmPasswordChange !== undefined && !confirmPassword?.trim());
  const resolvedDescription =
    modalSubtitle ??
    (typeof message === 'string' && message.trim().length > 0 ? message : 'Confirm this action.');

  const sizeClasses = {
    sm: 'sm:max-w-[425px]',
    md: 'sm:max-w-[600px]',
    lg: 'sm:max-w-[800px]',
    xl: 'sm:max-w-[1000px]',
  }[size];
  const runtimeValue = React.useMemo<ConfirmModalRuntimeValue>(
    () => ({
      loading,
      onClose,
      handleConfirm: (event: React.MouseEvent): void => {
        void handleConfirm(event);
      },
      cancelText,
      confirmText,
      isDangerous,
      isConfirmDisabled,
      extraAction,
      onConfirmPasswordChange,
      confirmPassword,
      confirmPasswordLabel,
      resolvedDescription,
      hasSubtitle: Boolean(modalSubtitle),
      confirmDisabled,
    }),
    [
      loading,
      onClose,
      cancelText,
      confirmText,
      isDangerous,
      isConfirmDisabled,
      extraAction,
      onConfirmPasswordChange,
      confirmPassword,
      confirmPasswordLabel,
      resolvedDescription,
      modalSubtitle,
      confirmDisabled,
    ]
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ConfirmModalRuntimeContext.Provider value={runtimeValue}>
        <AlertDialogContent className={cn(sizeClasses)}>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <ConfirmModalDescription />
          </AlertDialogHeader>

          <div className='py-4 space-y-4'>
            {message && (
              <div className='text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed'>
                {message}
              </div>
            )}

            <ConfirmModalPasswordField />

            {children}
          </div>

          <AlertDialogFooter>
            <ConfirmModalFooterActions />
          </AlertDialogFooter>
        </AlertDialogContent>
      </ConfirmModalRuntimeContext.Provider>
    </AlertDialog>
  );
}
