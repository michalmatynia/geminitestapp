import { describe, expect, it } from 'vitest';

import {
  resolveRunHistoryAction,
  runHistoryEntryActionTitle,
} from './run-history-entry-actions';

describe('run-history-entry-actions', () => {
  it('returns retry action for retry mode and failed statuses', () => {
    expect(resolveRunHistoryAction({ resumeMode: 'retry' }).kind).toBe('retry_node');
    expect(resolveRunHistoryAction({ status: ' failed ' }).kind).toBe('retry_node');
  });

  it('returns resume action for resumable decisions and statuses', () => {
    expect(resolveRunHistoryAction({ resumeDecision: 'reused' }).kind).toBe('resume_run');
    expect(resolveRunHistoryAction({ resumeDecision: 'reexecuted' }).kind).toBe('resume_run');
    expect(resolveRunHistoryAction({ status: 'waiting_callback' }).kind).toBe('resume_run');
    expect(resolveRunHistoryAction({ status: 'blocked' }).resumeMode).toBe('resume');
  });

  it('falls back to replay action when no resume metadata is present', () => {
    expect(resolveRunHistoryAction({ status: 'completed' })).toEqual(
      expect.objectContaining({
        kind: 'replay_run',
        resumeMode: 'replay',
      })
    );
  });

  it('returns disabled title when history actions are unavailable', () => {
    expect(
      runHistoryEntryActionTitle(
        {
          status: 'completed',
          resumeMode: null,
          resumeDecision: null,
        } as never,
        false
      )
    ).toBe('Run actions are not available in this context.');
  });
});
