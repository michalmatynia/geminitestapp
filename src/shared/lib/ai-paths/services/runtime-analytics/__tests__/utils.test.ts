import { describe, expect, it } from 'vitest';

import {
  RUNTIME_ANALYTICS_NODE_STATUS_KEYS,
  normalizeNodeStatus,
  resolveRuntimeAnalyticsNodeStatusKey,
} from '../utils';

describe('runtime analytics utils', () => {
  it('normalizes canonical runtime node statuses', () => {
    expect(normalizeNodeStatus('  WAITING_CALLBACK  ')).toBe('waiting_callback');
    expect(normalizeNodeStatus('processing')).toBe('processing');
    expect(normalizeNodeStatus('skipped')).toBe('skipped');
  });

  it('keeps legacy started status for analytics compatibility', () => {
    expect(normalizeNodeStatus('started')).toBe('started');
  });

  it('rejects unsupported statuses', () => {
    expect(normalizeNodeStatus('legacy_server_status')).toBeNull();
    expect(normalizeNodeStatus('')).toBeNull();
    expect(normalizeNodeStatus(null)).toBeNull();
  });

  it('resolves tracked analytics node status keys', () => {
    expect(resolveRuntimeAnalyticsNodeStatusKey('running')).toBe('started');
    expect(resolveRuntimeAnalyticsNodeStatusKey('waiting_callback')).toBe('waiting_callback');
    expect(resolveRuntimeAnalyticsNodeStatusKey('skipped')).toBeNull();
    expect(resolveRuntimeAnalyticsNodeStatusKey('legacy_server_status')).toBeNull();
    expect(RUNTIME_ANALYTICS_NODE_STATUS_KEYS).toEqual([
      'started',
      'completed',
      'failed',
      'queued',
      'polling',
      'cached',
      'waiting_callback',
    ]);
  });
});
