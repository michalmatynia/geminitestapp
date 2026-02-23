'use client';

import React, { createContext, useContext } from 'react';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

export type StudioUploadMode = 'create' | 'replace' | 'temporary-object' | 'environment';

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

const StudioImportContext = createContext<StudioImportContextValue | null>(null);

export function StudioImportProvider({
  value,
  children,
}: {
  value: StudioImportContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <StudioImportContext.Provider value={value}>
      {children}
    </StudioImportContext.Provider>
  );
}

export function useStudioImportContext(): StudioImportContextValue {
  const context = useContext(StudioImportContext);
  if (!context) {
    throw new Error('useStudioImportContext must be used within StudioImportProvider');
  }
  return context;
}
