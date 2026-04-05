'use client';

import React from 'react';

import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export type StudioUploadMode =
  | 'create'
  | 'replace'
  | 'temporary-object'
  | 'environment'
  | 'assets'
  | 'slot';

export interface StudioImportContextValue {
  driveImportMode: StudioUploadMode;
  driveImportOpen: boolean;
  driveImportTargetId: string | null;
  handleCreateEmptySlot: () => Promise<void>;
  handleDriveSelection: (files: ImageFileSelection[]) => Promise<void>;
  handleLocalUpload: (files: File[]) => Promise<void>;
  projectId: string | null;
  selectedSlot: ImageStudioSlotRecord | null;
  setDriveImportMode: (mode: StudioUploadMode) => void;
  setDriveImportOpen: (open: boolean) => void;
  setDriveImportTargetId: (targetId: string | null) => void;
  setLocalUploadMode: (mode: StudioUploadMode) => void;
  setLocalUploadTargetId: (targetId: string | null) => void;
  setSlotCreateOpen: (open: boolean) => void;
  slotCreateOpen: boolean;
  triggerLocalUpload: (mode: StudioUploadMode, targetId: string | null) => void;
  uploadPending: boolean;
}

const { Context: StudioImportContext, useStrictContext: useStudioImportContext } =
  createStrictContext<StudioImportContextValue>({
    hookName: 'useStudioImportContext',
    providerName: 'StudioImportProvider',
    displayName: 'StudioImportContext',
    errorFactory: internalError,
  });

export function StudioImportProvider({
  value,
  children,
}: {
  value: StudioImportContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return <StudioImportContext.Provider value={value}>{children}</StudioImportContext.Provider>;
}
export { useStudioImportContext };
