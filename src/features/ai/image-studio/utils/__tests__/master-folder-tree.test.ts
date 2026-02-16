import { describe, expect, it } from 'vitest';

import {
  buildMasterNodesFromStudioTree,
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

  it('excludes generation-derived slots from folder tree nodes', () => {
    const nodes = buildMasterNodesFromStudioTree(
      [
        {
          id: 'slot-base',
          projectId: 'proj',
          name: 'Base',
          folderPath: 'test',
          position: null,
          imageFileId: 'file-base',
          imageUrl: '/uploads/studio/proj/base.png',
          imageBase64: null,
          asset3dId: null,
          screenshotFileId: null,
          metadata: null,
          imageFile: null,
          screenshotFile: null,
          asset3d: null,
        },
        {
          id: 'slot-generation',
          projectId: 'proj',
          name: 'Base • Gen 1',
          folderPath: 'test',
          position: null,
          imageFileId: 'file-gen',
          imageUrl: '/uploads/studio/proj/gen.png',
          imageBase64: null,
          asset3dId: null,
          screenshotFileId: null,
          metadata: {
            role: 'generation',
            sourceSlotId: 'slot-base',
            relationType: 'generation:output',
          },
          imageFile: null,
          screenshotFile: null,
          asset3d: null,
        },
      ],
      ['test']
    );

    expect(nodes.some((node) => node.id === 'card:slot-base')).toBe(true);
    expect(nodes.some((node) => node.id === 'card:slot-generation')).toBe(false);
  });

  it('keeps crop-derived slots visible in folder tree nodes', () => {
    const nodes = buildMasterNodesFromStudioTree(
      [
        {
          id: 'slot-base',
          projectId: 'proj',
          name: 'Base',
          folderPath: 'test',
          position: null,
          imageFileId: 'file-base',
          imageUrl: '/uploads/studio/proj/base.png',
          imageBase64: null,
          asset3dId: null,
          screenshotFileId: null,
          metadata: null,
          imageFile: null,
          screenshotFile: null,
          asset3d: null,
        },
        {
          id: 'slot-crop',
          projectId: 'proj',
          name: 'Base • Crop',
          folderPath: 'test',
          position: null,
          imageFileId: 'file-crop',
          imageUrl: '/uploads/studio/proj/crop.png',
          imageBase64: null,
          asset3dId: null,
          screenshotFileId: null,
          metadata: {
            role: 'generation',
            sourceSlotId: 'slot-base',
            relationType: 'crop:output',
          },
          imageFile: null,
          screenshotFile: null,
          asset3d: null,
        },
      ],
      ['test']
    );

    expect(nodes.some((node) => node.id === 'card:slot-base')).toBe(true);
    expect(nodes.some((node) => node.id === 'card:slot-crop')).toBe(true);
  });

  it('keeps center-derived slots visible in folder tree nodes', () => {
    const nodes = buildMasterNodesFromStudioTree(
      [
        {
          id: 'slot-base',
          projectId: 'proj',
          name: 'Base',
          folderPath: 'test',
          position: null,
          imageFileId: 'file-base',
          imageUrl: '/uploads/studio/proj/base.png',
          imageBase64: null,
          asset3dId: null,
          screenshotFileId: null,
          metadata: null,
          imageFile: null,
          screenshotFile: null,
          asset3d: null,
        },
        {
          id: 'slot-center',
          projectId: 'proj',
          name: 'Base • Centered',
          folderPath: 'test',
          position: null,
          imageFileId: 'file-center',
          imageUrl: '/uploads/studio/proj/center.png',
          imageBase64: null,
          asset3dId: null,
          screenshotFileId: null,
          metadata: {
            role: 'generation',
            sourceSlotId: 'slot-base',
            relationType: 'center:output',
          },
          imageFile: null,
          screenshotFile: null,
          asset3d: null,
        },
      ],
      ['test']
    );

    expect(nodes.some((node) => node.id === 'card:slot-base')).toBe(true);
    expect(nodes.some((node) => node.id === 'card:slot-center')).toBe(true);
  });
});
