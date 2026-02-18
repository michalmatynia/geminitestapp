import { describe, expect, it, vi } from 'vitest';

import type { ImageStudioSlotRecord } from '@/features/ai/image-studio/server/slot-repository';
import { deleteImageStudioVariant } from '@/features/ai/image-studio/server/variant-delete';

const makeSlot = (overrides: Partial<ImageStudioSlotRecord> = {}): ImageStudioSlotRecord => ({
  id: overrides.id ?? 'slot-1',
  projectId: overrides.projectId ?? 'proj-1',
  name: overrides.name ?? 'Slot',
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

describe('deleteImageStudioVariant', () => {
  it('deletes slot cascade by run/index selectors even when role metadata is not generation', async () => {
    const matchedSlot = makeSlot({
      id: 'slot-run-match',
      imageFileId: 'img-run-match',
      metadata: {
        role: 'base',
        generationRunId: 'run-1',
        generationOutputIndex: 1,
        sourceSlotId: 'root-1',
      },
    });

    const deps = {
      listSlots: vi.fn(async () => [matchedSlot]),
      deleteSlotCascade: vi.fn(async () => ({ deleted: true, deletedSlotIds: ['slot-run-match'] })),
      removeRunOutputs: vi.fn(async () => 1),
      getImageFileById: vi.fn(async () => null),
      deleteImageFileById: vi.fn(async () => undefined),
      deleteDiskPath: vi.fn(async () => false),
      logMetric: vi.fn(async () => undefined),
    };

    const result = await deleteImageStudioVariant(
      {
        projectId: 'proj-1',
        generationRunId: 'run-1',
        generationOutputIndex: 1,
        sourceSlotId: 'root-1',
      },
      deps,
    );

    expect(result.modeUsed).toBe('slot_cascade');
    expect(result.matchedSlotIds).toEqual(['slot-run-match']);
    expect(result.deletedSlotIds).toEqual(['slot-run-match']);
    expect(deps.deleteSlotCascade).toHaveBeenCalledTimes(1);
  });

  it('skips file-only fallback when matched slot remains undeleted to prevent orphan node', async () => {
    const matchedSlot = makeSlot({
      id: 'slot-stuck',
      imageFileId: 'img-stuck',
      imageUrl: '/uploads/studio/proj-1/stuck.png',
      metadata: {
        generationRunId: 'run-2',
        generationOutputIndex: 2,
      },
    });

    const deps = {
      listSlots: vi.fn(async () => [matchedSlot]),
      deleteSlotCascade: vi.fn(async () => ({ deleted: false, deletedSlotIds: [] })),
      removeRunOutputs: vi.fn(async () => 0),
      getImageFileById: vi.fn(async () => ({ id: 'img-stuck', filepath: '/uploads/studio/proj-1/stuck.png' })),
      deleteImageFileById: vi.fn(async () => undefined),
      deleteDiskPath: vi.fn(async () => true),
      logMetric: vi.fn(async () => undefined),
    };

    const result = await deleteImageStudioVariant(
      {
        projectId: 'proj-1',
        generationRunId: 'run-2',
        generationOutputIndex: 2,
        assetId: 'img-stuck',
        filepath: '/uploads/studio/proj-1/stuck.png',
      },
      deps,
    );

    expect(result.modeUsed).toBe('noop');
    expect(result.deletedFileIds).toEqual([]);
    expect(result.deletedFilepaths).toEqual([]);
    expect(result.warnings.some((warning) => warning.includes('orphan'))).toBe(true);
    expect(deps.deleteImageFileById).not.toHaveBeenCalled();
    expect(deps.deleteDiskPath).not.toHaveBeenCalled();
  });

  it('falls back to asset-only cleanup when no slot match is found', async () => {
    const deps = {
      listSlots: vi.fn(async () => [] as ImageStudioSlotRecord[]),
      deleteSlotCascade: vi.fn(async () => ({ deleted: false, deletedSlotIds: [] })),
      removeRunOutputs: vi.fn(async () => 1),
      getImageFileById: vi.fn(async () => ({
        id: 'img-orphan',
        filepath: '/uploads/studio/proj-1/orphan.png',
      })),
      deleteImageFileById: vi.fn(async () => undefined),
      deleteDiskPath: vi.fn(async () => true),
      logMetric: vi.fn(async () => undefined),
    };

    const result = await deleteImageStudioVariant(
      {
        projectId: 'proj-1',
        assetId: 'img-orphan',
      },
      deps,
    );

    expect(result.modeUsed).toBe('asset_only');
    expect(result.deletedFileIds).toEqual(['img-orphan']);
    expect(result.deletedFilepaths).toContain('/uploads/studio/proj-1/orphan.png');
    expect(deps.deleteImageFileById).toHaveBeenCalledWith('img-orphan');
  });
});
