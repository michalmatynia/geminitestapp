import { z } from 'zod';

import type {
  FolderTreeBadgeSpec,
  FolderTreeIconSlot,
  FolderTreeKeyboardConfig,
  FolderTreeMultiSelectConfig,
  FolderTreeNestingRuleV2,
  FolderTreePlaceholderEmphasis,
  FolderTreePlaceholderPreset,
  FolderTreePlaceholderStyle,
  FolderTreeProfileV2,
  FolderTreeSearchConfig,
  FolderTreeSelectionBehavior,
  MasterTreeNodeStatus,
} from '../contracts/master-folder-tree';

export type {
  FolderTreeBadgeSpec,
  FolderTreeIconSlot,
  FolderTreeKeyboardConfig,
  FolderTreeMultiSelectConfig,
  FolderTreeNestingRuleV2,
  FolderTreePlaceholderEmphasis,
  FolderTreePlaceholderPreset,
  FolderTreePlaceholderStyle,
  FolderTreeProfileV2,
  FolderTreeSearchConfig,
  FolderTreeSelectionBehavior,
  MasterTreeNodeStatus,
};

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
  'case_resolver_cases',
  'validator_list_tree',
  'validator_pattern_tree',
  'prompt_exploder_segments',
  'prompt_exploder_hierarchy',
  'brain_catalog_tree',
  'brain_routing_tree',
] as const;

export type FolderTreeInstance = (typeof folderTreeInstanceValues)[number];

export const folderTreePlaceholderPresetValues: FolderTreePlaceholderPreset[] = [
  'sublime',
  'classic',
  'vivid',
];

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

export const folderTreePlaceholderStyleValues: FolderTreePlaceholderStyle[] = [
  'line',
  'pill',
  'ghost',
];

export const folderTreePlaceholderEmphasisValues: FolderTreePlaceholderEmphasis[] = [
  'subtle',
  'balanced',
  'bold',
];

export const folderTreeSelectionBehaviorValues: FolderTreeSelectionBehavior[] = [
  'click_away',
  'toggle_only',
];

export const folderTreeIconSlotValues: FolderTreeIconSlot[] = [
  'folderClosed',
  'folderOpen',
  'file',
  'root',
  'dragHandle',
];

export type FolderTreeProfilesV2Map = Record<FolderTreeInstance, FolderTreeProfileV2>;

export type FolderTreeInstanceSettingsMeta = {
  title: string;
  description: string;
  fileHint: string;
  folderHint: string;
};

export type FolderTreePersistFeedback = {
  notifySuccess: boolean;
  notifyError: boolean;
  successMessage: string;
};

export const folderTreeSettingsMetaByInstance: Record<
  FolderTreeInstance,
  FolderTreeInstanceSettingsMeta
> = {
  notes: {
    title: 'Notes App',
    description: 'Controls the notes folder tree shown in the Notes workspace.',
    fileHint: 'Example: note',
    folderHint: 'Example: folder',
  },
  image_studio: {
    title: 'Image Studio',
    description: 'Controls folder/card nesting and placeholders in Image Studio.',
    fileHint: 'Example: card, generation, mask',
    folderHint: 'Example: folder',
  },
  product_categories: {
    title: 'Product Categories',
    description: 'Controls nesting behavior and visuals in Product Category tree.',
    fileHint: 'Usually empty for categories-only trees.',
    folderHint: 'Example: category',
  },
  cms_page_builder: {
    title: 'CMS Page Builder',
    description: 'Controls drop placeholders in the CMS structure tree.',
    fileHint: 'Example: section, block',
    folderHint: 'Example: zone, section',
  },
  case_resolver: {
    title: 'Case Resolver',
    description: 'Controls folder/case nesting and placeholders in Case Resolver.',
    fileHint: 'Example: case_file, node_file, asset_image, asset_pdf',
    folderHint: 'Example: folder',
  },
  case_resolver_cases: {
    title: 'Case Resolver Cases',
    description: 'Controls hierarchy placeholders and drag/drop behavior on the Cases list page.',
    fileHint: 'Not used (case hierarchy nodes are folder-type entries).',
    folderHint: 'Example: case_entry',
  },
  validator_list_tree: {
    title: 'Validator Lists',
    description: 'Controls drag/drop behavior for validator list ordering in admin settings.',
    fileHint: 'Example: validator-list',
    folderHint: 'Not used (flat list at root).',
  },
  validator_pattern_tree: {
    title: 'Validator Patterns',
    description: 'Controls pattern-to-group nesting and placeholder behavior in validator settings.',
    fileHint: 'Example: pattern',
    folderHint: 'Example: sequence-group',
  },
  prompt_exploder_segments: {
    title: 'Prompt Exploder Segments',
    description: 'Controls top-level segment ordering in Prompt Exploder.',
    fileHint: 'Example: prompt_segment',
    folderHint: 'Not used (segments remain flat at root).',
  },
  prompt_exploder_hierarchy: {
    title: 'Prompt Exploder Hierarchy',
    description: 'Controls hierarchy nesting and placeholders in Prompt Exploder tree editor.',
    fileHint: 'Not used (hierarchy items are folder-type entries).',
    folderHint: 'Example: folder',
  },
  brain_catalog_tree: {
    title: 'AI Brain Catalog',
    description: 'Controls drag/drop behavior for AI Brain catalog ordering.',
    fileHint: 'Example: brain-catalog-entry',
    folderHint: 'Not used (flat list at root).',
  },
  brain_routing_tree: {
    title: 'AI Brain Routing',
    description: 'Controls grouped routing list behavior for AI Brain capability routes.',
    fileHint: 'Example: brain-routing-capability',
    folderHint: 'Example: brain-routing-feature',
  },
};

export const folderTreePersistFeedbackByInstance: Record<
  FolderTreeInstance,
  FolderTreePersistFeedback
> = {
  notes: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Folder tree updated.',
  },
  image_studio: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Folder tree updated.',
  },
  product_categories: {
    notifySuccess: true,
    notifyError: true,
    successMessage: 'Category tree updated.',
  },
  cms_page_builder: {
    notifySuccess: true,
    notifyError: true,
    successMessage: 'Component tree updated.',
  },
  case_resolver: {
    notifySuccess: true,
    notifyError: true,
    successMessage: 'Case resolver tree updated.',
  },
  case_resolver_cases: {
    notifySuccess: true,
    notifyError: true,
    successMessage: 'Case hierarchy updated.',
  },
  validator_list_tree: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Validation lists reordered.',
  },
  validator_pattern_tree: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Validation patterns reordered.',
  },
  prompt_exploder_segments: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Segments reordered.',
  },
  prompt_exploder_hierarchy: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Hierarchy updated.',
  },
  brain_catalog_tree: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Catalog updated.',
  },
  brain_routing_tree: {
    notifySuccess: false,
    notifyError: true,
    successMessage: 'Routing tree updated.',
  },
};

export type CanNestTreeNodeV2Input = {
  profile: FolderTreeProfileV2;
  nodeType: MasterTreeNodeType;
  nodeKind?: string | null;
  targetType: MasterTreeTargetType;
  targetFolderKind?: string | null;
};

const placeholderPresetSchema = z.enum(
  folderTreePlaceholderPresetValues as [string, ...string[]]
) as z.ZodType<FolderTreePlaceholderPreset>;
const placeholderStyleSchema = z.enum(
  folderTreePlaceholderStyleValues as [string, ...string[]]
) as z.ZodType<FolderTreePlaceholderStyle>;
const placeholderEmphasisSchema = z.enum(
  folderTreePlaceholderEmphasisValues as [string, ...string[]]
) as z.ZodType<FolderTreePlaceholderEmphasis>;
const selectionBehaviorSchema = z.enum(
  folderTreeSelectionBehaviorValues as [string, ...string[]]
) as z.ZodType<FolderTreeSelectionBehavior>;
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

const badgeSpecSchema: z.ZodType<FolderTreeBadgeSpec> = z.object({
  field: z.enum(['children_count', 'custom']).optional().default('children_count'),
  position: z.enum(['inline_after_name', 'trailing']).optional().default('trailing'),
  style: z.enum(['count', 'dot', 'status_icon']).optional().default('count'),
  statusMap: z
    .record(z.string(), z.enum(['info', 'warning', 'error', 'success']))
    .optional(),
});

const keyboardConfigSchema: z.ZodType<Partial<FolderTreeKeyboardConfig>> = z.object({
  enabled: z.boolean().optional(),
  arrowNavigation: z.boolean().optional(),
  enterToRename: z.boolean().optional(),
  deleteKey: z.boolean().optional(),
});

const multiSelectConfigSchema: z.ZodType<Partial<FolderTreeMultiSelectConfig>> = z.object({
  enabled: z.boolean().optional(),
  ctrlClick: z.boolean().optional(),
  shiftClick: z.boolean().optional(),
  selectAll: z.boolean().optional(),
});

const searchConfigSchema: z.ZodType<Partial<FolderTreeSearchConfig>> = z.object({
  enabled: z.boolean().optional(),
  debounceMs: z.number().optional(),
  filterMode: z.enum(['highlight', 'filter_tree']).optional(),
  matchFields: z
    .array(z.enum(['name', 'path', 'metadata']))
    .optional(),
  minQueryLength: z.number().optional(),
});

const nodeStatusValues: [MasterTreeNodeStatus, ...MasterTreeNodeStatus[]] = [
  'loading',
  'error',
  'locked',
  'warning',
  'success',
];

const statusIconsSchema: z.ZodType<Partial<Record<MasterTreeNodeStatus, string | null>>> = z.object({
  loading: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  locked: z.string().nullable().optional(),
  warning: z.string().nullable().optional(),
  success: z.string().nullable().optional(),
});

// Expose the valid status values for consumers
export const masterTreeNodeStatusValues: readonly MasterTreeNodeStatus[] = nodeStatusValues;

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
  // Optional capability sections — missing in old persisted JSON → undefined (safe default)
  badges: badgeSpecSchema.optional(),
  keyboard: keyboardConfigSchema.optional(),
  multiSelect: multiSelectConfigSchema.optional(),
  search: searchConfigSchema.optional(),
  statusIcons: statusIconsSchema.optional(),
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
  badges: profile.badges ? { ...profile.badges } : undefined,
  keyboard: profile.keyboard ? { ...profile.keyboard } : undefined,
  multiSelect: profile.multiSelect ? { ...profile.multiSelect } : undefined,
  search: profile.search ? { ...profile.search } : undefined,
  statusIcons: profile.statusIcons ? { ...profile.statusIcons } : undefined,
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
          childKinds: [
            'case_file',
            'case_file_scan',
            'node_file',
            'asset_image',
            'asset_pdf',
            'asset_file',
          ],
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
          childKinds: [
            'case_file',
            'case_file_scan',
            'node_file',
            'asset_image',
            'asset_pdf',
            'asset_file',
          ],
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
  case_resolver_cases: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move case to root',
      inlineDropLabel: 'Drop case',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: 'Folder',
        root: 'Folder',
        dragHandle: 'GripVertical',
      },
      byKind: {
        case_entry: 'Folder',
      },
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'folder',
          childKinds: ['case_entry'],
          targetType: 'folder',
          targetKinds: ['case_entry'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['case_entry'],
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
  validator_list_tree: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move here',
      inlineDropLabel: '',
    },
    icons: {
      slots: {
        folderClosed: null,
        folderOpen: null,
        file: null,
        root: null,
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'file',
          childKinds: ['validator-list'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  validator_pattern_tree: {
    version: 2,
    placeholders: {
      preset: 'sublime',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move to root',
      inlineDropLabel: 'Add to group',
    },
    icons: {
      slots: {
        folderClosed: null,
        folderOpen: null,
        file: null,
        root: null,
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'file',
          childKinds: ['pattern'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
        {
          childType: 'file',
          childKinds: ['pattern'],
          targetType: 'folder',
          targetKinds: ['sequence-group'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['sequence-group'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  prompt_exploder_segments: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move to Root',
      inlineDropLabel: 'Drop segment',
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
          childType: 'file',
          childKinds: ['prompt_segment'],
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
  prompt_exploder_hierarchy: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'balanced',
      rootDropLabel: 'Move to Root',
      inlineDropLabel: 'Drop item',
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
          childKinds: ['folder'],
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
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  brain_catalog_tree: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move here',
      inlineDropLabel: '',
    },
    icons: {
      slots: {
        folderClosed: null,
        folderOpen: null,
        file: null,
        root: null,
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'file',
          childKinds: ['brain-catalog-entry'],
          targetType: 'root',
          targetKinds: ['*'],
          allow: true,
        },
      ],
    },
    interactions: {
      selectionBehavior: 'click_away',
    },
  },
  brain_routing_tree: {
    version: 2,
    placeholders: {
      preset: 'classic',
      style: 'line',
      emphasis: 'subtle',
      rootDropLabel: 'Move here',
      inlineDropLabel: 'Drop route',
    },
    icons: {
      slots: {
        folderClosed: 'Folder',
        folderOpen: 'FolderOpen',
        file: null,
        root: null,
        dragHandle: null,
      },
      byKind: {},
    },
    nesting: {
      defaultAllow: false,
      blockedTargetKinds: [],
      rules: [
        {
          childType: 'file',
          childKinds: ['brain-routing-capability'],
          targetType: 'folder',
          targetKinds: ['brain-routing-feature'],
          allow: true,
        },
        {
          childType: 'folder',
          childKinds: ['brain-routing-feature'],
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

export const createDefaultFolderTreeProfilesV2 = (): FolderTreeProfilesV2Map => {
  const defaults = {} as FolderTreeProfilesV2Map;
  folderTreeInstanceValues.forEach((instance: FolderTreeInstance) => {
    defaults[instance] = cloneProfileV2(defaultFolderTreeProfilesV2[instance]);
  });
  return defaults;
};

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

const coerceProfileV2 = (
  candidate: unknown,
  fallback: FolderTreeProfileV2
): FolderTreeProfileV2 => {
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
    badges: parsed.data.badges,
    keyboard: parsed.data.keyboard,
    multiSelect: parsed.data.multiSelect,
    search: parsed.data.search,
    statusIcons: parsed.data.statusIcons,
  };
};

export const parseFolderTreeProfilesV2 = (
  raw: string | null | undefined
): FolderTreeProfilesV2Map => {
  const defaults = createDefaultFolderTreeProfilesV2();
  if (!raw) return defaults;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return defaults;
  }

  if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
    return defaults;
  }

  const candidate = parsedJson as Partial<Record<FolderTreeInstance, unknown>>;
  const next = {} as FolderTreeProfilesV2Map;
  folderTreeInstanceValues.forEach((instance: FolderTreeInstance) => {
    next[instance] = coerceProfileV2(candidate[instance], defaults[instance]);
  });
  return next;
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

export const getFolderTreeInstanceSettingsHref = (instance: FolderTreeInstance): string =>
  `/admin/settings/folder-trees#folder-tree-instance-${instance}`;
