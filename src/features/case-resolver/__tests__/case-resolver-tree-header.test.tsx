import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaseResolverTreeHeader } from '@/features/case-resolver/components/CaseResolverTreeHeader';
import type {
  CaseResolverPageActionsValue,
  CaseResolverPageStateValue,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import type {
  CaseResolverFolderTreeDataContextValue,
  CaseResolverFolderTreeUiActionsContextValue,
  CaseResolverFolderTreeUiStateContextValue,
} from '@/features/case-resolver/context/CaseResolverFolderTreeContext';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

const routerPushMock = vi.fn();
const onRetryCaseContextMock = vi.fn();
const onResetCaseContextMock = vi.fn();
const onCreateFolderMock = vi.fn();
const onCreateFileMock = vi.fn();
const onCreateScanFileMock = vi.fn();
const onCreateImageAssetMock = vi.fn();
const onCreateNodeFileMock = vi.fn();
const setShowChildCaseFoldersMock = vi.fn();

const pageStateContext = {
  activeCaseId: 'case-a',
  requestedCaseStatus: 'ready' as const,
  requestedCaseIssue: null,
  canCreateInActiveCase: true,
  caseResolverIdentifiers: [] as Array<{ id: string; name: string }>,
} as unknown as CaseResolverPageStateValue;

const pageActionsContext = {
  onRetryCaseContext: onRetryCaseContextMock,
  onResetCaseContext: onResetCaseContextMock,
  onCreateFolder: onCreateFolderMock,
  onCreateFile: onCreateFileMock,
  onCreateScanFile: onCreateScanFileMock,
  onCreateImageAsset: onCreateImageAssetMock,
  onCreateNodeFile: onCreateNodeFileMock,
} as unknown as CaseResolverPageActionsValue;

const folderTreeDataContext = {
  activeCaseFile: {
    id: 'case-a',
    name: 'Case A',
    caseIdentifierId: null,
  } as unknown as CaseResolverFile,
  activeCaseChildCount: 0,
  selectedFolderForFolderCreate: null,
  selectedFolderForCreate: null,
} as unknown as CaseResolverFolderTreeDataContextValue;

const folderTreeUiStateContext = {
  showChildCaseFolders: true,
  highlightedNodeFileAssetIds: [],
  highlightedNodeFileAssetIdSet: new Set<string>(),
  highlightedFolderAncestorNodeIds: [],
} as unknown as CaseResolverFolderTreeUiStateContextValue;

const folderTreeUiActionsContext = {
  setShowChildCaseFolders: setShowChildCaseFoldersMock,
  setHighlightedNodeFileAssetIds: vi.fn(),
} as unknown as CaseResolverFolderTreeUiActionsContextValue;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/features/case-resolver/context/CaseResolverPageContext', () => ({
  useCaseResolverPageState: () => pageStateContext,
  useCaseResolverPageActions: () => pageActionsContext,
}));

vi.mock('@/features/case-resolver/context/CaseResolverFolderTreeContext', () => ({
  useCaseResolverFolderTreeDataContext: () => folderTreeDataContext,
  useCaseResolverFolderTreeUiStateContext: () => folderTreeUiStateContext,
  useCaseResolverFolderTreeUiActionsContext: () => folderTreeUiActionsContext,
}));

describe('CaseResolverTreeHeader', () => {
  beforeEach(() => {
    routerPushMock.mockReset();
    onRetryCaseContextMock.mockReset();
    onResetCaseContextMock.mockReset();
    onCreateFolderMock.mockReset();
    onCreateFileMock.mockReset();
    onCreateScanFileMock.mockReset();
    onCreateImageAssetMock.mockReset();
    onCreateNodeFileMock.mockReset();
    setShowChildCaseFoldersMock.mockReset();
    pageStateContext.requestedCaseStatus = 'ready';
    pageStateContext.requestedCaseIssue = null;
    pageStateContext.canCreateInActiveCase = true;
    pageStateContext.activeCaseId = 'case-a';
    folderTreeDataContext.activeCaseFile = {
      id: 'case-a',
      name: 'Case A',
      caseIdentifierId: null,
    } as unknown as CaseResolverFile;
    folderTreeDataContext.activeCaseChildCount = 2;
    folderTreeUiStateContext.showChildCaseFolders = true;
  });

  it('shows nested folders/files switch in active case and toggles child scope visibility', () => {
    render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    expect(screen.getByText('Show nested folders and files')).toBeInTheDocument();
    expect(screen.getByText('2 child cases')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show nested folders and files'));
    expect(setShowChildCaseFoldersMock).toHaveBeenCalledWith(false);
  });

  it('shows nested switch when case context exists even if activeCaseFile is unresolved', () => {
    folderTreeDataContext.activeCaseFile = null;
    folderTreeDataContext.activeCaseChildCount = 0;
    pageStateContext.activeCaseId = 'case-a';

    render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    expect(screen.getByText('Show nested folders and files')).toBeInTheDocument();
  });

  it('shows recoverable missing-context banner and actions', () => {
    pageStateContext.requestedCaseStatus = 'missing';
    pageStateContext.requestedCaseIssue = 'requested_file_missing';
    pageStateContext.canCreateInActiveCase = false;

    render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    expect(
      screen.getByText('Requested case context was not found. Retry or reset context.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset context' }));

    expect(onRetryCaseContextMock).toHaveBeenCalledTimes(1);
    expect(onResetCaseContextMock).toHaveBeenCalledTimes(1);
  });

  it('keeps create actions disabled while context is missing', () => {
    pageStateContext.requestedCaseStatus = 'missing';
    pageStateContext.requestedCaseIssue = 'workspace_unavailable';
    pageStateContext.canCreateInActiveCase = false;

    render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    const createButtons = screen.getAllByTitle('Case context unavailable.');
    expect(createButtons).toHaveLength(5);
    createButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('keeps create actions disabled while context is loading', () => {
    pageStateContext.requestedCaseStatus = 'loading';
    pageStateContext.requestedCaseIssue = null;
    pageStateContext.canCreateInActiveCase = false;

    render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    const createButtons = screen.getAllByTitle('Loading case context...');
    expect(createButtons).toHaveLength(5);
    createButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('calls image, scan, and node file creation actions from the toolbar', () => {
    render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    fireEvent.click(screen.getByTitle('Create new image file'));
    fireEvent.click(screen.getByTitle('Create new image asset'));
    fireEvent.click(screen.getByTitle('Add node file'));

    expect(onCreateScanFileMock).toHaveBeenCalledWith(null);
    expect(onCreateImageAssetMock).toHaveBeenCalledWith(null);
    expect(onCreateNodeFileMock).toHaveBeenCalledWith(null);
  });

  it('supports keyboard tab order between primary case actions', async () => {
    const user = userEvent.setup();
    render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    const allCasesButton = screen.getByRole('button', { name: 'ALL CASES' });
    const nestedSwitch = screen.getByLabelText('Show nested folders and files');

    allCasesButton.focus();
    expect(allCasesButton).toHaveFocus();
    await user.tab();
    expect(nestedSwitch).toHaveFocus();
  });

  it('hides tree search input when search capability is disabled', () => {
    render(
      <CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} searchEnabled={false} />
    );

    expect(screen.queryByPlaceholderText('Search files & folders…')).not.toBeInTheDocument();
  });
});
