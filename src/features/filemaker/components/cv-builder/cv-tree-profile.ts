import type { FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';

import type { CvContainerBlockKind, CvLeafBlockKind } from './cv-block-model';

const LEAF_KINDS: CvLeafBlockKind[] = [
  'profileHeader',
  'summary',
  'experience',
  'education',
  'skills',
  'techStack',
  'languages',
  'customText',
  'divider',
  'spacer',
];

const CONTAINER_KIND_ICON: Record<CvContainerBlockKind, string> = {
  section: 'LayoutTemplate',
  stack: 'PanelTop',
  columns: 'Columns',
  row: 'Rows',
};

const LEAF_KIND_ICON: Record<CvLeafBlockKind, string> = {
  profileHeader: 'IdCard',
  summary: 'AlignLeft',
  experience: 'BriefcaseBusiness',
  education: 'GraduationCap',
  skills: 'Sparkles',
  techStack: 'Cpu',
  languages: 'Languages',
  customText: 'Type',
  divider: 'Minus',
  spacer: 'Space',
};

export const cvBuilderTreeProfile: FolderTreeProfileV2 = {
  version: 2,
  placeholders: {
    preset: 'sublime',
    style: 'ghost',
    emphasis: 'subtle',
    rootDropLabel: 'Drop CV section here',
    inlineDropLabel: 'Drop CV block here',
  },
  icons: {
    slots: {
      folderClosed: 'LayoutTemplate',
      folderOpen: 'LayoutTemplate',
      file: 'Square',
      root: 'IdCard',
      dragHandle: 'GripVertical',
    },
    byKind: { ...CONTAINER_KIND_ICON, ...LEAF_KIND_ICON },
  },
  nesting: {
    defaultAllow: false,
    blockedTargetKinds: [],
    rules: [
      {
        childType: 'folder',
        childKinds: ['section'],
        targetType: 'root',
        targetKinds: ['root'],
        allow: true,
      },
      {
        childType: 'folder',
        childKinds: ['stack', 'columns', 'row'],
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
      {
        childType: 'file',
        childKinds: LEAF_KINDS,
        targetType: 'folder',
        targetKinds: ['stack'],
        allow: true,
      },
      {
        childType: 'folder',
        childKinds: ['row'],
        targetType: 'folder',
        targetKinds: ['columns'],
        allow: true,
      },
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
