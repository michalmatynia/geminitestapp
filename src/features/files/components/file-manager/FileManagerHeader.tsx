'use client';

import React from 'react';

import { Button } from '@/shared/ui';

import { useFileManager } from '../../contexts/FileManagerContext';

export function FileManagerHeader(): React.JSX.Element {
  const { mode, onSelectFile, autoConfirmSelection, selectedFiles, handleConfirmSelection } = useFileManager();

  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold">File Manager</h2>
      {mode === 'select' && onSelectFile && !autoConfirmSelection && (
        <Button onClick={handleConfirmSelection}>
          Confirm Selection ({selectedFiles.length})
        </Button>
      )}
    </div>
  );
}
