import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CaseResolverCaseOverviewWorkspace } from '@/features/case-resolver/components/CaseResolverCaseOverviewWorkspace';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

vi.mock('@/features/case-resolver/components/CaseResolverRelationsWorkspace', () => ({
  CaseResolverRelationsWorkspace: ({ focusCaseId }: { focusCaseId?: string | null }) => (
    <div data-testid='relations-workspace'>{focusCaseId ?? 'none'}</div>
  ),
}));

type SelectOption = {
  value: string;
  label: string;
};

const buildCaseFile = (
  input?: Partial<Pick<CaseResolverFile, 'id' | 'name' | 'isLocked'>>
): CaseResolverFile => ({
  id: input?.id ?? 'case-a',
  workspaceId: 'workspace-1',
  name: input?.name ?? 'Case Alpha',
  fileType: 'case',
  folder: '/',
  documentContent: '',
  version: 1,
  isLocked: input?.isLocked ?? false,
  scanSlots: [],
  documentContentVersion: 1,
  documentContentFormatVersion: 1,
  activeDocumentVersion: 'original',
  editorType: 'wysiwyg',
  documentContentPlainText: '',
  documentContentHtml: '',
  documentContentMarkdown: '',
  documentHistory: [],
  documentConversionWarnings: [],
  scanOcrModel: '',
  scanOcrPrompt: '',
  referenceCaseIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const BASE_OPTIONS: SelectOption[] = [
  { value: '__none__', label: 'None' },
  { value: 'case-a', label: 'Case Alpha' },
  { value: 'case-b', label: 'Case Beta' },
];

import {
  CaseResolverPageProvider,
  type CaseResolverPageContextValue,
} from '../context/CaseResolverPageContext';

const renderWorkspace = (
  activeCaseFile: CaseResolverFile | null,
  onUpdateActiveCase = vi.fn()
): ReturnType<typeof render> => {
  const workspaceFiles = activeCaseFile ? [activeCaseFile] : [];
  const contextValue: Partial<CaseResolverPageContextValue> = {
    workspace: {
      id: 'workspace-1',
      files: workspaceFiles,
      assets: [],
    } as unknown as CaseResolverPageContextValue['workspace'],
    activeCaseId: activeCaseFile?.id ?? null,
    activeFile: activeCaseFile,
    caseTagOptions: BASE_OPTIONS,
    caseIdentifierOptions: BASE_OPTIONS,
    caseCategoryOptions: BASE_OPTIONS,
    caseReferenceOptions: BASE_OPTIONS.filter((option): boolean => option.value !== '__none__'),
    parentCaseOptions: BASE_OPTIONS,
    onUpdateActiveCase,
  };

  return render(
    <CaseResolverPageProvider value={contextValue as CaseResolverPageContextValue}>
      <CaseResolverCaseOverviewWorkspace />
    </CaseResolverPageProvider>
  );
};

describe('CaseResolverCaseOverviewWorkspace', () => {
  it('renders empty state when no active case is present', () => {
    renderWorkspace(null);

    expect(screen.getByText('No case context')).toBeInTheDocument();
    expect(
      screen.getByText('Select a case in the folder tree to see case-specific options.')
    ).toBeInTheDocument();
  });

  it('renders case-specific options with relations hidden by default', () => {
    const caseFile = buildCaseFile();

    renderWorkspace(caseFile);

    expect(screen.getByText('Case-specific options')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Case Alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('relations-workspace')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show Relations' })).toBeInTheDocument();
  });

  it('toggles relations panel visibility from explicit controls', () => {
    const caseFile = buildCaseFile();

    renderWorkspace(caseFile);

    fireEvent.click(screen.getByRole('button', { name: 'Show Relations' }));
    expect(screen.getByTestId('relations-workspace')).toHaveTextContent(caseFile.id);

    fireEvent.click(screen.getByRole('button', { name: 'Hide Relations' }));
    expect(screen.queryByTestId('relations-workspace')).not.toBeInTheDocument();
  });

  it('updates case name when value changes and input blurs', () => {
    const caseFile = buildCaseFile();
    const onUpdateActiveCase = vi.fn();

    renderWorkspace(caseFile, onUpdateActiveCase);

    const nameInput = screen.getByDisplayValue('Case Alpha');
    fireEvent.change(nameInput, { target: { value: 'Case Omega' } });
    fireEvent.blur(nameInput);

    expect(onUpdateActiveCase).toHaveBeenCalledTimes(1);
    expect(onUpdateActiveCase).toHaveBeenCalledWith({ name: 'Case Omega' });
  });

  it('does not update case name when case is locked', () => {
    const caseFile = buildCaseFile({ isLocked: true });
    const onUpdateActiveCase = vi.fn();

    renderWorkspace(caseFile, onUpdateActiveCase);

    const nameInput = screen.getByDisplayValue('Case Alpha');
    fireEvent.change(nameInput, { target: { value: 'Case Omega' } });
    fireEvent.blur(nameInput);

    expect(onUpdateActiveCase).not.toHaveBeenCalled();
  });

  it('renders case status dropdown with pending as default value', () => {
    const caseFile = buildCaseFile();
    renderWorkspace(caseFile);

    expect(screen.getByText('Case Status')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('updates happening date when value changes and input blurs', () => {
    const caseFile = buildCaseFile();
    const onUpdateActiveCase = vi.fn();

    renderWorkspace(caseFile, onUpdateActiveCase);

    const happeningDateInput = screen.getByPlaceholderText('YYYY-MM-DD or custom date');
    fireEvent.change(happeningDateInput, { target: { value: '2026-03-12' } });
    fireEvent.blur(happeningDateInput);

    expect(onUpdateActiveCase).toHaveBeenCalledWith({ happeningDate: '2026-03-12' });
  });
});
