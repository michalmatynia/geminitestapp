import type { 
  AiPathRuntimeProfileEventDto, 
  RuntimeProfileSummaryDto 
} from '@/shared/contracts/ai-paths-runtime';
import { 
  RUNTIME_PROFILE_SAMPLE_LIMIT, 
  RUNTIME_TRACE_SPAN_LIMIT 
} from '../path-run-executor.helpers';
import type { 
  RuntimeProfileHighlight, 
  RuntimeProfileNodeSpan, 
  RuntimeProfileNodeSpanStatus 
} from './path-run-executor.types';

export function createPathRunProfiling() {
  const runtimeProfileHighlights: RuntimeProfileHighlight[] = [];
  const runtimeNodeSpans = new Map<string, RuntimeProfileNodeSpan>();
  const runtimeNodeSpanOrder: string[] = [];

  const setRuntimeNodeSpan = (span: RuntimeProfileNodeSpan): void => {
    runtimeNodeSpans.set(span.spanId, span);
    if (!runtimeNodeSpanOrder.includes(span.spanId)) {
      runtimeNodeSpanOrder.push(span.spanId);
    }
    if (runtimeNodeSpanOrder.length > RUNTIME_TRACE_SPAN_LIMIT) {
      const dropped = runtimeNodeSpanOrder.shift();
      if (dropped) {
        runtimeNodeSpans.delete(dropped);
      }
    }
  };

  const beginRuntimeNodeSpan = (input: {
    spanId: string;
    nodeId: string;
    nodeType: string;
    nodeTitle: string | null;
    iteration: number;
    attempt: number;
    startedAt: string;
  }): void => {
    setRuntimeNodeSpan({
      spanId: input.spanId,
      nodeId: input.nodeId,
      nodeType: input.nodeType,
      nodeTitle: input.nodeTitle,
      iteration: input.iteration,
      attempt: input.attempt,
      status: 'running',
      startedAt: input.startedAt,
      finishedAt: null,
      durationMs: null,
    });
  };

  const finalizeRuntimeNodeSpan = (input: {
    spanId: string;
    status: RuntimeProfileNodeSpanStatus;
    finishedAt: string;
  }): void => {
    const existing = runtimeNodeSpans.get(input.spanId);
    const startedAt = existing?.startedAt ?? null;
    let durationMs = null;
    if (startedAt) {
      const startMs = Date.parse(startedAt);
      const finishMs = Date.parse(input.finishedAt);
      if (!Number.isNaN(startMs) && !Number.isNaN(finishMs)) {
        durationMs = Math.max(0, finishMs - startMs);
      }
    }
    if (existing) {
      setRuntimeNodeSpan({
        ...existing,
        status: input.status,
        finishedAt: input.finishedAt,
        durationMs,
      });
    }
  };

  const getRuntimeNodeSpansSnapshot = (): RuntimeProfileNodeSpan[] =>
    runtimeNodeSpanOrder
      .map((id) => runtimeNodeSpans.get(id))
      .filter((span): span is RuntimeProfileNodeSpan => Boolean(span));

  const captureRuntimeProfileEvent = (event: AiPathRuntimeProfileEventDto): void => {
    if (runtimeProfileHighlights.length >= RUNTIME_PROFILE_SAMPLE_LIMIT) return;
    // We only capture specific highlights for now
    if (event.kind === 'node_finished' || event.kind === 'node_failed') {
      runtimeProfileHighlights.push({
        timestamp: event.timestamp,
        kind: event.kind,
        nodeId: event.nodeId ?? 'unknown',
        message: event.message,
      });
    }
  };

  return {
    runtimeProfileHighlights,
    beginRuntimeNodeSpan,
    finalizeRuntimeNodeSpan,
    getRuntimeNodeSpansSnapshot,
    captureRuntimeProfileEvent,
  };
}
