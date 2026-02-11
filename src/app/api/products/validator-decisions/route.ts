export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { appendProductValidationDecision } from '@/features/products/services/validator-decision-log-service';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const createDecisionSchema = z.object({
  action: z.enum(['deny', 'replace', 'accept']).default('deny'),
  productId: z.string().trim().min(1).nullable().optional(),
  draftId: z.string().trim().min(1).nullable().optional(),
  patternId: z.string().trim().min(1),
  fieldName: z.string().trim().min(1),
  denyBehavior: z.enum(['ask_again', 'mute_session']).nullable().optional(),
  message: z.string().trim().min(1).nullable().optional(),
  replacementValue: z.string().trim().min(1).nullable().optional(),
  sessionId: z.string().trim().min(1).nullable().optional(),
});

async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof createDecisionSchema>;
  const record = await appendProductValidationDecision({
    action: body.action,
    productId: body.productId ?? null,
    draftId: body.draftId ?? null,
    patternId: body.patternId,
    fieldName: body.fieldName,
    denyBehavior: body.denyBehavior ?? null,
    message: body.message ?? null,
    replacementValue: body.replacementValue ?? null,
    sessionId: body.sessionId ?? null,
    userId: ctx.userId ?? null,
  });
  return NextResponse.json({ ok: true, record });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  {
    source: 'products.validator-decisions.POST',
    parseJsonBody: true,
    bodySchema: createDecisionSchema,
    cacheControl: 'no-store',
  }
);
