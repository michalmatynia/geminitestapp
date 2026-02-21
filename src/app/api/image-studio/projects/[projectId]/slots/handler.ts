import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  countImageStudioSlots,
  createImageStudioSlots,
  listImageStudioSlots,
} from '@/features/ai/image-studio/server/slot-repository';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, quotaExceededError } from '@/shared/errors/app-error';

const MAX_PROJECT_SLOTS = 5000;
const MAX_SLOTS_PER_REQUEST = 250;

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..');
  return parts.join('/');
};

const slotSchema = z.object({
  name: z.string().trim().min(1).optional(),
  folderPath: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  imageBase64: z.string().trim().optional().nullable(),
  imageFileId: z.string().trim().optional().nullable(),
  asset3dId: z.string().trim().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

const createSchema = z.object({
  count: z.number().int().min(1).max(MAX_SLOTS_PER_REQUEST).optional(),
  slots: z.array(slotSchema).optional(),
});

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const slots = await listImageStudioSlots(projectId);

  return NextResponse.json({ slots });
}

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const existingCount = await countImageStudioSlots(projectId);
  const incomingSlots = parsed.data.slots ?? [];
  const count = parsed.data.count ?? incomingSlots.length;
  const maxCreate = Math.max(0, Math.min(MAX_PROJECT_SLOTS - existingCount, count));
  if (maxCreate <= 0) {
    throw quotaExceededError(`Slot limit reached (${MAX_PROJECT_SLOTS} cards per project).`);
  }

  const baseName = Date.now().toString();
  type SlotInput = {
    name?: string;
    folderPath?: string;
    imageUrl?: string;
    imageBase64?: string;
    imageFileId?: string;
    asset3dId?: string;
    metadata?: Record<string, unknown>;
  };

  const slotsToCreate = (incomingSlots.length > 0 ? (incomingSlots as SlotInput[]) : new Array<SlotInput>(maxCreate).fill({}))
    .slice(0, maxCreate)
    .map((slot: SlotInput, index: number) => ({
      projectId,
      name: slot.name?.trim() || `Card ${baseName}-${index + 1}`,
      folderPath: slot.folderPath ? sanitizeFolderPath(slot.folderPath) : '',
      imageUrl: slot.imageUrl?.trim() || null,
      imageBase64: slot.imageBase64?.trim() || null,
      imageFileId: slot.imageFileId?.trim() || null,
      asset3dId: slot.asset3dId?.trim() || null,
      metadata: slot.metadata ?? null,
    }));

  const created = await createImageStudioSlots(projectId, slotsToCreate);

  return NextResponse.json({ slots: created }, { status: 201 });
}
