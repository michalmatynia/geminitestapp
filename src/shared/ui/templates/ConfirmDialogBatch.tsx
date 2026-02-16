'use client';

import React from 'react';

import { ConfirmModal } from './modals/ConfirmModal';


export interface ConfirmDialogConfig {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export interface ConfirmDialogBatchProps {
  dialogs: ConfirmDialogConfig[];
}

/**
 * Reusable component for rendering multiple related confirm dialogs.
 * Simplifies management of batch confirmations (e.g., delete multiple items).
 *
 * Usage:
 * ```tsx
 * <ConfirmDialogBatch
 *   dialogs={[
 *     {
 *       id: 'delete-item',
 *       open: showDelete,
 *       onOpenChange: setShowDelete,
 *       title: 'Delete Item?',
 *       onConfirm: handleDelete,
 *     },
 *   ]}
 * />
 * ```
 */
export function ConfirmDialogBatch({
  dialogs,
}: ConfirmDialogBatchProps): React.JSX.Element {
  return (
    <>
      {dialogs.map((dialog) => (
        <ConfirmModal
          key={dialog.id}
          isOpen={dialog.open}
          onClose={() => dialog.onOpenChange(false)}
          title={dialog.title}
          message={dialog.description}
          onConfirm={dialog.onConfirm}
          {...(dialog.isDestructive !== undefined ? { isDangerous: dialog.isDestructive } : {})}
          {...(dialog.confirmText !== undefined ? { confirmText: dialog.confirmText } : {})}
          {...(dialog.cancelText !== undefined ? { cancelText: dialog.cancelText } : {})}
          {...(dialog.isLoading !== undefined ? { loading: dialog.isLoading } : {})}
        />
      ))}
    </>
  );
}
