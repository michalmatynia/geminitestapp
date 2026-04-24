import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { importScripterFromConnectionId } from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const inputSchema = z
  .object({
    connectionId: z.string().trim().min(1),
    siteHostHint: z.string().trim().min(1).optional(),
  })
  .strict();

export const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  try {
    const result = await importScripterFromConnectionId(parsed.data.connectionId, {
      siteHostHint: parsed.data.siteHostHint ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found|only programmable/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};
