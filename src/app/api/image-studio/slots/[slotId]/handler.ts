import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteImageStudioSlotCascade,
  updateImageStudioSlot,
} from '@/features/ai/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { optionalBooleanQuerySchema } from '@/shared/lib/api/query-schema';

const sanitizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..');
  return parts.join('/');
};

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  folderPath: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  imageBase64: z.string().trim().optional().nullable(),
  imageFileId: z.string().trim().optional().nullable(),
  asset3dId: z.string().trim().optional().nullable(),
  screenshotFileId: z.string().trim().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const deleteQuerySchema = z.object({
  debug: optionalBooleanQuerySchema(),
});

const resolveSlotIdCandidates = (slotIdRaw: string): string[] => {
  const normalized = slotIdRaw.trim();
  if (!normalized) return [];

  const candidates = [normalized];

  const prefixedCandidates = [
    normalized.startsWith('card:') ? normalized.slice('card:'.length) : null,
    normalized.startsWith('slot:') ? normalized.slice('slot:'.length) : null,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value: string) => value.trim())
    .filter((value: string) => value.length > 0);

  for (const candidate of prefixedCandidates) {
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  }

  return candidates;
};

export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotIdCandidates = resolveSlotIdCandidates(params.slotId ?? '');
  if (slotIdCandidates.length === 0) throw badRequestError('Slot id is required');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const data = {
    ...(parsed.data.name ? { name: parsed.data.name } : {}),
    ...(parsed.data.folderPath !== undefined
      ? { folderPath: sanitizeFolderPath(parsed.data.folderPath ?? '') }
      : {}),
    ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl ?? null } : {}),
    ...(parsed.data.imageBase64 !== undefined
      ? { imageBase64: parsed.data.imageBase64 ?? null }
      : {}),
    ...(parsed.data.imageFileId !== undefined
      ? { imageFileId: parsed.data.imageFileId ?? null }
      : {}),
    ...(parsed.data.asset3dId !== undefined ? { asset3dId: parsed.data.asset3dId ?? null } : {}),
    ...(parsed.data.screenshotFileId !== undefined
      ? { screenshotFileId: parsed.data.screenshotFileId ?? null }
      : {}),
    ...(parsed.data.metadata !== undefined ? { metadata: parsed.data.metadata ?? null } : {}),
  };

  let updated = null;
  for (const slotIdCandidate of slotIdCandidates) {
    updated = await updateImageStudioSlot(slotIdCandidate, data);
    if (updated) break;
  }
  if (!updated) throw notFoundError('Slot not found');

  return NextResponse.json({ slot: updated });
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotIdCandidates = resolveSlotIdCandidates(params.slotId ?? '');
  if (slotIdCandidates.length === 0) throw badRequestError('Slot id is required');
  const query = (_ctx.query ?? {}) as z.infer<typeof deleteQuerySchema>;
  const includeDebug = query.debug === true;

  let deleted = false;
  let deletedSlotIds: string[] = [];
  let lastTimings: unknown = null;
  for (const slotIdCandidate of slotIdCandidates) {
    const result = await deleteImageStudioSlotCascade(slotIdCandidate);
    deleted = result.deleted || result.deletedSlotIds.length > 0;
    deletedSlotIds = result.deletedSlotIds;
    lastTimings = result.timingsMs;
    if (deleted) break;
  }
  // Idempotent delete: stale client trees can request a slot that has already been removed.
  if (!deleted) {
    return NextResponse.json({
      ok: true,
      deletedSlotIds: [],
      ...(includeDebug ? { timingsMs: lastTimings } : {}),
    });
  }
  return NextResponse.json({
    ok: true,
    deletedSlotIds,
    ...(includeDebug ? { timingsMs: lastTimings } : {}),
  });
}
