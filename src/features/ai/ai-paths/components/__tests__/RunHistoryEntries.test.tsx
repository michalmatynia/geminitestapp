import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';

import { RunHistoryEntries } from '../RunHistoryEntries';

describe('RunHistoryEntries', () => {
  it('renders replay and effect metadata chips when present', () => {
    const entries: RuntimeHistoryEntry[] = [
      {
        timestamp: '2026-03-07T10:00:00.000Z',
        pathId: 'path-1',
        pathName: 'Path 1',
        traceId: 'run-1',
        spanId: 'node-http:1:1',
        nodeId: 'node-http',
        nodeType: 'http',
        nodeTitle: 'HTTP Node',
        status: 'cached',
        iteration: 1,
        attempt: 1,
        inputs: {
          url: 'https://example.test/items',
        },
        outputs: {
          value: {
            ok: true,
          },
        },
        inputHash: 'hash-1',
        cacheDecision: 'seed',
        sideEffectPolicy: 'per_activation',
        sideEffectDecision: 'skipped_duplicate',
        effectSourceSpanId: 'node-origin:1:1',
        activationHash: 'activation-hash-1',
        idempotencyKey: 'idempotency-key-1',
        resumeMode: 'resume',
        resumeDecision: 'reused',
        resumeReason: 'completed_upstream',
        resumeSourceSpanId: 'node-upstream:1:1',
        resumeSourceStatus: 'completed',
      },
    ];

    const onReplayFromEntry = vi.fn();

    render(
      <RunHistoryEntries
        entries={entries}
        showNodeLabel
        onReplayFromEntry={onReplayFromEntry}
      />
    );

    expect(screen.getByText('cache=seed')).toBeInTheDocument();
    expect(screen.getByText('effect=skipped_duplicate')).toBeInTheDocument();
    expect(screen.getByText('policy=per_activation')).toBeInTheDocument();
    expect(screen.getByText('sourceSpan=node-origin:1:1')).toBeInTheDocument();
    expect(screen.getByText('activation=activation-hash-1')).toBeInTheDocument();
    expect(screen.getByText('idempotency=idempotency-key-1')).toBeInTheDocument();
    expect(screen.getByText('resume=reused')).toBeInTheDocument();
    expect(screen.getByText('resumeMode=resume')).toBeInTheDocument();
    expect(screen.getByText('resumeReason=completed_upstream')).toBeInTheDocument();
    expect(screen.getByText('resumeSource=node-upstream:1:1')).toBeInTheDocument();
    expect(screen.getByText('resumeStatus=completed')).toBeInTheDocument();
    expect(
      screen.getByText('Resume metadata present; reuses recorded upstream outputs.')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume run' }));
    expect(onReplayFromEntry).toHaveBeenCalledWith(entries[0]);
  });

  it('labels failed history entries as node retries', () => {
    const entries: RuntimeHistoryEntry[] = [
      {
        timestamp: '2026-03-07T10:05:00.000Z',
        pathId: 'path-1',
        pathName: 'Path 1',
        traceId: 'run-2',
        spanId: 'node-failed:1:1',
        nodeId: 'node-failed',
        nodeType: 'template',
        nodeTitle: 'Recover',
        status: 'failed',
        iteration: 1,
        attempt: 1,
        inputs: {
          value: 'seeded',
        },
        outputs: {
          status: 'failed',
          error: 'boom',
        },
        inputHash: 'hash-2',
        error: 'boom',
      },
    ];

    render(<RunHistoryEntries entries={entries} onReplayFromEntry={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Retry node' })).toBeInTheDocument();
    expect(screen.getByText('Failed node entry; queues a node-only retry.')).toBeInTheDocument();
  });
});
