export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  clearSystemLogs,
  createSystemLog,
  listSystemLogs,
} from '@/features/observability/server';
import { parseJsonBody } from '@/features/products/server';
import { validationError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const levelSchema = z.enum(['info', 'warn', 'error']);

const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  level: levelSchema.optional(),
  source: z.string().trim().optional(),
  query: z.string().trim().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const createSchema = z.object({
  level: levelSchema.optional(),
  message: z.string().min(1),
  source: z.string().trim().optional(),
  context: z.record(z.string(), z['unknown']()).optional(),
  stack: z.string().optional(),
  path: z.string().optional(),
  method: z.string().optional(),
  statusCode: z.number().int().optional(),
  requestId: z.string().optional(),
  userId: z.string().optional(),
});

const clearSchema = z.object({
  before: z.string().datetime().optional(),
});

const parseCreateBody = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<
  | { ok: true; data: z.infer<typeof createSchema> }
  | { ok: false; response: Response }
> => {
  if (ctx.body !== undefined) {
    const parsed = createSchema.safeParse(ctx.body);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return {
      ok: false,
      response: await createErrorResponse(
        validationError('Invalid payload', { issues: parsed.error.flatten() }),
        { request: req, source: 'systemLogs.POST' }
      ),
    };
  }
  return parseJsonBody(req, createSchema, { logPrefix: 'systemLogs.POST' });
};

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const url = new URL(req.url);
  const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listSystemLogs({
    page: parsed.page ?? undefined,
    pageSize: parsed.pageSize ?? undefined,
    level: parsed.level ?? undefined,
    source: parsed.source ?? undefined,
    query: parsed.query ?? undefined,
    from: parsed.from ? new Date(parsed.from) : null,
    to: parsed.to ? new Date(parsed.to) : null,
  });
  return NextResponse.json(result);
}

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseCreateBody(req, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const created = await createSystemLog({
    level: data.level ?? undefined,
    message: data.message,
    source: data.source ?? undefined,
    context: data.context ?? null,
    stack: data.stack ?? null,
    path: data.path ?? null,
    method: data.method ?? null,
    statusCode: data.statusCode ?? null,
    requestId: data.requestId ?? null,
    userId: data.userId ?? null,
  });
  return NextResponse.json({ log: created });
}

async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const url = new URL(req.url);
  const parsed = clearSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const before = parsed.before ? new Date(parsed.before) : null;
  const result = await clearSystemLogs(before);
  return NextResponse.json({ deleted: result.deleted });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'system.logs.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'system.logs.POST' });
export const DELETE = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => DELETE_handler(req, ctx),
  { source: 'system.logs.DELETE' });
