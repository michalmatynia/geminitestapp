'use client';

import { Upload } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import { Button, FileUploadTrigger } from '@/shared/ui';
import FileManager, { FileManagerRuntimeContext } from '@/features/files/public';
import { DetailModal } from '@/shared/ui/templates/modals';

import { useStudioImportContext } from '../studio-modals/StudioImportContext';

export function DriveImportModal(): React.JSX.Element | null {
  const {
    driveImportMode,
    driveImportOpen,
    driveImportTargetId,
    handleDriveSelection,
    handleLocalUpload,
    selectedSlot,
    setDriveImportMode,
    setDriveImportOpen,
    setDriveImportTargetId,
    setLocalUploadMode,
    setLocalUploadTargetId,
    uploadPending,
  } = useStudioImportContext();

  const title =
    driveImportMode === 'replace'
      ? 'Attach Image To Selected Card'
      : driveImportMode === 'temporary-object'
        ? 'Select Object Image'
        : driveImportMode === 'environment'
          ? 'Select Environment Reference Image'
          : 'Import Images';

  const onClose = useCallback((): void => {
    setDriveImportOpen(false);
    setDriveImportMode('create');
    setDriveImportTargetId(null);
  }, [setDriveImportMode, setDriveImportOpen, setDriveImportTargetId]);

  const localUploadTrigger = (
    <FileUploadTrigger
      accept='image/*'
      onFilesSelected={(files: File[]) => {
        void handleLocalUpload(files);
      }}
      disabled={uploadPending}
      asChild
      preserveChildSemantics
    >
      <Button
        size='sm'
        type='button'
        variant='outline'
        disabled={uploadPending}
        className='gap-2'
        onClick={() => {
          setLocalUploadMode(driveImportMode);
          setLocalUploadTargetId(
            driveImportMode === 'replace' || driveImportMode === 'environment'
              ? (driveImportTargetId ?? selectedSlot?.id ?? null)
              : null
          );
        }}
      >
        <Upload className='size-4' />
        Upload From Computer
      </Button>
    </FileUploadTrigger>
  );

  const fileManagerRuntimeValue = useMemo(
    () => ({
      onSelectFile: (files: ImageFileSelection[]) => {
        void handleDriveSelection(files);
      },
    }),
    [handleDriveSelection]
  );

  return (
    <DetailModal
      isOpen={driveImportOpen}
      onClose={onClose}
      title={title}
      size='xl'
      footer={localUploadTrigger}
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
