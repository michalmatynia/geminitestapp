import { describe, expect, it } from 'vitest';

import { createFilemakerCampaignDomainThrottle } from '../domain-throttle';

describe('createFilemakerCampaignDomainThrottle', () => {
  it('waits the remaining interval before hitting the same domain again', async () => {
    const sleepCalls: number[] = [];
    let current = 1000;
    const throttle = createFilemakerCampaignDomainThrottle({
      minIntervalMs: 500,
      now: () => current,
      sleep: async (ms) => {
        sleepCalls.push(ms);
        current += ms;
      },
    });

    await throttle.wait('a@gmail.com');
    expect(sleepCalls).toEqual([]);

    current += 100;
    await throttle.wait('b@gmail.com');
    expect(sleepCalls).toEqual([400]);
  });

  it('does not throttle across distinct domains', async () => {
    const sleepCalls: number[] = [];
    let current = 0;
    const throttle = createFilemakerCampaignDomainThrottle({
      minIntervalMs: 1000,
      now: () => current,
      sleep: async (ms) => {
        sleepCalls.push(ms);
        current += ms;
      },
    });

    await throttle.wait('x@gmail.com');
    await throttle.wait('x@yahoo.com');
    await throttle.wait('x@outlook.com');

    expect(sleepCalls).toEqual([]);
  });

  it('no-ops when minIntervalMs is 0', async () => {
    const sleepCalls: number[] = [];
    const throttle = createFilemakerCampaignDomainThrottle({
      minIntervalMs: 0,
      now: () => 0,
      sleep: async (ms) => {
        sleepCalls.push(ms);
      },
    });

    await throttle.wait('a@gmail.com');
    await throttle.wait('b@gmail.com');
    await throttle.wait('c@gmail.com');

    expect(sleepCalls).toEqual([]);
  });

  it('ignores malformed addresses without throwing', async () => {
    const throttle = createFilemakerCampaignDomainThrottle({
      minIntervalMs: 1000,
      now: () => 0,
      sleep: async () => {},
    });

    await expect(throttle.wait('no-at-sign')).resolves.toBeUndefined();
    await expect(throttle.wait('trailing@')).resolves.toBeUndefined();
  });

  it('is case-insensitive on domain', async () => {
    const sleepCalls: number[] = [];
    let current = 0;
    const throttle = createFilemakerCampaignDomainThrottle({
      minIntervalMs: 1000,
      now: () => current,
      sleep: async (ms) => {
        sleepCalls.push(ms);
        current += ms;
      },
    });

    await throttle.wait('a@GMAIL.com');
    await throttle.wait('b@gmail.COM');

    expect(sleepCalls).toEqual([1000]);
  });
});
