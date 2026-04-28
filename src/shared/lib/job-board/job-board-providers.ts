/* eslint-disable @typescript-eslint/strict-boolean-expressions */

export const JOB_BOARD_PROVIDER_IDS = ['pracuj_pl', 'justjoin_it', 'nofluffjobs'] as const;

export type JobBoardProvider = (typeof JOB_BOARD_PROVIDER_IDS)[number];
export type JobBoardProviderSelection = 'auto' | JobBoardProvider;

export type JobBoardProviderConfig = {
  hostSuffixes: readonly string[];
  id: JobBoardProvider;
  label: string;
  offerPathPattern: RegExp;
  sourceSite: string;
};

export const JOB_BOARD_PROVIDER_CONFIGS: Record<JobBoardProvider, JobBoardProviderConfig> = {
  pracuj_pl: {
    id: 'pracuj_pl',
    label: 'Pracuj.pl',
    sourceSite: 'pracuj.pl',
    hostSuffixes: ['pracuj.pl'],
    offerPathPattern: /\/praca\//i,
  },
  justjoin_it: {
    id: 'justjoin_it',
    label: 'Just Join IT',
    sourceSite: 'justjoin.it',
    hostSuffixes: ['justjoin.it'],
    offerPathPattern: /\/job-offer\//i,
  },
  nofluffjobs: {
    id: 'nofluffjobs',
    label: 'No Fluff Jobs',
    sourceSite: 'nofluffjobs.com',
    hostSuffixes: ['nofluffjobs.com'],
    offerPathPattern: /\/(?:pl\/)?job\//i,
  },
};

export const isJobBoardProvider = (value: unknown): value is JobBoardProvider =>
  typeof value === 'string' &&
  JOB_BOARD_PROVIDER_IDS.includes(value as JobBoardProvider);

const hostMatches = (host: string, suffix: string): boolean =>
  host === suffix || host.endsWith(`.${suffix}`);

export const detectJobBoardProviderFromUrl = (value: string): JobBoardProvider | null => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const match = JOB_BOARD_PROVIDER_IDS.find((provider) =>
      JOB_BOARD_PROVIDER_CONFIGS[provider].hostSuffixes.some((suffix) => hostMatches(host, suffix))
    );
    return match ?? null;
  } catch {
    return null;
  }
};

export const resolveJobBoardProvider = (
  sourceUrl: string,
  requestedProvider?: JobBoardProviderSelection | null
): JobBoardProvider | null => {
  if (requestedProvider && requestedProvider !== 'auto') return requestedProvider;
  return detectJobBoardProviderFromUrl(sourceUrl);
};

export const getJobBoardProviderConfig = (
  provider: JobBoardProvider
): JobBoardProviderConfig => JOB_BOARD_PROVIDER_CONFIGS[provider];

export const getJobBoardProviderLabel = (provider: JobBoardProvider): string =>
  JOB_BOARD_PROVIDER_CONFIGS[provider].label;

export const getJobBoardSourceSite = (provider: JobBoardProvider): string =>
  JOB_BOARD_PROVIDER_CONFIGS[provider].sourceSite;

export const isSupportedJobBoardUrl = (value: string): boolean =>
  detectJobBoardProviderFromUrl(value) !== null;

export const isJobBoardOfferUrl = (
  value: string,
  provider?: JobBoardProvider | null
): boolean => {
  const resolvedProvider = provider ?? detectJobBoardProviderFromUrl(value);
  if (resolvedProvider === null) return false;
  try {
    const url = new URL(value);
    const config = getJobBoardProviderConfig(resolvedProvider);
    if (!config.hostSuffixes.some((suffix) => hostMatches(url.hostname.toLowerCase().replace(/^www\./, ''), suffix))) {
      return false;
    }
    return config.offerPathPattern.test(url.pathname);
  } catch {
    return false;
  }
};
