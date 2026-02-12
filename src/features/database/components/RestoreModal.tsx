'use client';

import { useState } from 'react';

import { Label, Checkbox, FormModal } from '@/shared/ui';

type RestoreModalProps = {
  backupName: string;
  onClose: () => void;
  onConfirm: (truncate: boolean) => void;
};

export const RestoreModal = ({
  backupName,
  onClose,
  onConfirm,
}: RestoreModalProps): React.JSX.Element => {
  const [truncate, setTruncate] = useState(true);

  return (
    <FormModal
      open={true}
      onClose={onClose}
      title='Restore Database'
      onSave={(): void => onConfirm(truncate)}
      saveText='Restore'
      cancelText='Cancel'
      size='sm'
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
