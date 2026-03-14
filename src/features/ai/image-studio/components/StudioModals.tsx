'use client';

import React, { useRef } from 'react';

import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { toSlotName } from './studio-modals/prompt-extract-utils';
import { slotHasRenderableImage } from './studio-modals/slot-inline-edit-utils';
import { createUploadHandlers } from './studio-modals/studio-modals-upload-handlers';
import {
  StudioImportProvider,
  type StudioImportContextValue,
  type StudioUploadMode,
} from './studio-modals/StudioImportContext';
import { StudioImportPanels } from './studio-modals/StudioImportPanels';
import { StudioInlineEditProvider } from './studio-modals/StudioInlineEditContext';
import { StudioInlineEditPanels } from './studio-modals/StudioInlineEditPanels';

export function StudioModals(): React.JSX.Element {
  const { toast } = useToast();
  const { projectId } = useProjectsState();
  const {
    slots,
    selectedSlot,
    selectedFolder,
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
  const [localUploadMode, setLocalUploadMode] = React.useState<
    'create' | 'replace' | 'temporary-object' | 'environment'
  >('create');
  const [localUploadTargetId, setLocalUploadTargetId] = React.useState<string | null>(null);

  const deleteStagedAsset = async (asset: { id: string; filepath: string }): Promise<void> => {
    if (!projectId) return;
    await api.post(`/api/image-studio/projects/${encodeURIComponent(projectId)}/assets/delete`, {
      id: asset.id,
      filepath: asset.filepath,
    });
  };

  const normalizeLocalUploadMode = (
    mode: StudioUploadMode
  ): 'create' | 'replace' | 'temporary-object' | 'environment' => {
    if (mode === 'slot') return 'replace';
    if (mode === 'assets') return 'create';
    return mode;
  };

  const setLocalUploadModeFromImport = (mode: StudioUploadMode): void => {
    setLocalUploadMode(normalizeLocalUploadMode(mode));
  };

  const setLocalUploadTargetIdFromImport = (targetId: string | null): void => {
    setLocalUploadTargetId(targetId);
  };

  const uploadHandlersDeps: Parameters<typeof createUploadHandlers>[0] = {
    applyEnvironmentReferenceDraft: () => {},
    clearTemporaryUpload: async (asset): Promise<void> => {
      await deleteStagedAsset(asset).catch(() => {});
    },
    createSlots,
    driveImportMode: normalizeLocalUploadMode(driveImportMode),
    driveImportTargetId,
    importFromDriveMutation,
    localUploadMode,
    localUploadTargetId,
    selectedFolder,
    selectedSlot,
    setDriveImportMode: (mode) => setDriveImportMode(mode),
    setDriveImportOpen,
    setDriveImportTargetId,
    setLocalUploadMode: setLocalUploadModeFromImport,
    setLocalUploadTargetId: setLocalUploadTargetIdFromImport,
    setSelectedSlotId,
    setTemporaryObjectUpload,
    slotHasRenderableImage,
    slotsCount: slots.length,
    temporaryObjectUpload,
    toast,
    toSlotName,
    updateSlotMutation,
    uploadMutation,
  };

  const {
    handleDriveSelection,
    handleCreateEmptySlot: handleCreateEmptySlotCore,
    handleLocalUpload,
  } = createUploadHandlers(uploadHandlersDeps);

  const handleCreateEmptySlot = async (): Promise<void> => {
    setSlotCreateOpen(false);
    await handleCreateEmptySlotCore();
  };

  const triggerLocalUpload = (mode: StudioUploadMode, targetId: string | null): void => {
    setLocalUploadMode(normalizeLocalUploadMode(mode));
    setLocalUploadTargetId(targetId);
    window.setTimeout(() => localUploadInputRef.current?.click(), 0);
  };

  const importContextValue: StudioImportContextValue = {
    driveImportMode,
    driveImportOpen,
    driveImportTargetId,
    handleCreateEmptySlot,
    handleDriveSelection,
    handleLocalUpload,
    projectId: projectId ?? null,
    selectedSlot,
    setDriveImportMode,
    setDriveImportOpen,
    setDriveImportTargetId,
    setLocalUploadMode: setLocalUploadModeFromImport,
    setLocalUploadTargetId: setLocalUploadTargetIdFromImport,
    setSlotCreateOpen,
    slotCreateOpen,
    triggerLocalUpload,
    uploadPending: uploadMutation.isPending,
  };

  return (
    <>
      <StudioImportProvider value={importContextValue}>
        <StudioImportPanels />
      </StudioImportProvider>

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
        aria-label='Upload images'
        title='Upload images'
      />
    </>
  );
}
