import type {
  MasterTreeId,
  MasterTreeNode,
} from '@/shared/utils/master-folder-tree-contract';

export const resolveRootTopReorderAnchor = <TEntityId extends string>({
  roots,
  decodeNodeId,
  draggedEntityId,
}: {
  roots: Array<Pick<MasterTreeNode, 'id'>>;
  decodeNodeId: (nodeId: MasterTreeId) => TEntityId | null;
  draggedEntityId: TEntityId;
}): TEntityId | null => {
  return (
    roots
      .map((root: Pick<MasterTreeNode, 'id'>): TEntityId | null => decodeNodeId(root.id))
      .find(
        (candidate: TEntityId | null): candidate is TEntityId =>
          Boolean(candidate) && candidate !== draggedEntityId
      ) ?? null
  );
};
