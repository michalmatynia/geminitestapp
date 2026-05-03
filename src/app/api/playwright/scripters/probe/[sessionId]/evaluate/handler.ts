import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultProbeService } from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const evaluateInputSchema = z.object({ selector: z.string().min(1) }).strict();

export const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { sessionId: string }
): Promise<Response> => {
  if (!params.sessionId) {
    return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
  }
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = evaluateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  try {
    const result = await getDefaultProbeService().evaluate(params.sessionId, parsed.data.selector);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /not found|expired/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};
