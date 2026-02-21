import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CaseResolverCaseOverviewWorkspace } from '@/features/case-resolver/components/CaseResolverCaseOverviewWorkspace';
import { createCaseResolverFile } from '@/features/case-resolver/settings';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';

vi.mock('@/features/case-resolver/components/CaseResolverRelationsWorkspace', () => ({
  CaseResolverRelationsWorkspace: ({
    focusCaseId,
  }: {
    focusCaseId?: string | null;
  }) => (
    <div data-testid='relations-workspace'>{focusCaseId ?? 'none'}</div>
  ),
}));

type SelectOption = {
  value: string;
  label: string;
};

const buildCaseFile = (input?: Partial<Pick<CaseResolverFile, 'id' | 'name' | 'isLocked'>>): CaseResolverFile =>
  createCaseResolverFile({
    id: input?.id ?? 'case-a',
    fileType: 'case',
    name: input?.name ?? 'Case Alpha',
    isLocked: input?.isLocked ?? false,
  });

const BASE_OPTIONS: SelectOption[] = [
  { value: '__none__', label: 'None' },
  { value: 'case-a', label: 'Case Alpha' },
  { value: 'case-b', label: 'Case Beta' },
];

const renderWorkspace = (
  activeCaseFile: CaseResolverFile | null,
  onUpdateActiveCase: ReturnType<typeof vi.fn> = vi.fn()
): ReturnType<typeof render> =>
  render(
    <CaseResolverCaseOverviewWorkspace
      activeCaseFile={activeCaseFile}
      caseTagOptions={BASE_OPTIONS}
      caseIdentifierOptions={BASE_OPTIONS}
      caseCategoryOptions={BASE_OPTIONS}
      caseReferenceOptions={BASE_OPTIONS.filter((option): boolean => option.value !== '__none__')}
      parentCaseOptions={BASE_OPTIONS}
      onUpdateActiveCase={onUpdateActiveCase}
    />
  );

describe('CaseResolverCaseOverviewWorkspace', () => {
  it('renders empty state when no active case is present', () => {
    renderWorkspace(null);

    expect(screen.getByText('No case context')).toBeInTheDocument();
    expect(
      screen.getByText('Select a case in the folder tree to see case-specific options and relations.')
    ).toBeInTheDocument();
  });

  it('renders case-specific options and focuses relations graph on the active case', () => {
    const caseFile = buildCaseFile();

    renderWorkspace(caseFile);

    expect(screen.getByText('Case-specific options')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Case Alpha')).toBeInTheDocument();
    expect(screen.getByTestId('relations-workspace')).toHaveTextContent(caseFile.id);
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
});
