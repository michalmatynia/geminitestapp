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
        {
          id: 'case-1',
          fileType: 'case',
          name: 'Case A',
          caseIdentifierId: 'id-1',
        },
        {
          id: 'doc-a',
          fileType: 'document',
          name: 'Draft Document',
          parentCaseId: 'case-1',
          folder: '',
        },
        {
          id: 'doc-b',
          fileType: 'document',
          name: 'Related Document',
          parentCaseId: 'case-1',
          folder: '',
          documentContentPlainText: 'Preview text',
        },
        {
          id: 'scan-c',
          fileType: 'scanfile',
          name: 'Scan C',
          parentCaseId: 'case-1',
          folder: '',
        },
        {
          id: 'case-2',
          fileType: 'case',
          name: 'Case B',
          caseIdentifierId: 'id-2',
        },
        {
          id: 'doc-outside',
          fileType: 'document',
          name: 'Outside Case Document',
          parentCaseId: 'case-2',
          folder: '',
        },
      ],
    })
  ),
  caseResolverIdentifiers: [
    { id: 'id-1', label: 'SIG/1' },
    { id: 'id-2', label: 'SIG/2' },
  ],
  activeCaseId: 'case-1',
  caseResolverTags: [],
  caseResolverCategories: [],
};

vi.mock('@/features/case-resolver/components/CaseResolverViewContext', () => ({
  useCaseResolverViewContext: () => ({
    state: mockViewState,
  }),
}));

describe('DocumentRelationSearchPanel tree integration', () => {
  it('scopes results to active case by default', () => {
    const onLinkFile = vi.fn();

    render(
      <MasterFolderTreeRuntimeProvider>
        <DocumentRelationSearchPanel draftFileId='doc-a' isLocked={false} onLinkFile={onLinkFile} />
      </MasterFolderTreeRuntimeProvider>
    );

    expect(screen.getByText('Related Document')).toBeInTheDocument();
    expect(screen.queryByText('Outside Case Document')).not.toBeInTheDocument();
  });

  it('supports single and bulk linking from tree rows', () => {
    const onLinkFile = vi.fn();

    render(
      <MasterFolderTreeRuntimeProvider>
        <DocumentRelationSearchPanel
          draftFileId='doc-a'
          isLocked={false}
          onLinkFile={onLinkFile}
          defaultScope='all_cases'
        />
      </MasterFolderTreeRuntimeProvider>
    );

    const selectDocCheckbox = screen.getByLabelText('Select Related Document');
    fireEvent.click(selectDocCheckbox);
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /link all selected/i }));
    expect(onLinkFile).toHaveBeenCalledWith('doc-b');

    fireEvent.click(screen.getByLabelText('Link Scan C'));
    expect(onLinkFile).toHaveBeenCalledWith('scan-c');
  });

  it('applies document default file-type and can switch to all', () => {
    const onLinkFile = vi.fn();

    render(
      <MasterFolderTreeRuntimeProvider>
        <DocumentRelationSearchPanel
          draftFileId='doc-a'
          isLocked={false}
          onLinkFile={onLinkFile}
          relationTreeInstance='case_resolver_document_relations'
          defaultScope='all_cases'
          defaultFileType='document'
        />
      </MasterFolderTreeRuntimeProvider>
    );

    expect(screen.getByText('Related Document')).toBeInTheDocument();
    expect(screen.queryByText('Scan C')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByText('Scan C')).toBeInTheDocument();
  });
});
