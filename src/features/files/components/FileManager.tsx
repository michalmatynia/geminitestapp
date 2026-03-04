'use client';

import React from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import { Card } from '@/shared/ui';

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

export type FileManagerRuntimeValue = {
  onSelectFile?: (files: ImageFileSelection[]) => void;
};

export const FileManagerRuntimeContext = React.createContext<FileManagerRuntimeValue | null>(null);

export default function FileManager({
  onSelectFile,
  mode,
  selectionMode,
  autoConfirmSelection,
  showFolderFilter,
  defaultFolder,
  showBulkActions,
  showTagSearch,
}: FileManagerProps): React.JSX.Element {
  const runtime = React.useContext(FileManagerRuntimeContext);
  const resolvedOnSelectFile = onSelectFile ?? runtime?.onSelectFile;

  return (
    <FileManagerProvider
      {...(resolvedOnSelectFile !== undefined ? { onSelectFile: resolvedOnSelectFile } : {})}
      {...(mode !== undefined ? { mode } : {})}
      {...(selectionMode !== undefined ? { selectionMode } : {})}
      {...(autoConfirmSelection !== undefined ? { autoConfirmSelection } : {})}
      {...(showFolderFilter !== undefined ? { showFolderFilter } : {})}
      {...(defaultFolder !== undefined ? { defaultFolder } : {})}
      {...(showBulkActions !== undefined ? { showBulkActions } : {})}
      {...(showTagSearch !== undefined ? { showTagSearch } : {})}
    >
      <Card variant='glass' padding='md' className='text-white shadow-xl border-border/60'>
        <FileManagerHeader />
        <FileManagerFilters />
        <FileManagerBulkActions />
        <FileManagerContent />
        <FileManagerModals />
      </Card>
    </FileManagerProvider>
  );
}
