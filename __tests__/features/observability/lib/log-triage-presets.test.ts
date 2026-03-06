import { describe, expect, it } from 'vitest';

import {
  SYSTEM_LOG_FILTER_DEFAULTS,
  SYSTEM_LOG_TRIAGE_PRESETS,
  isSystemLogPresetActive,
  resolveSystemLogPresetFilters,
} from '@/shared/lib/observability/log-triage-presets';

describe('log-triage-presets', () => {
  it('resolves recent-errors preset with a rolling 24-hour date window', () => {
    const preset = SYSTEM_LOG_TRIAGE_PRESETS.find((item) => item.id === 'recent-errors-24h');
    expect(preset).toBeDefined();

    const now = new Date(2026, 1, 10, 12, 0, 0);
    const resolved = resolveSystemLogPresetFilters(preset, now);

    expect(resolved.level).toBe('error');
    expect(resolved.fromDate).toBe('2026-02-09');
    expect(resolved.toDate).toBe('2026-02-10');
  });

  it('matches only exact preset state including non-preset defaults', () => {
    const preset = SYSTEM_LOG_TRIAGE_PRESETS.find((item) => item.id === 'http-500-last7d');
    expect(preset).toBeDefined();

    const now = new Date(2026, 1, 10, 12, 0, 0);
    const resolved = resolveSystemLogPresetFilters(preset, now);

    const exactState = {
      ...SYSTEM_LOG_FILTER_DEFAULTS,
      ...resolved,
    };
    expect(isSystemLogPresetActive(exactState, resolved)).toBe(true);

    const changedState = {
      ...exactState,
      query: 'timeout',
    };
    expect(isSystemLogPresetActive(changedState, resolved)).toBe(false);
  });

  it('resolves Kangur preset with kangur source prefix filter', () => {
    const preset = SYSTEM_LOG_TRIAGE_PRESETS.find((item) => item.id === 'kangur-source-last7d');
    expect(preset).toBeDefined();

    const now = new Date(2026, 1, 10, 12, 0, 0);
    const resolved = resolveSystemLogPresetFilters(preset, now);

    expect(resolved.source).toBe('kangur.');
    expect(resolved.fromDate).toBe('2026-02-03');
    expect(resolved.toDate).toBe('2026-02-10');
  });
});
