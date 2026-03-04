import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';

export const handleSubgraphNode: NodeHandler = ({
  node,
  prevOutputs,
}: NodeHandlerContext): RuntimePortValues => {
  if (node.type !== 'subgraph') return prevOutputs;

  const config = node.config?.['subgraph'];

  return {
    ...prevOutputs,
    status: 'failed',
    error:
      'Subgraph execution is not yet supported in the local runtime. Configure this node with a valid pathId and triggerNodeId, then run it via the AI Paths service.',
    errorCode: 'SUBGRAPH_NOT_SUPPORTED',
    subgraphConfig: config ?? null,
  };
};
