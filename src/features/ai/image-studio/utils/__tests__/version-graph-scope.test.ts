import { describe, expect, it } from 'vitest';

import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { resolveScopedVersionGraphSlots } from '@/features/ai/image-studio/utils/version-graph-scope';


const makeSlot = (
  id: string,
  metadata?: Record<string, unknown>
): ImageStudioSlotRecord => ({
  id,
  projectId: 'project-1',
  name: id,
  folderPath: null,
  imageFileId: null,
  imageUrl: null,
  imageBase64: null,
  asset3dId: null,
  screenshotFileId: null,
  metadata: metadata ?? null,
  imageFile: null,
  screenshotFile: null,
  asset3d: null,
});

describe('resolveScopedVersionGraphSlots', () => {
  it('includes siblings through shared ancestors so created variants stay visible', () => {
    const slots: ImageStudioSlotRecord[] = [
      makeSlot('root'),
      makeSlot('crop', { sourceSlotId: 'root', relationType: 'crop:output' }),
      makeSlot('center', { sourceSlotId: 'root', relationType: 'center:output' }),
      makeSlot('upscale', { sourceSlotId: 'crop', relationType: 'upscale:output' }),
      makeSlot('unrelated'),
    ];

    const scoped = resolveScopedVersionGraphSlots(slots, 'upscale');
    const scopedIds = scoped.map((slot) => slot.id).sort();

    expect(scopedIds).toEqual(['center', 'crop', 'root', 'upscale']);
  });

  it('returns connected lineage for multi-source nodes', () => {
    const slots: ImageStudioSlotRecord[] = [
      makeSlot('root-a'),
      makeSlot('root-b'),
      makeSlot('a1', { sourceSlotId: 'root-a', relationType: 'generation:output' }),
      makeSlot('b1', { sourceSlotId: 'root-b', relationType: 'generation:output' }),
      makeSlot('merge', { sourceSlotIds: ['a1', 'b1'], relationType: 'merge:output', role: 'merge' }),
      makeSlot('desc', { sourceSlotId: 'merge', relationType: 'generation:output' }),
      makeSlot('isolated'),
    ];

    const scoped = resolveScopedVersionGraphSlots(slots, 'desc');
    const scopedIds = scoped.map((slot) => slot.id).sort();

    expect(scopedIds).toEqual(['a1', 'b1', 'desc', 'merge', 'root-a', 'root-b']);
  });
});

