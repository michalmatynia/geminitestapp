import { describe, expect, it } from 'vitest';

import { localHmToUtcHm, utcHmToLocalHm } from '@/shared/lib/db/utils/backup-schedule-time';

describe('backup-schedule-time', () => {
  it('returns null for invalid time strings', () => {
    const refDate = new Date('2026-01-15T12:00:00.000Z');

    expect(utcHmToLocalHm('25:00', refDate)).toBeNull();
    expect(localHmToUtcHm('not-a-time', refDate)).toBeNull();
  });

  it('round-trips UTC and local times for a reference date', () => {
    const refDate = new Date('2026-01-15T12:00:00.000Z');

    const localHm = utcHmToLocalHm('03:45', refDate);
    expect(localHm).not.toBeNull();
    if (!localHm) return;
    expect(localHmToUtcHm(localHm, refDate)).toBe('03:45');

    const utcHm = localHmToUtcHm('18:20', refDate);
    expect(utcHm).not.toBeNull();
    if (!utcHm) return;
    expect(utcHmToLocalHm(utcHm, refDate)).toBe('18:20');
  });
});
