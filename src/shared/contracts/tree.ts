export type RecursiveTreeNode<TNode> = TNode & {
  children: RecursiveTreeNode<TNode>[];
};
