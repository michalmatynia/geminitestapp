import { describe, expect, it } from 'vitest';

import {
  createFilemakerCampaignWarmupTracker,
  resolveFilemakerCampaignWarmupDailyCap,
  type FilemakerCampaignWarmupState,
} from '../warmup-tracker';

const buildStore = (
  initial: FilemakerCampaignWarmupState = { version: 1, senders: {} }
): {
  readState: () => Promise<FilemakerCampaignWarmupState>;
  writeState: (state: FilemakerCampaignWarmupState) => Promise<void>;
  current: () => FilemakerCampaignWarmupState;
} => {
  let state = initial;
  return {
    readState: async () => state,
    writeState: async (next) => {
      state = next;
    },
    current: () => state,
  };
};

describe('resolveFilemakerCampaignWarmupDailyCap', () => {
  it('returns the schedule entry for the current day index', () => {
    expect(resolveFilemakerCampaignWarmupDailyCap(0, [10, 20, 30])).toBe(10);
    expect(resolveFilemakerCampaignWarmupDailyCap(1, [10, 20, 30])).toBe(20);
    expect(resolveFilemakerCampaignWarmupDailyCap(2, [10, 20, 30])).toBe(30);
  });

  it('returns null once the schedule is exhausted (unlimited)', () => {
    expect(resolveFilemakerCampaignWarmupDailyCap(3, [10, 20, 30])).toBeNull();
  });
});

describe('createFilemakerCampaignWarmupTracker', () => {
  it('initializes firstSendDate on first reserve and allows up to day-1 cap', async () => {
    const store = buildStore();
    const tracker = createFilemakerCampaignWarmupTracker({
      readState: store.readState,
      writeState: store.writeState,
      now: () => new Date('2026-04-24T10:00:00.000Z'),
      schedule: [2, 5],
    });

    await expect(tracker.reserve('acct-1')).resolves.toEqual({ ok: true });
    await expect(tracker.reserve('acct-1')).resolves.toEqual({ ok: true });

    const denied = await tracker.reserve('acct-1');
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.dailyCap).toBe(2);
      expect(denied.used).toBe(2);
      expect(denied.nextAvailableAt).toBe('2026-04-25T00:00:00.000Z');
    }
  });

  it('increases cap on the next day as the warm-up ramps', async () => {
    const store = buildStore();
    let current = new Date('2026-04-24T09:00:00.000Z');
    const tracker = createFilemakerCampaignWarmupTracker({
      readState: store.readState,
      writeState: store.writeState,
      now: () => current,
      schedule: [1, 3],
    });

    await expect(tracker.reserve('acct-1')).resolves.toEqual({ ok: true });
    const denied = await tracker.reserve('acct-1');
    expect(denied.ok).toBe(false);

    current = new Date('2026-04-25T09:00:00.000Z');
    await expect(tracker.reserve('acct-1')).resolves.toEqual({ ok: true });
    await expect(tracker.reserve('acct-1')).resolves.toEqual({ ok: true });
    await expect(tracker.reserve('acct-1')).resolves.toEqual({ ok: true });
    const denied2 = await tracker.reserve('acct-1');
    expect(denied2.ok).toBe(false);
  });

  it('tracks separate counters per sender', async () => {
    const store = buildStore();
    const tracker = createFilemakerCampaignWarmupTracker({
      readState: store.readState,
      writeState: store.writeState,
      now: () => new Date('2026-04-24T10:00:00.000Z'),
      schedule: [1],
    });

    await expect(tracker.reserve('acct-a')).resolves.toEqual({ ok: true });
    await expect(tracker.reserve('acct-b')).resolves.toEqual({ ok: true });

    const deniedA = await tracker.reserve('acct-a');
    const deniedB = await tracker.reserve('acct-b');
    expect(deniedA.ok).toBe(false);
    expect(deniedB.ok).toBe(false);
  });

  it('is unlimited once the schedule is exhausted', async () => {
    const store = buildStore();
    const tracker = createFilemakerCampaignWarmupTracker({
      readState: store.readState,
      writeState: store.writeState,
      now: () => new Date('2026-04-24T10:00:00.000Z'),
      schedule: [1, 1, 1],
    });

    const seed: FilemakerCampaignWarmupState = {
      version: 1,
      senders: {
        'acct-1': {
          firstSendDate: '2026-04-20',
          dailyUsage: { '2026-04-24': 9999 },
        },
      },
    };
    await store.writeState(seed);

    await expect(tracker.reserve('acct-1')).resolves.toEqual({ ok: true });
  });

  it('reserve is a no-op for empty sender keys', async () => {
    const store = buildStore();
    const tracker = createFilemakerCampaignWarmupTracker({
      readState: store.readState,
      writeState: store.writeState,
      now: () => new Date('2026-04-24T10:00:00.000Z'),
      schedule: [0],
    });

    await expect(tracker.reserve('')).resolves.toEqual({ ok: true });
    await expect(tracker.reserve('   ')).resolves.toEqual({ ok: true });
    expect(store.current().senders).toEqual({});
  });
});
