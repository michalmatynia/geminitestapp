'use client';

import React, { useRef } from 'react';

import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { toSlotName } from './studio-modals/prompt-extract-utils';
import { slotHasRenderableImage } from './studio-modals/slot-inline-edit-utils';
import { createUploadHandlers } from './studio-modals/studio-modals-upload-handlers';
import { StudioImportPanels } from './studio-modals/StudioImportPanels';
import { StudioInlineEditProvider } from './studio-modals/StudioInlineEditContext';
import { StudioInlineEditPanels } from './studio-modals/StudioInlineEditPanels';


export function StudioModals(): React.JSX.Element {
  const { toast } = useToast();
  const { projectId } = useProjectsState();
  const {
    slots,
    selectedSlot,
    slotCreateOpen,
    driveImportOpen,
    driveImportMode,
    driveImportTargetId,
    temporaryObjectUpload,
  } = useSlotsState();
  const {
    setSelectedSlotId,
    createSlots,
    updateSlotMutation,
    setSlotCreateOpen,
    setDriveImportOpen,
    setDriveImportMode,
    setDriveImportTargetId,
    setTemporaryObjectUpload,
    importFromDriveMutation,
    uploadMutation,
  } = useSlotsActions();

  const localUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [localUploadMode, setLocalUploadMode] = React.useState<'create' | 'replace' | 'temporary-object' | 'environment'>('create');
  const [localUploadTargetId, setLocalUploadTargetId] = React.useState<string | null>(null);

  const deleteStagedAsset = async (asset: { id: string; filepath: string }): Promise<void> => {
    if (!projectId) return;
    await api.post(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/delete`, {
      id: asset.id,
      filepath: asset.filepath,
    });
  };

  const {
    handleDriveSelection,
    handleCreateEmptySlot: handleCreateEmptySlotCore,
    handleLocalUpload,
  } = createUploadHandlers({
    applyEnvironmentReferenceDraft: () => {}, // Handled in provider for inline edit
    clearTemporaryUpload: async (asset): Promise<void> => {
      await deleteStagedAsset(asset).catch(() => {});
    },
    createSlots,
    driveImportMode,
    driveImportTargetId,
    importFromDriveMutation: importFromDriveMutation as any,
    localUploadMode,
    localUploadTargetId,
    selectedFolder: '', // From SlotsContext normally
    selectedSlot,
    setDriveImportMode,
    setDriveImportOpen,
    setDriveImportTargetId,
    setLocalUploadMode,
    setLocalUploadTargetId,
    setSelectedSlotId,
    setTemporaryObjectUpload,
    slotHasRenderableImage,
    slotsCount: slots.length,
    temporaryObjectUpload: temporaryObjectUpload as any,
    toast: toast as any,
    toSlotName,
    updateSlotMutation: updateSlotMutation as any,
    uploadMutation: uploadMutation as any,
  });

  const handleCreateEmptySlot = async (): Promise<void> => { 
    setSlotCreateOpen(false); 
    await handleCreateEmptySlotCore(); 
  };

  const triggerLocalUpload = (mode: 'create' | 'replace' | 'temporary-object' | 'environment', targetId: string | null): void => {
    setLocalUploadMode(mode);
    setLocalUploadTargetId(targetId);
    window.setTimeout(() => localUploadInputRef.current?.click(), 0);
  };

  return (
    <>
      <StudioImportPanels
        driveImportMode={driveImportMode}
        driveImportOpen={driveImportOpen}
        driveImportTargetId={driveImportTargetId}
        handleCreateEmptySlot={handleCreateEmptySlot}
        handleDriveSelection={handleDriveSelection}
        handleLocalUpload={handleLocalUpload}
        projectId={projectId ?? null}
        selectedSlot={selectedSlot}
        setDriveImportMode={setDriveImportMode}
        setDriveImportOpen={setDriveImportOpen}
        setDriveImportTargetId={setDriveImportTargetId}
        setLocalUploadMode={setLocalUploadMode}
        setLocalUploadTargetId={setLocalUploadTargetId}
        setSlotCreateOpen={setSlotCreateOpen}
        slotCreateOpen={slotCreateOpen}
        triggerLocalUpload={triggerLocalUpload}
        uploadPending={uploadMutation.isPending}
      />

      <StudioInlineEditProvider triggerLocalUpload={triggerLocalUpload}>
        <StudioInlineEditPanels />
      </StudioInlineEditProvider>

      <input
        type='file'
        ref={localUploadInputRef}
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          void handleLocalUpload(files);
        }}
        className='hidden'
        accept='image/*'
        multiple={localUploadMode === 'create'}
      />
    </>
  );
}
