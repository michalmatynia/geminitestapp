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
  const providerProps = React.useMemo(() => {
    const config: Partial<React.ComponentProps<typeof FileManagerProvider>> = {};
    const assignIfDefined = (key: keyof FileManagerProps): void => {
      if (props[key] !== undefined) (config as unknown as Record<string, unknown>)[key] = props[key];
    };
    // ...

    assignIfDefined('onSelectFile');
    assignIfDefined('mode');
    assignIfDefined('selectionMode');
    assignIfDefined('autoConfirmSelection');
    assignIfDefined('showFolderFilter');
    assignIfDefined('defaultFolder');
    assignIfDefined('showBulkActions');
    assignIfDefined('showTagSearch');
    assignIfDefined('filepathFilter');
    return config;
  }, [props]);


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
