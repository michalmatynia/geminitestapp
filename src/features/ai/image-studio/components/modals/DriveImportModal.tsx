'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

import FileManager from '@/features/files/components/FileManager';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import type { ModalStateProps } from '@/shared/types/modal-props';
import { AppModal, Button } from '@/shared/ui';

interface DriveImportModalProps extends ModalStateProps {
  title: string;
  isUploading: boolean;
  onLocalUploadTrigger: () => void;
  onSelectFile: (files: ImageFileSelection[]) => void;
}

export function DriveImportModal({
  isOpen,
  onClose,
  title,
  isUploading,
  onLocalUploadTrigger,
  onSelectFile,
}: DriveImportModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      title={title}
      size='xl'
    >
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <Button 
          size='xs'
          type='button'
          variant='outline'
          onClick={onLocalUploadTrigger}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
          Upload From Computer
        </Button>
        <span className='text-xs text-gray-400'>
          Or select existing files below.
        </span>
      </div>
      <FileManager
        mode='select'
        selectionMode='single'
        onSelectFile={onSelectFile}
      />
    </AppModal>
  );
}
