import { describe, expect, it } from 'vitest';

import { resolveCaseResolverTreeNodeClickAction } from './CaseResolverTreeNode.helpers';

describe('resolveCaseResolverTreeNodeClickAction', () => {
  it('routes folder clicks through folder selection after selecting the node', () => {
    expect(
      resolveCaseResolverTreeNodeClickAction({
        isCaseEntryNode: false,
        isSelected: false,
        isVirtualSectionNode: false,
        folderPath: 'cases/incoming',
        fileId: null,
        fileType: null,
        assetId: null,
      })
    ).toEqual({
      shouldSelectNode: true,
      action: {
        type: 'select_folder',
        folderPath: 'cases/incoming',
      },
    });
  });

  it('deactivates a selected non-case file instead of reopening it', () => {
    expect(
      resolveCaseResolverTreeNodeClickAction({
        isCaseEntryNode: false,
        isSelected: true,
        isVirtualSectionNode: false,
        folderPath: null,
        fileId: 'file-1',
        fileType: 'document',
        assetId: null,
      })
    ).toEqual({
      shouldSelectNode: false,
      action: {
        type: 'deactivate_active_file',
      },
    });
  });

  it('keeps case files and virtual sections as no-op click targets', () => {
    expect(
      resolveCaseResolverTreeNodeClickAction({
        isCaseEntryNode: false,
        isSelected: false,
        isVirtualSectionNode: false,
        folderPath: null,
        fileId: 'case-1',
        fileType: 'case',
        assetId: null,
      })
    ).toEqual({
      shouldSelectNode: true,
      action: {
        type: 'noop',
      },
    });

    expect(
      resolveCaseResolverTreeNodeClickAction({
        isCaseEntryNode: false,
        isSelected: false,
        isVirtualSectionNode: true,
        folderPath: null,
        fileId: null,
        fileType: null,
        assetId: null,
      })
    ).toEqual({
      shouldSelectNode: true,
      action: {
        type: 'noop',
      },
    });
  });

  it('routes document, generic file, and asset clicks to their specialized actions', () => {
    expect(
      resolveCaseResolverTreeNodeClickAction({
        isCaseEntryNode: false,
        isSelected: false,
        isVirtualSectionNode: false,
        folderPath: null,
        fileId: 'doc-1',
        fileType: 'document',
        assetId: null,
      })
    ).toEqual({
      shouldSelectNode: true,
      action: {
        type: 'edit_file',
        fileId: 'doc-1',
      },
    });

    expect(
      resolveCaseResolverTreeNodeClickAction({
        isCaseEntryNode: false,
        isSelected: false,
        isVirtualSectionNode: false,
        folderPath: null,
        fileId: 'file-2',
        fileType: 'other',
        assetId: null,
      })
    ).toEqual({
      shouldSelectNode: true,
      action: {
        type: 'select_file',
        fileId: 'file-2',
      },
    });

    expect(
      resolveCaseResolverTreeNodeClickAction({
        isCaseEntryNode: false,
        isSelected: false,
        isVirtualSectionNode: false,
        folderPath: null,
        fileId: null,
        fileType: null,
        assetId: 'asset-1',
      })
    ).toEqual({
      shouldSelectNode: true,
      action: {
        type: 'select_asset',
        assetId: 'asset-1',
      },
    });
  });
});
