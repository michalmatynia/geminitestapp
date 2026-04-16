'use client';

import React, { useMemo, useState } from 'react';

import type { ModalStateProps } from '@/shared/contracts/ui/base';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

interface RestoreModalProps extends ModalStateProps {
  backupName: string;
  onConfirm: (truncate: boolean) => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

type RestoreFormState = {
  truncate: boolean;
};

export const RestoreModal = (props: RestoreModalProps): React.JSX.Element | null => {
  const {
    isOpen,
    onClose,
    onSuccess,
    backupName,
    onConfirm,
    title = 'Restore Database',
    size = 'sm',
  } = props;

  const [values, setValues] = useState<RestoreFormState>({ truncate: true });

  const fields: SettingsPanelField<RestoreFormState>[] = useMemo(
    () => [
      {
        key: 'truncate',
        label: 'Confirmation',
        type: 'custom',
        render: () => (
          <p className='text-gray-300'>
            Are you sure you want to restore backup <strong>{backupName}</strong>?
          </p>
        ),
      },
      {
        key: 'truncate',
        label: 'Truncate (delete) existing data before restore',
        type: 'checkbox',
      },
    ],
    [backupName]
  );

  const handleSave = (): void => {
    onConfirm(values.truncate);
    onSuccess?.();
  };

  return (
    <SettingsPanelBuilder
      open={isOpen}
      onClose={onClose}
      title={title}
      fields={fields}
      values={values}
      onChange={(vals: Partial<RestoreFormState>) => setValues((prev) => ({ ...prev, ...vals }))}
      onSave={handleSave}
      saveText='Restore'
      size={size}
    />
  );
};
