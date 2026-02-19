import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getValidationPatternRepository } from '@/features/products/server';
import { invalidateValidationPatternRuntimeCache } from '@/features/products/services/validation-pattern-runtime-cache';
import type { UpdateProductValidationPatternInput } from '@/features/products/types/services/validation-pattern-repository';
import type { ProductValidationPatternDto as ProductValidationPattern } from '@/shared/contracts/products';
import { conflictError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const reorderUpdateSchema = z.object({
  id: z.string().trim().min(1),
  sequence: z.number().int().min(0).optional(),
  sequenceGroupId: z.string().trim().nullable().optional(),
  sequenceGroupLabel: z.string().trim().nullable().optional(),
  sequenceGroupDebounceMs: z.number().int().min(0).max(30_000).optional(),
  expectedUpdatedAt: z.string().trim().nullable().optional(),
});

export const reorderPayloadSchema = z.object({
  updates: z.array(reorderUpdateSchema).min(1).max(500),
});

const normalizeNullableTrimmed = (
  value: string | null | undefined
): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof reorderPayloadSchema>;
  const updates = body.updates;
  const ids = updates.map((update) => update.id);
  const uniqueIdCount = new Set(ids).size;
  if (uniqueIdCount !== ids.length) {
    throw conflictError('Duplicate pattern IDs in reorder payload.');
  }

  const repository = await getValidationPatternRepository();
  const currentPatterns = await repository.listPatterns();
  const currentById = new Map<string, ProductValidationPattern>(
    currentPatterns.map((pattern: ProductValidationPattern) => [pattern.id, pattern])
  );

  for (const update of updates) {
    const current = currentById.get(update.id);
    if (!current) {
      throw notFoundError('Validation pattern not found', { patternId: update.id });
    }
    const expectedUpdatedAt = normalizeNullableTrimmed(update.expectedUpdatedAt);
    if (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt) {
      throw conflictError('Validation pattern was modified by another request.', {
        patternId: update.id,
        expectedUpdatedAt,
        actualUpdatedAt: current.updatedAt,
      });
    }
  }

  const updatedPatterns: ProductValidationPattern[] = [];
  for (const update of updates) {
    const input: UpdateProductValidationPatternInput = {};
    if (update.sequence !== undefined) input.sequence = update.sequence;
    if (update.sequenceGroupId !== undefined) {
      input.sequenceGroupId = normalizeNullableTrimmed(update.sequenceGroupId) ?? null;
    }
    if (update.sequenceGroupLabel !== undefined) {
      input.sequenceGroupLabel = normalizeNullableTrimmed(update.sequenceGroupLabel) ?? null;
    }
    if (update.sequenceGroupDebounceMs !== undefined) {
      input.sequenceGroupDebounceMs = update.sequenceGroupDebounceMs;
    }
    input.expectedUpdatedAt = normalizeNullableTrimmed(update.expectedUpdatedAt) ?? null;

    const updated = await repository.updatePattern(update.id, input);
    updatedPatterns.push(updated);
  }

  invalidateValidationPatternRuntimeCache();

  return NextResponse.json({
    updated: updatedPatterns,
  });
}
