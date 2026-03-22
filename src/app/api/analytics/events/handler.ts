import { NextRequest, NextResponse } from 'next/server';

import { auth, extractClientIp } from '@/features/auth/server';
import {
  analyticsEventCreateRequestSchema,
  analyticsEventsQuerySchema,
  type AnalyticsEventCreateInput,
  type AnalyticsEventType,
} from '@/shared/contracts/analytics';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError } from '@/shared/errors/app-error';
import { resolveAnalyticsRangeWindow } from '@/shared/lib/analytics/range';
import { insertAnalyticsEvent, listAnalyticsEvents } from '@/shared/lib/analytics/server';
import {
  buildAnalyticsRequestMeta,
  deriveAnalyticsReferrerHost,
  mergeAnalyticsMeta,
  parseAnalyticsUserAgent,
} from '@/shared/lib/analytics/server/enrichment';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { logger } from '@/shared/utils/logger';

const BLOCKING_ANALYTICS_EVENTS_INGESTION =
  process.env['ANALYTICS_EVENTS_BLOCKING_INGESTION'] === 'true';

export { analyticsEventCreateRequestSchema as createEventSchema };
export { analyticsEventsQuerySchema as querySchema };

const resolveSessionUserId = async (): Promise<string | null> => {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  if (typeof userId !== 'string') return null;
  const trimmed = userId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const persistAnalyticsEvent = async (
  inputBase: AnalyticsEventCreateInput,
  serverContext: {
    ip: string | null;
    userAgent: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
  }
): Promise<{ id: string }> => {
  const userId = await resolveSessionUserId();
  const input: AnalyticsEventCreateInput = userId ? { ...inputBase, userId } : inputBase;

  return insertAnalyticsEvent(input, serverContext);
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, analyticsEventCreateRequestSchema, {
    logPrefix: 'analytics.events.POST',
  });
  if (!parsed.ok) return parsed.response;

  const ip = extractClientIp(req);
  const userAgent = req.headers.get('user-agent');

  const country = req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry') ?? null;
  const region = req.headers.get('x-vercel-ip-country-region') ?? null;
  const city = req.headers.get('x-vercel-ip-city') ?? null;
  const requestMeta = buildAnalyticsRequestMeta(req);
  const mergedMeta = mergeAnalyticsMeta(parsed.data.meta, requestMeta);
  const referrerHost = deriveAnalyticsReferrerHost(parsed.data.referrer);
  const ua = parseAnalyticsUserAgent(userAgent);

  const input: AnalyticsEventCreateInput = {
    type: parsed.data.type,
    scope: parsed.data.scope,
    path: parsed.data.path,
    visitorId: parsed.data.visitorId,
    sessionId: parsed.data.sessionId,
    ...(parsed.data.search !== null && parsed.data.search !== undefined
      ? { search: parsed.data.search }
      : {}),
    ...(parsed.data.url !== null && parsed.data.url !== undefined ? { url: parsed.data.url } : {}),
    ...(parsed.data.title !== null && parsed.data.title !== undefined
      ? { title: parsed.data.title }
      : {}),
    ...(parsed.data.referrer !== null && parsed.data.referrer !== undefined
      ? { referrer: parsed.data.referrer }
      : {}),
    ...(parsed.data.utm ? { utm: parsed.data.utm } : {}),
    ...(parsed.data.language !== null && parsed.data.language !== undefined
      ? { language: parsed.data.language }
      : {}),
    ...(parsed.data.languages ? { languages: parsed.data.languages } : {}),
    ...(parsed.data.timeZone !== null && parsed.data.timeZone !== undefined
      ? { timeZone: parsed.data.timeZone }
      : {}),
    ...(parsed.data.viewport ? { viewport: parsed.data.viewport } : {}),
    ...(parsed.data.screen ? { screen: parsed.data.screen } : {}),
    ...(parsed.data.connection ? { connection: parsed.data.connection } : {}),
    ...(mergedMeta ? { meta: mergedMeta } : {}),
    ...(parsed.data.clientTs !== null && parsed.data.clientTs !== undefined
      ? { clientTs: parsed.data.clientTs }
      : {}),
    ...(referrerHost ? { referrerHost } : {}),
    ...(ua ? { ua } : {}),
  };

  const serverContext = {
    ip,
    userAgent,
    country,
    region,
    city,
  };

  if (BLOCKING_ANALYTICS_EVENTS_INGESTION) {
    const inserted = await persistAnalyticsEvent(input, serverContext);
    return NextResponse.json({ ok: true, id: inserted.id, queued: false });
  }

  void persistAnalyticsEvent(input, serverContext).catch((error: unknown) => {
    logger.error('analytics.events.POST background ingestion failed', error, {
      service: 'analytics.events',
      source: 'analytics.events.POST',
      path: input.path,
      scope: input.scope,
      type: input.type,
      requestId: _ctx.requestId,
    });
  });

  return NextResponse.json({ ok: true, queued: true, requestId: _ctx.requestId }, { status: 202 });
}

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) throw authError('Unauthorized.');

  const query = analyticsEventsQuerySchema.parse(_ctx.query ?? {});
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;
  const range = query.range;
  const scopeRaw = query.scope;
  const scope = scopeRaw === 'all' ? undefined : (scopeRaw);
  const typeRaw = query.type;
  const type: AnalyticsEventType | undefined = typeRaw === 'all' ? undefined : typeRaw;
  const search = query.search;
  const country = query.country;
  const referrerHost = query.referrerHost;
  const browser = query.browser;
  const deviceRaw = query.device;
  const device = deviceRaw === 'all' ? '' : deviceRaw;
  const botRaw = query.bot;
  const isBot = botRaw === 'all' ? undefined : botRaw === 'bots';

  const { from, to } = resolveAnalyticsRangeWindow(range);
  const result = await listAnalyticsEvents({
    from,
    to,
    ...(scope ? { scope } : {}),
    ...(type ? { type } : {}),
    ...(search ? { search } : {}),
    ...(country ? { country } : {}),
    ...(referrerHost ? { referrerHost } : {}),
    ...(browser ? { browser } : {}),
    ...(device ? { device } : {}),
    ...(isBot !== undefined ? { isBot } : {}),
    limit: pageSize,
    skip,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  return NextResponse.json(
    {
      page,
      pageSize,
      totalPages,
      range,
      scope: scopeRaw,
      type: typeRaw,
      search,
      country,
      referrerHost,
      browser,
      device: deviceRaw,
      bot: botRaw,
      ...result,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
