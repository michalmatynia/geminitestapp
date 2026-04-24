import { describe, expect, it } from 'vitest';

import {
  resolveRunHistoryAction,
  runHistoryEntryActionTitle,
} from './run-history-entry-actions';

describe('run-history-entry-actions', () => {
  it('always exposes replay as the only forward-only history action', () => {
    expect(resolveRunHistoryAction({ resumeMode: 'retry' }).kind).toBe('replay_run');
    expect(resolveRunHistoryAction({ resumeDecision: 'reused' }).kind).toBe('replay_run');
    expect(resolveRunHistoryAction({ status: 'completed' })).toEqual(
      expect.objectContaining({
        kind: 'replay_run',
        resumeMode: 'replay',
        description: 'Forward-only mode replays the full run from recorded inputs.',
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
