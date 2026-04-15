import { validationError } from '@/shared/errors/app-error';

import { normalizeMasterTreeKind } from '../master-folder-tree-contract';
import { profileV2Schema } from './schema';
import {
  type FolderTreeProfileV2,
  type FolderTreeKeyboardConfig,
  type FolderTreeMultiSelectConfig,
  type FolderTreeSearchConfig,
  type FolderTreePlaceholderPreset,
  type FolderTreePlaceholderClassSet,
  type FolderTreeProfilesV2Map,
  type FolderTreeInstance,
  type FolderTreeNestingRuleV2,
  type FolderTreeIconSlot,
  type CanNestTreeNodeV2Input,
} from './types';
import { folderTreeInstanceValues } from './types';

export type ResolvedFolderTreeKeyboardConfig = FolderTreeKeyboardConfig;
export type ResolvedFolderTreeMultiSelectConfig = FolderTreeMultiSelectConfig;
export type ResolvedFolderTreeSearchConfig = FolderTreeSearchConfig;

const DEFAULT_KEYBOARD_CONFIG: ResolvedFolderTreeKeyboardConfig = {
  enabled: true,
  arrowNavigation: true,
  enterToRename: true,
  deleteKey: false,
};

const DEFAULT_MULTI_SELECT_CONFIG: ResolvedFolderTreeMultiSelectConfig = {
  enabled: false,
  ctrlClick: true,
  shiftClick: true,
  selectAll: true,
};

const DEFAULT_SEARCH_CONFIG: ResolvedFolderTreeSearchConfig = {
  enabled: false,
  debounceMs: 200,
  filterMode: 'highlight',
  matchFields: ['name'],
  minQueryLength: 1,
};

export const resolveFolderTreeKeyboardConfig = (
  profile: FolderTreeProfileV2 | null | undefined
): ResolvedFolderTreeKeyboardConfig => ({
  enabled: profile?.keyboard?.enabled ?? DEFAULT_KEYBOARD_CONFIG.enabled,
  arrowNavigation: profile?.keyboard?.arrowNavigation ?? DEFAULT_KEYBOARD_CONFIG.arrowNavigation,
  enterToRename: profile?.keyboard?.enterToRename ?? DEFAULT_KEYBOARD_CONFIG.enterToRename,
  deleteKey: profile?.keyboard?.deleteKey ?? DEFAULT_KEYBOARD_CONFIG.deleteKey,
});

export const resolveFolderTreeMultiSelectConfig = (
  profile: FolderTreeProfileV2 | null | undefined
): ResolvedFolderTreeMultiSelectConfig => ({
  enabled: profile?.multiSelect?.enabled ?? DEFAULT_MULTI_SELECT_CONFIG.enabled,
  ctrlClick: profile?.multiSelect?.ctrlClick ?? DEFAULT_MULTI_SELECT_CONFIG.ctrlClick,
  shiftClick: profile?.multiSelect?.shiftClick ?? DEFAULT_MULTI_SELECT_CONFIG.shiftClick,
  selectAll: profile?.multiSelect?.selectAll ?? DEFAULT_MULTI_SELECT_CONFIG.selectAll,
});

export const resolveFolderTreeSearchConfig = (
  profile: FolderTreeProfileV2 | null | undefined
): ResolvedFolderTreeSearchConfig => {
  const rawDebounceMs = profile?.search?.debounceMs;
  const rawMinQueryLength = profile?.search?.minQueryLength;
  return {
    enabled: profile?.search?.enabled ?? DEFAULT_SEARCH_CONFIG.enabled,
    debounceMs:
      typeof rawDebounceMs === 'number' && Number.isFinite(rawDebounceMs)
        ? Math.max(0, Math.floor(rawDebounceMs))
        : DEFAULT_SEARCH_CONFIG.debounceMs,
    filterMode: profile?.search?.filterMode ?? DEFAULT_SEARCH_CONFIG.filterMode,
    matchFields:
      Array.isArray(profile?.search?.matchFields) && profile.search.matchFields.length > 0
        ? [...new Set(profile.search.matchFields)]
        : DEFAULT_SEARCH_CONFIG.matchFields,
    minQueryLength:
      typeof rawMinQueryLength === 'number' && Number.isFinite(rawMinQueryLength)
        ? Math.max(0, Math.floor(rawMinQueryLength))
        : DEFAULT_SEARCH_CONFIG.minQueryLength,
  };
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

export const cloneProfileV2 = (profile: FolderTreeProfileV2): FolderTreeProfileV2 => ({
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

export const createDefaultFolderTreeProfilesV2 = (
  defaultProfiles: FolderTreeProfilesV2Map
): FolderTreeProfilesV2Map => {
  const defaults = {} as FolderTreeProfilesV2Map;
  folderTreeInstanceValues.forEach((instance: FolderTreeInstance) => {
    defaults[instance] = cloneProfileV2(defaultProfiles[instance]);
  });
  return defaults;
};

export const normalizeByKindIcons = (
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

export const toCanonicalProfileV2 = ({
  candidate,
  parsed,
  fallback,
}: {
  candidate: unknown;
  parsed: FolderTreeProfileV2;
  fallback: FolderTreeProfileV2;
}): FolderTreeProfileV2 => {
  const sourceRecord =
    candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      ? (candidate as Record<string, unknown>)
      : null;
  const hasInteractionSettings = Boolean(sourceRecord && 'interactions' in sourceRecord);
  const hasSearchSettings = Boolean(sourceRecord && 'search' in sourceRecord);
  const mergedSearch = hasSearchSettings
    ? {
      ...(fallback.search ?? {}),
      ...(parsed.search ?? {}),
    }
    : fallback.search
      ? { ...fallback.search }
      : undefined;

  return {
    version: 2,
    placeholders: {
      preset: parsed.placeholders.preset,
      style: parsed.placeholders.style,
      emphasis: parsed.placeholders.emphasis,
      rootDropLabel: parsed.placeholders.rootDropLabel,
      inlineDropLabel: parsed.placeholders.inlineDropLabel,
    },
    icons: {
      slots: {
        folderClosed: parsed.icons.slots.folderClosed,
        folderOpen: parsed.icons.slots.folderOpen,
        file: parsed.icons.slots.file,
        root: parsed.icons.slots.root,
        dragHandle: parsed.icons.slots.dragHandle,
      },
      byKind: normalizeByKindIcons(parsed.icons.byKind, fallback.icons.byKind),
    },
    nesting: {
      defaultAllow: parsed.nesting.defaultAllow,
      blockedTargetKinds: normalizeKindList(parsed.nesting.blockedTargetKinds, []),
      rules: parsed.nesting.rules.map((rule: FolderTreeNestingRuleV2) => ({
        childType: rule.childType,
        childKinds: normalizeKindList(rule.childKinds, ['*']),
        targetType: rule.targetType,
        targetKinds: normalizeKindList(rule.targetKinds, ['*']),
        allow: rule.allow,
      })),
    },
    interactions: {
      selectionBehavior: hasInteractionSettings
        ? parsed.interactions.selectionBehavior
        : fallback.interactions.selectionBehavior,
    },
    badges: parsed.badges,
    keyboard: parsed.keyboard,
    multiSelect: parsed.multiSelect,
    search: mergedSearch
      ? {
        ...mergedSearch,
        matchFields: mergedSearch.matchFields ? [...mergedSearch.matchFields] : undefined,
      }
      : undefined,
    statusIcons: parsed.statusIcons,
  };
};

export const parseFolderTreeProfileV2Strict = (
  candidate: unknown,
  fallback: FolderTreeProfileV2
): FolderTreeProfileV2 => {
  const parsed = profileV2Schema.safeParse(candidate);
  if (!parsed.success) {
    throw validationError('Invalid folder tree V2 profile payload.', {
      issues: parsed.error.issues,
    });
  }
  return toCanonicalProfileV2({
    candidate,
    parsed: parsed.data,
    fallback,
  });
};

export const listMatches = (allowed: string[], value: string): boolean =>
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

export const getFolderTreeInstanceSettingsHref = (instance: FolderTreeInstance): string =>
  `/admin/settings/folder-trees#folder-tree-instance-${instance}`;
