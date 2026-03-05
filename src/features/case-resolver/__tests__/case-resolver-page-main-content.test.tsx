import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CaseResolverPageMainContent } from '@/features/case-resolver/components/page/CaseResolverPageMainContent';
import type { CaseResolverStateValue } from '@/features/case-resolver/types';
import type { CaseResolverViewStateValue } from '@/features/case-resolver/components/CaseResolverViewContext';

let viewContextMock: CaseResolverViewStateValue;

vi.mock('@/features/case-resolver/components/CaseResolverViewContext', () => ({
  useCaseResolverViewStateContext: (): CaseResolverViewStateValue => viewContextMock,
}));

vi.mock('@/features/case-resolver/components/CaseResolverNodeFileWorkspace', () => ({
  CaseResolverNodeFileWorkspace: () => <div data-testid='node-file-workspace' />,
}));

vi.mock('@/features/case-resolver/components/CaseResolverRelationsWorkspace', () => ({
  CaseResolverRelationsWorkspace: () => <div data-testid='relations-workspace' />,
}));

vi.mock('@/features/case-resolver/components/CaseResolverCaseOverviewWorkspace', () => ({
  CaseResolverCaseOverviewWorkspace: () => <div data-testid='case-overview-workspace' />,
}));

vi.mock('@/features/case-resolver/components/CaseResolverFileViewer', () => ({
  CaseResolverFileViewer: () => <div data-testid='file-viewer' />,
}));

vi.mock('@/features/case-resolver/components/page/CaseResolverScanFileEditor', () => ({
  CaseResolverScanFileEditor: () => <div data-testid='scan-editor' />,
}));

vi.mock('@/features/case-resolver/components/page/CaseResolverDocumentEditor', () => ({
  CaseResolverDocumentEditor: () => <div data-testid='document-editor' />,
}));

vi.mock('@/features/case-resolver/components/CaseResolverCanvasWorkspace', () => ({
  CaseResolverCanvasWorkspace: () => <div data-testid='canvas-workspace' />,
}));

const createContextMock = ({
  workspaceView = 'document',
  stateOverrides = {},
}: {
  workspaceView?: 'document' | 'relations';
  stateOverrides?: Partial<CaseResolverStateValue>;
} = {}): CaseResolverViewStateValue => {
  const baseState = {
    workspace: {
      id: 'workspace-1',
      files: [],
      assets: [],
    },
    activeCaseId: null,
    selectedFileId: null,
    selectedAssetId: null,
    editingDocumentDraft: null,
    activeFile: null,
    selectedAsset: null,
  } as unknown as CaseResolverStateValue;

  return {
    state: {
      ...baseState,
      ...stateOverrides,
    } as CaseResolverStateValue,
    workspaceView,
  } as unknown as CaseResolverViewStateValue;
};

describe('CaseResolverPageMainContent routing', () => {
  it('renders case overview for case context even when workspace view is relations and active file is stale', () => {
    const caseFile = {
      id: 'case-1',
      fileType: 'case',
      name: 'Case 1',
      folder: '',
    };
    const staleDocumentFile = {
      id: 'doc-1',
      fileType: 'document',
      name: 'Doc 1',
      folder: '',
    };

    viewContextMock = createContextMock({
      workspaceView: 'relations',
      stateOverrides: {
        workspace: {
          id: 'workspace-1',
          files: [caseFile, staleDocumentFile],
          assets: [],
        } as unknown as CaseResolverStateValue['workspace'],
        activeCaseId: 'case-1',
        selectedFileId: 'case-1',
        activeFile: staleDocumentFile as CaseResolverStateValue['activeFile'],
        selectedAsset: null,
        selectedAssetId: null,
        editingDocumentDraft: null,
      },
    });

    render(<CaseResolverPageMainContent />);

    expect(screen.getByTestId('case-overview-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('relations-workspace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('canvas-workspace')).not.toBeInTheDocument();
  });

  it('renders case overview when no file is selected but active case context exists', () => {
    const caseFile = {
      id: 'case-2',
      fileType: 'case',
      name: 'Case 2',
      folder: '',
    };
    const staleDocumentFile = {
      id: 'doc-2',
      fileType: 'document',
      name: 'Doc 2',
      folder: '',
      parentCaseId: 'case-2',
    };

    viewContextMock = createContextMock({
      stateOverrides: {
        workspace: {
          id: 'workspace-1',
          files: [caseFile, staleDocumentFile],
          assets: [],
        } as unknown as CaseResolverStateValue['workspace'],
        activeCaseId: 'case-2',
        selectedFileId: null,
        activeFile: staleDocumentFile as CaseResolverStateValue['activeFile'],
        selectedAsset: null,
        selectedAssetId: null,
        selectedFolderPath: null,
        editingDocumentDraft: null,
      },
    });

    render(<CaseResolverPageMainContent />);

    expect(screen.getByTestId('case-overview-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-workspace')).not.toBeInTheDocument();
  });

  it('keeps canvas rendering for non-case active files', () => {
    const caseFile = {
      id: 'case-3',
      fileType: 'case',
      name: 'Case 3',
      folder: '',
    };
    const documentFile = {
      id: 'doc-3',
      fileType: 'document',
      name: 'Doc 3',
      folder: '',
      parentCaseId: 'case-3',
    };

    viewContextMock = createContextMock({
      stateOverrides: {
        workspace: {
          id: 'workspace-1',
          files: [caseFile, documentFile],
          assets: [],
        } as unknown as CaseResolverStateValue['workspace'],
        activeCaseId: 'case-3',
        selectedFileId: 'doc-3',
        activeFile: documentFile as CaseResolverStateValue['activeFile'],
        selectedAsset: null,
        selectedAssetId: null,
        editingDocumentDraft: null,
      },
    });

    render(<CaseResolverPageMainContent />);

    expect(screen.getByTestId('canvas-workspace')).toBeInTheDocument();
    expect(screen.queryByTestId('case-overview-workspace')).not.toBeInTheDocument();
  });
});
