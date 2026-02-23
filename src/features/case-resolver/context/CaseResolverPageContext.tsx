'use client';

import React from 'react';

import type {
  CaseResolverAssetFile,
  CaseResolverAssetKind,
  CaseResolverCategory,
  CaseResolverEditorNodeContext,
  CaseResolverFile,
  CaseResolverGraph,
  CaseResolverIdentifier,
  CaseResolverRelationGraph,
  CaseResolverTag,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

type CaseResolverAssetPatch = Partial<
  Pick<CaseResolverAssetFile, 'textContent' | 'description'>
>;

export type CaseResolverPageContextValue = {
  workspace: CaseResolverWorkspace;
  activeCaseId: string | null;
  requestedCaseStatus: 'loading' | 'ready' | 'missing';
  canCreateInActiveCase: boolean;
  selectedFileId: string | null;
  selectedAssetId: string | null;
  selectedFolderPath: string | null;
  panelCollapsed: boolean;
  onPanelCollapsedChange: (collapsed: boolean) => void;
  onDeactivateActiveFile: () => void;
  onSelectFile: (fileId: string) => void;
  onSelectAsset: (assetId: string) => void;
  onSelectFolder: (folderPath: string | null) => void;
  onCreateFolder: (targetFolderPath: string | null) => void;
  onCreateFile: (targetFolderPath: string | null) => void;
  onCreateScanFile: (targetFolderPath: string | null) => void;
  onCreateNodeFile: (targetFolderPath: string | null) => void;
  onCreateImageAsset: (targetFolderPath: string | null) => void;
  onUploadScanFiles: (fileId: string, files: File[]) => Promise<void>;
  onRunScanFileOcr: (fileId: string) => Promise<void>;
  onUploadAssets: (
    files: File[],
    targetFolderPath: string | null
  ) => Promise<CaseResolverAssetFile[]>;
  onAttachAssetFile: (
    assetId: string,
    file: File,
    options?: { expectedKind?: CaseResolverAssetKind | null }
  ) => Promise<CaseResolverAssetFile>;
  onMoveFile: (fileId: string, targetFolder: string) => Promise<void>;
  onMoveAsset: (assetId: string, targetFolder: string) => Promise<void>;
  onMoveFolder: (folderPath: string, targetFolder: string) => Promise<void>;
  onRenameFile: (fileId: string, nextName: string) => Promise<void>;
  onRenameAsset: (assetId: string, nextName: string) => Promise<void>;
  onRenameFolder: (folderPath: string, nextFolderPath: string) => Promise<void>;
  onDeleteFolder: (folderPath: string) => void;
  onToggleFolderLock: (folderPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onToggleFileLock: (fileId: string) => void;
  onEditFile: (
    fileId: string,
    options?: { nodeContext?: CaseResolverEditorNodeContext | null }
  ) => void;
  caseResolverTags: CaseResolverTag[];
  caseResolverIdentifiers: CaseResolverIdentifier[];
  caseResolverCategories: CaseResolverCategory[];
  onCreateDocumentFromSearch: () => void;
  onOpenFileFromSearch: (fileId: string) => void;
  onEditFileFromSearch: (fileId: string) => void;
  activeFile: CaseResolverFile | null;
  selectedAsset: CaseResolverAssetFile | null;
  onUpdateSelectedAsset: (patch: CaseResolverAssetPatch) => void;
  onGraphChange: (nextGraph: CaseResolverGraph) => void;
  onRelationGraphChange: (nextGraph: CaseResolverRelationGraph) => void;
  onLinkRelatedFiles: (fileIdA: string, fileIdB: string) => void;
  onUnlinkRelatedFile: (sourceFileId: string, targetFileId: string) => void;
  onUpdateActiveCase: (patch: Partial<Pick<CaseResolverFile, 'name' | 'parentCaseId' | 'referenceCaseIds' | 'tagId' | 'caseIdentifierId' | 'categoryId' | 'caseStatus'>>) => void;
  caseTagOptions: Array<{ value: string; label: string; description?: string }>;
  caseIdentifierOptions: Array<{ value: string; label: string; description?: string }>;
  caseCategoryOptions: Array<{ value: string; label: string; description?: string }>;
  caseReferenceOptions: Array<{ value: string; label: string; description?: string }>;
  parentCaseOptions: Array<{ value: string; label: string; description?: string }>;
  partyOptions: Array<{ value: string; label: string; description?: string }>;
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
