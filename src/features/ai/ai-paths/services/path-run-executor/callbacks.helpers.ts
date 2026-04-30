import { toRuntimeNodeStatus } from '@/features/ai/ai-paths/services/path-run-executor.logic';
import type {
  AiPathRunNodeRecord,
  RuntimeProfileNodeSpanStatus,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';
import type {
  RuntimeSideEffectDecision,
  RuntimeSideEffectPolicy,
  RuntimeTraceEffect,
  RuntimeTraceSpanStatus,
} from '@/shared/contracts/ai-paths-runtime';
import { isEffectNodeType } from '@/shared/lib/ai-paths/core/node-handler-registry';

export function resolveFinishedNodeStatus(input: {
  cached?: boolean;
  nextOutputs: RuntimePortValues;
}): AiPathRunNodeRecord['status'] {
  if (input.cached) return 'cached';
  return toRuntimeNodeStatus(input.nextOutputs['status']) ?? 'completed';
}

export function resolveRuntimeTraceSpanStatus(
  status: AiPathRunNodeRecord['status']
): RuntimeTraceSpanStatus {
  switch (status) {
    case 'cached':
      return 'cached';
    case 'failed':
    case 'timeout':
    case 'canceled':
      return 'failed';
    case 'blocked':
      return 'blocked';
    case 'waiting_callback':
    case 'advance_pending':
      return 'waiting_callback';
    case 'skipped':
      return 'skipped';
    default:
      return 'completed';
  }
}

export function resolveRuntimeProfileSpanStatus(
  status: RuntimeTraceSpanStatus
): RuntimeProfileNodeSpanStatus {
  switch (status) {
    case 'cached':
      return 'cached';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'blocked':
    case 'waiting_callback':
      return 'blocked';
    default:
      return 'completed';
  }
}

export function resolveDurationMs(
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined
): number | null {
  if (!startedAt || !finishedAt) return null;
  const startedAtMs = Date.parse(startedAt);
  const finishedAtMs = Date.parse(finishedAt);
  if (!Number.isFinite(startedAtMs) || !Number.isFinite(finishedAtMs)) return null;
  return Math.max(0, finishedAtMs - startedAtMs);
}

export function buildRuntimeTraceEffect(input: {
  nodeType: string;
  sideEffectPolicy?: RuntimeSideEffectPolicy;
  sideEffectDecision?: RuntimeSideEffectDecision;
  effectSourceSpanId?: string | null;
}): RuntimeTraceEffect | undefined {
  const policy = input.sideEffectPolicy;
  const decision = input.sideEffectDecision;
  const sourceSpanId =
    typeof input.effectSourceSpanId === 'string' && input.effectSourceSpanId.trim().length > 0
      ? input.effectSourceSpanId.trim()
      : undefined;

  const isEffectNode = isEffectNodeType(input.nodeType);
  if (!isEffectNode && !policy && !decision && !sourceSpanId) {
    return undefined;
  }

  return {
    ...(policy ? { policy } : {}),
    ...(decision ? { decision } : {}),
    ...(sourceSpanId ? { sourceSpanId } : {}),
  };
}
