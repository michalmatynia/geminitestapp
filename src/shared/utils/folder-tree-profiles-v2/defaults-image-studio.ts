import { FolderTreeProfileV2 } from '../../contracts/master-folder-tree';

export const imageStudioProfiles: Record<string, FolderTreeProfileV2> = {
  image_studio: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop card',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'LayoutGrid',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        card: 'LayoutGrid',
      },
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['card', 'generation', 'mask', 'variant', 'part', 'version', 'derived'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['folder'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['card', 'generation', 'mask', 'variant', 'part', 'version', 'derived'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'toggle_only',
    },
  },
};
