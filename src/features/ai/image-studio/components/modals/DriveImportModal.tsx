'use client';

import { Upload } from 'lucide-react';
import React, { useMemo } from 'react';

import FileManager, { FileManagerRuntimeContext } from '@/features/files/components/FileManager';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ModalStateProps } from '@/shared/contracts/ui';
import { Button } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

interface DriveImportModalProps extends ModalStateProps {
  title: string;
  isUploading: boolean;
  localUploadTrigger?: React.ReactNode;
  onSelectFile: (files: ImageFileSelection[]) => void;
}

export function DriveImportModal(props: DriveImportModalProps): React.JSX.Element | null {
  const { isOpen, onClose, title, isUploading, localUploadTrigger, onSelectFile } = props;

  const fileManagerRuntimeValue = useMemo(() => ({ onSelectFile }), [onSelectFile]);

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size='xl'
      footer={
        localUploadTrigger || (
          <Button
            size='sm'
            type='button'
            variant='outline'
            disabled={isUploading}
            className='gap-2'
            loading={isUploading}
          >
            <Upload className='size-4' />
            Upload From Computer
          </Button>
        )
      }
    >
      <div className='space-y-4'>
        <p className='text-xs text-muted-foreground px-1'>
          Select existing assets from your drive or upload a new file from your device.
        </p>
        <FileManagerRuntimeContext.Provider value={fileManagerRuntimeValue}>
          <FileManager mode='select' selectionMode='single' />
        </FileManagerRuntimeContext.Provider>
      </div>
    </DetailModal>
  );
}
