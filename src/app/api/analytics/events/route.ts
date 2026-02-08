export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { insertAnalyticsEvent, listAnalyticsEvents } from '@/features/analytics/server';
import { auth, extractClientIp } from '@/features/auth/server';
import { authError, badRequestError } from '@/shared/errors/app-error';
import { apiHandler, getPaginationParams, getQueryParams } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { AnalyticsEventCreateInput, AnalyticsScope } from '@/shared/types';
import type { ApiHandlerContext } from '@/shared/types/api';

const createEventSchema = z.object({
  type: z.enum(['pageview', 'event']),
  scope: z.enum(['public', 'admin']),
  path: z.string().min(1),
  search: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  visitorId: z.string().min(1),
  sessionId: z.string().min(1),
  utm: z
    .object({
      source: z.string().optional().nullable(),
      medium: z.string().optional().nullable(),
      campaign: z.string().optional().nullable(),
      term: z.string().optional().nullable(),
      content: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  language: z.string().optional().nullable(),
  languages: z.array(z.string()).optional().nullable(),
  timeZone: z.string().optional().nullable(),
  viewport: z
    .object({
      width: z.number().int().nonnegative(),
      height: z.number().int().nonnegative(),
    })
    .optional()
    .nullable(),
  screen: z
    .object({
      width: z.number().int().nonnegative(),
      height: z.number().int().nonnegative(),
      dpr: z.number().nonnegative(),
    })
    .optional()
    .nullable(),
  connection: z
    .object({
      effectiveType: z.string().optional().nullable(),
      downlink: z.number().optional().nullable(),
      rtt: z.number().optional().nullable(),
      saveData: z.boolean().optional().nullable(),
    })
    .optional()
    .nullable(),
  meta: z.record(z.string(), z['unknown']()).optional().nullable(),
  clientTs: z.string().optional().nullable(),
});

const RANGE_VALUES = ['24h', '7d', '30d'] as const;
type AnalyticsRange = (typeof RANGE_VALUES)[number];

const getRangeWindow = (range: AnalyticsRange): { from: Date; to: Date } => {
  const to = new Date();
  const msByRange: Record<AnalyticsRange, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  const from = new Date(to.getTime() - msByRange[range]);
  return { from, to };
};

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, createEventSchema, {
    logPrefix: 'analytics.events.POST',
  });
  if (!parsed.ok) return parsed.response;

  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  const ip = extractClientIp(req);
  const userAgent = req.headers.get('user-agent');

  const country =
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('cf-ipcountry') ??
    null;
  const region = req.headers.get('x-vercel-ip-country-region') ?? null;
  const city = req.headers.get('x-vercel-ip-city') ?? null;

  const input: AnalyticsEventCreateInput = {
    type: parsed.data.type,
    scope: parsed.data.scope,
    path: parsed.data.path,
    visitorId: parsed.data.visitorId,
    sessionId: parsed.data.sessionId,
    ...(parsed.data.search !== null && parsed.data.search !== undefined ? { search: parsed.data.search } : {}),
    ...(parsed.data.url !== null && parsed.data.url !== undefined ? { url: parsed.data.url } : {}),
    ...(parsed.data.title !== null && parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.referrer !== null && parsed.data.referrer !== undefined ? { referrer: parsed.data.referrer } : {}),
    ...(parsed.data.utm ? { utm: parsed.data.utm } : {}),
    ...(parsed.data.language !== null && parsed.data.language !== undefined ? { language: parsed.data.language } : {}),
    ...(parsed.data.languages ? { languages: parsed.data.languages } : {}),
    ...(parsed.data.timeZone !== null && parsed.data.timeZone !== undefined ? { timeZone: parsed.data.timeZone } : {}),
    ...(parsed.data.viewport ? { viewport: parsed.data.viewport } : {}),
    ...(parsed.data.screen ? { screen: parsed.data.screen } : {}),
    ...(parsed.data.connection ? { connection: parsed.data.connection } : {}),
    ...(parsed.data.meta ? { meta: parsed.data.meta } : {}),
    ...(parsed.data.clientTs !== null && parsed.data.clientTs !== undefined ? { clientTs: parsed.data.clientTs } : {}),
    ...(userId ? { userId } : {}),
  };

  const inserted = await insertAnalyticsEvent(input, {
    ip,
    userAgent,
    country,
    region,
    city,
  });

  return NextResponse.json({ ok: true, id: inserted.id });
}

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) throw authError('Unauthorized.');

  const searchParams = getQueryParams(req);
  const { page, pageSize, skip } = getPaginationParams(searchParams);

  const rangeRaw = searchParams.get('range') ?? '24h';
  if (!RANGE_VALUES.includes(rangeRaw as AnalyticsRange)) {
    throw badRequestError('Invalid range');
  }
  const range = rangeRaw as AnalyticsRange;

  const scopeRaw = searchParams.get('scope') ?? 'all';
  const scope =
    scopeRaw === 'all' ? undefined : (scopeRaw as AnalyticsScope);
  if (scopeRaw !== 'all' && scope !== 'public' && scope !== 'admin') {
    throw badRequestError('Invalid scope');
  }

  const { from, to } = getRangeWindow(range);
  const result = await listAnalyticsEvents({
    from,
    to,
    ...(scope ? { scope } : {}),
    limit: pageSize,
    skip,
  });

  return NextResponse.json({
    page,
    pageSize,
    range,
    scope: scopeRaw,
    ...result,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'analytics.events.POST', requireCsrf: false }
);

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'analytics.events.GET' }
);
