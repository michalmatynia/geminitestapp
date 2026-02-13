import { describe, expect, it } from 'vitest';

import {
  decodeImageStudioMasterNodeId,
  toFolderMasterNodeId,
  toSlotMasterNodeId,
} from '@/features/ai/image-studio/utils/master-folder-tree';

describe('decodeImageStudioMasterNodeId', () => {
  it('decodes folder node ids with normalized path', () => {
    const decoded = decodeImageStudioMasterNodeId(toFolderMasterNodeId('assets/masks'));
    expect(decoded).toEqual({
      entity: 'folder',
      id: 'assets/masks',
      nodeId: 'folder:assets/masks',
    });
  });

  it('decodes card node ids', () => {
    const decoded = decodeImageStudioMasterNodeId(toSlotMasterNodeId('slot-1'));
    expect(decoded).toEqual({
      entity: 'card',
      id: 'slot-1',
      nodeId: 'card:slot-1',
    });
  });

  it('rejects unknown or root-like ids', () => {
    expect(decodeImageStudioMasterNodeId('folder:')).toBeNull();
    expect(decodeImageStudioMasterNodeId('unknown:1')).toBeNull();
  });
});
