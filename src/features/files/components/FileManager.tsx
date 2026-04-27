'use client';

import React from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import { Card } from '@/shared/ui/primitives.public';

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
  filepathFilter?: (filepath: string) => boolean;
}

export type FileManagerRuntimeValue = {
  onSelectFile?: (files: ImageFileSelection[]) => void;
};

export const FileManagerRuntimeContext = React.createContext<FileManagerRuntimeValue | null>(null);

export default function FileManager(props: FileManagerProps): React.JSX.Element {
  const {
    onSelectFile,
    mode,
    selectionMode,
    autoConfirmSelection,
    showFolderFilter,
    defaultFolder,
    showBulkActions,
    showTagSearch,
    filepathFilter,
  } = props;

  const runtime = React.useContext(FileManagerRuntimeContext);
  const resolvedOnSelectFile = onSelectFile ?? runtime?.onSelectFile;

  const providerProps = React.useMemo(() => {
    const config: Partial<React.ComponentProps<typeof FileManagerProvider>> = {};
    if (resolvedOnSelectFile !== undefined) config.onSelectFile = resolvedOnSelectFile;
    if (mode !== undefined) config.mode = mode;
    if (selectionMode !== undefined) config.selectionMode = selectionMode;
    if (autoConfirmSelection !== undefined) config.autoConfirmSelection = autoConfirmSelection;
    if (showFolderFilter !== undefined) config.showFolderFilter = showFolderFilter;
    if (defaultFolder !== undefined) config.defaultFolder = defaultFolder;
    if (showBulkActions !== undefined) config.showBulkActions = showBulkActions;
    if (showTagSearch !== undefined) config.showTagSearch = showTagSearch;
    if (filepathFilter !== undefined) config.filepathFilter = filepathFilter;
    return config;
  }, [
    resolvedOnSelectFile,
    mode,
    selectionMode,
    autoConfirmSelection,
    showFolderFilter,
    defaultFolder,
    showBulkActions,
    showTagSearch,
    filepathFilter,
  ]);


  return (
    <FileManagerProvider {...providerProps}>
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
