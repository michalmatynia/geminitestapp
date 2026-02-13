'use client';

import React from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverWorkspace,
} from '../types';

type CaseResolverAssetPatch = Partial<
  Pick<CaseResolverAssetFile, 'textContent' | 'description'>
>;

export type CaseResolverPageContextValue = {
  workspace: CaseResolverWorkspace;
  selectedFileId: string | null;
  selectedAssetId: string | null;
  selectedFolderPath: string | null;
  panelCollapsed: boolean;
  onPanelCollapsedChange: (collapsed: boolean) => void;
  onSelectFile: (fileId: string) => void;
  onSelectAsset: (assetId: string) => void;
  onSelectFolder: (folderPath: string | null) => void;
  onCreateFolder: (targetFolderPath: string | null) => void;
  onCreateFile: (targetFolderPath: string | null) => void;
  onCreateNodeFile: (targetFolderPath: string | null) => void;
  onUploadAssets: (
    files: File[],
    targetFolderPath: string | null
  ) => Promise<CaseResolverAssetFile[]>;
  onMoveFile: (fileId: string, targetFolder: string) => Promise<void>;
  onMoveAsset: (assetId: string, targetFolder: string) => Promise<void>;
  onMoveFolder: (folderPath: string, targetFolder: string) => Promise<void>;
  onRenameFile: (fileId: string, nextName: string) => Promise<void>;
  onRenameAsset: (assetId: string, nextName: string) => Promise<void>;
  onRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  onDeleteFile: (fileId: string) => void;
  onToggleFileLock: (fileId: string) => void;
  onEditFile: (fileId: string) => void;
  activeFile: CaseResolverFile | null;
  selectedAsset: CaseResolverAssetFile | null;
  onUpdateSelectedAsset: (patch: CaseResolverAssetPatch) => void;
};

const CaseResolverPageContext = React.createContext<CaseResolverPageContextValue | null>(null);

type CaseResolverPageProviderProps = {
  value: CaseResolverPageContextValue;
  children: React.ReactNode;
};

export function CaseResolverPageProvider({
  value,
  children,
}: CaseResolverPageProviderProps): React.JSX.Element {
  return (
    <CaseResolverPageContext.Provider value={value}>
      {children}
    </CaseResolverPageContext.Provider>
  );
}

export function useCaseResolverPageContext(): CaseResolverPageContextValue {
  const context = React.useContext(CaseResolverPageContext);
  if (!context) {
    throw new Error('useCaseResolverPageContext must be used within CaseResolverPageProvider');
  }
  return context;
}
