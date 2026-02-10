'use client';

import { useCallback, useRef } from 'react';

import type {
  AiNode,
  AiPathRunEventRecord,
  AiPathRunRecord,
  AiPathRuntimeEvent,
} from '@/features/ai/ai-paths/lib';
import {
  aiPathsApi,
} from '@/features/ai/ai-paths/lib';

import { 
  mergeRuntimeStateSnapshot, 
  resolveRunAt, 
  resolveRunStartedAt,
  buildActivePathConfig
} from './utils';
import {
  parseRuntimeState,
} from '../../AiPathsSettingsUtils';

import type { ServerExecutionArgs } from './types';

interface ServerStreamMessage {
  type: string;
  state?: unknown;
  nodeId?: string;
  status?: string;
  runId?: string;
  runStartedAt?: string;
  iteration?: number;
  events?: AiPathRunEventRecord[];
  error?: string;
  finishedAt?: string;
  updatedAt?: string;
  startedAt?: string;
}

interface AiPathRunEventRecordExtended extends AiPathRunEventRecord {
  nodeId?: string | null;
  runId?: string | null;
  status?: string | null;
  iteration?: number | null;
  metadata?: Record<string, unknown> | null;
  timestamp?: string | null;
}

export function useAiPathsServerExecution(args: ServerExecutionArgs) {
  const serverRunActiveRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stopServerRunStream = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    serverRunActiveRef.current = false;
  }, []);

  const runServerStream = useCallback(
    async (
      triggerNode: AiNode,
      triggerEvent: string,
      triggerContext: Record<string, unknown>
    ): Promise<void> => {
      if (!args.activePathId) return;
      if (serverRunActiveRef.current) stopServerRunStream();

      serverRunActiveRef.current = true;
      args.resetRuntimeNodeStatuses({});

      const eventSource = aiPathsApi.streamRun(args.activePathId, {
        triggerNodeId: triggerNode.id,
        triggerEvent,
        triggerContext,
      });

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event: MessageEvent): void => {
        try {
          const data = JSON.parse(event.data as string) as ServerStreamMessage;
          if (data.type === 'heartbeat') return;

          if (data.type === 'state_update' && data.state) {
            const nextState = parseRuntimeState(data.state);
            if (nextState) {
              args.setRuntimeState((prev) => mergeRuntimeStateSnapshot(prev, nextState));
            }
          }

          if (data.type === 'node_status' && data.nodeId) {
            const status = args.normalizeNodeStatus(data.status);
            const runtimeNode = args.normalizedNodes.find((n) => n.id === data.nodeId);
            args.setNodeStatus({
              nodeId: data.nodeId,
              status,
              source: 'server',
              runId: data.runId ?? null,
              runStartedAt: data.runStartedAt ?? null,
              nodeType: runtimeNode?.type,
              nodeTitle: runtimeNode?.title ?? null,
              iteration: data.iteration,
              kind: status === 'failed' ? 'node_failed' : 'node_status',
              level: status === 'failed' ? 'error' : 'info',
              message: `Node ${runtimeNode?.title ?? data.nodeId} ${args.formatStatusLabel(status)}.`,
            });
          }

          if (data.type === 'run_events' && Array.isArray(data.events)) {
            const logEvents: AiPathRuntimeEvent[] = [];
            data.events.forEach((rawItem: AiPathRunEventRecord): void => {
              const item = rawItem as AiPathRunEventRecordExtended;
              const nodeId = item.nodeId;
              const runId = item.runId;
              const status = args.normalizeNodeStatus(item.status);
              const iteration = item.iteration;
              const metadata = item.metadata;
              const runtimeNode = args.normalizedNodes.find((n) => n.id === nodeId);

              logEvents.push({
                id: item.id,
                timestamp: item.timestamp || new Date().toISOString(),
                source: 'server',
                kind: 'log',
                level: item.level as 'info' | 'warning' | 'error',
                message: item.message,
                runId: runId ?? null,
                nodeId: nodeId ?? null,
                nodeType: runtimeNode?.type,
                nodeTitle: runtimeNode?.title ?? null,
                status,
                iteration: iteration ?? undefined,
                metadata: metadata ?? undefined,
              });
            });
            if (logEvents.length > 0) {
              args.setRuntimeEvents((prev) => [...prev, ...logEvents]);
            }
          }

          if (data.type === 'run_completed') {
            const finishedAt = resolveRunAt(data as unknown as AiPathRunRecord);
            const startedAt = resolveRunStartedAt(data as unknown as AiPathRunRecord, args.runtimeStateRef.current);
            args.appendRuntimeEvent({
              source: 'server',
              kind: 'run_completed',
              level: 'info',
              runId: data.runId ?? null,
              runStartedAt: startedAt,
              timestamp: finishedAt,
              message: 'Server run completed.',
            });
            args.setLastRunAt(finishedAt);
            if (data.state) {
              const finalState = parseRuntimeState(data.state);
              if (finalState && args.activePathId) {
                args.setPathConfigs((prev) => ({
                  ...prev,
                  [args.activePathId!]: {
                    ...(prev[args.activePathId!] ?? buildActivePathConfig({
                      activePathId: args.activePathId,
                      pathName: args.pathName,
                      pathDescription: args.pathDescription,
                      activeTrigger: args.activeTrigger,
                      executionMode: args.executionMode,
                      runMode: args.runMode,
                      nodes: args.normalizedNodes,
                      edges: args.sanitizedEdges,
                      updatedAt: finishedAt,
                      parserSamples: args.parserSamples,
                      updaterSamples: args.updaterSamples,
                      runtimeState: finalState,
                      lastRunAt: finishedAt
                    })),
                    runtimeState: finalState,
                    lastRunAt: finishedAt,
                  },
                }));
              }
            }
            stopServerRunStream();
            args.settleTransientNodeStatuses('completed');
          }

          if (data.type === 'run_failed') {
            const finishedAt = resolveRunAt(data as unknown as AiPathRunRecord);
            const startedAt = resolveRunStartedAt(data as unknown as AiPathRunRecord, args.runtimeStateRef.current);
            args.appendRuntimeEvent({
              source: 'server',
              kind: 'run_failed',
              level: 'error',
              runId: data.runId ?? null,
              runStartedAt: startedAt,
              timestamp: finishedAt,
              message: `Server run failed: ${data.error || 'Unknown error'}`,
            });
            stopServerRunStream();
            args.settleTransientNodeStatuses('failed');
          }
        } catch (err) {
          console.error('[AI Paths] Failed to parse server stream message.', err);
        }
      };

      eventSource.onerror = (err: Event): void => {
        console.error('[AI Paths] Server run stream error.', err);
        args.appendRuntimeEvent({
          source: 'server',
          kind: 'run_failed',
          level: 'error',
          message: 'Server stream connection lost.',
        });
        stopServerRunStream();
        args.settleTransientNodeStatuses('failed');
      };
    },
    [args, stopServerRunStream]
  );

  return {
    serverRunActiveRef,
    runServerStream,
    stopServerRunStream,
  };
}
