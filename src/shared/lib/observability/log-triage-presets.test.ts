import { describe, expect, it } from 'vitest';

import {
  SYSTEM_LOG_TRIAGE_PRESETS,
  resolveSystemLogPresetFilters,
} from './log-triage-presets';

describe('system log triage presets', () => {
  it('resolves the Kangur slow progress preset with a duration filter', () => {
    const preset = SYSTEM_LOG_TRIAGE_PRESETS.find(
      (entry) => entry.id === 'kangur-slow-progress-last3d'
    );

    expect(preset).toBeDefined();

    const filters = resolveSystemLogPresetFilters(
      preset!,
      new Date('2026-03-07T12:00:00.000Z')
    );

    expect(filters).toMatchObject({
      source: 'kangur.progress.PATCH',
      minDurationMs: '750',
      fromDate: '2026-03-04',
      toDate: '2026-03-07',
    });
  });
});
