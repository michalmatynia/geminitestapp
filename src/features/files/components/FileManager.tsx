'use client';

import React from 'react';

import type { ImageFileSelection } from '@/shared/types/files';

import { FileManagerProvider } from '../contexts/FileManagerContext';
import { FileManagerBulkActions } from './file-manager/FileManagerBulkActions';
import { FileManagerContent } from './file-manager/FileManagerContent';
import { FileManagerFilters } from './file-manager/FileManagerFilters';
import { FileManagerHeader } from './file-manager/FileManagerHeader';
import { FileManagerModals } from './file-manager/FileManagerModals';

interface FileManagerProps {
  onSelectFile?: (files: ImageFileSelection[]) => void;
  mode?: 'view' | 'select';
  showFileManager?: boolean;
  selectionMode?: 'single' | 'multiple';
  autoConfirmSelection?: boolean;
  showFolderFilter?: boolean;
  defaultFolder?: string;
  showBulkActions?: boolean;
  showTagSearch?: boolean;
}

export default function FileManager(props: FileManagerProps): React.JSX.Element {
  return (
    <FileManagerProvider {...props}>
      <div className='p-4 bg-gray-900 text-white rounded-lg shadow-xl border border-gray-800'>
        <FileManagerHeader />
        <FileManagerFilters />
        <FileManagerBulkActions />
        <FileManagerContent />
        <FileManagerModals />
      </div>
    </FileManagerProvider>
  );
}