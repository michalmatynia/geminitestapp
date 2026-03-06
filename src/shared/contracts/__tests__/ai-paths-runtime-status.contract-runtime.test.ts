import { describe, expect, it } from 'vitest';

import {
  AI_PATH_RUNTIME_NODE_STATUS_VALUES,
  TERMINAL_RUNTIME_NODE_STATUSES,
  TRANSIENT_RUNTIME_NODE_STATUSES,
  normalizeAiPathRuntimeNodeStatus,
} from '@/shared/contracts/ai-paths-runtime';

describe('ai-paths runtime status contract helpers', () => {
  it('normalizes canonical runtime statuses', () => {
    expect(normalizeAiPathRuntimeNodeStatus('  WAITING_CALLBACK  ')).toBe('waiting_callback');
    expect(normalizeAiPathRuntimeNodeStatus('PROCESSING')).toBe('processing');
    expect(normalizeAiPathRuntimeNodeStatus('skipped')).toBe('skipped');
  });

  it('rejects non-canonical runtime statuses', () => {
    expect(normalizeAiPathRuntimeNodeStatus('dead_lettered')).toBeNull();
    expect(normalizeAiPathRuntimeNodeStatus('')).toBeNull();
    expect(normalizeAiPathRuntimeNodeStatus(null)).toBeNull();
  });

  it('keeps terminal/transient sets aligned with status contract values', () => {
    const allStatuses = new Set<string>(AI_PATH_RUNTIME_NODE_STATUS_VALUES);

    TERMINAL_RUNTIME_NODE_STATUSES.forEach((status) => {
      expect(allStatuses.has(status)).toBe(true);
    });
    TRANSIENT_RUNTIME_NODE_STATUSES.forEach((status) => {
      expect(allStatuses.has(status)).toBe(true);
    });
  });
});
