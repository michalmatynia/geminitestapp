import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { getDefaultScripterServer } from '@/features/playwright/scripters/public';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const dryRunInputSchema = z
  .object({
    entryUrl: z.string().url().optional(),
    limit: z.number().int().positive().optional(),
    skipRecordsWithErrors: z.boolean().optional(),
    catalogDefaults: z
      .object({
        catalogIds: z.array(z.string()).optional(),
        categoryId: z.string().nullable().optional(),
        importSource: z.string().nullable().optional(),
        shippingGroupId: z.string().nullable().optional(),
        defaultPriceGroupId: z.string().nullable().optional(),
      })
      .optional(),
  })
  .strict();

export const postHandler = async (
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> => {
  if (!params.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const rawBody = (await req.json().catch(() => ({}))) as unknown;
  const parsed = dryRunInputSchema.safeParse(rawBody ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }
  try {
    const server = getDefaultScripterServer();
    const result = await server.dryRun({
      scripterId: params.id,
      options: parsed.data,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
};
