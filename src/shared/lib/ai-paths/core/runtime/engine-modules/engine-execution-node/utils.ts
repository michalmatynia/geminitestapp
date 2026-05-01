import { type AiNode, type Edge } from '@/shared/contracts/ai-paths';
import { type NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';
import { type RuntimeNodeBlockedReason } from '../engine-types';

export const normalizeBlockedReason = (value: unknown): RuntimeNodeBlockedReason => {
  if (typeof value !== 'string') return 'flow_control';
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'missing_inputs':
    case 'flow_control':
    case 'validation':
    case 'error':
    case 'waiting_callback':
      return normalized;
    default:
      return 'flow_control';
  }
};
