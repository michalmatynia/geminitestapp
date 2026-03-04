import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CaseListSearchPanel } from '@/features/case-resolver/components/list/search';
import type { CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

const buildWorkspace = (): CaseResolverWorkspace =>
  ({
    files: [
      {
        id: 'case-alpha',
        fileType: 'case',
        name: 'Alpha Case',
        caseIdentifierId: 'sig-a',
        caseTreeOrder: 10,
      },
      {
        id: 'case-beta',
        fileType: 'case',
        name: 'Beta Case',
        caseIdentifierId: 'sig-b',
        caseTreeOrder: 20,
      },
      {
        id: 'file-alpha-1',
        fileType: 'document',
        name: 'Invoice Alpha',
        parentCaseId: 'case-alpha',
        folder: 'docs',
        documentContentPlainText: 'invoice content',
      },
      {
        id: 'file-beta-1',
        fileType: 'scanfile',
        name: 'Invoice Beta',
        parentCaseId: 'case-beta',
        folder: 'evidence',
        scanSlots: [
          {
            id: 'slot-1',
            fileId: 'file-beta-1',
            status: 'completed',
            progress: 100,
            ocrText: 'invoice scan text',
          },
        ],
      },
    ],
  }) as unknown as CaseResolverWorkspace;

describe('CaseListSearchPanel shared runtime search', () => {
  it('keeps grouped summary, case ordering, expand/collapse, and callbacks parity', () => {
    const workspace = buildWorkspace();
    const onPrefetchCase = vi.fn();
    const onPrefetchFile = vi.fn();
    const onOpenCase = vi.fn();
    const onOpenFile = vi.fn();

    render(
      <CaseListSearchPanel
        workspace={workspace}
        identifierLabelById={
          new Map([
            ['sig-a', 'SIG/A'],
            ['sig-b', 'SIG/B'],
          ])
        }
        query='invoice'
        caseOrderById={
          new Map([
            ['case-beta', 0],
            ['case-alpha', 1],
          ])
        }
        onPrefetchCase={onPrefetchCase}
        onPrefetchFile={onPrefetchFile}
        onOpenCase={onOpenCase}
        onOpenFile={onOpenFile}
      />
    );

    const summaryBar = screen.getByRole('button', { name: /expand all/i }).parentElement;
    expect(summaryBar).toHaveTextContent(/2\s+cases/i);
    expect(summaryBar).toHaveTextContent(/2\s+files\s+matching/i);

    const alphaLabel = screen.getByText('Alpha Case');
    const betaLabel = screen.getByText('Beta Case');
    expect(
      betaLabel.compareDocumentPosition(alphaLabel) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /expand all/i }));
    expect(screen.getByText('Invoice Alpha')).toBeInTheDocument();
    expect(screen.getByText('Invoice Beta')).toBeInTheDocument();

    const betaCaseOpenButton = screen.getByRole('button', { name: 'Beta Case' });
    fireEvent.mouseEnter(betaCaseOpenButton);
    expect(onPrefetchCase).toHaveBeenCalledWith('case-beta');

    fireEvent.click(betaCaseOpenButton);
    expect(onOpenCase).toHaveBeenCalledWith('case-beta');

    const betaFileOpenButton = screen.getByRole('button', { name: 'Invoice Beta' });
    fireEvent.mouseEnter(betaFileOpenButton);
    expect(onPrefetchFile).toHaveBeenCalledWith(expect.objectContaining({ id: 'file-beta-1' }));

    fireEvent.click(betaFileOpenButton);
    expect(onOpenFile).toHaveBeenCalledWith(expect.objectContaining({ id: 'file-beta-1' }));

    fireEvent.click(screen.getByRole('button', { name: /collapse all/i }));
    expect(screen.queryByText('Invoice Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Invoice Beta')).not.toBeInTheDocument();
  });

  it('returns empty state when query has no matches', () => {
    render(
      <CaseListSearchPanel
        workspace={buildWorkspace()}
        identifierLabelById={new Map()}
        query='does-not-match'
        onPrefetchCase={vi.fn()}
        onPrefetchFile={vi.fn()}
        onOpenCase={vi.fn()}
        onOpenFile={vi.fn()}
      />
    );

    expect(screen.getByText('No cases or files match your search.')).toBeInTheDocument();
  });
});
