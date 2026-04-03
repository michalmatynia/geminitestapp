import { describe, expect, it } from 'vitest';

import {
  agentAuditLogRecordsResponseSchema,
  agentBrowserLogsResponseSchema,
  agentBrowserSnapshotsResponseSchema,
  agentRunEnqueueResponseSchema,
  agentRunsDeleteResponseSchema,
  agentRunsResponseSchema,
} from '@/shared/contracts/agent-runtime';

const AGENT_RUNS_RESPONSE = {
  runs: [
    {
      id: 'run-1',
      prompt: 'Open example.com and summarize it.',
      model: 'gpt-4.1-mini',
      tools: ['browser'],
      searchProvider: 'brave',
      agentBrowser: 'chromium',
      runHeadless: true,
      status: 'queued',
      logLines: ['[2026-03-11T10:00:00.000Z] Run queued.'],
      requiresHumanIntervention: false,
      errorMessage: null,
      recordingPath: null,
      activeStepId: null,
      checkpointedAt: null,
      createdAt: '2026-03-11T10:00:00.000Z',
      updatedAt: '2026-03-11T10:00:01.000Z',
      _count: {
        browserSnapshots: 0,
        browserLogs: 0,
      },
    },
  ],
} as const;

const AGENT_RUN_ENQUEUE_RESPONSE = {
  runId: 'run-1',
  status: 'queued',
} as const;

const AGENT_RUNS_DELETE_RESPONSE = {
  deleted: 2,
} as const;

const AGENT_BROWSER_SNAPSHOTS_RESPONSE = {
  snapshots: [
    {
      id: 'snapshot-1',
      runId: 'run-1',
      url: 'https://example.com',
      title: 'Example Domain',
      domHtml: '<html></html>',
      domText: 'Example Domain',
      screenshotData: null,
      screenshotPath: null,
      stepId: 'step-1',
      mouseX: null,
      mouseY: null,
      viewportWidth: 1280,
      viewportHeight: 720,
      createdAt: '2026-03-11T10:00:00.000Z',
    },
  ],
} as const;

const AGENT_BROWSER_LOGS_RESPONSE = {
  logs: [
    {
      id: 'log-1',
      runId: 'run-1',
      stepId: 'step-1',
      level: 'info',
      message: 'Navigated to page.',
      metadata: { type: 'navigation' },
      createdAt: '2026-03-11T10:00:00.000Z',
    },
  ],
} as const;

const AGENT_AUDIT_LOG_RECORDS_RESPONSE = {
  audits: [
    {
      id: 'audit-1',
      runId: 'run-1',
      level: 'warning',
      message: 'Resume summary prepared.',
      metadata: { type: 'resume_summary' },
      createdAt: '2026-03-11T10:00:00.000Z',
    },
  ],
} as const;

describe('agent runtime contract runtime', () => {
  it('parses agent run list and queue envelopes', () => {
    expect(agentRunsResponseSchema.parse(AGENT_RUNS_RESPONSE).runs).toHaveLength(1);
    expect(agentRunEnqueueResponseSchema.parse(AGENT_RUN_ENQUEUE_RESPONSE).runId).toBe('run-1');
    expect(agentRunsDeleteResponseSchema.parse(AGENT_RUNS_DELETE_RESPONSE).deleted).toBe(2);
  });

  it('parses agent snapshot, log, and audit envelopes', () => {
    expect(agentBrowserSnapshotsResponseSchema.parse(AGENT_BROWSER_SNAPSHOTS_RESPONSE).snapshots[0]?.url).toBe(
      'https://example.com'
    );
    expect(agentBrowserLogsResponseSchema.parse(AGENT_BROWSER_LOGS_RESPONSE).logs[0]?.message).toBe(
      'Navigated to page.'
    );
    expect(agentAuditLogRecordsResponseSchema.parse(AGENT_AUDIT_LOG_RECORDS_RESPONSE).audits[0]?.level).toBe(
      'warning'
    );
  });
});
