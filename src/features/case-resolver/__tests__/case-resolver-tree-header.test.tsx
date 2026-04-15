import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CaseResolverTreeHeader,
  CaseResolverTreeHeaderRuntimeContext,
  type CaseResolverTreeHeaderRuntimeValue,
} from '@/features/case-resolver/components/CaseResolverTreeHeader';
import type {
  CaseResolverPageActionsValue,
  CaseResolverPageStateValue,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import type {
  CaseResolverFolderTreeDataContextValue,
  CaseResolverFolderTreeUiActionsContextValue,
  CaseResolverFolderTreeUiStateContextValue,
} from '@/features/case-resolver/context/CaseResolverFolderTreeContext';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver/file';
import { expectNoAxeViolations } from '@/testing/accessibility/axe';

const routerPushMock = vi.fn();
const onRetryCaseContextMock = vi.fn();
const onResetCaseContextMock = vi.fn();
const onCreateFolderMock = vi.fn();
const onCreateFileMock = vi.fn();
const onCreateScanFileMock = vi.fn();
const onCreateImageAssetMock = vi.fn();
const onCreateNodeFileMock = vi.fn();
const setShowChildCaseFoldersMock = vi.fn();

const asPageStateContextValue = (value: Record<string, unknown>): CaseResolverPageStateValue =>
  value as CaseResolverPageStateValue;
const asPageActionsContextValue = (
  value: Record<string, unknown>
): CaseResolverPageActionsValue => value as CaseResolverPageActionsValue;
const asCaseResolverFile = (value: Record<string, unknown>): CaseResolverFile =>
  value as CaseResolverFile;
const asFolderTreeDataContextValue = (
  value: Record<string, unknown>
): CaseResolverFolderTreeDataContextValue => value as CaseResolverFolderTreeDataContextValue;
const asFolderTreeUiStateContextValue = (
  value: Record<string, unknown>
): CaseResolverFolderTreeUiStateContextValue => value as CaseResolverFolderTreeUiStateContextValue;
const asFolderTreeUiActionsContextValue = (
  value: Record<string, unknown>
): CaseResolverFolderTreeUiActionsContextValue =>
  value as CaseResolverFolderTreeUiActionsContextValue;

const pageStateContext = asPageStateContextValue({
  activeCaseId: 'case-a',
  requestedCaseStatus: 'ready' as const,
  requestedCaseIssue: null,
  canCreateInActiveCase: true,
  caseResolverIdentifiers: [] as Array<{ id: string; name: string }>,
});

const pageActionsContext = asPageActionsContextValue({
  onRetryCaseContext: onRetryCaseContextMock,
  onResetCaseContext: onResetCaseContextMock,
  onCreateFolder: onCreateFolderMock,
  onCreateFile: onCreateFileMock,
  onCreateScanFile: onCreateScanFileMock,
  onCreateImageAsset: onCreateImageAssetMock,
  onCreateNodeFile: onCreateNodeFileMock,
});

const folderTreeDataContext = asFolderTreeDataContextValue({
  activeCaseFile: asCaseResolverFile({
    id: 'case-a',
    name: 'Case A',
    caseIdentifierId: null,
  }),
  activeCaseChildCount: 0,
  selectedFolderForFolderCreate: null,
  selectedFolderForCreate: null,
});

const folderTreeUiStateContext = asFolderTreeUiStateContextValue({
  showChildCaseFolders: true,
  highlightedNodeFileAssetIds: [],
  highlightedNodeFileAssetIdSet: new Set<string>(),
  highlightedFolderAncestorNodeIds: [],
});

const folderTreeUiActionsContext = asFolderTreeUiActionsContextValue({
  setShowChildCaseFolders: setShowChildCaseFoldersMock,
  setHighlightedNodeFileAssetIds: vi.fn(),
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('nextjs-toploader/app', () => ({
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
    folderTreeDataContext.activeCaseFile = asCaseResolverFile({
      id: 'case-a',
      name: 'Case A',
      caseIdentifierId: null,
    });
    folderTreeDataContext.activeCaseChildCount = 2;
    folderTreeUiStateContext.showChildCaseFolders = true;
  });

  it('shows nested folders/files switch in active case and toggles child scope visibility', () => {
    render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Case Resolver' })).toBeInTheDocument();
    expect(screen.getByText('Case A')).toBeInTheDocument();
    expect(screen.getByText('Show nested folders and files')).toBeInTheDocument();
    expect(screen.getByText('2 child cases')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show nested folders and files'));
    expect(setShowChildCaseFoldersMock).toHaveBeenCalledWith(false);
  });

  it('has no obvious accessibility violations in the default tree header state', async () => {
    const { container } = render(<CaseResolverTreeHeader searchQuery='' onSearchChange={vi.fn()} />);

    await expectNoAxeViolations(container);
  });

  it('supports the tree header context path when search props are omitted', () => {
    const onSearchChange = vi.fn();
    const runtimeValue: CaseResolverTreeHeaderRuntimeValue = {
      searchQuery: 'invoice',
      onSearchChange,
      searchEnabled: true,
    };

    render(
      <CaseResolverTreeHeaderRuntimeContext.Provider value={runtimeValue}>
        <CaseResolverTreeHeader />
      </CaseResolverTreeHeaderRuntimeContext.Provider>
    );

    fireEvent.change(screen.getByPlaceholderText('Search files & folders…'), {
      target: { value: 'invoice-2' },
    });

    expect(onSearchChange).toHaveBeenCalledWith('invoice-2');
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

    fireEvent.click(screen.getByTitle('Create a scan file'));
    fireEvent.click(screen.getByTitle('Add an image asset'));
    fireEvent.click(screen.getByTitle('Create a node file'));

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
