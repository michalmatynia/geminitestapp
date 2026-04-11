'use client';

import { useCallback, type MouseEvent, type MutableRefObject } from 'react';

import type { AiNode } from '@/shared/lib/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type {
  RuntimeControlHandlers,
  RuntimeNodeConfigHandlers,
  RuntimeRunStatus,
  RuntimeStateData,
} from './RuntimeContext.shared';

export const useRuntimeExternalActions = ({
  runControlHandlersRef,
  runtimeNodeConfigHandlersRef,
  setLastError,
  setRuntimeRunStatus,
}: {
  runControlHandlersRef: MutableRefObject<RuntimeControlHandlers>;
  runtimeNodeConfigHandlersRef: MutableRefObject<RuntimeNodeConfigHandlers>;
  setLastError: (value: RuntimeStateData['lastError']) => void;
  setRuntimeRunStatus: (
    value: RuntimeRunStatus | ((prev: RuntimeRunStatus) => RuntimeRunStatus)
  ) => void;
}) => {
  const reportMissingRunControlHandler = useCallback(
    (action: string, options?: { nodeId?: string | null; markFailed?: boolean }): void => {
      const message = `AI Paths runtime handler "${action}" is not initialized. Reload the page and try again.`;
      setLastError({
        message,
        time: new Date().toISOString(),
      });
      if (options?.markFailed) {
        setRuntimeRunStatus('failed');
      }
      logClientError(new Error(message), {
        context: {
          source: 'ai-paths.runtime-context',
          action,
          feature: 'ai-paths',
          category: 'AI',
          level: 'error',
          nodeId: options?.nodeId ?? null,
        },
      });
    },
    [setLastError, setRuntimeRunStatus]
  );

  const reportMissingRuntimeNodeConfigHandler = useCallback(
    (action: string, options?: { nodeId?: string | null }): void => {
      const message = `AI Paths runtime node-config handler "${action}" is not initialized. Reload the page and try again.`;
      setLastError({
        message,
        time: new Date().toISOString(),
      });
      logClientError(new Error(message), {
        context: {
          source: 'ai-paths.runtime-context',
          action,
          feature: 'ai-paths',
          category: 'AI',
          level: 'error',
          nodeId: options?.nodeId ?? null,
        },
      });
    },
    [setLastError]
  );

  const setRunControlHandlers = useCallback((handlers: RuntimeControlHandlers) => {
    runControlHandlersRef.current = handlers;
  }, [runControlHandlersRef]);

  const fireTrigger = useCallback(
    async (node: AiNode, event?: MouseEvent<Element>) => {
      const handler = runControlHandlersRef.current.fireTrigger;
      if (!handler) {
        reportMissingRunControlHandler('fireTrigger', { nodeId: node.id, markFailed: true });
        return;
      }
      await handler(node, event);
    },
    [reportMissingRunControlHandler, runControlHandlersRef]
  );

  const fireTriggerPersistent = useCallback(
    async (node: AiNode, event?: MouseEvent<Element>) => {
      const handler = runControlHandlersRef.current.fireTriggerPersistent;
      if (!handler) {
        reportMissingRunControlHandler('fireTriggerPersistent', {
          nodeId: node.id,
          markFailed: true,
        });
        return;
      }
      await handler(node, event);
    },
    [reportMissingRunControlHandler, runControlHandlersRef]
  );

  const pauseActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.pauseActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('pauseActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler, runControlHandlersRef]);

  const resumeActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.resumeActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('resumeActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler, runControlHandlersRef]);

  const stepActiveRun = useCallback(
    (triggerNode?: AiNode) => {
      const handler = runControlHandlersRef.current.stepActiveRun;
      if (!handler) {
        reportMissingRunControlHandler('stepActiveRun', { nodeId: triggerNode?.id ?? null });
        return;
      }
      handler(triggerNode);
    },
    [reportMissingRunControlHandler, runControlHandlersRef]
  );

  const cancelActiveRun = useCallback(() => {
    const handler = runControlHandlersRef.current.cancelActiveRun;
    if (!handler) {
      reportMissingRunControlHandler('cancelActiveRun');
      return;
    }
    handler();
  }, [reportMissingRunControlHandler, runControlHandlersRef]);

  const clearWires = useCallback(() => {
    const handler = runControlHandlersRef.current.clearWires;
    if (!handler) {
      reportMissingRunControlHandler('clearWires');
      return;
    }
    const result = handler();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      void (result as Promise<unknown>).catch(() => {});
    }
  }, [reportMissingRunControlHandler, runControlHandlersRef]);

  const resetRuntimeDiagnostics = useCallback(() => {
    runControlHandlersRef.current.resetRuntimeDiagnostics?.();
  }, [runControlHandlersRef]);

  const setRuntimeNodeConfigHandlers = useCallback((handlers: RuntimeNodeConfigHandlers) => {
    runtimeNodeConfigHandlersRef.current = handlers;
  }, [runtimeNodeConfigHandlersRef]);

  const fetchParserSample = useCallback(
    async (nodeId: string, entityType: string, entityId: string): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.fetchParserSample;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('fetchParserSample', { nodeId });
        return;
      }
      await handler(nodeId, entityType, entityId);
    },
    [reportMissingRuntimeNodeConfigHandler, runtimeNodeConfigHandlersRef]
  );

  const fetchUpdaterSample = useCallback(
    async (
      nodeId: string,
      entityType: string,
      entityId: string,
      options?: { notify?: boolean }
    ): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.fetchUpdaterSample;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('fetchUpdaterSample', { nodeId });
        return;
      }
      await handler(nodeId, entityType, entityId, options);
    },
    [reportMissingRuntimeNodeConfigHandler, runtimeNodeConfigHandlersRef]
  );

  const runSimulation = useCallback(
    async (node: AiNode, triggerEvent?: string): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.runSimulation;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('runSimulation', { nodeId: node.id });
        return;
      }
      const result = handler(node, triggerEvent);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        await (result as Promise<unknown>);
      }
    },
    [reportMissingRuntimeNodeConfigHandler, runtimeNodeConfigHandlersRef]
  );

  const sendToAi = useCallback(
    async (databaseNodeId: string, prompt: string): Promise<void> => {
      const handler = runtimeNodeConfigHandlersRef.current.sendToAi;
      if (!handler) {
        reportMissingRuntimeNodeConfigHandler('sendToAi', { nodeId: databaseNodeId });
        return;
      }
      await handler(databaseNodeId, prompt);
    },
    [reportMissingRuntimeNodeConfigHandler, runtimeNodeConfigHandlersRef]
  );

  return {
    setRunControlHandlers,
    fireTrigger,
    fireTriggerPersistent,
    pauseActiveRun,
    resumeActiveRun,
    stepActiveRun,
    cancelActiveRun,
    clearWires,
    resetRuntimeDiagnostics,
    setRuntimeNodeConfigHandlers,
    fetchParserSample,
    fetchUpdaterSample,
    runSimulation,
    sendToAi,
  };
};
