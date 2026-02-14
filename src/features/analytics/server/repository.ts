import 'server-only';

import { createHash } from 'crypto';


import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { getRedisConnection } from '@/shared/lib/queue';
import type {
  AnalyticsConnectionInfo,
  AnalyticsEventCreateInput,
  AnalyticsEventDto,
  AnalyticsEventType,
  AnalyticsScope,
  AnalyticsScreen,
  AnalyticsSummaryDto,
  AnalyticsUtm,
  AnalyticsViewport,
} from '@/shared/types';

import type { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'analytics_events';
const ANALYTICS_CACHE_PREFIX = 'analytics:cache:v1';
const ANALYTICS_CACHE_VERSION_KEY = `${ANALYTICS_CACHE_PREFIX}:version`;
const ANALYTICS_SUMMARY_TTL_SECONDS = 20;
const ANALYTICS_EVENTS_TTL_SECONDS = 15;

type AnalyticsUtmDoc = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

type AnalyticsEventMongoDoc = {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date | null;
  ts: Date;
  type: AnalyticsEventType;
  scope: AnalyticsScope;
  path: string;
  visitorId: string;
  sessionId: string;
  search?: string;
  url?: string;
  title?: string;
  referrer?: string;
  userId?: string;
  utm?: AnalyticsUtmDoc;
  language?: string;
  languages?: string[];
  timeZone?: string;
  viewport?: AnalyticsViewport;
  screen?: AnalyticsScreen;
  connection?: AnalyticsConnectionInfo;
  meta?: Record<string, unknown>;
  clientTs?: Date;
  ip?: string;
  ipMasked?: string;
  ipHash?: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
};

type AnalyticsEventMongoDocWithId = AnalyticsEventMongoDoc & { _id: ObjectId };

let indexesEnsured: Promise<void> | null = null;

async function ensureAnalyticsIndexes(): Promise<void> {
  if (indexesEnsured) return indexesEnsured;

  async function initialize(): Promise<void> {
    const db = await getMongoDb();
    const col = db.collection<AnalyticsEventMongoDoc>(COLLECTION_NAME);
    await Promise.all([
      col.createIndex({ ts: -1 }),
      col.createIndex({ scope: 1, ts: -1 }),
      col.createIndex({ path: 1, ts: -1 }),
      col.createIndex({ visitorId: 1, ts: -1 }),
      col.createIndex({ sessionId: 1, ts: -1 }),
    ]);
  }

  indexesEnsured = initialize();
  return indexesEnsured;
}

const normalizeOptionalString = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
};

const normalizeUtm = (utm: AnalyticsUtm | null | undefined): AnalyticsUtmDoc | undefined => {
  if (!utm) return undefined;
  const doc: AnalyticsUtmDoc = {};
  const source = normalizeOptionalString(utm.source);
  const medium = normalizeOptionalString(utm.medium);
  const campaign = normalizeOptionalString(utm.campaign);
  const term = normalizeOptionalString(utm.term);
  const content = normalizeOptionalString(utm.content);
  if (source) doc.source = source;
  if (medium) doc.medium = medium;
  if (campaign) doc.campaign = campaign;
  if (term) doc.term = term;
  if (content) doc.content = content;
  return Object.keys(doc).length > 0 ? doc : undefined;
};

const hashIp = (ip: string): string => {
  const salt = process.env['ANALYTICS_IP_SALT'] ?? process.env['NEXTAUTH_SECRET'] ?? '';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
};

const normalizeIpMode = (): 'full' | 'masked' | 'hash' | 'none' => {
  const raw = process.env['ANALYTICS_IP_MODE']?.toLowerCase().trim();
  if (raw === 'full' || raw === 'masked' || raw === 'hash' || raw === 'none') {
    return raw;
  }
  return 'masked';
};

const maskIp = (ip: string): string => {
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);
    const head = parts.slice(0, 3).join(':');
    if (head) {
      return `${head}:xxxx:xxxx:xxxx:xxxx`;
    }
  }

  return ip;
};

const buildIpFields = (ip: string | undefined): { ip?: string; ipMasked?: string; ipHash?: string } => {
  if (!ip) return {};
  const mode = normalizeIpMode();
  if (mode === 'none') return {};
  const ipMasked = maskIp(ip);
  const ipHash = hashIp(ip);

  if (mode === 'hash') {
    return { ipHash };
  }
  if (mode === 'full') {
    return { ip, ipMasked, ipHash };
  }
  return { ipMasked, ipHash };
};

const toEventDto = (doc: AnalyticsEventMongoDocWithId): AnalyticsEventDto => ({
  id: doc._id.toString(),
  createdAt: doc.createdAt?.toISOString() ?? doc.ts.toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? null,
  ts: doc.ts.toISOString(),
  type: doc.type,
  scope: doc.scope,
  path: doc.path,
  visitorId: doc.visitorId,
  sessionId: doc.sessionId,
  ...(doc.search ? { search: doc.search } : {}),
  ...(doc.url ? { url: doc.url } : {}),
  ...(doc.title ? { title: doc.title } : {}),
  ...(doc.referrer ? { referrer: doc.referrer } : {}),
  ...(doc.userId ? { userId: doc.userId } : {}),
  ...(doc.utm ? { utm: doc.utm } : {}),
  ...(doc.language ? { language: doc.language } : {}),
  ...(doc.languages ? { languages: doc.languages } : {}),
  ...(doc.timeZone ? { timeZone: doc.timeZone } : {}),
  ...(doc.viewport ? { viewport: doc.viewport } : {}),
  ...(doc.screen ? { screen: doc.screen } : {}),
  ...(doc.connection ? { connection: doc.connection } : {}),
  ...(doc.meta ? { meta: doc.meta } : {}),
  ...(doc.clientTs ? { clientTs: doc.clientTs.toISOString() } : {}),
  ...(doc.ip ? { ip: doc.ip } : {}),
  ...(doc.ipMasked ? { ipMasked: doc.ipMasked } : {}),
  ...(doc.ipHash ? { ipHash: doc.ipHash } : {}),
  ...(doc.userAgent ? { userAgent: doc.userAgent } : {}),
  ...(doc.country ? { country: doc.country } : {}),
  ...(doc.region ? { region: doc.region } : {}),
  ...(doc.city ? { city: doc.city } : {}),
});

const getAnalyticsCacheVersion = async (): Promise<string> => {
  const redis = getRedisConnection();
  if (!redis) return '0';
  const version = await redis.get(ANALYTICS_CACHE_VERSION_KEY);
  return version ?? '0';
};

const bumpAnalyticsCacheVersion = async (): Promise<void> => {
  const redis = getRedisConnection();
  if (!redis) return;
  await redis.incr(ANALYTICS_CACHE_VERSION_KEY);
};

export async function insertAnalyticsEvent(
  input: AnalyticsEventCreateInput,
  server?: {
    ip?: string | null;
    userAgent?: string | null;
    country?: string | null;
    region?: string | null;
    city?: string | null;
  }
): Promise<{ id: string }> {
  await ensureAnalyticsIndexes();
  const db = await getMongoDb();
  const col = db.collection<AnalyticsEventMongoDoc>(COLLECTION_NAME);

  const clientTs = normalizeOptionalString(input.clientTs);
  const clientTsDate = clientTs ? new Date(clientTs) : null;
  const search = normalizeOptionalString(input.search);
  const url = normalizeOptionalString(input.url);
  const title = normalizeOptionalString(input.title);
  const referrer = normalizeOptionalString(input.referrer);
  const userId = normalizeOptionalString(input.userId);
  const language = normalizeOptionalString(input.language);
  const timeZone = normalizeOptionalString(input.timeZone);
  const utm = normalizeUtm(input.utm);

  const serverIp = normalizeOptionalString(server?.ip ?? null);
  const serverUserAgent = normalizeOptionalString(server?.userAgent ?? null);
  const serverCountry = normalizeOptionalString(server?.country ?? null);
  const serverRegion = normalizeOptionalString(server?.region ?? null);
  const serverCity = normalizeOptionalString(server?.city ?? null);
  const ipFields = buildIpFields(serverIp ?? undefined);
  const now = new Date();

  const doc = {
    createdAt: now,
    updatedAt: now,
    ts: now,
    type: input.type,
    scope: input.scope,
    path: input.path,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    ...(search ? { search } : {}),
    ...(url ? { url } : {}),
    ...(title ? { title } : {}),
    ...(referrer ? { referrer } : {}),
    ...(userId ? { userId } : {}),
    ...(utm ? { utm } : {}),
    ...(language ? { language } : {}),
    ...(input.languages && input.languages.length > 0 ? { languages: input.languages } : {}),
    ...(timeZone ? { timeZone } : {}),
    ...(input.viewport ? { viewport: input.viewport } : {}),
    ...(input.screen ? { screen: input.screen } : {}),
    ...(input.connection ? { connection: input.connection } : {}),
    ...(input.meta ? { meta: input.meta } : {}),
    ...(clientTsDate ? { clientTs: clientTsDate } : {}),
    ...ipFields,
    ...(serverUserAgent ? { userAgent: serverUserAgent } : {}),
    ...(serverCountry ? { country: serverCountry } : {}),
    ...(serverRegion ? { region: serverRegion } : {}),
    ...(serverCity ? { city: serverCity } : {}),
  } as Omit<AnalyticsEventMongoDoc, '_id'>;

  const result = await col.insertOne(doc);
  await bumpAnalyticsCacheVersion();
  return { id: result.insertedId.toString() };
}

export async function listAnalyticsEvents(input: {
  from: Date;
  to: Date;
  scope?: AnalyticsScope | undefined;
  limit: number;
  skip: number;
}): Promise<{ events: AnalyticsEventDto[] }> {
  const redis = getRedisConnection();
  const version = await getAnalyticsCacheVersion();
  const cacheKey = `${ANALYTICS_CACHE_PREFIX}:events:${version}:${input.from.toISOString()}:${input.to.toISOString()}:${input.scope ?? 'all'}:${input.limit}:${input.skip}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as { events: AnalyticsEventDto[] };
      } catch {
        // ignore cache parse failures
      }
    }
  }

  await ensureAnalyticsIndexes();
  const db = await getMongoDb();
  const col = db.collection<AnalyticsEventMongoDoc>(COLLECTION_NAME);

  const match: Record<string, unknown> = {
    ts: { $gte: input.from, $lt: input.to },
  };
  if (input.scope) {
    match['scope'] = input.scope;
  }

  const docs = await col
    .find(match)
    .sort({ ts: -1 })
    .skip(input.skip)
    .limit(input.limit)
    .toArray() as AnalyticsEventMongoDocWithId[];

  const payload = { events: docs.map(toEventDto) };
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', ANALYTICS_EVENTS_TTL_SECONDS);
  }
  return payload;
}

export async function getAnalyticsSummary(input: {
  from: Date;
  to: Date;
  scope?: AnalyticsScope | undefined;
}): Promise<AnalyticsSummaryDto> {
  const redis = getRedisConnection();
  const version = await getAnalyticsCacheVersion();
  const cacheKey = `${ANALYTICS_CACHE_PREFIX}:summary:${version}:${input.from.toISOString()}:${input.to.toISOString()}:${input.scope ?? 'all'}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as AnalyticsSummaryDto;
      } catch {
        // ignore cache parse failures
      }
    }
  }

  await ensureAnalyticsIndexes();
  const db = await getMongoDb();
  const col = db.collection<AnalyticsEventMongoDoc>(COLLECTION_NAME);

  const match: Record<string, unknown> = {
    ts: { $gte: input.from, $lt: input.to },
  };
  if (input.scope) {
    match['scope'] = input.scope;
  }

  const [result] = await col
    .aggregate<{
      totals: Array<{ events: number; pageviews: number }>;
      visitors: Array<{ count: number }>;
      sessions: Array<{ count: number }>;
      topPages: Array<{ path: string; count: number }>;
      topReferrers: Array<{ referrer: string; count: number }>;
      topLanguages: Array<{ language: string; count: number }>;
      topCountries: Array<{ country: string; count: number }>;
      recent: AnalyticsEventMongoDocWithId[];
    }>([
      { $match: match },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                events: { $sum: 1 },
                pageviews: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'pageview'] }, 1, 0],
                  },
                },
              },
            },
            { $project: { _id: 0, events: 1, pageviews: 1 } },
          ],
          visitors: [
            { $group: { _id: '$visitorId' } },
            { $count: 'count' },
          ],
          sessions: [
            { $group: { _id: '$sessionId' } },
            { $count: 'count' },
          ],
          topPages: [
            { $match: { type: 'pageview' } },
            { $group: { _id: '$path', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { _id: 0, path: '$_id', count: 1 } },
          ],
          topReferrers: [
            { $match: { referrer: { $exists: true, $ne: '' } } },
            { $group: { _id: '$referrer', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { _id: 0, referrer: '$_id', count: 1 } },
          ],
          topLanguages: [
            { $match: { language: { $exists: true, $ne: '' } } },
            { $group: { _id: '$language', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { _id: 0, language: '$_id', count: 1 } },
          ],
          topCountries: [
            { $match: { country: { $exists: true, $ne: '' } } },
            { $group: { _id: '$country', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 20 },
            { $project: { _id: 0, country: '$_id', count: 1 } },
          ],
          recent: [
            { $sort: { ts: -1 } },
            { $limit: 50 },
          ],
        },
      },
    ])
    .toArray();

  const totals = result?.totals?.[0] ?? { events: 0, pageviews: 0 };
  const visitors = result?.visitors?.[0]?.count ?? 0;
  const sessions = result?.sessions?.[0]?.count ?? 0;

  const payload: AnalyticsSummaryDto = {
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    scope: input.scope ?? 'all',
    totals,
    visitors,
    sessions,
    topPages: result?.topPages ?? [],
    topReferrers: result?.topReferrers ?? [],
    topEventNames: [],
    topLanguages: result?.topLanguages ?? [],
    topCountries: result?.topCountries ?? [],
    topRegions: [],
    topCities: [],
    topBrowsers: [],
    topOs: [],
    topDevices: [],
    topUtmSources: [],
    topUtmMediums: [],
    topUtmCampaigns: [],
    recent: (result?.recent ?? []).map(toEventDto),
  };
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(payload), 'EX', ANALYTICS_SUMMARY_TTL_SECONDS);
  }
  return payload;
}
