import type {
  AiPathRuntimeProfileEventDto,
  RuntimeProfileNodeStatsDto,
  RuntimeProfileSummaryDto,
  RuntimeState,
} from '@/shared/contracts/ai-paths-runtime';

export type RuntimeProfileEvent = AiPathRuntimeProfileEventDto;
export type RuntimeProfileNodeStats = RuntimeProfileNodeStatsDto;
export type RuntimeProfileSummary = RuntimeProfileSummaryDto;

export type RuntimeProfileOptions = {
  onEvent?: (event: RuntimeProfileEvent) => void;
  onSummary?: (summary: RuntimeProfileSummary) => void;
};

export class GraphExecutionError extends Error {
  state: RuntimeState;
  nodeId?: string | null;

  constructor(message: string, state: RuntimeState, nodeId?: string | null, cause?: unknown) {
    super(message);
    this.name = 'GraphExecutionError';
    this.state = state;
    this.nodeId = nodeId ?? null;
    if (cause && typeof (this as { cause?: unknown }).cause === 'undefined') {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

export class GraphExecutionCancelled extends Error {
  state: RuntimeState;
  nodeId?: string | null;

  constructor(message: string, state: RuntimeState, nodeId?: string | null, cause?: unknown) {
    super(message);
    this.name = 'GraphExecutionCancelled';
    this.state = state;
    this.nodeId = nodeId ?? null;
    if (cause && typeof (this as { cause?: unknown }).cause === 'undefined') {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}
