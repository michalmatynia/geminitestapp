export const folderTreeInstanceValues = [
  'notes',
  'image_studio',
  'product_categories',
  'cms_page_builder',
] as const;

export type FolderTreeInstance = (typeof folderTreeInstanceValues)[number];

export const folderTreePlaceholderPresetValues = ['sublime', 'classic', 'vivid'] as const;
export type FolderTreePlaceholderPreset = (typeof folderTreePlaceholderPresetValues)[number];

export type FolderTreePlaceholderClassSet = {
  rootIdle: string;
  rootActive: string;
  lineActive: string;
  badgeIdle: string;
  badgeActive: string;
};

export function getFolderTreePlaceholderClasses(
  preset: FolderTreePlaceholderPreset
): FolderTreePlaceholderClassSet {
  if (preset === 'vivid') {
    return {
      rootIdle: 'border-fuchsia-500/35 bg-fuchsia-600/10 text-fuchsia-200',
      rootActive: 'border-fuchsia-300/70 bg-fuchsia-500/35 text-white',
      lineActive: 'bg-fuchsia-300/80',
      badgeIdle: 'text-fuchsia-300/80',
      badgeActive: 'text-fuchsia-100',
    };
  }

  if (preset === 'classic') {
    return {
      rootIdle: 'border-sky-500/35 bg-sky-600/10 text-sky-200/80',
      rootActive: 'border-sky-300/65 bg-sky-500/20 text-sky-100',
      lineActive: 'bg-sky-300/80',
      badgeIdle: 'text-sky-300/70',
      badgeActive: 'text-sky-100',
    };
  }

  return {
    rootIdle: 'border-border/45 bg-card/25 text-gray-400',
    rootActive: 'border-sky-200/55 bg-sky-500/12 text-sky-100',
    lineActive: 'bg-sky-300/60',
    badgeIdle: 'text-gray-400',
    badgeActive: 'text-sky-100',
  };
}

export const folderTreePlaceholderPresetOptions: Array<{
  value: FolderTreePlaceholderPreset;
  label: string;
}> = [
  { value: 'sublime', label: 'Sublime' },
  { value: 'classic', label: 'Classic' },
  { value: 'vivid', label: 'Vivid' },
];
