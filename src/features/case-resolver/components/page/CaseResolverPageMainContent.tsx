'use client';

import { FileText } from 'lucide-react';
import React from 'react';

import { Card, CompactEmptyState } from '@/shared/ui';

import { useCaseResolverViewStateContext } from '../CaseResolverViewContext';
import { CaseResolverDocumentEditor } from './CaseResolverDocumentEditor';
import { CaseResolverScanFileEditor } from './CaseResolverScanFileEditor';
import { CaseResolverCanvasWorkspace } from '../CaseResolverCanvasWorkspace';
import { CaseResolverCaseOverviewWorkspace } from '../CaseResolverCaseOverviewWorkspace';
import { CaseResolverFileViewer } from '../CaseResolverFileViewer';
import { CaseResolverNodeFileWorkspace } from '../CaseResolverNodeFileWorkspace';
import { CaseResolverRelationsWorkspace } from '../CaseResolverRelationsWorkspace';

export function CaseResolverPageMainContent(): React.JSX.Element {
  const { state, workspaceView } = useCaseResolverViewStateContext();

  const {
    workspace,
    activeCaseId,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    editingDocumentDraft,
    activeFile,
    selectedAsset,
  } = state;
  const selectedFile = selectedFileId
    ? (workspace.files.find((file): boolean => file.id === selectedFileId) ?? null)
    : null;
  const selectedCaseFile = selectedFile?.fileType === 'case' ? selectedFile : null;
  const activeCaseFile = activeFile?.fileType === 'case' ? activeFile : null;
  const resolvedCaseContextFile =
    selectedCaseFile ??
    activeCaseFile ??
    (activeCaseId
      ? (workspace.files.find(
        (file): boolean => file.id === activeCaseId && file.fileType === 'case'
      ) ?? null)
      : null);
  const showCaseOverviewWorkspace = Boolean(
    resolvedCaseContextFile &&
    !selectedAssetId &&
    !selectedFolderPath &&
    !editingDocumentDraft &&
    (selectedFile?.fileType === 'case' ||
      activeFile?.fileType === 'case' ||
      (!selectedFileId && Boolean(activeCaseId)))
  );
  const isNodeFileMode = selectedAsset?.kind === 'node_file';

  return (
    <div
      className={
        isNodeFileMode
          ? 'flex flex-1 flex-col overflow-hidden p-3 md:p-4'
          : 'flex flex-1 flex-col overflow-hidden p-6'
      }
    >
      {isNodeFileMode ? (
        <CaseResolverNodeFileWorkspace />
      ) : showCaseOverviewWorkspace ? (
        <CaseResolverCaseOverviewWorkspace />
      ) : workspaceView === 'relations' ? (
        <CaseResolverRelationsWorkspace />
      ) : selectedAsset ? (
        <CaseResolverFileViewer />
      ) : editingDocumentDraft?.fileType === 'scanfile' ? (
        <CaseResolverScanFileEditor />
      ) : editingDocumentDraft ? (
        <CaseResolverDocumentEditor />
      ) : activeFile ? (
        <CaseResolverCanvasWorkspace />
      ) : (
        <Card
          variant='subtle'
          padding='lg'
          className='flex flex-1 items-center justify-center border-dashed border-border/40 bg-card/10'
        >
          <CompactEmptyState
            icon={<FileText className='size-12 text-gray-700' />}
            title='No document or case selected'
            description='Select a file from the tree to begin editing or viewing.'
            className='border-none p-0'
          />
        </Card>
      )}
    </div>
  );
}
