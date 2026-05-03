import { describe, expect, it } from 'vitest';

import {
  resolveRunHistoryAction,
  runHistoryEntryActionTitle,
} from './run-history-entry-actions';

describe('run-history-entry-actions', () => {
  it('always exposes rerun-from-inputs as the only forward-only history action', () => {
    expect(resolveRunHistoryAction({ status: 'completed' })).toEqual(
      expect.objectContaining({
        kind: 'rerun_from_inputs',
        label: 'Run again',
        description: 'Forward-only mode starts a fresh run from recorded inputs.',
      })
    );
  });

  it('returns disabled title when history actions are unavailable', () => {
    expect(
      runHistoryEntryActionTitle(
        {
          status: 'completed',
        } as never,
        false
      )
    ).toBe('Run actions are not available in this context.');
  });
});
