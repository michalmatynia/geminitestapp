import { type AiNode } from '@/shared/contracts/ai-paths';
import { TRIGGER_EVENTS, TRIGGER_INPUT_PORTS, TRIGGER_OUTPUT_PORTS } from '../../constants';

export const normalizeTriggerNode = (node: AiNode): AiNode => {
  return {
    ...node,
    inputs: TRIGGER_INPUT_PORTS,
    outputs: TRIGGER_OUTPUT_PORTS,
    config: {
      ...node.config,
      trigger: {
        event: node.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id ?? 'manual',
        contextMode: node.config?.trigger?.contextMode ?? 'trigger_only',
      },
    },
  };
};
