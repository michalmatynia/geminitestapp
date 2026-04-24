import { describe, expect, it } from 'vitest';

import { TERMINAL_AI_PATH_RUN_STATUSES, isTerminalAiPathRunStatus } from '../path-run-status';

describe('path-run-status', () => {
  it('exposes the canonical terminal run statuses', () => {
    expect(TERMINAL_AI_PATH_RUN_STATUSES).toEqual(['completed', 'failed', 'canceled']);
  });

  it('recognizes terminal run statuses', () => {
    expect(isTerminalAiPathRunStatus('completed')).toBe(true);
    expect(isTerminalAiPathRunStatus('canceled')).toBe(true);
    expect(isTerminalAiPathRunStatus('running')).toBe(false);
    expect(isTerminalAiPathRunStatus(null)).toBe(false);
  });
});
