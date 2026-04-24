import 'server-only';

const DEFAULT_MIN_INTERVAL_MS = 1000;

const resolveDefaultInterval = (): number => {
  const raw = process.env['FILEMAKER_CAMPAIGN_DOMAIN_MIN_INTERVAL_MS'];
  if (!raw) return DEFAULT_MIN_INTERVAL_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_MIN_INTERVAL_MS;
};

const extractDomain = (emailAddress: string): string => {
  const at = emailAddress.lastIndexOf('@');
  if (at < 0 || at === emailAddress.length - 1) return '';
  return emailAddress.slice(at + 1).trim().toLowerCase();
};

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
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const lastSentAt = new Map<string, number>();

  return {
    async wait(emailAddress: string): Promise<void> {
      if (minIntervalMs <= 0) return;
      const domain = extractDomain(emailAddress);
      if (!domain) return;
      const previous = lastSentAt.get(domain);
      const nowMs = now();
      if (previous !== undefined) {
        const elapsed = nowMs - previous;
        if (elapsed < minIntervalMs) {
          await sleep(minIntervalMs - elapsed);
        }
      }
      lastSentAt.set(domain, now());
    },
    reset(): void {
      lastSentAt.clear();
    },
  };
};
