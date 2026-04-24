import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultScripterServer } from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const diffInputSchema = z
  .object({
    entryUrl: z.string().url().optional(),
    limit: z.number().int().positive().optional(),
    enforceRobots: z.boolean().optional(),
  })
  .strict();

export const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  if (!params.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = diffInputSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  try {
    const { enforceRobots, ...sourceOptions } = parsed.data;
    const server = getDefaultScripterServer();
    const result = await server.diff({
      scripterId: params.id,
      options: sourceOptions,
      enforceRobots: enforceRobots ?? false,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};
