import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CaseResolverCaseOverviewWorkspace } from '@/features/case-resolver/components/CaseResolverCaseOverviewWorkspace';
import {
  buildCaseMetadataDraft,
  buildCaseMetadataPatch,
} from '@/features/case-resolver/case-overview-draft';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver/file';

vi.mock('@/features/case-resolver/components/CaseResolverRelationsWorkspace', () => ({
  CaseResolverRelationsWorkspace: () => <div data-testid='relations-workspace'>relations</div>,
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
  onSaveActiveCase = vi.fn()
): ReturnType<typeof render> => {
  const workspaceFiles = activeCaseFile ? [activeCaseFile] : [];
  const TestProvider = (): React.JSX.Element => {
    const [draft, setDraft] = React.useState(buildCaseMetadataDraft(activeCaseFile));
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
      activeCaseFile,
      activeCaseMetadataDraft: draft,
      isActiveCaseMetadataDirty: buildCaseMetadataPatch(activeCaseFile, draft) !== null,
      onUpdateActiveCase: vi.fn(),
      onUpdateActiveCaseDraft: (patch) => {
        setDraft((current) => (current ? { ...current, ...patch } : current));
      },
      onSaveActiveCase: () => {
        const patch = buildCaseMetadataPatch(activeCaseFile, draft);
        if (patch) onSaveActiveCase(patch);
      },
      onDiscardActiveCaseChanges: () => setDraft(buildCaseMetadataDraft(activeCaseFile)),
    };

    return (
      <CaseResolverPageProvider value={contextValue as CaseResolverPageContextValue}>
        <CaseResolverCaseOverviewWorkspace />
      </CaseResolverPageProvider>
    );
  };

  return render(<TestProvider />);
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

    expect(screen.getByDisplayValue('Case Alpha')).toBeInTheDocument();
    expect(screen.getByText('Signature ID')).toBeInTheDocument();
    expect(screen.queryByText('Case-specific options')).not.toBeInTheDocument();
    expect(screen.queryByTestId('relations-workspace')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show Relations' })).toBeInTheDocument();
  });

  it('toggles relations panel visibility from explicit controls', () => {
    const caseFile = buildCaseFile();

    renderWorkspace(caseFile);

    fireEvent.click(screen.getByRole('button', { name: 'Show Relations' }));
    expect(screen.getByTestId('relations-workspace')).toHaveTextContent('relations');

    fireEvent.click(screen.getByRole('button', { name: 'Hide Relations' }));
    expect(screen.queryByTestId('relations-workspace')).not.toBeInTheDocument();
  });

  it('updates case name when Update is clicked', () => {
    const caseFile = buildCaseFile();
    const onSaveActiveCase = vi.fn();

    renderWorkspace(caseFile, onSaveActiveCase);

    const nameInput = screen.getByDisplayValue('Case Alpha');
    fireEvent.change(nameInput, { target: { value: 'Case Omega' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(onSaveActiveCase).toHaveBeenCalledTimes(1);
    expect(onSaveActiveCase).toHaveBeenCalledWith({ name: 'Case Omega' });
  });

  it('does not update case name when case is locked', () => {
    const caseFile = buildCaseFile({ isLocked: true });
    const onSaveActiveCase = vi.fn();

    renderWorkspace(caseFile, onSaveActiveCase);

    const nameInput = screen.getByDisplayValue('Case Alpha');
    fireEvent.change(nameInput, { target: { value: 'Case Omega' } });
    expect(screen.getByRole('button', { name: 'Update' })).toBeDisabled();

    expect(onSaveActiveCase).not.toHaveBeenCalled();
  });

  it('renders case status dropdown with pending as default value', () => {
    const caseFile = buildCaseFile();
    renderWorkspace(caseFile);

    expect(screen.getByText('Case Status')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('updates happening date when value changes and Update is clicked', () => {
    const caseFile = buildCaseFile();
    const onSaveActiveCase = vi.fn();

    renderWorkspace(caseFile, onSaveActiveCase);

    const happeningDateInput = screen.getByPlaceholderText('YYYY-MM-DD or custom date');
    fireEvent.change(happeningDateInput, { target: { value: '2026-03-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(onSaveActiveCase).toHaveBeenCalledWith({ happeningDate: '2026-03-12' });
  });

  it('batches multiple metadata changes into one update', () => {
    const caseFile = buildCaseFile();
    const onSaveActiveCase = vi.fn();

    renderWorkspace(caseFile, onSaveActiveCase);

    fireEvent.change(screen.getByDisplayValue('Case Alpha'), {
      target: { value: 'Case Omega' },
    });
    fireEvent.change(screen.getByPlaceholderText('YYYY-MM-DD or custom date'), {
      target: { value: '2026-03-12' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Update' }));

    expect(onSaveActiveCase).toHaveBeenCalledWith({
      name: 'Case Omega',
      happeningDate: '2026-03-12',
    });
  });
});
