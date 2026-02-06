export type AnalyticsScope = 'public' | 'admin';

export type AnalyticsEventType = 'pageview' | 'event';

export type AnalyticsUtm = {
  source?: string | null | undefined;
  medium?: string | null | undefined;
  campaign?: string | null | undefined;
  term?: string | null | undefined;
  content?: string | null | undefined;
};

export type AnalyticsViewport = {
  width: number;
  height: number;
};

export type AnalyticsScreen = {
  width: number;
  height: number;
  dpr: number;
};

export type AnalyticsConnectionInfo = {
  effectiveType?: string | null | undefined;
  downlink?: number | null | undefined;
  rtt?: number | null | undefined;
  saveData?: boolean | null | undefined;
};

export type AnalyticsEventCreateInput = {
  type: AnalyticsEventType;
  name?: string | null;
  scope: AnalyticsScope;
  path: string;
  search?: string | null;
  url?: string | null;
  title?: string | null;
  referrer?: string | null;
  referrerHost?: string | null;

  visitorId: string;
  sessionId: string;

  userId?: string | null;

  utm?: AnalyticsUtm | null;
  language?: string | null;
  languages?: string[] | null;
  timeZone?: string | null;

  viewport?: AnalyticsViewport | null;
  screen?: AnalyticsScreen | null;
  connection?: AnalyticsConnectionInfo | null;

  meta?: Record<string, unknown> | null;
  clientTs?: string | null;
};

export type AnalyticsEventDto = AnalyticsEventCreateInput & {
  id: string;
  ts: string;
  ip?: string | null;
  ipHash?: string | null;
  ipMasked?: string | null;
  userAgent?: string | null;
  ua?: {
    browser?: string | null;
    os?: string | null;
    device?: string | null;
    isBot?: boolean | null;
  } | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
};

export type AnalyticsSummaryDto = {
  from: string;
  to: string;
  scope: AnalyticsScope | 'all';
  totals: {
    events: number;
    pageviews: number;
  };
  visitors: number;
  sessions: number;
  topPages: Array<{ path: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  topEventNames: Array<{ name: string; count: number }>;
  topLanguages: Array<{ language: string; count: number }>;
  topCountries: Array<{ country: string; count: number }>;
  topRegions: Array<{ region: string; count: number }>;
  topCities: Array<{ city: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topOs: Array<{ os: string; count: number }>;
  topDevices: Array<{ device: string; count: number }>;
  topUtmSources: Array<{ source: string; count: number }>;
  topUtmMediums: Array<{ medium: string; count: number }>;
  topUtmCampaigns: Array<{ campaign: string; count: number }>;
  recent: AnalyticsEventDto[];
};
