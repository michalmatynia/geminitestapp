import { Upload } from 'lucide-react';
import React from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import { Button, FileUploadTrigger } from '@/shared/ui';

import { DriveImportModal } from '../modals/DriveImportModal';
import { SlotCreateModal } from '../modals/SlotCreateModal';

import type { ImageStudioSlotRecord } from '../../types';

type UploadMode = 'create' | 'replace' | 'temporary-object' | 'environment';

type StudioImportPanelsProps = {
  driveImportMode: UploadMode;
  driveImportOpen: boolean;
  driveImportTargetId: string | null;
  handleCreateEmptySlot: () => Promise<void>;
  handleDriveSelection: (files: ImageFileSelection[]) => Promise<void>;
  handleLocalUpload: (files: File[]) => Promise<void>;
  projectId: string | null;
  selectedSlot: ImageStudioSlotRecord | null;
  setDriveImportMode: (mode: UploadMode) => void;
  setDriveImportOpen: (open: boolean) => void;
  setDriveImportTargetId: (targetId: string | null) => void;
  setLocalUploadMode: (mode: UploadMode) => void;
  setLocalUploadTargetId: (targetId: string | null) => void;
  setSlotCreateOpen: (open: boolean) => void;
  slotCreateOpen: boolean;
  triggerLocalUpload: (mode: UploadMode, targetId: string | null) => void;
  uploadPending: boolean;
};

export function StudioImportPanels({
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
}: StudioImportPanelsProps): React.JSX.Element {
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
