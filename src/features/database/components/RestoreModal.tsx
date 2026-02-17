'use client';

import React, { useMemo, useState } from 'react';

import type { ModalStateProps } from '@/shared/types/modal-props';
import { SettingsPanelBuilder, type SettingsField } from '@/shared/ui/templates/SettingsPanelBuilder';

interface RestoreModalProps extends ModalStateProps {
  backupName: string;
  onConfirm: (truncate: boolean) => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

type RestoreFormState = {
  truncate: boolean;
};

export const RestoreModal = ({
  isOpen,
  onClose,
  onSuccess,
  backupName,
  onConfirm,
  title = 'Restore Database',
  size = 'sm',
}: RestoreModalProps): React.JSX.Element | null => {
  const [values, setValues] = useState<RestoreFormState>({ truncate: true });

  const fields: SettingsField<RestoreFormState>[] = useMemo(() => [
    {
      key: 'truncate',
      label: 'Confirmation',
      type: 'custom',
      render: () => (
        <p className='text-gray-300'>
          Are you sure you want to restore backup <strong>{backupName}</strong>?
        </p>
      )
    },
    {
      key: 'truncate',
      label: 'Truncate (delete) existing data before restore',
      type: 'checkbox',
    }
  ], [backupName]);

  const handleSave = async () => {
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
      onChange={(vals) => setValues(prev => ({ ...prev, ...vals }))}
      onSave={handleSave}
      saveText='Restore'
      size={size}
    />
  );
};
