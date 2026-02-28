'use client';

import { FileText } from 'lucide-react';
import React from 'react';

import { Card, EmptyState } from '@/shared/ui';
import { useCaseResolverViewContext } from '../CaseResolverViewContext';
import { CaseResolverScanFileEditor } from './CaseResolverScanFileEditor';
import { CaseResolverDocumentEditor } from './CaseResolverDocumentEditor';
import { CaseResolverCanvasWorkspace } from '../CaseResolverCanvasWorkspace';
import { CaseResolverCaseOverviewWorkspace } from '../CaseResolverCaseOverviewWorkspace';
import { CaseResolverFileViewer } from '../CaseResolverFileViewer';
import { CaseResolverNodeFileWorkspace } from '../CaseResolverNodeFileWorkspace';
import { CaseResolverRelationsWorkspace } from '../CaseResolverRelationsWorkspace';

export function CaseResolverPageMainContent(): React.JSX.Element {
  const { state, workspaceView } = useCaseResolverViewContext();

  const {
    workspace,
    activeCaseId,
    selectedFileId,
    selectedAssetId,
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
    !editingDocumentDraft &&
    (selectedFile?.fileType === 'case' ||
      activeFile?.fileType === 'case' ||
      (!selectedFile && !activeFile))
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
        <CaseResolverRelationsWorkspace focusCaseId={activeFile?.id ?? activeCaseId} />
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
          <EmptyState
            icon={<FileText className='size-12 text-gray-700' />}
            title='No document or case selected'
            description='Select a file from the tree to begin editing or viewing.'
            variant='compact'
            className='border-none p-0'
          />
        </Card>
      )}
    </div>
  );
}
