import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { JobQueueOverview } from '../job-queue-overview';
import type { QueueHistoryEntry, QueueStatus } from '../job-queue-panel-utils';

const buildQueueStatus = (patch?: Partial<QueueStatus>): QueueStatus => ({
  running: true,
  healthy: true,
  processing: true,
  activeRuns: 1,
  concurrency: 2,
  waitingCount: 0,
  failedCount: 0,
  completedCount: 10,
  delayedCount: 0,
  pausedCount: 0,
  lastPollTime: Date.parse('2026-03-09T07:27:00.000Z'),
  timeSinceLastPoll: 1_500,
  queuedCount: 3,
  oldestQueuedAt: null,
  queueLagMs: 2_000,
  completedLastMinute: 4,
  throughputPerMinute: 4,
  avgRuntimeMs: 1_200,
  p50RuntimeMs: 900,
  p95RuntimeMs: 2_100,
  runtimeAnalytics: {
    enabled: true,
    storage: 'redis',
  },
  brainQueue: {
    running: true,
    healthy: true,
    processing: true,
    activeJobs: 1,
    waitingJobs: 2,
    failedJobs: 0,
    completedJobs: 6,
  },
  brainAnalytics24h: {
    analyticsReports: 5,
    logReports: 8,
    totalReports: 13,
    warningReports: 1,
    errorReports: 0,
  },
  ...patch,
});

const buildQueueHistory = (): QueueHistoryEntry[] => [
  {
    ts: Date.parse('2026-03-09T07:26:00.000Z'),
    queued: 2,
    lagMs: 1_000,
    throughput: 3,
  },
];

describe('JobQueueOverview', () => {
  it('renders queue timestamps in a deterministic UTC format', () => {
    render(
      <JobQueueOverview
        queueStatus={buildQueueStatus()}
        queueStatusError={null}
        queueStatusFetching={false}
        queueHistory={buildQueueHistory()}
        lagThresholdMs={60_000}
        autoRefreshEnabled
        autoRefreshInterval={5_000}
        showMetricsPanel
        onToggleMetricsPanel={() => {}}
        onClearHistory={() => {}}
      />
    );

    expect(screen.getByText('07:27:00 UTC')).toBeTruthy();
    expect(screen.getByText(/last sample 07:26:00 UTC/i)).toBeTruthy();
    expect(screen.getByTitle('2 queued @ 07:26:00 UTC')).toBeTruthy();
  });
});
