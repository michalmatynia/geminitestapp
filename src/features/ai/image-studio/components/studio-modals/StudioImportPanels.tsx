import { Upload } from 'lucide-react';
import React from 'react';

import { Button, FileUploadTrigger } from '@/shared/ui';

import { DriveImportModal } from '../modals/DriveImportModal';
import { SlotCreateModal } from '../modals/SlotCreateModal';
import { useStudioImportContext } from './StudioImportContext';

export function StudioImportPanels(): React.JSX.Element {
  const {
    driveImportMode,
    driveImportOpen,
    driveImportTargetId,
    handleCreateEmptySlot,
    handleDriveSelection,
    handleLocalUpload,
    projectId,
    selectedSlot,
    setDriveImportMode,
    setDriveImportOpen,
    setDriveImportTargetId,
    setLocalUploadMode,
    setLocalUploadTargetId,
    setSlotCreateOpen,
    slotCreateOpen,
    triggerLocalUpload,
    uploadPending,
  } = useStudioImportContext();

  const driveImportTitle =
    driveImportMode === 'replace'
      ? 'Attach Image To Selected Card'
      : driveImportMode === 'temporary-object'
        ? 'Select Object Image'
        : driveImportMode === 'environment'
          ? 'Select Environment Reference Image'
          : 'Import Images';

  return (
    <>
      <DriveImportModal
        isOpen={driveImportOpen}
        onClose={() => {
          setDriveImportOpen(false);
          setDriveImportMode('create');
          setDriveImportTargetId(null);
        }}
        onSuccess={() => {}}
        title={driveImportTitle}
        isUploading={uploadPending}
        onSelectFile={(files) => {
          void handleDriveSelection(files);
        }}
        localUploadTrigger={
          <FileUploadTrigger
            accept='image/*'
            onFilesSelected={(files) => {
              void handleLocalUpload(files);
            }}
            disabled={uploadPending}
            asChild
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
        }
      />

      <SlotCreateModal
        isOpen={slotCreateOpen}
        onClose={() => setSlotCreateOpen(false)}
        onSuccess={() => {}}
        disabled={!projectId}
        onSelectMode={(mode) => {
          if (mode === 'empty') {
            void handleCreateEmptySlot();
          } else if (mode === 'image') {
            setSlotCreateOpen(false);
            setDriveImportMode('create');
            setDriveImportTargetId(null);
            setDriveImportOpen(true);
          } else if (mode === 'local') {
            setSlotCreateOpen(false);
            triggerLocalUpload('create', null);
          }
        }}
      />
    </>
  );
}
