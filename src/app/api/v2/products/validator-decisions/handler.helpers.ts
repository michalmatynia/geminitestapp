import { z } from 'zod';

import { validationError } from '@/shared/errors/app-error';

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

export type CreateDecisionBody = z.infer<typeof createDecisionSchema>;

export const parseCreateDecisionBody = (raw: unknown): CreateDecisionBody => {
  const parsed = createDecisionSchema.safeParse(raw);
  if (!parsed.success) {
    throw validationError('Validation failed', {
      issues: parsed.error.flatten(),
    });
  }

  return parsed.data;
};

export const buildProductValidationDecisionInput = (
  body: CreateDecisionBody,
  userId: string | null | undefined
) => ({
  action: body.action,
  productId: body.productId ?? null,
  draftId: body.draftId ?? null,
  patternId: body.patternId,
  fieldName: body.fieldName,
  denyBehavior: body.denyBehavior ?? null,
  message: body.message ?? null,
  replacementValue: body.replacementValue ?? null,
  sessionId: body.sessionId ?? null,
  userId: userId ?? null,
});
