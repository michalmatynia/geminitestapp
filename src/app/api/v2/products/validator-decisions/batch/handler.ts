import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { validationError } from '@/shared/errors/app-error';
import { appendProductValidationDecisionsBatch } from '@/shared/lib/products/services/validator-decision-log-service';

const decisionItemSchema = z.object({
  action: z.enum(['deny', 'replace', 'accept']).default('accept'),
  productId: z.string().trim().min(1).nullable().optional(),
  draftId: z.string().trim().min(1).nullable().optional(),
  patternId: z.string().trim().min(1),
  fieldName: z.string().trim().min(1),
  denyBehavior: z.enum(['ask_again', 'mute_session']).nullable().optional(),
  message: z.string().trim().min(1).nullable().optional(),
  replacementValue: z.string().trim().min(1).nullable().optional(),
  sessionId: z.string().trim().min(1).nullable().optional(),
});

export const batchDecisionSchema = z.object({
  decisions: z.array(decisionItemSchema).min(1).max(50),
});

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const parsed = batchDecisionSchema.safeParse(ctx.body);
  if (!parsed.success) {
    throw validationError('Validation failed', {
      issues: parsed.error.flatten(),
    });
  }

  const records = await appendProductValidationDecisionsBatch(
    parsed.data.decisions.map((d) => ({
      action: d.action,
      productId: d.productId ?? null,
      draftId: d.draftId ?? null,
      patternId: d.patternId,
      fieldName: d.fieldName,
      denyBehavior: d.denyBehavior ?? null,
      message: d.message ?? null,
      replacementValue: d.replacementValue ?? null,
      sessionId: d.sessionId ?? null,
      userId: ctx.userId ?? null,
    }))
  );
  return NextResponse.json({ ok: true, count: records.length });
}
