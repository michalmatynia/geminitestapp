import type { AiNode } from './ai-paths-core';

export interface LastErrorInfo {
  message: string;
  time: string;
  pathId?: string | null;
}

export type RuntimeRunStatus =
  | 'idle'
  | 'running'
  | 'blocked_on_lease'
  | 'handoff_ready'
  | 'paused'
  | 'stepping'
  | 'completed'
  | 'failed';

export interface RuntimeControlHandlers {
  fireTrigger?: (node: AiNode, event?: React.MouseEvent<Element>) => void | Promise<void>;
  fireTriggerPersistent?: (node: AiNode, event?: React.MouseEvent<Element>) => void | Promise<void>;
  pauseActiveRun?: () => void;
  resumeActiveRun?: () => void;
  stepActiveRun?: (triggerNode?: AiNode) => void;
  cancelActiveRun?: () => void;
  clearWires?: () => void | Promise<void>;
  resetRuntimeDiagnostics?: () => void;
}

export interface RuntimeNodeConfigHandlers {
  fetchParserSample?: (
    nodeId: string,
    entityType: string,
    entityId: string
  ) => void | Promise<void>;
  fetchUpdaterSample?: (
    nodeId: string,
    entityType: string,
    entityId: string,
    options?: { notify?: boolean }
  ) => void | Promise<void>;
  runSimulation?: (node: AiNode, triggerEvent?: string) => void | Promise<void>;
  sendToAi?: (databaseNodeId: string, prompt: string) => void | Promise<void>;
}

export type AiPathLocalRunStatus = 'success' | 'error';

export type AiPathLocalRunRecord = {
  id: string;
  pathId?: string | null;
  pathName?: string | null;
  triggerEvent?: string | null;
  triggerLabel?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  status: AiPathLocalRunStatus;
  startedAt: string;
  finishedAt: string;
  durationMs?: number | null;
  nodeCount?: number | null;
  nodeDurations?: Record<string, number> | null;
  error?: string | null;
  source?: string | null;
};
