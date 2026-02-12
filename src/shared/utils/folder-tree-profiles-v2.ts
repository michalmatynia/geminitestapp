import { z } from 'zod';

import {
  createDefaultFolderTreeProfiles,
  folderTreeInstanceValues,
  folderTreePlaceholderPresetValues,
  type FolderTreeInstance,
  type FolderTreePlaceholderPreset,
  type FolderTreeProfile,
} from './folder-tree-profiles';
import {
  normalizeMasterTreeKind,
  type MasterTreeNodeType,
  type MasterTreeTargetType,
} from './master-folder-tree-contract';

export const FOLDER_TREE_PROFILES_V2_SETTING_KEY = 'folder_tree_profiles_v2';

export const folderTreePlaceholderStyleValues = ['line', 'pill', 'ghost'] as const;
export type FolderTreePlaceholderStyle = (typeof folderTreePlaceholderStyleValues)[number];

export const folderTreePlaceholderEmphasisValues = ['subtle', 'balanced', 'bold'] as const;
export type FolderTreePlaceholderEmphasis = (typeof folderTreePlaceholderEmphasisValues)[number];

export const folderTreeIconSlotValues = [
  'folderClosed',
  'folderOpen',
  'file',
  'root',
  'dragHandle',
] as const;
export type FolderTreeIconSlot = (typeof folderTreeIconSlotValues)[number];

export type FolderTreeNestingRuleV2 = {
  childType: MasterTreeNodeType;
  childKinds: string[];
  targetType: MasterTreeTargetType;
  targetKinds: string[];
  allow: boolean;
};

export type FolderTreeProfileV2 = {
  version: 2;
  placeholders: {
    preset: FolderTreePlaceholderPreset;
    style: FolderTreePlaceholderStyle;
    emphasis: FolderTreePlaceholderEmphasis;
    rootDropLabel: string;
    inlineDropLabel: string;
  };
  icons: {
    slots: Record<FolderTreeIconSlot, string | null>;
    byKind: Record<string, string | null>;
  };
  nesting: {
    defaultAllow: boolean;
    blockedTargetKinds: string[];
    rules: FolderTreeNestingRuleV2[];
  };
};

export type FolderTreeProfilesV2Map = Record<FolderTreeInstance, FolderTreeProfileV2>;

export type CanNestTreeNodeV2Input = {
  profile: FolderTreeProfileV2;
  nodeType: MasterTreeNodeType;
  nodeKind?: string | null;
  targetType: MasterTreeTargetType;
  targetFolderKind?: string | null;
};

const placeholderPresetSchema = z.enum(folderTreePlaceholderPresetValues);
const placeholderStyleSchema = z.enum(folderTreePlaceholderStyleValues);
const placeholderEmphasisSchema = z.enum(folderTreePlaceholderEmphasisValues);
const nodeTypeSchema = z.enum(['folder', 'file']);
const targetTypeSchema = z.enum(['folder', 'root']);
const iconSlotSchema = z.string().trim().min(1).nullable();

const iconSlotsSchema = z.object({
  folderClosed: iconSlotSchema.optional().default('Folder'),
  folderOpen: iconSlotSchema.optional().default('FolderOpen'),
  file: iconSlotSchema.optional().default('FileText'),
  root: iconSlotSchema.optional().default('Folder'),
  dragHandle: iconSlotSchema.optional().default('GripVertical'),
});

const nestingRuleSchema = z.object({
  childType: nodeTypeSchema.optional().default('file'),
  childKinds: z.array(z.string().trim().min(1)).optional().default(['*']),
  targetType: targetTypeSchema.optional().default('folder'),
  targetKinds: z.array(z.string().trim().min(1)).optional().default(['*']),
  allow: z.boolean().optional().default(false),
});

const profileV2Schema: z.ZodType<FolderTreeProfileV2> = z.object({
  version: z.literal(2).optional().default(2),
  placeholders: z
    .object({
      preset: placeholderPresetSchema.optional().default('sublime'),
      style: placeholderStyleSchema.optional().default('line'),
      emphasis: placeholderEmphasisSchema.optional().default('subtle'),
      rootDropLabel: z.string().trim().min(1).optional().default('Drop to Root'),
      inlineDropLabel: z.string().trim().min(1).optional().default('Drop here'),
    })
    .optional()
    .default({
      preset: 'sublime',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop here',
    }),
  icons: z
    .object({
      slots: iconSlotsSchema.optional().default({
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: 'GripVertical',
      }),
      byKind: z.record(z.string(), iconSlotSchema).optional().default({}),
    })
    .optional()
    .default({
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {},
    }),
  nesting: z
    .object({
      defaultAllow: z.boolean().optional().default(false),
      blockedTargetKinds: z.array(z.string().trim().min(1)).optional().default([]),
      rules: z.array(nestingRuleSchema).optional().default([]),
    })
    .optional()
    .default({
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [],
    }),
});

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

const cloneProfileV2 = (profile: FolderTreeProfileV2): FolderTreeProfileV2 => ({
  version: 2,
  placeholders: { ...profile.placeholders },
  icons: {
    slots: { ...profile.icons.slots },
    byKind: { ...profile.icons.byKind },
  },
  nesting: {
    defaultAllow: profile.nesting.defaultAllow,
    blockedTargetKinds: [...profile.nesting.blockedTargetKinds],
    rules: profile.nesting.rules.map((rule: FolderTreeNestingRuleV2) => ({
      childType: rule.childType,
      childKinds: [...rule.childKinds],
      targetType: rule.targetType,
      targetKinds: [...rule.targetKinds],
      allow: rule.allow,
    })),
  },
});

const iconSlotsFromV1 = (
  icons: FolderTreeProfile['icons']
): Record<FolderTreeIconSlot, string | null> => ({
  folderClosed: icons.folderClosed,
  folderOpen: icons.folderOpen,
  file: icons.file,
  root: icons.root,
  dragHandle: icons.dragHandle,
});

const createNestingRulesFromV1 = (profile: FolderTreeProfile): FolderTreeNestingRuleV2[] => [
  {
    childType: 'folder',
    childKinds: normalizeKindList(profile.nesting.folderKindsAllowedAsChildren, ['*']),
    targetType: 'folder',
    targetKinds: ['*'],
    allow: profile.nesting.allowFolderToFolder,
  },
  {
    childType: 'file',
    childKinds: normalizeKindList(profile.nesting.fileKindsAllowedAsChildren, ['*']),
    targetType: 'folder',
    targetKinds: ['*'],
    allow: profile.nesting.allowFileToFolder,
  },
  {
    childType: 'folder',
    childKinds: normalizeKindList(profile.nesting.folderKindsAllowedAsChildren, ['*']),
    targetType: 'root',
    targetKinds: ['root'],
    allow: profile.nesting.allowRootFolderDrop,
  },
  {
    childType: 'file',
    childKinds: normalizeKindList(profile.nesting.fileKindsAllowedAsChildren, ['*']),
    targetType: 'root',
    targetKinds: ['root'],
    allow: profile.nesting.allowRootFileDrop,
  },
];

const styleFromPreset = (preset: FolderTreePlaceholderPreset): FolderTreePlaceholderStyle => {
  if (preset === 'vivid') return 'pill';
  if (preset === 'classic') return 'line';
  return 'ghost';
};

const emphasisFromPreset = (
  preset: FolderTreePlaceholderPreset
): FolderTreePlaceholderEmphasis => {
  if (preset === 'vivid') return 'bold';
  if (preset === 'classic') return 'balanced';
  return 'subtle';
};

export const upgradeFolderTreeProfileV1ToV2 = (profile: FolderTreeProfile): FolderTreeProfileV2 => ({
  version: 2,
  placeholders: {
    preset: profile.placeholders.preset,
    style: styleFromPreset(profile.placeholders.preset),
    emphasis: emphasisFromPreset(profile.placeholders.preset),
    rootDropLabel: profile.placeholders.rootDropLabel,
    inlineDropLabel: profile.placeholders.inlineDropLabel,
  },
  icons: {
    slots: iconSlotsFromV1(profile.icons),
    byKind: {},
  },
  nesting: {
    defaultAllow: false,
    blockedTargetKinds: normalizeKindList(profile.nesting.blockedTargetFolderKinds, []),
    rules: createNestingRulesFromV1(profile),
  },
});

const defaultProfilesV1 = createDefaultFolderTreeProfiles();

export const defaultFolderTreeProfilesV2: FolderTreeProfilesV2Map = {
  notes: upgradeFolderTreeProfileV1ToV2(defaultProfilesV1.notes),
  image_studio: upgradeFolderTreeProfileV1ToV2(defaultProfilesV1.image_studio),
  product_categories: upgradeFolderTreeProfileV1ToV2(defaultProfilesV1.product_categories),
  cms_page_builder: upgradeFolderTreeProfileV1ToV2(defaultProfilesV1.cms_page_builder),
};

export const createDefaultFolderTreeProfilesV2 = (): FolderTreeProfilesV2Map => ({
  notes: cloneProfileV2(defaultFolderTreeProfilesV2.notes),
  image_studio: cloneProfileV2(defaultFolderTreeProfilesV2.image_studio),
  product_categories: cloneProfileV2(defaultFolderTreeProfilesV2.product_categories),
  cms_page_builder: cloneProfileV2(defaultFolderTreeProfilesV2.cms_page_builder),
});

const normalizeByKindIcons = (
  entries: Record<string, string | null>,
  fallback: Record<string, string | null>
): Record<string, string | null> => {
  const normalized: Record<string, string | null> = { ...fallback };
  Object.entries(entries).forEach(([key, value]: [string, string | null]) => {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) return;
    normalized[normalizedKey] = value && value.trim().length > 0 ? value : null;
  });
  return normalized;
};

const coerceProfileV2 = (candidate: unknown, fallback: FolderTreeProfileV2): FolderTreeProfileV2 => {
  const parsed = profileV2Schema.safeParse(candidate);
  if (!parsed.success) {
    return cloneProfileV2(fallback);
  }

  return {
    version: 2,
    placeholders: {
      preset: parsed.data.placeholders.preset,
      style: parsed.data.placeholders.style,
      emphasis: parsed.data.placeholders.emphasis,
      rootDropLabel: parsed.data.placeholders.rootDropLabel,
      inlineDropLabel: parsed.data.placeholders.inlineDropLabel,
    },
    icons: {
      slots: {
        folderClosed: parsed.data.icons.slots.folderClosed,
        folderOpen: parsed.data.icons.slots.folderOpen,
        file: parsed.data.icons.slots.file,
        root: parsed.data.icons.slots.root,
        dragHandle: parsed.data.icons.slots.dragHandle,
      },
      byKind: normalizeByKindIcons(parsed.data.icons.byKind, fallback.icons.byKind),
    },
    nesting: {
      defaultAllow: parsed.data.nesting.defaultAllow,
      blockedTargetKinds: normalizeKindList(parsed.data.nesting.blockedTargetKinds, []),
      rules: parsed.data.nesting.rules.map((rule: FolderTreeNestingRuleV2) => ({
        childType: rule.childType,
        childKinds: normalizeKindList(rule.childKinds, ['*']),
        targetType: rule.targetType,
        targetKinds: normalizeKindList(rule.targetKinds, ['*']),
        allow: rule.allow,
      })),
    },
  };
};

export const parseFolderTreeProfilesV2 = (
  raw: string | null | undefined
): FolderTreeProfilesV2Map => {
  if (!raw) return createDefaultFolderTreeProfilesV2();

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return createDefaultFolderTreeProfilesV2();
  }

  if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
    return createDefaultFolderTreeProfilesV2();
  }

  const candidate = parsedJson as Partial<Record<FolderTreeInstance, unknown>>;
  return {
    notes: coerceProfileV2(candidate.notes, defaultFolderTreeProfilesV2.notes),
    image_studio: coerceProfileV2(candidate.image_studio, defaultFolderTreeProfilesV2.image_studio),
    product_categories: coerceProfileV2(
      candidate.product_categories,
      defaultFolderTreeProfilesV2.product_categories
    ),
    cms_page_builder: coerceProfileV2(
      candidate.cms_page_builder,
      defaultFolderTreeProfilesV2.cms_page_builder
    ),
  };
};

const listMatches = (allowed: string[], value: string): boolean =>
  allowed.includes('*') || allowed.includes(value);

export const canNestTreeNodeV2 = ({
  profile,
  nodeType,
  nodeKind,
  targetType,
  targetFolderKind,
}: CanNestTreeNodeV2Input): boolean => {
  const normalizedNodeKind = normalizeMasterTreeKind(
    nodeKind,
    nodeType === 'folder' ? 'folder' : 'file'
  );
  const normalizedTargetKind = normalizeMasterTreeKind(targetFolderKind, 'folder');

  if (
    targetType === 'folder' &&
    profile.nesting.blockedTargetKinds.includes(normalizedTargetKind)
  ) {
    return false;
  }

  let decision: boolean | null = null;
  profile.nesting.rules.forEach((rule: FolderTreeNestingRuleV2) => {
    if (rule.childType !== nodeType) return;
    if (!listMatches(rule.childKinds, normalizedNodeKind)) return;
    if (rule.targetType !== targetType) return;

    if (targetType === 'folder') {
      if (!listMatches(rule.targetKinds, normalizedTargetKind)) return;
    } else if (!listMatches(rule.targetKinds, 'root')) {
      return;
    }

    decision = rule.allow;
  });

  return decision ?? profile.nesting.defaultAllow;
};

export const resolveFolderTreeIconV2 = (
  profile: FolderTreeProfileV2,
  slot: FolderTreeIconSlot,
  kind?: string | null
): string | null => {
  if (kind) {
    const normalizedKind = normalizeMasterTreeKind(kind, '');
    if (normalizedKind && normalizedKind in profile.icons.byKind) {
      return profile.icons.byKind[normalizedKind] ?? null;
    }
  }
  return profile.icons.slots[slot];
};

export const folderTreeProfileV2Instances = [...folderTreeInstanceValues];
