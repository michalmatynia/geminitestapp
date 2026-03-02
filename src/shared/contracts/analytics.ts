import { z } from 'zod';

import { dtoBaseSchema } from './base';

/**
 * Analytics UTM Contract
 */
export const analyticsUtmSchema = z.object({
  source: z.string().nullable().optional(),
  medium: z.string().nullable().optional(),
  campaign: z.string().nullable().optional(),
  term: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
});

export type AnalyticsUtm = z.infer<typeof analyticsUtmSchema>;
export type AnalyticsUtmDto = AnalyticsUtm;

/**
 * Analytics Viewport/Screen Contract
 */
export const analyticsViewportSchema = z.object({
  width: z.number(),
  height: z.number(),
});

export type AnalyticsViewport = z.infer<typeof analyticsViewportSchema>;
export type AnalyticsViewportDto = AnalyticsViewport;

export const analyticsScreenSchema = z.object({
  width: z.number(),
  height: z.number(),
  dpr: z.number(),
});

export type AnalyticsScreen = z.infer<typeof analyticsScreenSchema>;
export type AnalyticsScreenDto = AnalyticsScreen;

/**
 * Analytics Range Contract
 */
export const analyticsRangeSchema = z.enum(['24h', '7d', '30d']);
export type AnalyticsRange = z.infer<typeof analyticsRangeSchema>;
export type AnalyticsRangeDto = AnalyticsRange;

/**
 * Analytics Connection Contract
 */
export const analyticsConnectionInfoSchema = z.object({
  effectiveType: z.string().nullable().optional(),
  downlink: z.number().nullable().optional(),
  rtt: z.number().nullable().optional(),
  saveData: z.boolean().nullable().optional(),
});

export type AnalyticsConnectionInfo = z.infer<typeof analyticsConnectionInfoSchema>;
export type AnalyticsConnectionInfoDto = AnalyticsConnectionInfo;

/**
 * Analytics Event Contract
 */
export const analyticsScopeSchema = z.enum(['public', 'admin']);
export type AnalyticsScope = z.infer<typeof analyticsScopeSchema>;
export type AnalyticsScopeDto = AnalyticsScope;

export const analyticsEventTypeSchema = z.enum(['pageview', 'event']);
export type AnalyticsEventType = z.infer<typeof analyticsEventTypeSchema>;
export type AnalyticsEventTypeDto = AnalyticsEventType;

export const analyticsEventSchema = dtoBaseSchema.extend({
  type: analyticsEventTypeSchema,
  name: z.string().nullable().optional(),
  scope: analyticsScopeSchema,
  path: z.string(),
  search: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  referrer: z.string().nullable().optional(),
  referrerHost: z.string().nullable().optional(),
  visitorId: z.string(),
  sessionId: z.string(),
  userId: z.string().nullable().optional(),
  utm: analyticsUtmSchema.nullable().optional(),
  language: z.string().nullable().optional(),
  languages: z.array(z.string()).nullable().optional(),
  timeZone: z.string().nullable().optional(),
  viewport: analyticsViewportSchema.nullable().optional(),
  screen: analyticsScreenSchema.nullable().optional(),
  connection: analyticsConnectionInfoSchema.nullable().optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  clientTs: z.string().nullable().optional(),
  ts: z.string(),
  ip: z.string().nullable().optional(),
  ipHash: z.string().nullable().optional(),
  ipMasked: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  ua: z
    .object({
      browser: z.string().nullable().optional(),
      os: z.string().nullable().optional(),
      device: z.string().nullable().optional(),
      isBot: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  country: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
});

export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type AnalyticsEventDto = AnalyticsEvent;

export const createAnalyticsEventSchema = analyticsEventSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ts: true,
});

export type AnalyticsEventCreateInput = z.infer<typeof createAnalyticsEventSchema>;

/**
 * Analytics Summary Contract
 */
export const analyticsSummaryItemSchema = z.object({
  path: z.string(),
  count: z.number(),
});

export const analyticsSummaryMetricSchema = z.object({
  name: z.string(),
  count: z.number(),
});

export const analyticsSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  scope: z.union([analyticsScopeSchema, z.literal('all')]),
  totals: z.object({
    events: z.number(),
    pageviews: z.number(),
  }),
  visitors: z.number(),
  sessions: z.number(),
  topPages: z.array(analyticsSummaryItemSchema),
  topReferrers: z.array(z.object({ referrer: z.string(), count: z.number() })),
  topEventNames: z.array(analyticsSummaryMetricSchema),
  topLanguages: z.array(z.object({ language: z.string(), count: z.number() })),
  topCountries: z.array(z.object({ country: z.string(), count: z.number() })),
  topRegions: z.array(z.object({ region: z.string(), count: z.number() })),
  topCities: z.array(z.object({ city: z.string(), count: z.number() })),
  topBrowsers: z.array(z.object({ browser: z.string(), count: z.number() })),
  topOs: z.array(z.object({ os: z.string(), count: z.number() })),
  topDevices: z.array(z.object({ device: z.string(), count: z.number() })),
  topUtmSources: z.array(z.object({ source: z.string(), count: z.number() })),
  topUtmMediums: z.array(z.object({ medium: z.string(), count: z.number() })),
  topUtmCampaigns: z.array(z.object({ campaign: z.string(), count: z.number() })),
  recent: z.array(analyticsEventSchema),
});

export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;
export type AnalyticsSummaryDto = AnalyticsSummary;
