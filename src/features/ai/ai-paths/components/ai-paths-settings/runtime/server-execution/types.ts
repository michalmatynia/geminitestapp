import type { AiNode, AiPathRunRecord } from '@/shared/contracts/ai-paths';

import type { ServerExecutionArgs } from '../types';

export type { ServerExecutionArgs };

export type ServerRunFinalizeOptions = {
  run?: AiPathRunRecord | null;
  message?: string;
  finishedAt?: string | null;
  level?: 'info' | 'warn' | 'error';
};

export type ServerRunStreamContext = {
  runId: string;
  runStartedAt: string;
  triggerNode: AiNode;
  runtimeNodeById: Map<string, AiNode>;
  historyLimit: number;
};
