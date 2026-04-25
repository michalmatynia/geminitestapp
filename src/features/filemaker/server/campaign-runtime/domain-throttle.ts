import 'server-only';

import { resolveRecipientDomainProviderBucket } from './recipient-domain';

const DEFAULT_MIN_INTERVAL_MS = 1000;

const resolveDefaultInterval = (): number => {
  const raw = process.env['FILEMAKER_CAMPAIGN_DOMAIN_MIN_INTERVAL_MS'];
  if (raw === undefined || raw.trim().length === 0) return DEFAULT_MIN_INTERVAL_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MIN_INTERVAL_MS;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export type FilemakerCampaignDomainThrottle = {
  wait: (emailAddress: string) => Promise<void>;
  reset: () => void;
};

export type CreateFilemakerCampaignDomainThrottleOptions = {
  minIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

export const createFilemakerCampaignDomainThrottle = (
  options: CreateFilemakerCampaignDomainThrottleOptions = {}
): FilemakerCampaignDomainThrottle => {
  const minIntervalMs = options.minIntervalMs ?? resolveDefaultInterval();
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? defaultSleep;
  const lastSentAt = new Map<string, number>();

  return {
    async wait(emailAddress: string): Promise<void> {
      if (minIntervalMs <= 0) return;
      const bucket = resolveRecipientDomainProviderBucket(emailAddress);
      if (bucket.length === 0) return;
      const previous = lastSentAt.get(bucket);
      const nowMs = now();
      if (previous !== undefined) {
        const elapsed = nowMs - previous;
        if (elapsed < minIntervalMs) {
          await sleep(minIntervalMs - elapsed);
        }
      }
      lastSentAt.set(bucket, now());
    },
    reset(): void {
      lastSentAt.clear();
    },
  };
};
