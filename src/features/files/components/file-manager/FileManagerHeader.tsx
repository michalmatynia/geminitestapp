'use client';

import React from 'react';

import { PanelHeader } from '@/shared/ui';

import {
  useFileManagerActions,
  useFileManagerConfig,
  useFileManagerUIState,
} from '../../contexts/FileManagerContext';

export function FileManagerHeader(): React.JSX.Element {
  const { mode, onSelectFile, autoConfirmSelection } = useFileManagerConfig();
  const { selectedFiles } = useFileManagerUIState();
  const { handleConfirmSelection } = useFileManagerActions();

  return (
    <PanelHeader
      title='File Manager'
      actions={
        mode === 'select' && onSelectFile && !autoConfirmSelection
          ? [
              {
                key: 'confirm',
                label: `Confirm Selection (${selectedFiles.length})`,
                onClick: handleConfirmSelection,
              },
            ]
          : []
      }
      className='mb-4'
    />
  );
}
