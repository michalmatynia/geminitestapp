import { describe, expect, it } from 'vitest';

import { formatTimeLimitValue, parseTimeLimitInput } from '../KangurAssignmentManager.helpers';

describe('KangurAssignmentManager.helpers', () => {
  it('formats time limits with canonical message keys', () => {
    expect(
      formatTimeLimitValue(30, (key, values) => `${key}:${JSON.stringify(values)}`)
    ).toBe('minutesOnly:{"minutes":30}');
    expect(
      formatTimeLimitValue(60, (key, values) => `${key}:${JSON.stringify(values)}`)
    ).toBe('hoursOnly:{"hours":1}');
    expect(
      formatTimeLimitValue(75, (key, values) => `${key}:${JSON.stringify(values)}`)
    ).toBe('hoursMinutes:{"hours":1,"minutes":15}');
  });

  it('returns null when there is no active time limit', () => {
    expect(formatTimeLimitValue(null, () => 'unexpected')).toBeNull();
    expect(formatTimeLimitValue(0, () => 'unexpected')).toBeNull();
  });

  it('parses blank input as no limit and validates bounds', () => {
    expect(parseTimeLimitInput('')).toEqual({ value: null, errorKey: null });
    expect(parseTimeLimitInput('0')).toEqual({ value: null, errorKey: 'validation.range' });
    expect(parseTimeLimitInput('25')).toEqual({ value: 25, errorKey: null });
    expect(parseTimeLimitInput('241')).toEqual({ value: null, errorKey: 'validation.range' });
  });
});
