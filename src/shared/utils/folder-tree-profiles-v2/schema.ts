import { z } from 'zod';
import {
  FolderTreePlaceholderPreset,
  FolderTreePlaceholderStyle,
  FolderTreePlaceholderEmphasis,
  FolderTreeSelectionBehavior,
  FolderTreeBadgeSpec,
  FolderTreeKeyboardConfig,
  FolderTreeMultiSelectConfig,
  FolderTreeSearchConfig,
  MasterTreeNodeStatus,
  FolderTreeProfileV2,
} from './types';
import {
  folderTreePlaceholderPresetValues,
  folderTreePlaceholderStyleValues,
  folderTreePlaceholderEmphasisValues,
  folderTreeSelectionBehaviorValues,
} from './constants';

export const placeholderPresetSchema = z.enum(
  folderTreePlaceholderPresetValues as [string, ...string[]]
) as z.ZodType<FolderTreePlaceholderPreset>;

export const placeholderStyleSchema = z.enum(
  folderTreePlaceholderStyleValues as [string, ...string[]]
) as z.ZodType<FolderTreePlaceholderStyle>;

export const placeholderEmphasisSchema = z.enum(
  folderTreePlaceholderEmphasisValues as [string, ...string[]]
) as z.ZodType<FolderTreePlaceholderEmphasis>;

export const selectionBehaviorSchema = z.enum(
  folderTreeSelectionBehaviorValues as [string, ...string[]]
) as z.ZodType<FolderTreeSelectionBehavior>;

export const nodeTypeSchema = z.enum(['folder', 'file']);
export const targetTypeSchema = z.enum(['folder', 'root']);
export const iconSlotSchema = z.string().trim().min(1).nullable();

export const iconSlotsSchema = z
  .object({
    folderClosed: iconSlotSchema.optional().default('Folder'),
    folderOpen: iconSlotSchema.optional().default('FolderOpen'),
    file: iconSlotSchema.optional().default('FileText'),
    root: iconSlotSchema.optional().default('Folder'),
    dragHandle: iconSlotSchema.optional().default('GripVertical'),
  })
  .strict();

export const nestingRuleSchema = z
  .object({
    childType: nodeTypeSchema.optional().default('file'),
    childKinds: z.array(z.string().trim().min(1)).optional().default(['*']),
    targetType: targetTypeSchema.optional().default('folder'),
    targetKinds: z.array(z.string().trim().min(1)).optional().default(['*']),
    allow: z.boolean().optional().default(false),
  })
  .strict();

export const badgeSpecSchema: z.ZodType<FolderTreeBadgeSpec> = z
  .object({
    field: z.enum(['children_count', 'custom']).optional().default('children_count'),
    position: z.enum(['inline_after_name', 'trailing']).optional().default('trailing'),
    style: z.enum(['count', 'dot', 'status_icon']).optional().default('count'),
    statusMap: z.record(z.string(), z.enum(['info', 'warning', 'error', 'success'])).optional(),
  })
  .strict();

export const keyboardConfigSchema: z.ZodType<Partial<FolderTreeKeyboardConfig>> = z
  .object({
    enabled: z.boolean().optional(),
    arrowNavigation: z.boolean().optional(),
    enterToRename: z.boolean().optional(),
    deleteKey: z.boolean().optional(),
  })
  .strict();

export const multiSelectConfigSchema: z.ZodType<Partial<FolderTreeMultiSelectConfig>> = z
  .object({
    enabled: z.boolean().optional(),
    ctrlClick: z.boolean().optional(),
    shiftClick: z.boolean().optional(),
    selectAll: z.boolean().optional(),
  })
  .strict();

export const searchConfigSchema: z.ZodType<Partial<FolderTreeSearchConfig>> = z
  .object({
    enabled: z.boolean().optional(),
    debounceMs: z.number().optional(),
    filterMode: z.enum(['highlight', 'filter_tree']).optional(),
    matchFields: z.array(z.enum(['name', 'path', 'metadata'])).optional(),
    minQueryLength: z.number().optional(),
  })
  .strict();

export const nodeStatusValues: [MasterTreeNodeStatus, ...MasterTreeNodeStatus[]] = [
  'loading',
  'error',
  'locked',
  'warning',
  'success',
];

export const statusIconsSchema: z.ZodType<Partial<Record<MasterTreeNodeStatus, string | null>>> = z
  .object({
    loading: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
    locked: z.string().nullable().optional(),
    warning: z.string().nullable().optional(),
    success: z.string().nullable().optional(),
  })
  .strict();

export const masterTreeNodeStatusValues: readonly MasterTreeNodeStatus[] = nodeStatusValues;

export const profileV2Schema: z.ZodType<FolderTreeProfileV2> = z
  .object({
    version: z.literal(2).optional().default(2),
    placeholders: z
      .object({
        preset: placeholderPresetSchema.optional().default('sublime'),
        style: placeholderStyleSchema.optional().default('line'),
        emphasis: placeholderEmphasisSchema.optional().default('subtle'),
        rootDropLabel: z.string().trim().min(1).optional().default('Drop to Root'),
        inlineDropLabel: z.string().trim().min(1).optional().default('Drop here'),
      })
      .strict()
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
      .strict()
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
      .strict()
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
      .strict()
      .optional()
      .default({
        selectionBehavior: 'click_away',
      }),
    badges: badgeSpecSchema.optional(),
    keyboard: keyboardConfigSchema.optional(),
    multiSelect: multiSelectConfigSchema.optional(),
    search: searchConfigSchema.optional(),
    statusIcons: statusIconsSchema.optional(),
  })
  .strict();
