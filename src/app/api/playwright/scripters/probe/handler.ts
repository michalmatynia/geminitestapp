import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultProbeService } from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const startInputSchema = z.object({ url: z.string().url() }).strict();

export const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> => {
  const body = (await req.json().catch(() => ({}))) as unknown;
  const parsed = startInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  try {
    const result = await getDefaultProbeService().start(parsed.data.url);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
};
