import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MasterFolderTreeRuntimeProvider } from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';
import { NodeFileDocumentSearchPanel } from '@/features/case-resolver/components/NodeFileDocumentSearchPanel';
import { buildRelationMasterTree } from '@/features/case-resolver/relation-search/tree/relation-master-tree';

const contextValue = (() => {
  const row = {
    file: {
      id: 'doc-1',
      name: 'Doc 1',
      fileType: 'document',
      parentCaseId: 'case-1',
      folder: '',
      isLocked: false,
      documentDate: null,
    },
    signatureLabel: 'SIG/1',
    addresserLabel: '',
    addresseeLabel: '',
    folderPath: '',
    folderSegments: [],
    searchable: 'doc 1',
  } as const;
  const relationTree = buildRelationMasterTree({ rows: [row as never] });
  const addNode = vi.fn();
  const setNodeFileMeta = vi.fn();
  return {
    value: {
      documentSearchScope: 'all_cases',
      setDocumentSearchScope: vi.fn(),
      documentSearchQuery: '',
      setDocumentSearchQuery: vi.fn(),
      relationTreeNodes: relationTree.nodes,
      relationTreeLookup: relationTree.lookup,
      visibleDocumentSearchRows: [row],
      view: { x: 0, y: 0, scale: 1 },
      canvasHostRef: { current: null },
      addNode,
      setNodeFileMeta,
    },
    addNode,
    setNodeFileMeta,
  };
})();

vi.mock('@/features/case-resolver/components/NodeFileWorkspaceContext', () => ({
  useNodeFileWorkspaceContext: () => contextValue.value,
}));

describe('NodeFileDocumentSearchPanel tree mode', () => {
  it('adds selected document from tree action button to canvas', () => {
    render(
      <MasterFolderTreeRuntimeProvider>
        <NodeFileDocumentSearchPanel
          newNodeType='prompt'
          setNewNodeType={vi.fn()}
          onExplanatoryClick={vi.fn()}
          onNodeInspectorClick={vi.fn()}
        />
      </MasterFolderTreeRuntimeProvider>
    );

    fireEvent.click(screen.getByLabelText('Add Doc 1 to canvas'));

    expect(contextValue.addNode).toHaveBeenCalledTimes(1);
    expect(contextValue.setNodeFileMeta).toHaveBeenCalledTimes(1);
    expect(contextValue.setNodeFileMeta).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        fileId: 'doc-1',
        fileType: 'document',
        fileName: 'Doc 1',
      })
    );
  });
});

