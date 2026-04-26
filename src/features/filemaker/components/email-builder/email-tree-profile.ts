import type { FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';

import type { EmailContainerBlockKind, EmailLeafBlockKind } from './block-model';

const LEAF_KINDS: EmailLeafBlockKind[] = ['text', 'heading', 'image', 'button', 'divider', 'spacer'];

const CONTAINER_KIND_ICON: Record<EmailContainerBlockKind, string> = {
  section: 'LayoutTemplate',
  columns: 'Columns',
  row: 'Rows',
};

const LEAF_KIND_ICON: Record<EmailLeafBlockKind, string> = {
  heading: 'Heading',
  text: 'Type',
  image: 'Image',
  button: 'MousePointerClick',
  divider: 'Minus',
  spacer: 'Space',
};

export const emailBuilderTreeProfile: FolderTreeProfileV2 = {
  version: 2,
  placeholders: {
    preset: 'sublime',
    style: 'ghost',
    emphasis: 'subtle',
    rootDropLabel: 'Drop section here',
    inlineDropLabel: 'Drop block here',
  },
  icons: {
    slots: {
      folderClosed: 'LayoutTemplate',
      folderOpen: 'LayoutTemplate',
      file: 'Square',
      root: 'Mail',
      dragHandle: 'GripVertical',
    },
    byKind: { ...CONTAINER_KIND_ICON, ...LEAF_KIND_ICON },
  },
  nesting: {
    defaultAllow: false,
    blockedTargetKinds: [],
    rules: [
      // Top-level: only sections at root.
      {
        childType: 'folder',
        childKinds: ['section'],
        targetType: 'root',
        targetKinds: ['root'],
        allow: true,
      },
      // Section accepts everything except other sections.
      {
        childType: 'folder',
        childKinds: ['columns', 'row'],
        targetType: 'folder',
        targetKinds: ['section'],
        allow: true,
      },
      {
        childType: 'file',
        childKinds: LEAF_KINDS,
        targetType: 'folder',
        targetKinds: ['section'],
        allow: true,
      },
      // Columns accept rows only.
      {
        childType: 'folder',
        childKinds: ['row'],
        targetType: 'folder',
        targetKinds: ['columns'],
        allow: true,
      },
      // Rows accept leaves only.
      {
        childType: 'file',
        childKinds: LEAF_KINDS,
        targetType: 'folder',
        targetKinds: ['row'],
        allow: true,
      },
    ],
  },
  interactions: {
    selectionBehavior: 'click_away',
  },
  keyboard: {
    enabled: true,
    arrowNavigation: true,
    enterToRename: true,
    deleteKey: true,
  },
};
