export type CaseResolverTreeNodeClickAction =
  | { type: 'noop' }
  | { type: 'select_folder'; folderPath: string }
  | { type: 'deactivate_active_file' }
  | { type: 'edit_file'; fileId: string }
  | { type: 'select_file'; fileId: string }
  | { type: 'select_asset'; assetId: string };

export type ResolveCaseResolverTreeNodeClickActionInput = {
  isCaseEntryNode: boolean;
  isSelected: boolean;
  isVirtualSectionNode: boolean;
  folderPath: string | null;
  fileId: string | null;
  fileType: string | null;
  assetId: string | null;
};

export type ResolvedCaseResolverTreeNodeClickAction = {
  shouldSelectNode: boolean;
  action: CaseResolverTreeNodeClickAction;
};

const NOOP_TREE_NODE_CLICK_ACTION: CaseResolverTreeNodeClickAction = { type: 'noop' };

const resolveTreeNodeFileClickAction = ({
  fileId,
  fileType,
  isSelected,
}: {
  fileId: string;
  fileType: string | null;
  isSelected: boolean;
}): CaseResolverTreeNodeClickAction => {
  if (fileType === 'case') {
    return NOOP_TREE_NODE_CLICK_ACTION;
  }
  if (isSelected) {
    return { type: 'deactivate_active_file' };
  }
  if (fileType === 'document' || fileType === 'scanfile') {
    return { type: 'edit_file', fileId };
  }
  return { type: 'select_file', fileId };
};

export const resolveCaseResolverTreeNodeClickAction = ({
  isCaseEntryNode,
  isSelected,
  isVirtualSectionNode,
  folderPath,
  fileId,
  fileType,
  assetId,
}: ResolveCaseResolverTreeNodeClickActionInput): ResolvedCaseResolverTreeNodeClickAction => {
  if (isCaseEntryNode) {
    return { shouldSelectNode: false, action: NOOP_TREE_NODE_CLICK_ACTION };
  }

  if (isVirtualSectionNode) {
    return {
      shouldSelectNode: !isSelected,
      action: NOOP_TREE_NODE_CLICK_ACTION,
    };
  }

  if (folderPath !== null) {
    return {
      shouldSelectNode: !isSelected,
      action: { type: 'select_folder', folderPath },
    };
  }

  if (fileId) {
    return {
      shouldSelectNode: !isSelected,
      action: resolveTreeNodeFileClickAction({ fileId, fileType, isSelected }),
    };
  }

  if (assetId) {
    return {
      shouldSelectNode: !isSelected,
      action: { type: 'select_asset', assetId },
    };
  }

  return {
    shouldSelectNode: !isSelected,
    action: NOOP_TREE_NODE_CLICK_ACTION,
  };
};
