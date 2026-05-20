/**
 * @file error-reporting.ts
 * @description Provides utilities for building, parsing, and summarizing errors
 * occurring during AI Path execution. It standardizes error reporting across
 * different scopes (enqueue, run, node, etc.) and provides a unified report format.
 */

import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_MODEL_NOT_CONFIGURED_CODE,
  AI_PATHS_MODEL_NOT_CONFIGURED_HINTS,
  AI_PATHS_MODEL_NOT_CONFIGURED_USER_MESSAGE,
  isAiPathsModelNotConfiguredMessage,
} from '@/shared/lib/ai-paths/model-configuration-errors';

/** Severity levels for AI Path errors. */
export type AiPathErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

/** Possible scopes where an error can occur within the AI Path system. */
export type AiPathErrorScope =
  | 'enqueue'
  | 'run'
  | 'node'
  | 'portable_engine'
  | 'stream'
  | 'api'
  | 'unknown';

/**
 * Detailed report of an error in an AI Path run.
 */
export type AiPathErrorReport = {
  /** Schema version of the report. */
  version: 1;
  /** Machine-readable error code (e.g., AI_PATHS_NODE_TIMEOUT). */
  code: string;
  /** Broad category of the error (e.g., runtime, validation). */
  category: string;
  /** Severity of the error. */
  severity: AiPathErrorSeverity;
  /** Where the error originated. */
  scope: AiPathErrorScope;
  /** Internal error message. */
  message: string;
  /** Human-friendly error message. */
  userMessage: string;
  /** ISO timestamp when the error occurred. */
  timestamp: string;
  /** Trace ID for tracking the request through systems. */
  traceId: string | null;
  /** Run ID associated with the error. */
  runId: string | null;
  /** Node ID if the error occurred within a specific node. */
  nodeId: string | null;
  /** Type of the node (if applicable). */
  nodeType: string | null;
  /** Display title of the node (if applicable). */
  nodeTitle: string | null;
  /** Attempt number (for retriable operations). */
  attempt: number | null;
  /** Iteration number (for loops). */
  iteration: number | null;
  /** Whether the error is considered retriable. */
  retryable: boolean;
  /** Recommended delay before retrying, in milliseconds. */
  retryAfterMs: number | null;
  /** HTTP status code (if from an API). */
  statusCode: number | null;
  /** Primary cause of the error. */
  cause: string | null;
  /** Chain of causes leading to this error. */
  causeChain: string[];
  /** Suggested actions or hints to resolve the error. */
  hints: string[];
  /** Additional structured metadata. */
  metadata: Record<string, unknown> | null;
};

/**
 * Error frequency by code in a run summary.
 */
export type AiPathRunErrorSummaryCode = {
  /** The error code. */
  code: string;
  /** Number of occurrences. */
  count: number;
};

/**
 * Summary of failures for a specific node.
 */
export type AiPathRunErrorSummaryNode = {
  /** The node ID. */
  nodeId: string;
  /** Type of the node. */
  nodeType: string | null;
  /** Title of the node. */
  nodeTitle: string | null;
  /** Last error code encountered by this node. */
  code: string | null;
  /** Last error message encountered by this node. */
  message: string | null;
  /** Total error count for this node. */
  count: number;
  /** ISO timestamp of the last error. */
  lastAt: string | null;
};

/**
 * High-level summary of errors for an entire AI Path run.
 */
export type AiPathRunErrorSummary = {
  /** Total count of errors with 'error' or 'fatal' severity. */
  totalErrors: number;
  /** Total number of reports included in this summary. */
  reportCount: number;
  /** Whether any of the errors are retriable. */
  retryable: boolean;
  /** ISO timestamp of the most recent error. */
  lastErrorAt: string | null;
  /** The most significant or recent error report. */
  primary: AiPathErrorReport | null;
  /** Frequency of error codes. */
  codes: AiPathRunErrorSummaryCode[];
  /** Failures grouped by node. */
  nodeFailures: AiPathRunErrorSummaryNode[];
};

type BuildAiPathErrorReportInput = {
  error: unknown;
  code?: string | null;
  category?: string | null;
  severity?: AiPathErrorSeverity | null;
  scope?: AiPathErrorScope | null;
  userMessage?: string | null;
  timestamp?: string | Date | null;
  traceId?: string | null;
  runId?: string | null;
  nodeId?: string | null;
  nodeType?: string | null;
  nodeTitle?: string | null;
  attempt?: number | null;
  iteration?: number | null;
  retryable?: boolean | null;
  retryAfterMs?: number | null;
  statusCode?: number | null;
  hints?: readonly string[] | null;
  metadata?: Record<string, unknown> | null;
};

const MAX_CAUSE_DEPTH = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toOptionalFiniteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeCode = (value: string | null | undefined, fallback: string): string => {
  const normalized = toNonEmptyString(value)?.toUpperCase() ?? fallback;
  return normalized.replace(/[^A-Z0-9_]+/g, '_');
};

const normalizeSeverity = (value: unknown, fallback: AiPathErrorSeverity): AiPathErrorSeverity => {
  if (value === 'info' || value === 'warning' || value === 'error' || value === 'fatal') {
    return value;
  }
  if (value === 'warn') return 'warning';
  return fallback;
};

const normalizeScope = (value: unknown): AiPathErrorScope => {
  if (
    value === 'enqueue' ||
    value === 'run' ||
    value === 'node' ||
    value === 'portable_engine' ||
    value === 'stream' ||
    value === 'api'
  ) {
    return value;
  }
  return 'unknown';
};

const toIsoTimestamp = (value: unknown): string => {
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return new Date().toISOString();
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }
  if (typeof error === 'string' && error.trim().length > 0) {
    return error.trim();
  }
  return String(error);
};

const readCause = (value: unknown): unknown => {
  if (!isRecord(value)) return undefined;
  return value['cause'];
};

const toCauseChain = (error: unknown): string[] => {
  const chain: string[] = [];
  const seen = new WeakSet<object>();
  let cursor = readCause(error);

  while (cursor !== undefined && cursor !== null && chain.length < MAX_CAUSE_DEPTH) {
    if (typeof cursor === 'object' && cursor !== null) {
      if (seen.has(cursor)) {
        chain.push('Circular cause reference.');
        break;
      }
      seen.add(cursor);
    }

    const causeMessage = toErrorMessage(cursor);
    chain.push(causeMessage);
    cursor = readCause(cursor);
  }

  return chain;
};

const inferRetryable = (error: unknown): boolean => {
  if (!isRecord(error)) return false;
  if (typeof error['retryable'] === 'boolean') return error['retryable'];
  if (typeof error['code'] === 'string') {
    const code = error['code'].toUpperCase();
    if (code.includes('TIMEOUT') || code.includes('RATE_LIMIT') || code.includes('UNAVAILABLE')) {
      return true;
    }
  }
  return false;
};

const toHints = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown): string | null => toNonEmptyString(entry))
    .filter((entry: string | null): entry is string => Boolean(entry));
};

/**
 * Constructs a standardized AiPathErrorReport from various input types.
 * @param input Raw error data and context.
 * @returns A normalized error report.
 */
export const buildAiPathErrorReport = (input: BuildAiPathErrorReportInput): AiPathErrorReport => {
  const message = toErrorMessage(input.error);
  const causeChain = toCauseChain(input.error);
  const reportCause = causeChain[0] ?? null;
  const isModelNotConfigured =
    isAiPathsModelNotConfiguredMessage(message) ||
    causeChain.some((causeMessage) => isAiPathsModelNotConfiguredMessage(causeMessage));
  const inputHints = input.hints ? toHints(input.hints) : [];
  const hints = isModelNotConfigured
    ? Array.from(new Set([...inputHints, ...AI_PATHS_MODEL_NOT_CONFIGURED_HINTS]))
    : inputHints;
  const retryable = isModelNotConfigured ? false : (input.retryable ?? inferRetryable(input.error));

  return {
    version: 1,
    code: isModelNotConfigured
      ? AI_PATHS_MODEL_NOT_CONFIGURED_CODE
      : normalizeCode(input.code ?? null, 'AI_PATHS_RUNTIME_UNHANDLED_ERROR'),
    category: isModelNotConfigured ? 'configuration' : (toNonEmptyString(input.category) ?? 'runtime'),
    severity: normalizeSeverity(input.severity, 'error'),
    scope: normalizeScope(input.scope),
    message,
    userMessage: isModelNotConfigured
      ? AI_PATHS_MODEL_NOT_CONFIGURED_USER_MESSAGE
      : (toNonEmptyString(input.userMessage) ?? message),
    timestamp: toIsoTimestamp(input.timestamp),
    traceId: toNonEmptyString(input.traceId),
    runId: toNonEmptyString(input.runId),
    nodeId: toNonEmptyString(input.nodeId),
    nodeType: toNonEmptyString(input.nodeType),
    nodeTitle: toNonEmptyString(input.nodeTitle),
    attempt: toOptionalFiniteNumber(input.attempt),
    iteration: toOptionalFiniteNumber(input.iteration),
    retryable,
    retryAfterMs: toOptionalFiniteNumber(input.retryAfterMs),
    statusCode: toOptionalFiniteNumber(input.statusCode),
    cause: reportCause,
    causeChain,
    hints,
    metadata: input.metadata ?? null,
  };
};

/**
 * Parses a raw object into a standardized AiPathErrorReport.
 * @param value The value to parse.
 * @returns The parsed report or null if invalid.
 */
export const parseAiPathErrorReport = (value: unknown): AiPathErrorReport | null => {
  if (!isRecord(value)) return null;
  const code = normalizeCode(toNonEmptyString(value['code']), 'AI_PATHS_RUNTIME_UNHANDLED_ERROR');
  const message = toNonEmptyString(value['message']);
  if (!message) return null;

  return {
    version: 1,
    code,
    category: toNonEmptyString(value['category']) ?? 'runtime',
    severity: normalizeSeverity(value['severity'], 'error'),
    scope: normalizeScope(value['scope']),
    message,
    userMessage: toNonEmptyString(value['userMessage']) ?? message,
    timestamp: toIsoTimestamp(value['timestamp']),
    traceId: toNonEmptyString(value['traceId']),
    runId: toNonEmptyString(value['runId']),
    nodeId: toNonEmptyString(value['nodeId']),
    nodeType: toNonEmptyString(value['nodeType']),
    nodeTitle: toNonEmptyString(value['nodeTitle']),
    attempt: toOptionalFiniteNumber(value['attempt']),
    iteration: toOptionalFiniteNumber(value['iteration']),
    retryable: value['retryable'] === true,
    retryAfterMs: toOptionalFiniteNumber(value['retryAfterMs']),
    statusCode: toOptionalFiniteNumber(value['statusCode']),
    cause: toNonEmptyString(value['cause']),
    causeChain: toHints(value['causeChain']),
    hints: toHints(value['hints']),
    metadata: isRecord(value['metadata']) ? value['metadata'] : null,
  };
};

const toEventFallbackSeverity = (level: AiPathRunEventRecord['level']): AiPathErrorSeverity => {
  if (level === 'fatal') return 'fatal';
  if (level === 'warn') return 'warning';
  return 'error';
};

const toEventReport = (event: AiPathRunEventRecord): AiPathErrorReport | null => {
  // Try to extract an embedded report from metadata first.
  const metadata = isRecord(event.metadata) ? event.metadata : null;
  const existing = parseAiPathErrorReport(metadata?.['errorReport']);
  if (existing) {
    return {
      ...existing,
      timestamp: toIsoTimestamp(event.createdAt ?? existing.timestamp),
      runId: toNonEmptyString(event.runId) ?? existing.runId,
      nodeId: toNonEmptyString(event.nodeId) ?? existing.nodeId,
      nodeType: toNonEmptyString(event.nodeType) ?? existing.nodeType,
      nodeTitle: toNonEmptyString(event.nodeTitle) ?? existing.nodeTitle,
    };
  }

  if (event.level !== 'error' && event.level !== 'fatal' && event.level !== 'warn') {
    return null;
  }

  return buildAiPathErrorReport({
    error: event.message,
    code:
      toNonEmptyString(metadata?.['errorCode']) ??
      (event.level === 'warn' ? 'AI_PATHS_RUNTIME_WARNING_EVENT' : 'AI_PATHS_RUNTIME_EVENT_ERROR'),
    category: toNonEmptyString(metadata?.['errorCategory']) ?? 'runtime',
    severity: toEventFallbackSeverity(event.level),
    scope: event.nodeId ? 'node' : 'run',
    timestamp: event.createdAt,
    runId: event.runId,
    nodeId: event.nodeId ?? null,
    nodeType: event.nodeType ?? null,
    nodeTitle: event.nodeTitle ?? null,
    attempt: toOptionalFiniteNumber(metadata?.['attempt']),
    iteration: event.iteration ?? toOptionalFiniteNumber(metadata?.['iteration']),
    retryable: metadata?.['retryable'] === true,
    retryAfterMs: toOptionalFiniteNumber(metadata?.['retryAfterMs']),
    statusCode: toOptionalFiniteNumber(metadata?.['statusCode']),
    hints: toHints(metadata?.['hints']),
    metadata,
  });
};

const toRunFallbackReport = (run: AiPathRunRecord): AiPathErrorReport | null => {
  const message = toNonEmptyString(run.errorMessage) ?? toNonEmptyString(run.error);
  if (!message) return null;
  return buildAiPathErrorReport({
    error: message,
    code: 'AI_PATHS_RUN_FAILED',
    category: 'runtime',
    severity: 'error',
    scope: 'run',
    timestamp: run.finishedAt ?? run.updatedAt ?? run.createdAt,
    runId: run.id,
    traceId:
      isRecord(run.meta) && typeof run.meta['traceId'] === 'string' ? run.meta['traceId'] : run.id,
    retryable: false,
    retryAfterMs: null,
    metadata: null,
  });
};

const toNodeFallbackReports = (nodes: AiPathRunNodeRecord[], runId: string): AiPathErrorReport[] =>
  nodes
    .filter(
      (node: AiPathRunNodeRecord): boolean =>
        node.status === 'failed' || node.status === 'blocked' || node.status === 'timeout'
    )
    .map(
      (node: AiPathRunNodeRecord): AiPathErrorReport => {
        const isBlocked = node.status === 'blocked';
        const isTimeout = node.status === 'timeout';
        const code = isBlocked
          ? 'AI_PATHS_NODE_BLOCKED'
          : isTimeout
            ? 'AI_PATHS_NODE_TIMEOUT'
            : 'AI_PATHS_NODE_FAILED';
        const fallbackMessage = isBlocked
          ? 'Node blocked without completing.'
          : isTimeout
            ? 'Node timed out without completing.'
            : 'Node failed without an explicit error message.';
        return buildAiPathErrorReport({
          error:
            toNonEmptyString(node.errorMessage) ??
            toNonEmptyString(node.error) ??
            fallbackMessage,
          code,
          category: 'runtime',
          severity: 'error',
          scope: 'node',
          timestamp: node.finishedAt ?? node.updatedAt ?? node.createdAt,
          runId,
          nodeId: node.nodeId,
          nodeType: node.nodeType,
          nodeTitle: node.nodeTitle ?? null,
          attempt: node.attempt,
        });
      }
    );

const compareReports = (left: AiPathErrorReport, right: AiPathErrorReport): number => {
  const leftTime = Date.parse(left.timestamp);
  const rightTime = Date.parse(right.timestamp);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime;
  }
  return left.code.localeCompare(right.code);
};

const dedupeReports = (reports: AiPathErrorReport[]): AiPathErrorReport[] => {
  const deduped: AiPathErrorReport[] = [];
  const keys = new Set<string>();
  reports.forEach((report: AiPathErrorReport) => {
    const key = [
      report.code,
      report.message,
      report.timestamp,
      report.nodeId ?? '',
      report.runId ?? '',
    ].join('|');
    if (keys.has(key)) return;
    keys.add(key);
    deduped.push(report);
  });
  return deduped;
};

const selectPrimaryReport = (reports: AiPathErrorReport[]): AiPathErrorReport | null => {
  const modelConfigurationReport = reports
    .slice()
    .reverse()
    .find((report) => report.code === AI_PATHS_MODEL_NOT_CONFIGURED_CODE);
  if (modelConfigurationReport) return modelConfigurationReport;
  return reports[reports.length - 1] ?? null;
};

/**
 * Aggregates error reports from run, node, and event records into a high-level summary.
 * @param input The run, nodes, and events to summarize.
 * @returns An error summary or null if no errors were found.
 */
export const buildAiPathRunErrorSummary = (input: {
  run: AiPathRunRecord;
  nodes: AiPathRunNodeRecord[];
  events: AiPathRunEventRecord[];
}): AiPathRunErrorSummary | null => {
  const eventReports = input.events
    .map((event: AiPathRunEventRecord): AiPathErrorReport | null => toEventReport(event))
    .filter((report: AiPathErrorReport | null): report is AiPathErrorReport => Boolean(report));
  const runReport = toRunFallbackReport(input.run);
  const nodeFallbackReports = toNodeFallbackReports(input.nodes, input.run.id);
  
  // Categorization Logic:
  // 1. Collect reports from events (the most detailed source).
  // 2. Add fallback report from the run status itself.
  // 3. Add fallback reports for any failed nodes.
  // 4. Sort by timestamp and deduplicate to ensure the summary is accurate and concise.
  const reports = dedupeReports(
    [...eventReports, ...(runReport ? [runReport] : []), ...nodeFallbackReports].sort(
      compareReports
    )
  );

  if (reports.length === 0) return null;

  const primary = selectPrimaryReport(reports);
  const codeMap = new Map<string, number>();
  const nodeMap = new Map<string, AiPathRunErrorSummaryNode>();

  reports.forEach((report: AiPathErrorReport) => {
    codeMap.set(report.code, (codeMap.get(report.code) ?? 0) + 1);
    if (!report.nodeId) return;
    const key = report.nodeId;
    const previous = nodeMap.get(key);
    if (!previous) {
      nodeMap.set(key, {
        nodeId: report.nodeId,
        nodeType: report.nodeType,
        nodeTitle: report.nodeTitle,
        code: report.code,
        message: report.userMessage,
        count: 1,
        lastAt: report.timestamp,
      });
      return;
    }
    nodeMap.set(key, {
      ...previous,
      count: previous.count + 1,
      code: report.code ?? previous.code,
      message: report.userMessage ?? previous.message,
      lastAt: report.timestamp,
    });
  });

  const codes = Array.from(codeMap.entries())
    .map(([code, count]): AiPathRunErrorSummaryCode => ({ code, count }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.code.localeCompare(right.code);
    })
    .slice(0, 10);
  const nodeFailures = Array.from(nodeMap.values())
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.nodeId.localeCompare(right.nodeId);
    })
    .slice(0, 10);

  const totalErrors = reports.filter(
    (report: AiPathErrorReport): boolean =>
      report.severity === 'error' || report.severity === 'fatal'
  ).length;

  return {
    totalErrors,
    reportCount: reports.length,
    retryable: reports.some((report: AiPathErrorReport): boolean => report.retryable),
    lastErrorAt: primary?.timestamp ?? null,
    primary,
    codes,
    nodeFailures,
  };
};

/**
 * Parses a raw value into an AiPathRunErrorSummary.
 * @param value The value to parse.
 * @returns The parsed summary or null if invalid.
 */
export const parseAiPathRunErrorSummary = (value: unknown): AiPathRunErrorSummary | null => {
  if (!isRecord(value)) return null;
  const primary = parseAiPathErrorReport(value['primary']);
  const codesRaw = Array.isArray(value['codes']) ? value['codes'] : [];
  const codes: AiPathRunErrorSummaryCode[] = codesRaw
    .map((entry: unknown): AiPathRunErrorSummaryCode | null => {
      if (!isRecord(entry)) return null;
      const code = toNonEmptyString(entry['code']);
      const count = toOptionalFiniteNumber(entry['count']);
      if (!code || count === null) return null;
      return { code, count };
    })
    .filter((entry: AiPathRunErrorSummaryCode | null): entry is AiPathRunErrorSummaryCode =>
      Boolean(entry)
    );
  const nodeRaw = Array.isArray(value['nodeFailures']) ? value['nodeFailures'] : [];
  const nodeFailures: AiPathRunErrorSummaryNode[] = nodeRaw
    .map((entry: unknown): AiPathRunErrorSummaryNode | null => {
      if (!isRecord(entry)) return null;
      const nodeId = toNonEmptyString(entry['nodeId']);
      const count = toOptionalFiniteNumber(entry['count']);
      if (!nodeId || count === null) return null;
      return {
        nodeId,
        nodeType: toNonEmptyString(entry['nodeType']),
        nodeTitle: toNonEmptyString(entry['nodeTitle']),
        code: toNonEmptyString(entry['code']),
        message: toNonEmptyString(entry['message']),
        count,
        lastAt: toNonEmptyString(entry['lastAt']),
      };
    })
    .filter((entry: AiPathRunErrorSummaryNode | null): entry is AiPathRunErrorSummaryNode =>
      Boolean(entry)
    );

  return {
    totalErrors: toOptionalFiniteNumber(value['totalErrors']) ?? 0,
    reportCount: toOptionalFiniteNumber(value['reportCount']) ?? 0,
    retryable: value['retryable'] === true,
    lastErrorAt: toNonEmptyString(value['lastErrorAt']),
    primary,
    codes,
    nodeFailures,
  };
};
