import { z } from 'zod';

import { validationError } from '@/shared/errors/app-error';

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

export type BatchDecisionBody = z.infer<typeof batchDecisionSchema>;

export const parseBatchDecisionBody = (raw: unknown): BatchDecisionBody => {
  const parsed = batchDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError('Validation failed', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data;
};

export const buildBatchProductValidationDecisionInputs = (
  body: BatchDecisionBody,
  userId: string | null | undefined
) =>
  body.decisions.map((decision) => ({
    action: decision.action,
    productId: decision.productId ?? null,
    draftId: decision.draftId ?? null,
    patternId: decision.patternId,
    fieldName: decision.fieldName,
    denyBehavior: decision.denyBehavior ?? null,
    message: decision.message ?? null,
    replacementValue: decision.replacementValue ?? null,
    sessionId: decision.sessionId ?? null,
    userId: userId ?? null,
  }));
