import React from 'react';

import type { ImageFileSelection } from '@/shared/types/domain/files';

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
  handleLocalUpload: (filesList: FileList | null) => Promise<void>;
  localUploadInputRef: React.RefObject<HTMLInputElement | null>;
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
  localUploadInputRef,
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
      <input
        ref={localUploadInputRef}
        type='file'
        accept='image/*'
        multiple={false}
        className='hidden'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          void handleLocalUpload(event.target.files);
        }}
      />
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
        onLocalUploadTrigger={() => {
          setLocalUploadMode(driveImportMode);
          setLocalUploadTargetId(
            driveImportMode === 'replace' || driveImportMode === 'environment'
              ? (driveImportTargetId ?? selectedSlot?.id ?? null)
              : null
          );
          window.setTimeout(() => localUploadInputRef.current?.click(), 0);
        }}
        onSelectFile={(files) => {
          void handleDriveSelection(files);
        }}
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
