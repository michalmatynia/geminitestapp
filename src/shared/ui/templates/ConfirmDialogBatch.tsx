'use client';

import React from 'react';

import { ConfirmDialog } from '../confirm-dialog';


export interface ConfirmDialogConfig {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
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
  const handleConfirm =
    (onConfirm: () => Promise<void> | void) =>
      (): void => {
        void onConfirm();
      };

  return (
    <>
      {dialogs.map((dialog) => (
        <ConfirmDialog
          key={dialog.id}
          open={dialog.open}
          onOpenChange={dialog.onOpenChange}
          title={dialog.title}
          description={dialog.description}
          onConfirm={handleConfirm(dialog.onConfirm)}
          confirmText={dialog.confirmText}
          cancelText={dialog.cancelText}
          isDestructive={dialog.isDestructive}
          isLoading={dialog.isLoading}
        />
      ))}
    </>
  );
}
