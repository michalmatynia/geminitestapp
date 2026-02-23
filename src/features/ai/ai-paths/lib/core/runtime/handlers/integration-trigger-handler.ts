import type { NodeHandler, NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

export const handleTrigger: NodeHandler = async ({
  node,
  triggerNodeId,
  triggerEvent,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  if (triggerNodeId && node.id !== triggerNodeId) {
    return {};
  }

  const eventName: string = triggerEvent ?? node.config?.trigger?.event ?? 'manual';

  return {
    trigger: true,
    triggerName: eventName,
  };
};
