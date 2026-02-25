import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaseResolverTreeHeader } from '@/features/case-resolver/components/CaseResolverTreeHeader';

const routerPushMock = vi.fn();
const onRetryCaseContextMock = vi.fn();
const onResetCaseContextMock = vi.fn();
const onCreateFolderMock = vi.fn();
const onCreateFileMock = vi.fn();
const onCreateScanFileMock = vi.fn();
const onCreateNodeFileMock = vi.fn();
const setShowChildCaseFoldersMock = vi.fn();

const pageContext = {
  activeCaseId: 'case-a',
  requestedCaseStatus: 'ready' as 'loading' | 'ready' | 'missing',
  requestedCaseIssue: null as 'requested_file_missing' | 'workspace_unavailable' | null,
  canCreateInActiveCase: true,
  onRetryCaseContext: onRetryCaseContextMock,
  onResetCaseContext: onResetCaseContextMock,
  onCreateFolder: onCreateFolderMock,
  onCreateFile: onCreateFileMock,
  onCreateScanFile: onCreateScanFileMock,
  onCreateNodeFile: onCreateNodeFileMock,
  caseResolverIdentifiers: [] as Array<{ id: string; name: string }>,
};

const folderTreeContext = {
  activeCaseFile: {
    id: 'case-a',
    name: 'Case A',
    caseIdentifierId: null,
  },
  activeCaseChildCount: 0,
  showChildCaseFolders: true,
  setShowChildCaseFolders: setShowChildCaseFoldersMock,
  selectedFolderForFolderCreate: null,
  selectedFolderForCreate: null,
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/features/case-resolver/context/CaseResolverPageContext', () => ({
  useCaseResolverPageContext: () => pageContext,
}));

vi.mock('@/features/case-resolver/context/CaseResolverFolderTreeContext', () => ({
  useCaseResolverFolderTreeContext: () => folderTreeContext,
}));

describe('CaseResolverTreeHeader', () => {
  beforeEach(() => {
    routerPushMock.mockReset();
    onRetryCaseContextMock.mockReset();
    onResetCaseContextMock.mockReset();
    onCreateFolderMock.mockReset();
    onCreateFileMock.mockReset();
    onCreateScanFileMock.mockReset();
    onCreateNodeFileMock.mockReset();
    setShowChildCaseFoldersMock.mockReset();
    pageContext.requestedCaseStatus = 'ready';
    pageContext.requestedCaseIssue = null;
    pageContext.canCreateInActiveCase = true;
    folderTreeContext.activeCaseFile = {
      id: 'case-a',
      name: 'Case A',
      caseIdentifierId: null,
    };
    folderTreeContext.activeCaseChildCount = 2;
    folderTreeContext.showChildCaseFolders = true;
  });

  it('shows nested folders/files switch in active case and toggles child scope visibility', () => {
    render(<CaseResolverTreeHeader />);

    expect(screen.getByText('Show nested folders and files')).toBeInTheDocument();
    expect(screen.getByText('2 child cases')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show nested folders and files'));
    expect(setShowChildCaseFoldersMock).toHaveBeenCalledWith(false);
  });

  it('shows recoverable missing-context banner and actions', () => {
    pageContext.requestedCaseStatus = 'missing';
    pageContext.requestedCaseIssue = 'requested_file_missing';
    pageContext.canCreateInActiveCase = false;

    render(<CaseResolverTreeHeader />);

    expect(
      screen.getByText('Requested case context was not found. Retry or reset context.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset context' }));

    expect(onRetryCaseContextMock).toHaveBeenCalledTimes(1);
    expect(onResetCaseContextMock).toHaveBeenCalledTimes(1);
  });

  it('keeps create actions disabled while context is missing', () => {
    pageContext.requestedCaseStatus = 'missing';
    pageContext.requestedCaseIssue = 'workspace_unavailable';
    pageContext.canCreateInActiveCase = false;

    render(<CaseResolverTreeHeader />);

    const createButtons = screen.getAllByTitle('Case context unavailable.');
    expect(createButtons).toHaveLength(4);
    createButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('keeps create actions disabled while context is loading', () => {
    pageContext.requestedCaseStatus = 'loading';
    pageContext.requestedCaseIssue = null;
    pageContext.canCreateInActiveCase = false;

    render(<CaseResolverTreeHeader />);

    const createButtons = screen.getAllByTitle('Loading case context...');
    expect(createButtons).toHaveLength(4);
    createButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
