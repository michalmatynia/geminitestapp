import { type AiNode } from '@/shared/contracts/ai-paths';
import { type RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { DEFAULT_RETRY_BACKOFF_MS } from '../execution-helpers';
import { type EngineStateManager } from './engine-state-manager';

export type RuntimeRetryPolicy = {
  enabled: boolean;
  attempts: number;
  backoffMs: number;
};

export const readRuntimeRetryPolicy = (node: AiNode): RuntimeRetryPolicy => {
  const runtimeConfig = node.config?.runtime;
  if (!isObjectRecord(runtimeConfig)) {
    return {
      enabled: false,
      attempts: 1,
      backoffMs: DEFAULT_RETRY_BACKOFF_MS,
    };
  }

  const retryConfig = runtimeConfig['retry'];
  if (!isObjectRecord(retryConfig)) {
    return {
      enabled: false,
      attempts: 1,
      backoffMs: DEFAULT_RETRY_BACKOFF_MS,
    };
  }

  const attemptsValue =
    typeof retryConfig['attempts'] === 'number' && Number.isFinite(retryConfig['attempts'])
      ? Math.max(1, Math.trunc(retryConfig['attempts']))
      : 1;
  const backoffValue =
    typeof retryConfig['backoffMs'] === 'number' && Number.isFinite(retryConfig['backoffMs'])
      ? Math.max(0, Math.trunc(retryConfig['backoffMs']))
      : DEFAULT_RETRY_BACKOFF_MS;
  const isRetryEnabled = attemptsValue > 1;

  return {
    enabled: isRetryEnabled,
    attempts: attemptsValue,
    backoffMs: backoffValue,
  };
};

export const resolveRecoverableNodeWaitState = (
  node: AiNode,
  error: unknown
): { message: string; waitingOnPorts: string[] } | null => {
  if (node.type !== 'fetcher') return null;
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (!message) return null;
  const normalizedMessage = message.trim();
  if (!normalizedMessage) return null;

  if (
    normalizedMessage.includes('Simulated entity by ID') &&
    normalizedMessage.includes('no entity ID is configured')
  ) {
    return {
      message: normalizedMessage,
      waitingOnPorts: ['entityId'],
    };
  }

  if (
    normalizedMessage.toLowerCase().includes('could not hydrate') &&
    normalizedMessage.toLowerCase().includes('fetcher')
  ) {
    return {
      message: normalizedMessage,
      waitingOnPorts: ['entityId', 'entityType'],
    };
  }

  return null;
};

export const resolveBlockedNodeStatus = (
  outputs: RuntimePortValues | undefined
): 'blocked' | 'waiting_callback' => {
  const rawStatus =
    typeof outputs?.['status'] === 'string' ? String(outputs['status']).trim().toLowerCase() : '';
  return rawStatus === 'waiting_callback' || rawStatus === 'advance_pending'
    ? 'waiting_callback'
    : 'blocked';
};

export const resolveDeclaredNodeStatus = (
  outputs: RuntimePortValues | undefined
): string | null => {
  const rawStatus =
    typeof outputs?.['status'] === 'string' ? String(outputs['status']).trim().toLowerCase() : '';
  if (!rawStatus) return null;
  if (rawStatus === 'cancelled') return 'canceled';
  if (rawStatus === 'advance_pending') return 'waiting_callback';
  if (rawStatus === 'error') return 'failed';
  return rawStatus;
};

export const applyCachedNodeRuntimeStatus = (
  state: EngineStateManager,
  nodeId: string,
  outputs: RuntimePortValues
): void => {
  const rawStatus =
    typeof outputs['status'] === 'string' ? String(outputs['status']).trim().toLowerCase() : '';

  if (rawStatus === 'failed' || rawStatus === 'timeout' || rawStatus === 'error') {
    state.errorNodes.add(nodeId);
    if (rawStatus === 'timeout') {
      state.timeoutNodes.add(nodeId);
    } else {
      state.timeoutNodes.delete(nodeId);
    }
    state.finishedNodes.delete(nodeId);
    state.blockedNodes.delete(nodeId);
    return;
  }

  if (
    rawStatus === 'blocked' ||
    rawStatus === 'waiting_callback' ||
    rawStatus === 'advance_pending'
  ) {
    state.blockedNodes.add(nodeId);
    state.finishedNodes.delete(nodeId);
    state.errorNodes.delete(nodeId);
    state.timeoutNodes.delete(nodeId);
    return;
  }

  state.finishedNodes.add(nodeId);
  state.blockedNodes.delete(nodeId);
  state.errorNodes.delete(nodeId);
  state.timeoutNodes.delete(nodeId);
};
