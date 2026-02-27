import { describe, expect, it } from 'vitest';

import { localHmToUtcHm, utcHmToLocalHm } from '@/features/database/utils/backup-schedule-time';

describe('backup schedule time conversion helpers', () => {
  const referenceDate = new Date('2026-02-27T12:00:00.000Z');

  it('converts UTC time to local and preserves value in round-trip conversion', () => {
    const local = utcHmToLocalHm('02:00', referenceDate);
    expect(local).not.toBeNull();
    expect(localHmToUtcHm(local ?? '', referenceDate)).toBe('02:00');
  });

  it('converts local time to UTC and preserves value in round-trip conversion', () => {
    const utc = localHmToUtcHm('02:00', referenceDate);
    expect(utc).not.toBeNull();
    expect(utcHmToLocalHm(utc ?? '', referenceDate)).toBe('02:00');
  });

  it('returns null for invalid input values', () => {
    expect(utcHmToLocalHm('25:00', referenceDate)).toBeNull();
    expect(utcHmToLocalHm('2:00', referenceDate)).toBeNull();
    expect(localHmToUtcHm('xx:yy', referenceDate)).toBeNull();
    expect(localHmToUtcHm('24:00', referenceDate)).toBeNull();
  });

  it('accepts boundary HH:MM values', () => {
    const localMidnight = utcHmToLocalHm('00:00', referenceDate);
    const localLate = utcHmToLocalHm('23:59', referenceDate);

    expect(localMidnight).not.toBeNull();
    expect(localLate).not.toBeNull();
    expect(localHmToUtcHm(localMidnight ?? '', referenceDate)).toBe('00:00');
    expect(localHmToUtcHm(localLate ?? '', referenceDate)).toBe('23:59');
  });
});

