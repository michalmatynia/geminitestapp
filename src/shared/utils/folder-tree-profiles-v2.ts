import { z } from 'zod';

import type {
  FolderTreeIconSlot,
  FolderTreeNestingRuleV2,
  FolderTreePlaceholderEmphasis,
  FolderTreePlaceholderPreset,
  FolderTreePlaceholderStyle,
  FolderTreeProfileV2,
  FolderTreeSelectionBehavior,
} from '@/shared/contracts/master-folder-tree';

import {
  normalizeMasterTreeKind,
  type MasterTreeNodeType,
  type MasterTreeTargetType,
} from './master-folder-tree-contract';

export const FOLDER_TREE_PROFILES_V2_SETTING_KEY = 'folder_tree_profiles_v2';

export const folderTreeInstanceValues = [
  'notes',
  'image_studio',
  'product_categories',
  'cms_page_builder',
  'case_resolver',
] as const;

export type FolderTreeInstance = (typeof folderTreeInstanceValues)[number];

export const folderTreePlaceholderPresetValues: FolderTreePlaceholderPreset[] = ['sublime', 'classic', 'vivid'];

export type FolderTreePlaceholderClassSet = {
  rootIdle: string;
  rootActive: string;
  lineIdle: string; // Added this line
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
      lineIdle: 'bg-fuchsia-500/35',
      lineActive: 'bg-fuchsia-300/80',
      badgeIdle: 'text-fuchsia-300/80',
      badgeActive: 'text-fuchsia-100',
    };
  }

  if (preset === 'classic') {
    return {
      rootIdle: 'border-sky-500/35 bg-sky-600/10 text-sky-200/80',
      rootActive: 'border-sky-300/65 bg-sky-500/20 text-sky-100',
      lineIdle: 'bg-sky-500/35',
      lineActive: 'bg-sky-300/80',
      badgeIdle: 'text-sky-300/70',
      badgeActive: 'text-sky-100',
    };
  }

  return {
    rootIdle: 'border-border/45 bg-card/25 text-gray-400',
    rootActive: 'border-sky-200/55 bg-sky-500/12 text-sky-100',
    lineIdle: 'bg-card/25',
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

export const folderTreePlaceholderStyleValues: FolderTreePlaceholderStyle[] = ['line', 'pill', 'ghost'];

export const folderTreePlaceholderEmphasisValues: FolderTreePlaceholderEmphasis[] = ['subtle', 'balanced', 'bold'];

export const folderTreeSelectionBehaviorValues: FolderTreeSelectionBehavior[] = ['click_away', 'toggle_only'];

export const folderTreeIconSlotValues: FolderTreeIconSlot[] = [
  'folderClosed',
  'folderOpen',
  'file',
  'root',
  'dragHandle',
];

export type FolderTreeProfilesV2Map = Record<FolderTreeInstance, FolderTreeProfileV2>;

export type CanNestTreeNodeV2Input = {
  profile: FolderTreeProfileV2;
  nodeType: MasterTreeNodeType;
  nodeKind?: string | null;
  targetType: MasterTreeTargetType;
  targetFolderKind?: string | null;
};

const placeholderPresetSchema = z.enum(folderTreePlaceholderPresetValues as [string, ...string[]]);
const placeholderStyleSchema = z.enum(folderTreePlaceholderStyleValues as [string, ...string[]]);
const placeholderEmphasisSchema = z.enum(folderTreePlaceholderEmphasisValues as [string, ...string[]]);
const selectionBehaviorSchema = z.enum(folderTreeSelectionBehaviorValues as [string, ...string[]]);
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
  interactions: z
    .object({
      selectionBehavior: selectionBehaviorSchema.optional().default('click_away'),
    })
    .optional()
    .default({
      selectionBehavior: 'click_away',
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
  interactions: {
    selectionBehavior: profile.interactions.selectionBehavior,
  },
});

export const defaultFolderTreeProfilesV2: FolderTreeProfilesV2Map = {
  notes: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop to folder',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {},
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
          childKinds: ['note'],
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
          childKinds: ['note'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
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
  product_categories: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move to root category',
      inlineDropLabel: 'Drop category',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: null,
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['category'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['*'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: false,
        },
        {
          childType: 'folder',
          childKinds: ['category'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['*'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: false,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  cms_page_builder: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Drop section',
      inlineDropLabel: 'Drop here',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'Box',
        root: 'LayoutGrid',
        dragHandle: 'GripVertical',
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['zone', 'section'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['section', 'block'],
          targetType: 'folder',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['zone', 'section'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['section', 'block'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  case_resolver: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'ghost',
      emphasis: 'subtle',
      rootDropLabel: 'Drop to Root',
      inlineDropLabel: 'Drop case',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'FileText',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        case_file: 'FileText',
        node_file: 'FileCode2',
        asset_image: 'FileImage',
        asset_pdf: 'FileText',
        asset_file: 'FileText',
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
          childKinds: ['case_file', 'case_file_scan', 'node_file', 'asset_image', 'asset_pdf', 'asset_file'],
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
          childKinds: ['case_file', 'case_file_scan', 'node_file', 'asset_image', 'asset_pdf', 'asset_file'],
          targetType: 'root',
          targetKinds: ['root'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
};

export const createDefaultFolderTreeProfilesV2 = (): FolderTreeProfilesV2Map => ({
  notes: cloneProfileV2(defaultFolderTreeProfilesV2.notes),
  image_studio: cloneProfileV2(defaultFolderTreeProfilesV2.image_studio),
  product_categories: cloneProfileV2(defaultFolderTreeProfilesV2.product_categories),
  cms_page_builder: cloneProfileV2(defaultFolderTreeProfilesV2.cms_page_builder),
  case_resolver: cloneProfileV2(defaultFolderTreeProfilesV2.case_resolver),
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
  const sourceRecord =
    candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : null;
  const hasInteractionSettings = Boolean(sourceRecord && 'interactions' in sourceRecord);

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
    interactions: {
      selectionBehavior: hasInteractionSettings
        ? parsed.data.interactions.selectionBehavior
        : fallback.interactions.selectionBehavior,
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
    case_resolver: coerceProfileV2(
      candidate.case_resolver,
      defaultFolderTreeProfilesV2.case_resolver
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
