/**
 * AI Paths Trigger Node Normalization
 * 
 * Normalization utilities for trigger nodes in AI paths.
 * Provides:
 * - Trigger node configuration normalization
 * - Standard input/output port assignment
 * - Trigger event handling
 * - Node standardization for triggers
 * - Path execution initiation setup
 */

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
        contextMode: 'trigger_only',
        entitySnapshotMode: node.config?.trigger?.entitySnapshotMode ?? 'auto',
      },
    },
  };
};
