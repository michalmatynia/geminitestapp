import { describe, expect, it } from 'vitest';

import {
  BLOCKER_PROCESSING_STATUSES,
  formatRuntimeStatusLabel,
  normalizeRuntimeStatus,
  resolveEdgeRuntimeActive,
  resolveNodeBlockerProcessing,
  resolveNodeRuntimeStatusLabel,
} from '../canvas/signal-flow-visual-state';

describe('signal flow visual state', () => {
  it('normalizes runtime status values safely', () => {
    expect(normalizeRuntimeStatus('  WAITING_CALLBACK ')).toBe('waiting_callback');
    expect(normalizeRuntimeStatus('')).toBeNull();
    expect(normalizeRuntimeStatus(null)).toBeNull();
  });

  it('keeps edge runtime flow active only for true processing statuses', () => {
    expect(resolveEdgeRuntimeActive('running')).toBe(true);
    expect(resolveEdgeRuntimeActive('processing')).toBe(true);
    expect(resolveEdgeRuntimeActive('polling')).toBe(true);
    expect(resolveEdgeRuntimeActive('pending')).toBe(true);

    expect(resolveEdgeRuntimeActive('waiting_callback')).toBe(false);
    expect(resolveEdgeRuntimeActive('advance_pending')).toBe(false);
    expect(resolveEdgeRuntimeActive('queued')).toBe(false);
    expect(resolveEdgeRuntimeActive('completed')).toBe(false);
    expect(resolveEdgeRuntimeActive('failed')).toBe(false);
  });

  it('keeps edge runtime flow disabled for terminal and non-flow statuses', () => {
    [
      'waiting_callback',
      'advance_pending',
      'queued',
      'completed',
      'failed',
      'blocked',
      'skipped',
      'cached',
      'timeout',
      'canceled',
    ].forEach((status: string) => {
      expect(resolveEdgeRuntimeActive(status)).toBe(false);
    });
  });

  it('marks blocker processing only for processing-capable node types', () => {
    expect(
      resolveNodeBlockerProcessing({
        nodeType: 'model',
        status: 'waiting_callback',
      })
    ).toBe(true);
    expect(
      resolveNodeBlockerProcessing({
        nodeType: 'poll',
        status: 'advance_pending',
      })
    ).toBe(true);
    expect(
      resolveNodeBlockerProcessing({
        nodeType: 'fetcher',
        status: 'waiting_callback',
      })
    ).toBe(false);
  });

  it('maps waiting_callback label to Processing only for blocker-processing nodes', () => {
    expect(
      resolveNodeRuntimeStatusLabel({
        nodeType: 'model',
        status: 'waiting_callback',
      })
    ).toBe('Processing');

    expect(
      resolveNodeRuntimeStatusLabel({
        nodeType: 'fetcher',
        status: 'waiting_callback',
      })
    ).toBe('Waiting');
  });

  it('does not treat blocker terminal statuses as processing', () => {
    expect(
      resolveNodeBlockerProcessing({
        nodeType: 'model',
        status: 'blocked',
      })
    ).toBe(false);
    expect(
      resolveNodeBlockerProcessing({
        nodeType: 'agent',
        status: 'skipped',
      })
    ).toBe(false);
  });

  it('keeps status label contract stable for other statuses', () => {
    expect(formatRuntimeStatusLabel('advance_pending')).toBe('Processing');
    expect(formatRuntimeStatusLabel('queued')).toBe('Queued');
    expect(formatRuntimeStatusLabel('timeout')).toBe('Timeout');
    expect(BLOCKER_PROCESSING_STATUSES.has('waiting_callback')).toBe(true);
    expect(BLOCKER_PROCESSING_STATUSES.has('advance_pending')).toBe(true);
  });
});
