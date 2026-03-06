'use client';

import { useCallback, useRef, useState } from 'react';

import type {
  AiPathRuntimeEvent,
  AiPathRuntimeNodeStatus,
  AiPathRuntimeNodeStatusMap,
} from '@/shared/lib/ai-paths';
import {
  MAX_RUNTIME_EVENTS,
  NON_SETTLED_RUNTIME_NODE_STATUSES,
  TERMINAL_RUNTIME_NODE_STATUSES,
  TRANSIENT_RUNTIME_NODE_STATUSES,
  normalizeAiPathRuntimeNodeStatus,
  type RunStatus,
  type RuntimeEventInput,
  type SetNodeStatusInput,
} from '@/shared/contracts/ai-paths-runtime';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { resolveRuntimeNodeDisplayStatus } from './utils';

const DURATION_TERMINAL_NODE_STATUSES: ReadonlySet<AiPathRuntimeNodeStatus> = new Set([
  'completed',
  'cached',
  'failed',
  'canceled',
  'timeout',
  'skipped',
]);

export function useAiPathsRuntimeState() {
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [runtimeNodeStatuses, setRuntimeNodeStatuses] = useState<AiPathRuntimeNodeStatusMap>({});
  const [runtimeEvents, setRuntimeEvents] = useState<AiPathRuntimeEvent[]>([]);

  const runtimeNodeStatusesRef = useRef<AiPathRuntimeNodeStatusMap>({});
  const runStatusRef = useRef<RunStatus>(runStatus);
  const nodeStartTimesRef = useRef<Record<string, number>>({});
  const [nodeDurations, setNodeDurations] = useState<Record<string, number>>({});

  const setRunStatusWithRef = useCallback((status: RunStatus) => {
    runStatusRef.current = status;
    setRunStatus(status);
  }, []);

  const appendRuntimeEvent = useCallback((input: RuntimeEventInput): void => {
    const event: AiPathRuntimeEvent = {
      id:
        input.id ??
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `evt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`),
      timestamp: input.timestamp ?? new Date().toISOString(),
      type: input.type ?? 'log',
      source: input.source,
      kind: input.kind,
      level: input.level,
      message: input.message,
      ...(input.nodeId != null ? { nodeId: input.nodeId } : {}),
      ...(input.nodeType != null ? { nodeType: input.nodeType } : {}),
      ...(input.nodeTitle != null ? { nodeTitle: input.nodeTitle } : {}),
      ...(input.status != null ? { status: input.status } : {}),
      ...(input.iteration !== undefined ? { iteration: input.iteration } : {}),
      ...(input.metadata != null ? { metadata: input.metadata ?? undefined } : {}),
    };
    setRuntimeEvents((prev: AiPathRuntimeEvent[]): AiPathRuntimeEvent[] => {
      const next = [...prev, event];
      if (next.length > MAX_RUNTIME_EVENTS) {
        return next.slice(next.length - MAX_RUNTIME_EVENTS);
      }
      return next;
    });
  }, []);

  const resetRuntimeNodeStatuses = useCallback((next: AiPathRuntimeNodeStatusMap = {}): void => {
    runtimeNodeStatusesRef.current = next;
    setRuntimeNodeStatuses(next);
    nodeStartTimesRef.current = {};
    setNodeDurations({});
  }, []);

  const normalizeNodeStatus = useCallback(
    (value: unknown): AiPathRuntimeNodeStatus | null => normalizeAiPathRuntimeNodeStatus(value),
    []
  );

  const formatStatusLabel = useCallback((status: AiPathRuntimeNodeStatus): string => {
    switch (status) {
      case 'idle':
        return 'Idle';
      case 'queued':
        return 'Queued';
      case 'running':
        return 'Running';
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'canceled':
        return 'Canceled';
      case 'cached':
        return 'Cached';
      case 'polling':
        return 'Polling';
      case 'waiting_callback':
        return 'Waiting';
      case 'advance_pending':
        return 'Processing';
      case 'blocked':
        return 'Blocked';
      case 'skipped':
        return 'Skipped';
      case 'timeout':
        return 'Timeout';
      default:
        return String(status);
    }
  }, []);

  const setNodeStatus = useCallback(
    (input: SetNodeStatusInput): void => {
      const normalizedStatus = normalizeNodeStatus(input.status);
      const resolvedStatus = resolveRuntimeNodeDisplayStatus({
        status: normalizedStatus,
        metadata: isObjectRecord(input.metadata) ? input.metadata : null,
      });
      if (!resolvedStatus) return;
      const prevStatus = runtimeNodeStatusesRef.current[input.nodeId];
      if (prevStatus === resolvedStatus) return;

      if (prevStatus) {
        const isQueueLikeDowngrade =
          (resolvedStatus === 'queued' || resolvedStatus === 'pending') &&
          prevStatus !== 'idle' &&
          prevStatus !== 'queued' &&
          prevStatus !== 'pending';
        const isLateTransientAfterTerminal =
          TERMINAL_RUNTIME_NODE_STATUSES.has(prevStatus) &&
          TRANSIENT_RUNTIME_NODE_STATUSES.has(resolvedStatus);
        if (isQueueLikeDowngrade || isLateTransientAfterTerminal) {
          return;
        }
      }

      // Track node execution timing
      if (resolvedStatus === 'running') {
        nodeStartTimesRef.current[input.nodeId] = performance.now();
      }
      if (
        DURATION_TERMINAL_NODE_STATUSES.has(resolvedStatus) &&
        nodeStartTimesRef.current[input.nodeId] != null
      ) {
        const dur = Math.round(performance.now() - nodeStartTimesRef.current[input.nodeId]!);
        delete nodeStartTimesRef.current[input.nodeId];
        setNodeDurations((prev) => ({ ...prev, [input.nodeId]: dur }));
      }
      const next = {
        ...runtimeNodeStatusesRef.current,
        [input.nodeId]: resolvedStatus,
      };
      runtimeNodeStatusesRef.current = next;
      setRuntimeNodeStatuses(next);
      appendRuntimeEvent({
        source: input.source,
        kind: input.kind ?? 'node_status',
        level: input.level ?? 'info',
        message:
          input.message ??
          `Node ${input.nodeTitle ?? input.nodeId} is ${formatStatusLabel(resolvedStatus)}.`,
        nodeId: input.nodeId,
        ...(input.nodeType !== undefined ? { nodeType: input.nodeType } : {}),
        ...(input.nodeTitle !== undefined ? { nodeTitle: input.nodeTitle } : {}),
        status: resolvedStatus,
        ...(input.iteration !== undefined ? { iteration: input.iteration } : {}),
        ...(input.metadata != null ? { metadata: input.metadata } : {}),
      });
    },
    [normalizeNodeStatus, appendRuntimeEvent, formatStatusLabel]
  );

  const settleTransientNodeStatuses = useCallback(
    (
      terminalStatus: 'completed' | 'failed' | 'canceled',
      currentOutputs: Record<string, unknown> = {},
      options?: {
        settleQueued?: boolean;
      }
    ): void => {
      const settleQueued = options?.settleQueued === true;
      const currentStatuses = runtimeNodeStatusesRef.current;
      const nextStatuses: AiPathRuntimeNodeStatusMap = { ...currentStatuses };
      const candidateNodeIds = new Set<string>([
        ...Object.keys(currentStatuses),
        ...Object.keys(currentOutputs),
      ]);
      let changed = false;
      candidateNodeIds.forEach((nodeId: string) => {
        const outputStatus = ((currentOutputs[nodeId] ?? {}) as Record<string, unknown>)['status'];
        const normalizedStatus = normalizeNodeStatus(nextStatuses[nodeId] ?? outputStatus);
        if (!normalizedStatus) return;
        const isNonSettledStatus = NON_SETTLED_RUNTIME_NODE_STATUSES.has(normalizedStatus);
        if (isNonSettledStatus && !(settleQueued && normalizedStatus === 'queued')) {
          return;
        }
        if (nextStatuses[nodeId] === terminalStatus) return;
        nextStatuses[nodeId] = terminalStatus;
        changed = true;
      });
      if (!changed) return;
      runtimeNodeStatusesRef.current = nextStatuses;
      setRuntimeNodeStatuses(nextStatuses);
    },
    [normalizeNodeStatus]
  );

  return {
    runStatus,
    setRunStatus: setRunStatusWithRef,
    runStatusRef,
    runtimeNodeStatuses,
    setRuntimeNodeStatuses,
    runtimeNodeStatusesRef,
    runtimeEvents,
    setRuntimeEvents,
    appendRuntimeEvent,
    resetRuntimeNodeStatuses,
    setNodeStatus,
    settleTransientNodeStatuses,
    normalizeNodeStatus,
    formatStatusLabel,
    nodeDurations,
    nodeStartTimesRef,
  };
}
