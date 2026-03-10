import type { AiPathRunNodeRecord, AiPathRunRecord } from '@/shared/contracts/ai-paths';

import { 
  readRuntimeTraceSummary, 
  toDate, 
  asString, 
  formatNodeLabel, 
  formatSpanDuration, 
  formatTraceSpanActionExplanation, 
  formatTraceSpanDetails, 
  resolveDurationMs 
} from './normalization';

import type { 
  RuntimeTraceTimelineItem
} from './types';

export const buildRuntimeTimelineItems = (
  run: AiPathRunRecord,
  nodes: AiPathRunNodeRecord[] = []
): RuntimeTraceTimelineItem[] => {
  const items: RuntimeTraceTimelineItem[] = [];
  const queuedAt = toDate(asString(run.createdAt));
  if (queuedAt) {
    items.push({
      id: `run-created-${run.id}`,
      timestamp: queuedAt,
      label: 'Run queued',
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: 'queued',
      kind: 'run',
      source: 'record',
    });
  }

  const startedAt = toDate(asString(run.startedAt));
  if (startedAt) {
    items.push({
      id: `run-started-${run.id}`,
      timestamp: startedAt,
      label: 'Run started',
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: 'running',
      kind: 'run',
      source: 'record',
    });
  }

  const traceSummary = readRuntimeTraceSummary(run.meta ?? null);
  if (traceSummary && traceSummary.spans.length > 0) {
    traceSummary.spans.forEach((span, index) => {
      const spanLabel = formatNodeLabel({
        nodeTitle: span.nodeTitle,
        nodeId: span.nodeId,
        nodeType: span.nodeType,
        iteration: span.iteration,
        attempt: span.attempt,
      });
      const spanStartedAt = toDate(span.startedAt);
      if (spanStartedAt) {
        items.push({
          id: `trace-span-start-${span.spanId ?? index}`,
          timestamp: spanStartedAt,
          label: 'Node started',
          description: spanLabel,
          status: 'running',
          kind: 'node',
          source: 'trace',
        });
      }
      const spanFinishedAt = toDate(span.finishedAt);
      if (spanFinishedAt) {
        const durationLabel = formatSpanDuration(span.durationMs);
        const actionExplanation = formatTraceSpanActionExplanation(span);
        items.push({
          id: `trace-span-finish-${span.spanId ?? index}`,
          timestamp: spanFinishedAt,
          label: `Node ${span.status ?? 'finished'}`,
          description: [
            durationLabel ? `${spanLabel} · ${durationLabel}` : spanLabel,
            actionExplanation,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' · '),
          status: span.status,
          kind: 'node',
          details: formatTraceSpanDetails(span),
          meta: span.error ?? undefined,
          source: 'trace',
        });
      }
    });
  } else {
    nodes.forEach((node) => {
      const nodeLabel = formatNodeLabel({
        nodeTitle: node.nodeTitle ?? null,
        nodeId: node.nodeId,
        nodeType: node.nodeType ?? null,
      });
      const nodeStartedAt = toDate(asString(node.startedAt));
      if (nodeStartedAt) {
        items.push({
          id: `node-start-${node.id}`,
          timestamp: nodeStartedAt,
          label: 'Node started',
          description: nodeLabel,
          status: 'running',
          kind: 'node',
          source: 'record',
        });
      }
      const nodeFinishedAt = toDate(asString(node.finishedAt) ?? asString(node.completedAt));
      if (nodeFinishedAt) {
        const durationLabel = formatSpanDuration(
          resolveDurationMs(asString(node.startedAt), asString(node.finishedAt))
        );
        items.push({
          id: `node-finish-${node.id}`,
          timestamp: nodeFinishedAt,
          label: `Node ${node.status}`,
          description: durationLabel ? `${nodeLabel} · ${durationLabel}` : nodeLabel,
          status: node.status,
          kind: 'node',
          meta: asString(node.errorMessage) ?? undefined,
          source: 'record',
        });
      }
    });
  }

  const finishedAt = toDate(asString(run.finishedAt));
  if (finishedAt) {
    items.push({
      id: `run-finished-${run.id}`,
      timestamp: finishedAt,
      label: `Run ${run.status}`,
      description: run.pathName ?? run.pathId ?? 'AI Path',
      status: run.status,
      kind: 'run',
      meta: asString(run.errorMessage) ?? undefined,
      source: 'record',
    });
  }

  return items
    .filter((item) => Number.isFinite(item.timestamp.getTime()))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
};
