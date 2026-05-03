import { describe, expect, it } from 'vitest';

import type {
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
} from '@/shared/contracts/ai-paths';

import {
  buildAiPathErrorReport,
  buildAiPathRunErrorSummary,
  parseAiPathErrorReport,
  parseAiPathRunErrorSummary,
} from '@/shared/lib/ai-paths/error-reporting';

const buildRun = (overrides: Partial<AiPathRunRecord> = {}): AiPathRunRecord =>
  ({
    id: 'run-1',
    status: 'failed',
    errorMessage: null,
    error: null,
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:05.000Z',
    finishedAt: '2026-03-09T12:00:05.000Z',
    nextRetryAt: null,
    meta: null,
    ...overrides,
  }) as unknown as AiPathRunRecord;

const buildNode = (overrides: Partial<AiPathRunNodeRecord> = {}): AiPathRunNodeRecord =>
  ({
    id: 'node-record-1',
    runId: 'run-1',
    nodeId: 'node-db-update',
    nodeType: 'database',
    nodeTitle: 'DB Update',
    status: 'failed',
    attempt: 1,
    errorMessage: null,
    error: null,
    createdAt: '2026-03-09T12:00:01.000Z',
    updatedAt: '2026-03-09T12:00:04.000Z',
    finishedAt: '2026-03-09T12:00:04.000Z',
    ...overrides,
  }) as unknown as AiPathRunNodeRecord;

describe('ai path error reporting shared-lib behavior', () => {
  it('builds normalized reports with inferred retryability and bounded circular causes', () => {
    const firstCause = new Error('inner timeout');
    const secondCause = new Error('outer timeout');
    (firstCause as Error & { cause?: unknown }).cause = secondCause;
    (secondCause as Error & { cause?: unknown }).cause = firstCause;
    const error = new Error('Top level timeout');
    (error as Error & { code?: string; cause?: unknown }).code = 'gateway_timeout';
    (error as Error & { cause?: unknown }).cause = firstCause;

    const report = buildAiPathErrorReport({
      error,
      code: ' model failure ',
      severity: 'warn',
      scope: 'something-else',
      userMessage: '  Friendly message  ',
      timestamp: 'invalid-date',
      attempt: Number.POSITIVE_INFINITY,
      iteration: 2,
      retryAfterMs: 1500,
      statusCode: 503,
      hints: [' retry ', '', 'open settings'],
      metadata: { source: 'test' },
    });

    expect(report).toEqual(
      expect.objectContaining({
        code: 'MODEL_FAILURE',
        severity: 'warning',
        scope: 'unknown',
        userMessage: 'Friendly message',
        retryable: true,
        attempt: null,
        iteration: 2,
        retryAfterMs: 1500,
        statusCode: 503,
        cause: 'inner timeout',
        hints: ['retry', 'open settings'],
        metadata: { source: 'test' },
      })
    );
    expect(report.causeChain).toContain('Circular cause reference.');
    expect(Date.parse(report.timestamp)).not.toBeNaN();
  });

  it('parses stored error reports and summaries while discarding invalid entries', () => {
    expect(parseAiPathErrorReport({ code: 'MISSING_ONLY' })).toBeNull();

    const parsedReport = parseAiPathErrorReport({
      code: 'node failure',
      severity: 'fatal',
      scope: 'node',
      message: 'Node failed',
      userMessage: '',
      timestamp: '2026-03-10T10:00:00.000Z',
      retryable: true,
      causeChain: ['first', '', 'second'],
      hints: ['retry', ''],
      metadata: { source: 'stored' },
    });

    expect(parsedReport).toEqual(
      expect.objectContaining({
        code: 'NODE_FAILURE',
        severity: 'fatal',
        scope: 'node',
        userMessage: 'Node failed',
        retryable: true,
        causeChain: ['first', 'second'],
        hints: ['retry'],
        metadata: { source: 'stored' },
      })
    );

    const parsedSummary = parseAiPathRunErrorSummary({
      totalErrors: 3,
      reportCount: 4,
      retryable: true,
      lastErrorAt: '2026-03-10T10:05:00.000Z',
      primary: {
        code: 'primary_error',
        message: 'Primary failure',
        severity: 'error',
        scope: 'run',
      },
      codes: [{ code: 'RUN_FAILED', count: 2 }, { code: '', count: 1 }],
      nodeFailures: [
        { nodeId: 'node-1', count: 2, code: 'RUN_FAILED', message: 'Boom' },
        { nodeId: '', count: 1, code: 'IGNORED' },
      ],
    });

    expect(parsedSummary).toEqual(
      expect.objectContaining({
        totalErrors: 3,
        reportCount: 4,
        retryable: true,
        primary: expect.objectContaining({
          code: 'PRIMARY_ERROR',
          message: 'Primary failure',
        }),
        codes: [{ code: 'RUN_FAILED', count: 2 }],
        nodeFailures: [
          expect.objectContaining({
            nodeId: 'node-1',
            count: 2,
            code: 'RUN_FAILED',
            message: 'Boom',
          }),
        ],
      })
    );
  });

  it('builds summaries from persisted event reports, fallback run errors, and node failures without duplicates', () => {
    const eventReport = buildAiPathErrorReport({
      error: 'Persisted warning',
      code: 'event_warning',
      severity: 'warning',
      scope: 'node',
      timestamp: '2026-03-09T12:00:03.000Z',
      runId: 'run-1',
      nodeId: 'node-db-update',
      nodeType: 'database',
      nodeTitle: 'DB Update',
      retryable: true,
    });
    const events: AiPathRunEventRecord[] = [
      {
        id: 'event-1',
        runId: 'run-1',
        nodeId: 'node-db-update',
        nodeType: 'database',
        nodeTitle: 'DB Update',
        level: 'warn',
        message: 'Persisted warning',
        metadata: { errorReport: eventReport },
        createdAt: '2026-03-09T12:00:03.000Z',
      } as AiPathRunEventRecord,
      {
        id: 'event-2',
        runId: 'run-1',
        nodeId: 'node-db-update',
        nodeType: 'database',
        nodeTitle: 'DB Update',
        level: 'warn',
        message: 'Persisted warning',
        metadata: { errorReport: eventReport },
        createdAt: '2026-03-09T12:00:03.000Z',
      } as AiPathRunEventRecord,
      {
        id: 'event-3',
        runId: 'run-1',
        nodeId: 'node-api',
        nodeType: 'http',
        nodeTitle: 'HTTP Call',
        level: 'fatal',
        message: 'API exploded',
        iteration: 4,
        metadata: {
          errorCode: 'api_failure',
          errorCategory: 'api',
          statusCode: 502,
          retryable: false,
          hints: ['retry later'],
        },
        createdAt: '2026-03-09T12:00:06.000Z',
      } as AiPathRunEventRecord,
    ];

    const summary = buildAiPathRunErrorSummary({
      run: buildRun({
        status: 'failed',
        errorMessage: 'Run exhausted retries',
        nextRetryAt: '2026-03-09T12:10:00.000Z',
        meta: { traceId: 'trace-run-1' },
      }),
      nodes: [
        buildNode({ status: 'timeout', errorMessage: null }),
        buildNode({ id: 'node-record-2', nodeId: 'node-api', nodeType: 'http', nodeTitle: 'HTTP Call', status: 'blocked' }),
      ],
      events,
    });

    expect(summary).not.toBeNull();
    expect(summary).toEqual(
      expect.objectContaining({
        reportCount: 5,
        retryable: true,
        totalErrors: 4,
        primary: expect.objectContaining({
          code: 'API_FAILURE',
          severity: 'fatal',
          nodeId: 'node-api',
        }),
      })
    );
    expect(summary!.codes).toEqual(
      expect.arrayContaining([
        { code: 'AI_PATHS_NODE_TIMEOUT', count: 1 },
        { code: 'API_FAILURE', count: 1 },
        { code: 'EVENT_WARNING', count: 1 },
        { code: 'AI_PATHS_RUN_FAILED', count: 1 },
      ])
    );
    expect(summary!.nodeFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: 'node-db-update',
          count: 2,
        }),
        expect.objectContaining({
          nodeId: 'node-api',
          count: 2,
        }),
      ])
    );
  });
});
