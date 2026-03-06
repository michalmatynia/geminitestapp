'use client';

import React, { useMemo } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

type ConfirmDialogRuntimeValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText: string;
  cancelText: string;
  variant: 'default' | 'destructive' | 'success';
  loading: boolean;
};

const { Context: ConfirmDialogRuntimeContext, useStrictContext: useConfirmDialogRuntime } =
  createStrictContext<ConfirmDialogRuntimeValue>({
    hookName: 'useConfirmDialogRuntime',
    providerName: 'ConfirmDialogRuntimeProvider',
    displayName: 'ConfirmDialogRuntimeContext',
  });

function ConfirmDialogModal(): React.JSX.Element {
  const runtime = useConfirmDialogRuntime();

  return (
    <ConfirmModal
      isOpen={runtime.open}
      onClose={() => {
        runtime.onOpenChange(false);
        runtime.onCancel?.();
      }}
      onConfirm={runtime.onConfirm}
      title={runtime.title}
      message={runtime.description}
      confirmText={runtime.confirmText}
      cancelText={runtime.cancelText}
      isDangerous={runtime.variant === 'destructive'}
      loading={runtime.loading}
    />
  );
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
}: ConfirmDialogProps): React.JSX.Element {
  const runtimeValue = useMemo<ConfirmDialogRuntimeValue>(
    () => ({
      open,
      onOpenChange,
      title,
      description,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      variant,
      loading,
    }),
    [
      open,
      onOpenChange,
      title,
      description,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      variant,
      loading,
    ]
  );

  return (
    <ConfirmDialogRuntimeContext.Provider value={runtimeValue}>
      <ConfirmDialogModal />
    </ConfirmDialogRuntimeContext.Provider>
  );
}
