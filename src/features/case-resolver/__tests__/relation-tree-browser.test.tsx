import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MasterFolderTreeRuntimeProvider } from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';
import type { NodeFileDocumentSearchRow } from '@/features/case-resolver/components/CaseResolverNodeFileUtils';
import { RelationTreeBrowser } from '@/features/case-resolver/relation-search/components/RelationTreeBrowser';
import { buildRelationMasterTree } from '@/features/case-resolver/relation-search/tree/relation-master-tree';

const logCaseResolverWorkspaceEventMock = vi.fn();

vi.mock('@/features/case-resolver/workspace-persistence', () => ({
  logCaseResolverWorkspaceEvent: (...args: unknown[]) =>
    void logCaseResolverWorkspaceEventMock(...args),
}));

const createRow = (input: {
  fileId: string;
  name: string;
  caseId: string;
  signature: string;
}): NodeFileDocumentSearchRow =>
  ({
    file: {
      id: input.fileId,
      name: input.name,
      fileType: 'document',
      parentCaseId: input.caseId,
      folder: '',
      isLocked: false,
      documentDate: null,
    },
    signatureLabel: input.signature,
    addresserLabel: '',
    addresseeLabel: '',
    folderPath: '',
    folderSegments: [],
    searchable: input.name.toLowerCase(),
  }) as unknown as NodeFileDocumentSearchRow;

const createDataTransfer = () => {
  const store = new Map<string, string>();
  return {
    effectAllowed: 'move',
    dropEffect: 'none',
    setData: vi.fn((type: string, value: string) => {
      store.set(type, value);
    }),
    getData: vi.fn((type: string) => store.get(type) ?? ''),
    types: [] as string[],
  };
};

describe('RelationTreeBrowser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    logCaseResolverWorkspaceEventMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects row-body drag start and allows drag start from handle only', async () => {
    const rows = [createRow({ fileId: 'file-1', name: 'Doc 1', caseId: 'case-1', signature: 'SIG/1' })];
    const relationTree = buildRelationMasterTree({ rows });
    const dataTransfer = createDataTransfer();

    const { container } = render(
      <MasterFolderTreeRuntimeProvider>
        <RelationTreeBrowser
          instance='case_resolver_nodefile_relations'
          mode='add_to_node_canvas'
          nodes={relationTree.nodes}
          lookup={relationTree.lookup}
        />
      </MasterFolderTreeRuntimeProvider>
    );

    const fileRow = container.querySelector('[data-master-tree-node-id^="relation_file::"]');
    expect(fileRow).not.toBeNull();

    fireEvent.dragStart(fileRow as Element, { dataTransfer });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(dataTransfer.setData).not.toHaveBeenCalledWith('application/case-resolver-file-id', 'file-1');
    expect(
      logCaseResolverWorkspaceEventMock.mock.calls.some(
        (call) =>
          call[0] &&
          typeof call[0] === 'object' &&
          (call[0] as { action?: string }).action === 'relation_tree_drop_rejected'
      )
    ).toBe(true);

    const dragHandle = screen.getByLabelText('Drag handle');
    fireEvent.pointerDown(dragHandle);
    fireEvent.dragStart(fileRow as Element, { dataTransfer });
    await act(async () => {
      vi.runAllTimers();
    });

    expect(dataTransfer.setData).toHaveBeenCalledWith('application/case-resolver-file-id', 'file-1');
    expect(
      logCaseResolverWorkspaceEventMock.mock.calls.some(
        (call) =>
          call[0] &&
          typeof call[0] === 'object' &&
          (call[0] as { action?: string }).action === 'relation_tree_node_drag_started'
      )
    ).toBe(true);
  });

  it('rejects in-tree drop attempts in node mode', async () => {
    const rows = [
      createRow({ fileId: 'file-1', name: 'Doc 1', caseId: 'case-1', signature: 'SIG/1' }),
      createRow({ fileId: 'file-2', name: 'Doc 2', caseId: 'case-1', signature: 'SIG/1' }),
    ];
    const relationTree = buildRelationMasterTree({ rows });
    const dataTransfer = createDataTransfer();

    const { container } = render(
      <MasterFolderTreeRuntimeProvider>
        <RelationTreeBrowser
          instance='case_resolver_nodefile_relations'
          mode='add_to_node_canvas'
          nodes={relationTree.nodes}
          lookup={relationTree.lookup}
        />
      </MasterFolderTreeRuntimeProvider>
    );

    const fileRow = container.querySelector('[data-master-tree-node-id^="relation_file::"]');
    const caseRow = container.querySelector('[data-master-tree-node-id^="relation_case::"]');
    expect(fileRow).not.toBeNull();
    expect(caseRow).not.toBeNull();

    fireEvent.pointerDown(screen.getAllByLabelText('Drag handle')[0]);
    fireEvent.dragStart(fileRow as Element, { dataTransfer });
    await act(async () => {
      vi.runAllTimers();
    });
    fireEvent.dragOver(caseRow as Element, { dataTransfer });

    expect(
      logCaseResolverWorkspaceEventMock.mock.calls.some(
        (call) =>
          call[0] &&
          typeof call[0] === 'object' &&
          (call[0] as { action?: string }).action === 'relation_tree_drop_rejected'
      )
    ).toBe(true);
  });

  it('supports file selection and single-link action in link mode', () => {
    const rows = [createRow({ fileId: 'file-9', name: 'Doc 9', caseId: 'case-9', signature: 'SIG/9' })];
    const relationTree = buildRelationMasterTree({ rows });
    const onToggleFileSelection = vi.fn();
    const onLinkFile = vi.fn();

    render(
      <MasterFolderTreeRuntimeProvider>
        <RelationTreeBrowser
          instance='case_resolver_document_relations'
          mode='link_relations'
          nodes={relationTree.nodes}
          lookup={relationTree.lookup}
          selectedFileIds={new Set<string>()}
          onToggleFileSelection={onToggleFileSelection}
          onLinkFile={onLinkFile}
        />
      </MasterFolderTreeRuntimeProvider>
    );

    const selectCheckbox = screen.getByLabelText('Select Doc 9');
    fireEvent.click(selectCheckbox);
    expect(onToggleFileSelection).toHaveBeenCalledWith('file-9');

    const linkButton = screen.getByLabelText('Link Doc 9');
    fireEvent.click(linkButton);
    expect(onLinkFile).toHaveBeenCalledWith('file-9');
  });
});
