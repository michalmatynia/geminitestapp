import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';
import { appendProductValidationDecision } from '@/shared/lib/products/services/validator-decision-log-service';

export const createDecisionSchema = z.object({
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

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const parsed = createDecisionSchema.safeParse(ctx.body);
  if (!parsed.success) {
    throw validationError('Validation failed', {
      issues: parsed.error.flatten(),
    });
  }

  const body = parsed.data;
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
