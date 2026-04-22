import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getValidationPatternRepository } from '@/features/products/server';
import type { UpdateProductValidationPatternInput } from '@/shared/contracts/products/validation';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { conflictError, notFoundError } from '@/shared/errors/app-error';
import { invalidateValidationPatternRuntimeCache } from '@/shared/lib/products/services/validation-pattern-runtime-cache';

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

type ReorderUpdate = z.infer<typeof reorderUpdateSchema>;

const normalizeNullableTrimmed = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const assertUniqueReorderUpdateIds = (updates: ReorderUpdate[]): void => {
  const ids = updates.map((update) => update.id);
  const uniqueIdCount = new Set(ids).size;
  if (uniqueIdCount !== ids.length) {
    throw conflictError('Duplicate pattern IDs in reorder payload.');
  }
};

const mapPatternsById = (
  patterns: ProductValidationPattern[]
): Map<string, ProductValidationPattern> =>
  new Map<string, ProductValidationPattern>(
    patterns.map((pattern: ProductValidationPattern) => [pattern.id, pattern])
  );

const assertReorderUpdatesAreFresh = (
  updates: ReorderUpdate[],
  currentById: Map<string, ProductValidationPattern>
): void => {
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
};

const buildReorderUpdateInput = (update: ReorderUpdate): UpdateProductValidationPatternInput => {
  const input: UpdateProductValidationPatternInput = {
    expectedUpdatedAt: normalizeNullableTrimmed(update.expectedUpdatedAt) ?? null,
  };
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
  return input;
};

const applyReorderUpdates = async (
  repository: Awaited<ReturnType<typeof getValidationPatternRepository>>,
  updates: ReorderUpdate[]
): Promise<ProductValidationPattern[]> => {
  const updatedPatterns: ProductValidationPattern[] = [];
  for (const update of updates) {
    const updated = await repository.updatePattern(update.id, buildReorderUpdateInput(update));
    updatedPatterns.push(updated);
  }
  return updatedPatterns;
};

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as z.infer<typeof reorderPayloadSchema>;
  const updates = body.updates;
  assertUniqueReorderUpdateIds(updates);

  const repository = await getValidationPatternRepository();
  const currentPatterns = await repository.listPatterns();
  assertReorderUpdatesAreFresh(updates, mapPatternsById(currentPatterns));

  const updatedPatterns = await applyReorderUpdates(repository, updates);

  invalidateValidationPatternRuntimeCache();

  return NextResponse.json({
    updated: updatedPatterns,
  });
}
