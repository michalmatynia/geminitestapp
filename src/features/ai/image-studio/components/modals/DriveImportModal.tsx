'use client';

import { Loader2, Upload } from 'lucide-react';
import React from 'react';

import FileManager from '@/features/files/components/FileManager';
import type { ImageFileSelection } from '@/shared/types/domain/files';
import type { ModalStateProps } from '@/shared/types/modal-props';
import { Button } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

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
  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size='xl'
      footer={
        <Button 
          size='sm'
          type='button'
          variant='outline'
          onClick={onLocalUploadTrigger}
          disabled={isUploading}
          className='gap-2'
        >
          {isUploading ? <Loader2 className='size-4 animate-spin' /> : <Upload className='size-4' />}
          Upload From Computer
        </Button>
      }
    >
      <div className='space-y-4'>
        <p className='text-xs text-muted-foreground px-1'>
          Select existing assets from your drive or upload a new file from your device.
        </p>
        <FileManager
          mode='select'
          selectionMode='single'
          onSelectFile={onSelectFile}
        />
      </div>
    </DetailModal>
  );
}
