import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type {
  PromptExploderTreeNodeKind,
  PromptExploderTreeMetadata,
} from '@/shared/contracts/prompt-exploder';

export const PROMPT_EXPLODER_TREE_NODE_PREFIX = 'prompt_exploder_tree:';

export type { PromptExploderTreeNodeKind, PromptExploderTreeMetadata };

export const toPromptExploderTreeNodeId = (
  kind: PromptExploderTreeNodeKind,
  entityId: string
): string => `${PROMPT_EXPLODER_TREE_NODE_PREFIX}${kind}:${entityId}`;

export const parsePromptExploderTreeNodeId = (
  nodeId: string
): { kind: PromptExploderTreeNodeKind; entityId: string } | null => {
  if (!nodeId.startsWith(PROMPT_EXPLODER_TREE_NODE_PREFIX)) return null;
  const payload = nodeId.slice(PROMPT_EXPLODER_TREE_NODE_PREFIX.length).trim();
  if (!payload) return null;
  const separatorIndex = payload.indexOf(':');
  if (separatorIndex <= 0) return null;
  const kind = payload.slice(0, separatorIndex).trim() as PromptExploderTreeNodeKind;
  const entityId = payload.slice(separatorIndex + 1).trim();
  if (!entityId) return null;
  if (
    kind !== 'segment' &&
    kind !== 'list_item' &&
    kind !== 'subsection' &&
    kind !== 'subsection_item' &&
    kind !== 'hierarchy_item'
  ) {
    return null;
  }
  return { kind, entityId };
};

export const buildPromptExploderTreeMetadata = (
  metadata: PromptExploderTreeMetadata
): MasterTreeNode['metadata'] => ({
  promptExploderTree: metadata,
});

export const readPromptExploderTreeMetadata = (
  node: Pick<MasterTreeNode, 'metadata'>
): PromptExploderTreeMetadata | null => {
  const rawMetadata =
    node.metadata && typeof node.metadata === 'object' && !Array.isArray(node.metadata)
      ? (node.metadata as { promptExploderTree?: unknown }).promptExploderTree
      : null;
  if (!rawMetadata || typeof rawMetadata !== 'object' || Array.isArray(rawMetadata)) return null;
  const candidate = rawMetadata as Partial<PromptExploderTreeMetadata>;
  const kind = candidate.kind;
  const entityId = typeof candidate.entityId === 'string' ? candidate.entityId.trim() : '';
  if (
    kind !== 'segment' &&
    kind !== 'list_item' &&
    kind !== 'subsection' &&
    kind !== 'subsection_item' &&
    kind !== 'hierarchy_item'
  ) {
    return null;
  }
  if (!entityId) return null;
  return {
    kind,
    entityId,
    parentEntityId:
      typeof candidate.parentEntityId === 'string' ? candidate.parentEntityId : candidate.parentEntityId ?? null,
    segmentType: typeof candidate.segmentType === 'string' ? candidate.segmentType : null,
    code: typeof candidate.code === 'string' ? candidate.code : null,
    condition: typeof candidate.condition === 'string' ? candidate.condition : null,
    guidance: typeof candidate.guidance === 'string' ? candidate.guidance : null,
    logicalOperator:
      typeof candidate.logicalOperator === 'string' ? candidate.logicalOperator : null,
  };
};
