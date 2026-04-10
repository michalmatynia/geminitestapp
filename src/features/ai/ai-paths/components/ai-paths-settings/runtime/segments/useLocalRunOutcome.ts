'use client';

import { useCallback, useRef } from 'react';

import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import { useRuntimeActions } from '@/features/ai/ai-paths/context/RuntimeContext';
import type { PathConfig, PathDebugSnapshot, RuntimeState } from '@/shared/lib/ai-paths';
import { appendLocalRun } from '@/shared/lib/ai-paths/local-runs';
import { PATH_DEBUG_PREFIX } from '@/shared/lib/ai-paths';
import { updateAiPathsSetting } from '@/shared/lib/ai-paths/settings-store-client';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { buildActivePathConfig, buildDebugSnapshot, safeJsonStringify } from '../utils';

import type { LocalExecutionArgs } from '../types';

export function useLocalRunOutcome(args: LocalExecutionArgs) {
  const argsRef = useRef(args);
  argsRef.current = args;

  const { setPathConfigs } = useGraphActions();
  const { setPathDebugSnapshots } = useRuntimeActions();

  const persistDebugSnapshot = useCallback(
    async (pathId: string | null, runAt: string, state: RuntimeState): Promise<void> => {
      const args = argsRef.current;
      if (!pathId) return;
      const snapshot = buildDebugSnapshot({ pathId, runAt, state, nodes: args.normalizedNodes });
      if (!snapshot) return;
      const payload = safeJsonStringify(snapshot);
      if (!payload) return;
      try {
        await updateAiPathsSetting(`${PATH_DEBUG_PREFIX}${pathId}`, payload);
        setPathDebugSnapshots((prev: Record<string, PathDebugSnapshot>) => ({
          ...prev,
          [pathId]: snapshot,
        }));
      } catch (error) {
        logClientCatch(error, {
          source: 'useAiPathsLocalExecution',
          action: 'persistDebugSnapshot',
          pathId,
        });
      }
    },
    [setPathDebugSnapshots]
  );

  const settleRuntimeCurrentRun = useCallback(
    (status: 'completed' | 'failed' | 'canceled', finishedAt: string): void => {
      const args = argsRef.current;
      args.setRuntimeState((prev: RuntimeState): RuntimeState => {
        const currentRun = prev.currentRun ?? null;
        return {
          ...prev,
          status,
          currentRun: currentRun
            ? {
                ...currentRun,
                status,
                finishedAt,
                ...(status === 'completed' ? { completedAt: finishedAt } : {}),
              }
            : currentRun,
        };
      });
    },
    []
  );

  const finalizeLocalRunOutcome = useCallback(
    (
      outcome: {
        status: 'completed' | 'paused' | 'canceled' | 'error';
        error?: unknown;
        state: RuntimeState;
      },
      meta: {
        startedAt: string;
        startedAtMs: number;
        triggerEvent: string | null;
        triggerContext: Record<string, unknown> | null;
      }
    ): void => {
      const args = argsRef.current;
      const finishedAt = new Date().toISOString();
      if (outcome.status === 'completed') {
        settleRuntimeCurrentRun('completed', finishedAt);
        args.settleTransientNodeStatuses('completed');
        args.appendRuntimeEvent({
          source: 'local',
          kind: 'run_completed',
          level: 'info',
          timestamp: finishedAt,
          message: 'Run completed.',
        });
        args.setLastRunAt(finishedAt);
        void persistDebugSnapshot(args.activePathId ?? null, finishedAt, outcome.state);
        if (args.activePathId) {
          setPathConfigs((prev: Record<string, PathConfig>) => ({
            ...prev,
            [args.activePathId!]: {
              ...(prev[args.activePathId!] ??
                buildActivePathConfig({
                  activePathId: args.activePathId,
                  pathName: args.pathName,
                  pathDescription: args.pathDescription,
                  activeTrigger: args.activeTrigger,
                  executionMode: args.executionMode,
                  runMode: args.runMode,
                  strictFlowMode: args.strictFlowMode,
                  blockedRunPolicy: args.blockedRunPolicy,
                  aiPathsValidation: args.aiPathsValidation,
                  nodes: args.normalizedNodes,
                  edges: args.sanitizedEdges,
                  updatedAt: finishedAt,
                  parserSamples: args.parserSamples,
                  updaterSamples: args.updaterSamples,
                  runtimeState: outcome.state,
                  lastRunAt: finishedAt,
                  runCount: 1,
                })),
              runtimeState: outcome.state,
              lastRunAt: finishedAt,
              runCount: Math.max(1, Math.trunc((prev[args.activePathId!]?.runCount ?? 0) + 1)),
            },
          }));
        }
        const entityId =
          typeof meta.triggerContext?.['entityId'] === 'string'
            ? meta.triggerContext['entityId']
            : null;
        const entityType =
          typeof meta.triggerContext?.['entityType'] === 'string'
            ? meta.triggerContext['entityType']
            : null;
        void appendLocalRun({
          pathId: args.activePathId ?? null,
          pathName: args.pathName ?? null,
          triggerEvent: meta['triggerEvent'] ?? null,
          triggerLabel: args.activeTrigger ?? null,
          entityId,
          entityType,
          status: 'success',
          startedAt: meta['startedAt'] ?? '',
          finishedAt,
          durationMs: Date.now() - (meta['startedAtMs'] ?? 0),
          nodeCount: args.normalizedNodes.length,
          nodeDurations: outcome.state.nodeDurations ?? null,
          source: 'ai_paths_ui',
        });
        return;
      }

      if (outcome.status === 'error') {
        settleRuntimeCurrentRun('failed', finishedAt);
        args.settleTransientNodeStatuses('failed');
        args.appendRuntimeEvent({
          source: 'local',
          kind: 'run_failed',
          level: 'error',
          timestamp: finishedAt,
          message:
            outcome.error instanceof Error ? `Run failed: ${outcome.error.message}` : 'Run failed.',
        });
        if (outcome.state) {
          args.setLastRunAt(finishedAt);
          if (args.activePathId) {
            setPathConfigs((prev: Record<string, PathConfig>) => ({
              ...prev,
              [args.activePathId!]: {
                ...(prev[args.activePathId!] ??
                  buildActivePathConfig({
                    activePathId: args.activePathId,
                    pathName: args.pathName,
                    pathDescription: args.pathDescription,
                    activeTrigger: args.activeTrigger,
                    executionMode: args.executionMode,
                    runMode: args.runMode,
                    strictFlowMode: args.strictFlowMode,
                    blockedRunPolicy: args.blockedRunPolicy,
                    aiPathsValidation: args.aiPathsValidation,
                    nodes: args.normalizedNodes,
                    edges: args.sanitizedEdges,
                    updatedAt: finishedAt,
                    parserSamples: args.parserSamples,
                    updaterSamples: args.updaterSamples,
                    runtimeState: outcome.state,
                    lastRunAt: finishedAt,
                    runCount: 1,
                  })),
                runtimeState: outcome.state,
                lastRunAt: finishedAt,
                runCount: Math.max(1, Math.trunc((prev[args.activePathId!]?.runCount ?? 0) + 1)),
              },
            }));
          }
        }
        void appendLocalRun({
          pathId: args.activePathId ?? null,
          pathName: args.pathName ?? null,
          triggerEvent: meta['triggerEvent'] ?? null,
          triggerLabel: args.activeTrigger ?? null,
          status: 'error',
          startedAt: meta['startedAt'] ?? '',
          finishedAt,
          durationMs: Date.now() - (meta['startedAtMs'] ?? 0),
          nodeCount: args.normalizedNodes.length,
          nodeDurations: outcome.state.nodeDurations ?? null,
          error: outcome.error instanceof Error ? outcome.error.message : 'Local run failed',
          source: 'ai_paths_ui',
        });
        return;
      }

      if (outcome.status === 'canceled') {
        settleRuntimeCurrentRun('canceled', finishedAt);
        args.settleTransientNodeStatuses('canceled');
        args.appendRuntimeEvent({
          source: 'local',
          kind: 'run_canceled',
          level: 'info',
          timestamp: finishedAt,
          message: 'Run canceled.',
        });
        args.toast('Run canceled.', { variant: 'info' });
        args.setLastRunAt(finishedAt);
        if (args.activePathId) {
          setPathConfigs((prev: Record<string, PathConfig>) => ({
            ...prev,
            [args.activePathId!]: {
              ...(prev[args.activePathId!] ??
                buildActivePathConfig({
                  activePathId: args.activePathId,
                  pathName: args.pathName,
                  pathDescription: args.pathDescription,
                  activeTrigger: args.activeTrigger,
                  executionMode: args.executionMode,
                  runMode: args.runMode,
                  strictFlowMode: args.strictFlowMode,
                  blockedRunPolicy: args.blockedRunPolicy,
                  aiPathsValidation: args.aiPathsValidation,
                  nodes: args.normalizedNodes,
                  edges: args.sanitizedEdges,
                  updatedAt: finishedAt,
                  parserSamples: args.parserSamples,
                  updaterSamples: args.updaterSamples,
                  runtimeState: outcome.state,
                  lastRunAt: finishedAt,
                  runCount: 1,
                })),
              runtimeState: outcome.state,
              lastRunAt: finishedAt,
              runCount: Math.max(1, Math.trunc((prev[args.activePathId!]?.runCount ?? 0) + 1)),
            },
          }));
        }
        void appendLocalRun({
          pathId: args.activePathId ?? null,
          pathName: args.pathName ?? null,
          triggerEvent: meta['triggerEvent'] ?? null,
          triggerLabel: args.activeTrigger ?? null,
          status: 'error',
          startedAt: meta['startedAt'] ?? '',
          finishedAt,
          durationMs: Date.now() - (meta['startedAtMs'] ?? 0),
          nodeCount: args.normalizedNodes.length,
          nodeDurations: outcome.state.nodeDurations ?? null,
          error: 'Run canceled',
          source: 'ai_paths_ui',
        });
      }
    },
    [persistDebugSnapshot, setPathConfigs, settleRuntimeCurrentRun]
  );

  return { finalizeLocalRunOutcome, persistDebugSnapshot };
}
