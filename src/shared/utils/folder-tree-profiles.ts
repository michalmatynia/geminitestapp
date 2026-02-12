import { z } from 'zod';

export const FOLDER_TREE_PROFILES_SETTING_KEY = 'folder_tree_profiles_v1';

export const folderTreeInstanceValues = [
  'notes',
  'image_studio',
  'product_categories',
  'cms_page_builder',
] as const;

export type FolderTreeInstance = (typeof folderTreeInstanceValues)[number];

export const folderTreePlaceholderPresetValues = ['sublime', 'classic', 'vivid'] as const;
export type FolderTreePlaceholderPreset = (typeof folderTreePlaceholderPresetValues)[number];

export type FolderTreeProfile = {
  version: 1;
  placeholders: {
    preset: FolderTreePlaceholderPreset;
    rootDropLabel: string;
    inlineDropLabel: string;
  };
  icons: {
    folderClosed: string | null;
    folderOpen: string | null;
    file: string | null;
    root: string | null;
    dragHandle: string | null;
  };
  nesting: {
    allowFolderToFolder: boolean;
    allowFileToFolder: boolean;
    allowRootFolderDrop: boolean;
    allowRootFileDrop: boolean;
    folderKindsAllowedAsChildren: string[];
    fileKindsAllowedAsChildren: string[];
    blockedTargetFolderKinds: string[];
  };
};

export type FolderTreeProfilesMap = Record<FolderTreeInstance, FolderTreeProfile>;

export type FolderTreePlaceholderClassSet = {
  rootIdle: string;
  rootActive: string;
  lineActive: string;
  badgeIdle: string;
  badgeActive: string;
};

const placeholderPresetSchema = z.enum(folderTreePlaceholderPresetValues);

const profileSchema: z.ZodType<FolderTreeProfile> = z.object({
  version: z.literal(1).optional().default(1),
  placeholders: z
    .object({
      preset: placeholderPresetSchema.optional().default('sublime'),
      rootDropLabel: z.string().trim().min(1).optional().default('Drop to Root'),
      inlineDropLabel: z.string().trim().min(1).optional().default('Drop here'),
    })
    .optional()
    .default({
      preset: 'sublime',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop here',
    }),
  icons: z
    .object({
      folderClosed: z.string().trim().min(1).nullable().optional().default('Folder'),
      folderOpen: z.string().trim().min(1).nullable().optional().default('FolderOpen'),
      file: z.string().trim().min(1).nullable().optional().default('FileText'),
      root: z.string().trim().min(1).nullable().optional().default('Folder'),
      dragHandle: z.string().trim().min(1).nullable().optional().default('GripVertical'),
    })
    .optional()
    .default({
      folderClosed: 'Folder',
      folderOpen: 'FolderOpen',
      file: 'FileText',
      root: 'Folder',
      dragHandle: 'GripVertical',
    }),
  nesting: z
    .object({
      allowFolderToFolder: z.boolean().optional().default(true),
      allowFileToFolder: z.boolean().optional().default(true),
      allowRootFolderDrop: z.boolean().optional().default(true),
      allowRootFileDrop: z.boolean().optional().default(true),
      folderKindsAllowedAsChildren: z.array(z.string().trim().min(1)).optional().default(['*']),
      fileKindsAllowedAsChildren: z.array(z.string().trim().min(1)).optional().default(['*']),
      blockedTargetFolderKinds: z.array(z.string().trim().min(1)).optional().default([]),
    })
    .optional()
    .default({
      allowFolderToFolder: true,
      allowFileToFolder: true,
      allowRootFolderDrop: true,
      allowRootFileDrop: true,
      folderKindsAllowedAsChildren: ['*'],
      fileKindsAllowedAsChildren: ['*'],
      blockedTargetFolderKinds: [],
    }),
});

const normalizeKind = (value: string | null | undefined, fallback: string): string => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized || fallback;
};

const normalizeKindList = (values: string[] | null | undefined, fallback: string[]): string[] => {
  if (!Array.isArray(values) || values.length === 0) return [...fallback];
  const normalized = new Set<string>();
  values.forEach((entry: string) => {
    const value = entry.trim().toLowerCase();
    if (!value) return;
    normalized.add(value);
  });
  return normalized.size > 0 ? Array.from(normalized) : [...fallback];
};

const cloneProfile = (profile: FolderTreeProfile): FolderTreeProfile => ({
  version: profile.version,
  placeholders: { ...profile.placeholders },
  icons: { ...profile.icons },
  nesting: {
    ...profile.nesting,
    folderKindsAllowedAsChildren: [...profile.nesting.folderKindsAllowedAsChildren],
    fileKindsAllowedAsChildren: [...profile.nesting.fileKindsAllowedAsChildren],
    blockedTargetFolderKinds: [...profile.nesting.blockedTargetFolderKinds],
  },
});

export const defaultFolderTreeProfiles: FolderTreeProfilesMap = {
  notes: {
    version: 1,
    placeholders: {
      preset: 'sublime',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to folder',
    },
    icons: {
      folderClosed: 'Folder',
      folderOpen: 'FolderOpen',
      file: 'FileText',
      root: 'Folder',
      dragHandle: 'GripVertical',
    },
    nesting: {
      allowFolderToFolder: true,
      allowFileToFolder: true,
      allowRootFolderDrop: true,
      allowRootFileDrop: true,
      folderKindsAllowedAsChildren: ['folder'],
      fileKindsAllowedAsChildren: ['note'],
      blockedTargetFolderKinds: [],
    },
  },
  image_studio: {
    version: 1,
    placeholders: {
      preset: 'sublime',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop card',
    },
    icons: {
      folderClosed: 'Folder',
      folderOpen: 'FolderOpen',
      file: 'Image',
      root: 'Folder',
      dragHandle: 'GripVertical',
    },
    nesting: {
      allowFolderToFolder: true,
      allowFileToFolder: true,
      allowRootFolderDrop: true,
      allowRootFileDrop: true,
      folderKindsAllowedAsChildren: ['folder'],
      fileKindsAllowedAsChildren: ['card', 'generation', 'mask', 'variant', 'part', 'version', 'derived'],
      blockedTargetFolderKinds: [],
    },
  },
  product_categories: {
    version: 1,
    placeholders: {
      preset: 'classic',
      rootDropLabel: 'Move to root category',
      inlineDropLabel: 'Drop category',
    },
    icons: {
      folderClosed: 'Folder',
      folderOpen: 'FolderOpen',
      file: null,
      root: 'Folder',
      dragHandle: 'GripVertical',
    },
    nesting: {
      allowFolderToFolder: true,
      allowFileToFolder: false,
      allowRootFolderDrop: true,
      allowRootFileDrop: false,
      folderKindsAllowedAsChildren: ['category'],
      fileKindsAllowedAsChildren: [],
      blockedTargetFolderKinds: [],
    },
  },
  cms_page_builder: {
    version: 1,
    placeholders: {
      preset: 'classic',
      rootDropLabel: 'Drop section',
      inlineDropLabel: 'Drop here',
    },
    icons: {
      folderClosed: 'Folder',
      folderOpen: 'FolderOpen',
      file: 'Box',
      root: 'LayoutGrid',
      dragHandle: 'GripVertical',
    },
    nesting: {
      allowFolderToFolder: true,
      allowFileToFolder: true,
      allowRootFolderDrop: true,
      allowRootFileDrop: true,
      folderKindsAllowedAsChildren: ['zone', 'section'],
      fileKindsAllowedAsChildren: ['section', 'block'],
      blockedTargetFolderKinds: [],
    },
  },
};

export const createDefaultFolderTreeProfiles = (): FolderTreeProfilesMap => ({
  notes: cloneProfile(defaultFolderTreeProfiles.notes),
  image_studio: cloneProfile(defaultFolderTreeProfiles.image_studio),
  product_categories: cloneProfile(defaultFolderTreeProfiles.product_categories),
  cms_page_builder: cloneProfile(defaultFolderTreeProfiles.cms_page_builder),
});

const coerceProfile = (candidate: unknown, fallback: FolderTreeProfile): FolderTreeProfile => {
  const parsed = profileSchema.safeParse(candidate);
  if (!parsed.success) {
    return cloneProfile(fallback);
  }

  return {
    version: 1,
    placeholders: {
      preset: parsed.data.placeholders.preset,
      rootDropLabel: parsed.data.placeholders.rootDropLabel,
      inlineDropLabel: parsed.data.placeholders.inlineDropLabel,
    },
    icons: {
      folderClosed: parsed.data.icons.folderClosed,
      folderOpen: parsed.data.icons.folderOpen,
      file: parsed.data.icons.file,
      root: parsed.data.icons.root,
      dragHandle: parsed.data.icons.dragHandle,
    },
    nesting: {
      allowFolderToFolder: parsed.data.nesting.allowFolderToFolder,
      allowFileToFolder: parsed.data.nesting.allowFileToFolder,
      allowRootFolderDrop: parsed.data.nesting.allowRootFolderDrop,
      allowRootFileDrop: parsed.data.nesting.allowRootFileDrop,
      folderKindsAllowedAsChildren: normalizeKindList(
        parsed.data.nesting.folderKindsAllowedAsChildren,
        fallback.nesting.folderKindsAllowedAsChildren
      ),
      fileKindsAllowedAsChildren: normalizeKindList(
        parsed.data.nesting.fileKindsAllowedAsChildren,
        fallback.nesting.fileKindsAllowedAsChildren
      ),
      blockedTargetFolderKinds: normalizeKindList(parsed.data.nesting.blockedTargetFolderKinds, []),
    },
  };
};

export function parseFolderTreeProfiles(raw: string | null | undefined): FolderTreeProfilesMap {
  if (!raw) return createDefaultFolderTreeProfiles();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return createDefaultFolderTreeProfiles();
  }

  if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
    return createDefaultFolderTreeProfiles();
  }

  const candidate = parsedJson as Partial<Record<FolderTreeInstance, unknown>>;

  return {
    notes: coerceProfile(candidate.notes, defaultFolderTreeProfiles.notes),
    image_studio: coerceProfile(candidate.image_studio, defaultFolderTreeProfiles.image_studio),
    product_categories: coerceProfile(candidate.product_categories, defaultFolderTreeProfiles.product_categories),
    cms_page_builder: coerceProfile(candidate.cms_page_builder, defaultFolderTreeProfiles.cms_page_builder),
  };
}

export type CanNestTreeNodeInput = {
  profile: FolderTreeProfile;
  nodeType: 'folder' | 'file';
  nodeKind?: string | null;
  targetFolderKind?: string | null;
  targetIsRoot?: boolean;
};

const listAllowsKind = (allowedKinds: string[], value: string): boolean => {
  if (allowedKinds.includes('*')) return true;
  return allowedKinds.includes(value);
};

export function canNestTreeNode({
  profile,
  nodeType,
  nodeKind,
  targetFolderKind,
  targetIsRoot = false,
}: CanNestTreeNodeInput): boolean {
  if (targetIsRoot) {
    return nodeType === 'folder'
      ? profile.nesting.allowRootFolderDrop
      : profile.nesting.allowRootFileDrop;
  }

  const normalizedTargetKind = normalizeKind(targetFolderKind, 'folder');
  if (profile.nesting.blockedTargetFolderKinds.includes(normalizedTargetKind)) {
    return false;
  }

  if (nodeType === 'folder') {
    if (!profile.nesting.allowFolderToFolder) return false;
    const normalizedFolderKind = normalizeKind(nodeKind, 'folder');
    return listAllowsKind(profile.nesting.folderKindsAllowedAsChildren, normalizedFolderKind);
  }

  if (!profile.nesting.allowFileToFolder) return false;
  const normalizedFileKind = normalizeKind(nodeKind, 'file');
  return listAllowsKind(profile.nesting.fileKindsAllowedAsChildren, normalizedFileKind);
}

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
