import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MasterFolderTreeRuntimeProvider } from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';
import { DocumentRelationSearchPanel } from '@/features/case-resolver/relation-search/components/DocumentRelationSearchPanel';
import { parseCaseResolverWorkspace } from '@/features/case-resolver/settings';

const mockViewState = {
  workspace: parseCaseResolverWorkspace(
    JSON.stringify({
      files: [
        { id: 'case-1', fileType: 'case', name: 'Case A', caseIdentifierId: 'id-1' },
        {
          id: 'scan-draft',
          fileType: 'scanfile',
          name: 'Current Scan',
          parentCaseId: 'case-1',
          folder: '',
        },
        {
          id: 'scan-linked',
          fileType: 'scanfile',
          name: 'Candidate Scan',
          parentCaseId: 'case-1',
          folder: '',
        },
        {
          id: 'doc-linked',
          fileType: 'document',
          name: 'Candidate Document',
          parentCaseId: 'case-1',
          folder: '',
        },
      ],
    })
  ),
  caseResolverIdentifiers: [{ id: 'id-1', label: 'SIG/1' }],
  caseResolverTags: [],
  caseResolverCategories: [],
};

vi.mock('@/features/case-resolver/components/CaseResolverViewContext', () => ({
  useCaseResolverViewContext: () => ({
    state: mockViewState,
  }),
}));

const expandVisibleNodes = (): void => {
  // Expand nested relation rows until no collapsed rows remain.
  for (let pass = 0; pass < 4; pass += 1) {
    const expandButtons = screen.queryAllByLabelText('Expand');
    if (expandButtons.length === 0) return;
    expandButtons.forEach((button) => {
      fireEvent.click(button);
    });
  }
};

describe('scan relations tree integration', () => {
  it('links scan/document files from tree in scan flow', () => {
    const onLinkFile = vi.fn();

    render(
      <MasterFolderTreeRuntimeProvider>
        <DocumentRelationSearchPanel
          draftFileId='scan-draft'
          isLocked={false}
          onLinkFile={onLinkFile}
          defaultScope='all_cases'
        />
      </MasterFolderTreeRuntimeProvider>
    );

    expandVisibleNodes();

    fireEvent.click(screen.getByLabelText('Link Candidate Scan'));
    fireEvent.click(screen.getByLabelText('Link Candidate Document'));

    expect(onLinkFile).toHaveBeenCalledWith('scan-linked');
    expect(onLinkFile).toHaveBeenCalledWith('doc-linked');
  });

  it('applies scanfile default file-type and can switch to all', () => {
    const onLinkFile = vi.fn();

    render(
      <MasterFolderTreeRuntimeProvider>
        <DocumentRelationSearchPanel
          draftFileId='scan-draft'
          isLocked={false}
          onLinkFile={onLinkFile}
          relationTreeInstance='case_resolver_scanfile_relations'
          defaultScope='all_cases'
          defaultFileType='scanfile'
        />
      </MasterFolderTreeRuntimeProvider>
    );

    expandVisibleNodes();
    expect(screen.getByText('Candidate Scan')).toBeInTheDocument();
    expect(screen.queryByText('Candidate Document')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expandVisibleNodes();
    expect(screen.getByText('Candidate Document')).toBeInTheDocument();
  });
});
