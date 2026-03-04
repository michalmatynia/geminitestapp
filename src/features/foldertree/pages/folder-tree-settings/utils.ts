import {
  type FolderTreeInstance,
  folderTreeInstanceValues,
  folderTreeSettingsMetaByInstance,
  type FolderTreeProfileV2,
  type FolderTreeNestingRuleV2,
} from '@/shared/utils/folder-tree-profiles-v2';
import { ICON_LIBRARY, type IconLibraryItem } from '@/shared/lib/icons';

export const INSTANCE_META: Array<{
  id: FolderTreeInstance;
  title: string;
  description: string;
  fileHint: string;
  folderHint: string;
}> = folderTreeInstanceValues.map((id: FolderTreeInstance) => ({
  id,
  ...folderTreeSettingsMetaByInstance[id],
}));

export type NestingRuleKey =
  | 'folder_to_folder'
  | 'file_to_folder'
  | 'folder_to_root'
  | 'file_to_root';

export const NESTING_RULE_CONFIG: Record<
  NestingRuleKey,
  {
    childType: 'folder' | 'file';
    targetType: 'folder' | 'root';
    targetKinds: string[];
    defaultKinds: string[];
  }
> = {
  folder_to_folder: {
    childType: 'folder',
    targetType: 'folder',
    targetKinds: ['*'],
    defaultKinds: ['*'],
  },
  file_to_folder: {
    childType: 'file',
    targetType: 'folder',
    targetKinds: ['*'],
    defaultKinds: ['*'],
  },
  folder_to_root: {
    childType: 'folder',
    targetType: 'root',
    targetKinds: ['root'],
    defaultKinds: ['*'],
  },
  file_to_root: {
    childType: 'file',
    targetType: 'root',
    targetKinds: ['root'],
    defaultKinds: ['*'],
  },
};

export const TREE_ICON_IDS = new Set<string>([
  'Folder',
  'FolderOpen',
  'FileText',
  'Image',
  'GripVertical',
  'LayoutGrid',
  'Box',
  'Tag',
  'Layers',
  'List',
  'ListChecks',
  'Archive',
  'Package',
  'BookOpen',
  'Map',
  'Library',
  'NotebookTabs',
  'FileCode2',
  'FileSpreadsheet',
  'NotepadText',
]);

export const TREE_ICON_ITEMS: ReadonlyArray<IconLibraryItem> = ICON_LIBRARY.filter(
  (item: IconLibraryItem): boolean => TREE_ICON_IDS.has(item.id)
);

export const toKindList = (value: string): string[] =>
  value
    .split(',')
    .map((entry: string) => entry.trim().toLowerCase())
    .filter((entry: string) => entry.length > 0);

export const listToValue = (values: string[]): string => values.join(', ');

export const normalizeKindList = (
  values: string[] | null | undefined,
  fallback: string[]
): string[] => {
  if (!Array.isArray(values) || values.length === 0) return [...fallback];
  const normalized = new Set<string>();
  values.forEach((entry: string) => {
    const value = entry.trim().toLowerCase();
    if (!value) return;
    normalized.add(value);
  });
  return normalized.size > 0 ? Array.from(normalized) : [...fallback];
};

export const toTitleLabel = (value: string): string =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

export const findRuleIndex = (profile: FolderTreeProfileV2, key: NestingRuleKey): number => {
  const config = NESTING_RULE_CONFIG[key];
  for (let index = profile.nesting.rules.length - 1; index >= 0; index -= 1) {
    const rule = profile.nesting.rules[index];
    if (!rule) continue;
    if (rule.childType !== config.childType) continue;
    if (rule.targetType !== config.targetType) continue;
    if (config.targetType === 'root') {
      const targetKinds = normalizeKindList(rule.targetKinds, ['root']);
      if (!targetKinds.includes('root') && !targetKinds.includes('*')) continue;
    }
    return index;
  }
  return -1;
};

export const getRule = (
  profile: FolderTreeProfileV2,
  key: NestingRuleKey
): FolderTreeNestingRuleV2 | null => {
  const index = findRuleIndex(profile, key);
  return index >= 0 ? (profile.nesting.rules[index] ?? null) : null;
};

export const getRuleAllow = (profile: FolderTreeProfileV2, key: NestingRuleKey): boolean => {
  const rule = getRule(profile, key);
  return rule ? rule.allow : profile.nesting.defaultAllow;
};

export const getRuleKinds = (profile: FolderTreeProfileV2, key: NestingRuleKey): string[] => {
  const config = NESTING_RULE_CONFIG[key];
  const rule = getRule(profile, key);
  return normalizeKindList(rule?.childKinds, config.defaultKinds);
};

export const upsertRule = (
  profile: FolderTreeProfileV2,
  key: NestingRuleKey,
  update: Partial<Pick<FolderTreeNestingRuleV2, 'allow' | 'childKinds'>>
): FolderTreeProfileV2 => {
  const config = NESTING_RULE_CONFIG[key];
  const rules = [...profile.nesting.rules];
  const ruleIndex = findRuleIndex(profile, key);
  const existing = ruleIndex >= 0 ? rules[ruleIndex] : null;
  const childKinds = normalizeKindList(
    update.childKinds ?? existing?.childKinds ?? config.defaultKinds,
    config.defaultKinds
  );
  const targetKinds = normalizeKindList(
    existing?.targetKinds ?? config.targetKinds,
    config.targetKinds
  );
  const nextRule: FolderTreeNestingRuleV2 = {
    childType: config.childType,
    childKinds,
    targetType: config.targetType,
    targetKinds,
    allow: update.allow ?? existing?.allow ?? profile.nesting.defaultAllow,
  };

  if (ruleIndex >= 0) {
    rules[ruleIndex] = nextRule;
  } else {
    rules.push(nextRule);
  }

  return {
    ...profile,
    nesting: {
      ...profile.nesting,
      rules,
    },
  };
};

export const byKindToValue = (byKind: Record<string, string | null>): string =>
  Object.entries(byKind)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, iconId]) => `${kind}=${iconId ?? ''}`)
    .join('\n');

export const valueToByKind = (value: string): Record<string, string | null> => {
  const entries: Record<string, string | null> = {};
  value.split('\n').forEach((line: string) => {
    const normalizedLine = line.trim();
    if (!normalizedLine) return;
    const separator = normalizedLine.includes('=') ? '=' : normalizedLine.includes(':') ? ':' : '';
    if (!separator) return;
    const parts = normalizedLine.split(separator);
    const key = parts.shift()?.trim().toLowerCase() ?? '';
    if (!key) return;
    const iconId = parts.join(separator).trim();
    entries[key] = iconId || null;
  });
  return entries;
};
