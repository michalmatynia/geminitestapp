import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearEnsureImageStudioSlotFromUploadInFlightStateForTests,
  ensureImageStudioSlotFromUploadedAsset,
} from '@/features/ai/image-studio/server/ensure-slot-from-upload';
import type { ImageStudioSlotRecord } from '@/features/ai/image-studio/server/slot-repository';

const makeSlot = (overrides: Partial<ImageStudioSlotRecord> = {}): ImageStudioSlotRecord => ({
  id: overrides.id ?? 'slot-1',
  projectId: overrides.projectId ?? 'proj-1',
  name: overrides.name ?? 'Card 1',
  folderPath: overrides.folderPath ?? null,
  position: overrides.position ?? null,
  imageFileId: overrides.imageFileId ?? null,
  imageUrl: overrides.imageUrl ?? null,
  imageBase64: overrides.imageBase64 ?? null,
  asset3dId: overrides.asset3dId ?? null,
  screenshotFileId: overrides.screenshotFileId ?? null,
  metadata: overrides.metadata ?? null,
  imageFile: overrides.imageFile ?? null,
  screenshotFile: overrides.screenshotFile ?? null,
  asset3d: overrides.asset3d ?? null,
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
});

describe('ensureImageStudioSlotFromUploadedAsset', () => {
  beforeEach(() => {
    clearEnsureImageStudioSlotFromUploadInFlightStateForTests();
  });

  it('reuses an existing matching slot and does not create a duplicate', async () => {
    const existing = makeSlot({
      id: 'slot-existing',
      imageFileId: 'img-1',
      imageUrl: '/uploads/studio/proj-1/a.png',
    });
    const listSlots = vi.fn(async () => [existing]);
    const updateSlot = vi.fn(async () => existing);
    const createSlots = vi.fn(async () => [makeSlot({ id: 'slot-created' })]);
    const getSlotById = vi.fn(async () => null);

    const result = await ensureImageStudioSlotFromUploadedAsset(
      {
        projectId: 'proj-1',
        uploadId: 'img-1',
        filepath: '/uploads/studio/proj-1/a.png',
      },
      { listSlots, updateSlot, createSlots, getSlotById }
    );

    expect(result.created).toBe(false);
    expect(result.action).toBe('reused_existing');
    expect(result.slot.id).toBe('slot-existing');
    expect(createSlots).not.toHaveBeenCalled();
  });

  it('updates selected empty slot before attempting to create a new card', async () => {
    const selectedEmpty = makeSlot({ id: 'slot-selected-empty' });
    const updatedSelected = makeSlot({
      id: 'slot-selected-empty',
      imageFileId: 'img-2',
      imageUrl: '/uploads/studio/proj-1/b.png',
    });
    const listSlots = vi.fn(async () => [selectedEmpty]);
    const updateSlot = vi.fn(async () => updatedSelected);
    const createSlots = vi.fn(async () => [makeSlot({ id: 'slot-created' })]);
    const getSlotById = vi.fn(async () => null);

    const result = await ensureImageStudioSlotFromUploadedAsset(
      {
        projectId: 'proj-1',
        uploadId: 'img-2',
        filepath: '/uploads/studio/proj-1/b.png',
        selectedSlotId: 'slot-selected-empty',
      },
      { listSlots, updateSlot, createSlots, getSlotById }
    );

    expect(result.created).toBe(false);
    expect(result.action).toBe('reused_selected_slot');
    expect(result.slot.id).toBe('slot-selected-empty');
    expect(createSlots).not.toHaveBeenCalled();
  });

  it('coalesces concurrent requests for the same upload token', async () => {
    const created = makeSlot({
      id: 'slot-created-once',
      imageFileId: 'img-3',
      imageUrl: '/uploads/studio/proj-1/c.png',
    });
    const listSlots = vi.fn(async () => []);
    const updateSlot = vi.fn(async () => null);
    const createSlots = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return [created];
    });
    const getSlotById = vi.fn(async () => null);

    const input = {
      projectId: 'proj-1',
      uploadId: 'img-3',
      filepath: '/uploads/studio/proj-1/c.png',
      filename: 'c.png',
    };

    const [first, second] = await Promise.all([
      ensureImageStudioSlotFromUploadedAsset(input, {
        listSlots,
        updateSlot,
        createSlots,
        getSlotById,
      }),
      ensureImageStudioSlotFromUploadedAsset(input, {
        listSlots,
        updateSlot,
        createSlots,
        getSlotById,
      }),
    ]);

    expect(createSlots).toHaveBeenCalledTimes(1);
    expect(first.slot.id).toBe('slot-created-once');
    expect(second.slot.id).toBe('slot-created-once');
  });

  it('handles stale list data by reusing deterministic slot after duplicate-key create failure', async () => {
    const deterministicSlot = makeSlot({
      id: 'slot_upload_stable',
      imageFileId: 'img-4',
      imageUrl: '/uploads/studio/proj-1/d.png',
    });
    const listSlots = vi.fn(async () => []);
    const updateSlot = vi.fn(async () => deterministicSlot);
    const createSlots = vi.fn(async () => {
      const duplicate = new Error('E11000 duplicate key error collection');
      (duplicate as Error & { code?: number }).code = 11000;
      throw duplicate;
    });
    const getSlotById = vi.fn(async () => deterministicSlot);

    const result = await ensureImageStudioSlotFromUploadedAsset(
      {
        projectId: 'proj-1',
        uploadId: 'img-4',
        filepath: '/uploads/studio/proj-1/d.png',
      },
      { listSlots, updateSlot, createSlots, getSlotById }
    );

    expect(result.created).toBe(false);
    expect(result.action).toBe('reused_deterministic');
    expect(result.slot.id).toBe('slot_upload_stable');
    expect(createSlots).toHaveBeenCalledTimes(1);
  });
});
