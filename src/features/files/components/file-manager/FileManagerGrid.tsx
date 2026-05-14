'use client';

import React from 'react';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products/drafts';

import {
  useFileManagerActions,
  useFileManagerConfig,
  useFileManagerData,
  useFileManagerUIState,
} from '../../contexts/FileManagerContext';
import { FileGridItem } from './grid/FileGridItem';

export function FileManagerGrid(): React.JSX.Element {
  const { filteredFiles } = useFileManagerData();
  const { selectedFiles, setPreviewFile } = useFileManagerUIState();
  const { mode } = useFileManagerConfig();
  const { handleToggleSelect, handleDelete } = useFileManagerActions();

  return (
    <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
      {filteredFiles.map((file: ExpandedImageFile) => (
        <FileGridItem
          key={file.id}
          file={file}
          isSelected={selectedFiles.some((f: ImageFileSelection) => f.id === file.id)}
          mode={mode}
          onView={setPreviewFile}
          onDelete={handleDelete}
          onToggleSelect={handleToggleSelect}
        />
      ))}
    </div>
  );
}

