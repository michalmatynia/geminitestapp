import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PortableEngineTrendSnapshotsPanel } from '../PortableEngineTrendSnapshotsPanel';

const buildPayload = () => ({
  snapshotCount: 2,
  summary: {
    latestSnapshotAt: '2026-03-05T01:00:00.000Z',
    driftAlertsTotal: 1,
    sinkWritesFailedTotal: 2,
  },
  autoRemediation: {
    enabled: true,
    strategy: 'degrade_to_log_only' as const,
    threshold: 3,
    cooldownSeconds: 300,
    rateLimitWindowSeconds: 3600,
    rateLimitMaxActions: 2,
    notifications: {
      enabled: true,
      webhookConfigured: true,
      emailWebhookConfigured: false,
      emailRecipients: [],
      timeoutMs: 8000,
      deadLetter: {
        queuedCount: 1,
        replayPolicySkipsTotal: 1,
        replayPolicySkipReasons: [{ reason: 'dead_letter_endpoint_disallowed', count: 1 }],
      },
    },
    state: {
      consecutiveFailureCount: 2,
      remediationCount: 1,
      lastStatus: 'degraded',
      lastRemediatedAt: '2026-03-05T00:30:00.000Z',
    },
  },
  runExecution: {
    source: 'in_memory' as const,
    totals: {
      attempts: 8,
      successes: 5,
      failures: 3,
      successRate: 62.5,
      failureRate: 37.5,
    },
    failureStageCounts: {
      resolve: 1,
      validation: 1,
      runtime: 1,
    },
    topFailureErrors: [
      { reason: 'Invalid AI-Path payload', count: 2 },
      { reason: 'runtime failure', count: 1 },
    ],
    recentFailures: [
      {
        at: '2026-03-05T01:01:00.000Z',
        runner: 'client' as const,
        surface: 'canvas' as const,
        source: 'path_config' as const,
        stage: 'runtime' as const,
        error: 'runtime failure',
        durationMs: 240,
        validateBeforeRun: true,
        validationMode: 'strict',
      },
    ],
  },
  snapshots: [
    {
      at: '2026-03-05T01:00:00.000Z',
      trigger: 'threshold' as const,
      usageTotals: { uses: 12 },
      sinkTotals: { writesFailed: 2, writesAttempted: 10 },
      driftAlerts: [{ id: 'alert-1' }],
    },
    {
      at: '2026-03-05T00:50:00.000Z',
      trigger: 'manual' as const,
      usageTotals: { uses: 10 },
      sinkTotals: { writesFailed: 0, writesAttempted: 8 },
      driftAlerts: [],
    },
  ],
});

describe('PortableEngineTrendSnapshotsPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders run execution telemetry details from trend snapshots payload', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => buildPayload(),
    } as Response);

    render(<PortableEngineTrendSnapshotsPanel />);

    expect(await screen.findByText('Run execution telemetry')).toBeInTheDocument();
    expect(screen.getByText(/run failures 3/i)).toBeInTheDocument();
    expect(screen.getByText(/source=in_memory attempts=8 success=63% failure=38% stage\(1\/1\/1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Invalid AI-Path payload \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/runtime failure \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/client\/canvas\/runtime/i)).toBeInTheDocument();
  });

  it('falls back to unavailable run telemetry when payload does not include runExecution', async () => {
    const payload = buildPayload();
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...payload, runExecution: undefined }),
    } as Response);

    render(<PortableEngineTrendSnapshotsPanel />);

    expect(await screen.findByText('Run execution telemetry')).toBeInTheDocument();
    expect(screen.getByText(/source=unavailable attempts=0 success=0% failure=0% stage\(0\/0\/0\)/i)).toBeInTheDocument();
    expect(screen.getByText(/No recent runtime failures captured\./i)).toBeInTheDocument();
  });
});
