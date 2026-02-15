'use client';

import { useState } from 'react';

import type { SimpleModalProps } from '@/shared/types/modal-props';
import { Label, Checkbox, FormModal } from '@/shared/ui';

interface RestoreModalProps extends Omit<SimpleModalProps, 'title' | 'onSuccess'> {
  title?: string;
  onSuccess?: () => void;
  backupName: string;
  onConfirm: (truncate: boolean) => void;
}

export const RestoreModal = ({
  isOpen,
  onClose,
  backupName,
  onConfirm,
  title = 'Restore Database',
  size = 'sm',
}: RestoreModalProps): React.JSX.Element | null => {
  const [truncate, setTruncate] = useState(true);

  if (!isOpen) return null;

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={title}
      onSave={(): void => onConfirm(truncate)}
      saveText='Restore'
      cancelText='Cancel'
      size={size}
    >
      <p className='mb-4 text-gray-300'>
        Are you sure you want to restore backup <strong>{backupName}</strong>?
      </p>
      <Label className='mb-6 flex cursor-pointer items-center gap-2'>
        <Checkbox
          className='size-4 accent-emerald-500'
          checked={truncate}
          onCheckedChange={(checked: boolean | 'indeterminate'): void => setTruncate(Boolean(checked))}
        />
        <span className='text-sm text-gray-300'>
          Truncate (delete) existing data before restore
        </span>
      </Label>
    </FormModal>
  );
};
