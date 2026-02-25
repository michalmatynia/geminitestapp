export type RuntimeProfileHighlight = {
  type: 'run' | 'iteration' | 'node';
  phase?: 'start' | 'end' | undefined;
  nodeId?: string | undefined;
  nodeType?: string | undefined;
  status?: string | undefined;
  reason?: string | undefined;
  iteration?: number | undefined;
  durationMs?: number | undefined;
  hashMs?: number | undefined;
};

export type RuntimeProfileNodeSpanStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'cached'
  | 'skipped'
  | 'blocked';

export type RuntimeProfileNodeSpan = {
  spanId: string;
  nodeId: string;
  nodeType: string;
  nodeTitle: string | null;
  iteration: number;
  attempt: number;
  status: RuntimeProfileNodeSpanStatus;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  error: string | null;
  cached: boolean;
};

export type RuntimeProfileSnapshot = {
  traceId: string;
  recordedAt: string;
  eventCount: number;
  sampledEventCount: number;
  droppedEventCount: number;
  summary: {
    durationMs: number;
    iterationCount: number;
    nodeCount: number;
    edgeCount: number;
    hottestNodes: Array<{
      nodeId: string;
      nodeType: string;
      count: number;
      totalMs: number;
      maxMs: number;
      avgMs: number;
      errorCount: number;
      cachedCount: number;
      skippedCount: number;
    }>;
  } | null;
  highlights: RuntimeProfileHighlight[];
  nodeSpans: RuntimeProfileNodeSpan[];
};
