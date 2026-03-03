import { validationError } from '@/shared/errors/app-error';
import {
  normalizeMasterTreeKind,
} from '../master-folder-tree-contract';
import {
  FolderTreeProfileV2,
  FolderTreePlaceholderPreset,
  FolderTreePlaceholderClassSet,
  FolderTreeProfilesV2Map,
  FolderTreeInstance,
  FolderTreeNestingRuleV2,
  FolderTreeIconSlot,
  CanNestTreeNodeV2Input,
} from './types';
import {
  folderTreeInstanceValues,
} from './types';
import { profileV2Schema } from './schema';

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

export const normalizeKindList = (values: string[] | null | undefined, fallback: string[]): string[] => {
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
    search: parsed.search,
    statusIcons: parsed.statusIcons,
  };
};

export const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const pickKeys = (
  source: Record<string, unknown>,
  keys: ReadonlyArray<string>
): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  keys.forEach((key: string): void => {
    if (key in source) {
      next[key] = source[key];
    }
  });
  return next;
};

export const stripUnknownProfileV2CandidateKeys = (candidate: unknown): unknown => {
  const root = toRecord(candidate);
  if (!root) return candidate;

  const next = pickKeys(root, [
    'version',
    'placeholders',
    'icons',
    'nesting',
    'interactions',
    'badges',
    'keyboard',
    'multiSelect',
    'search',
    'statusIcons',
  ]);

  const placeholders = toRecord(root['placeholders']);
  if (placeholders) {
    next['placeholders'] = pickKeys(placeholders, [
      'preset',
      'style',
      'emphasis',
      'rootDropLabel',
      'inlineDropLabel',
    ]);
  }

  const icons = toRecord(root['icons']);
  if (icons) {
    const iconsNext = pickKeys(icons, ['slots', 'byKind']);
    const slots = toRecord(icons['slots']);
    if (slots) {
      iconsNext['slots'] = pickKeys(slots, [
        'folderClosed',
        'folderOpen',
        'file',
        'root',
        'dragHandle',
      ]);
    }
    next['icons'] = iconsNext;
  }

  const nesting = toRecord(root['nesting']);
  if (nesting) {
    const nestingNext = pickKeys(nesting, ['defaultAllow', 'blockedTargetKinds', 'rules']);
    if (Array.isArray(nesting['rules'])) {
      nestingNext['rules'] = nesting['rules']
        .map((rule: unknown): Record<string, unknown> | null => {
          const ruleRecord = toRecord(rule);
          if (!ruleRecord) return null;
          return pickKeys(ruleRecord, ['childType', 'childKinds', 'targetType', 'targetKinds', 'allow']);
        })
        .filter((rule: Record<string, unknown> | null): rule is Record<string, unknown> => Boolean(rule));
    }
    next['nesting'] = nestingNext;
  }

  const interactions = toRecord(root['interactions']);
  if (interactions) {
    next['interactions'] = pickKeys(interactions, ['selectionBehavior']);
  }

  const badges = toRecord(root['badges']);
  if (badges) {
    next['badges'] = pickKeys(badges, ['field', 'position', 'style', 'statusMap']);
  }

  const keyboard = toRecord(root['keyboard']);
  if (keyboard) {
    next['keyboard'] = pickKeys(keyboard, ['enabled', 'arrowNavigation', 'enterToRename', 'deleteKey']);
  }

  const multiSelect = toRecord(root['multiSelect']);
  if (multiSelect) {
    next['multiSelect'] = pickKeys(multiSelect, ['enabled', 'ctrlClick', 'shiftClick', 'selectAll']);
  }

  const search = toRecord(root['search']);
  if (search) {
    next['search'] = pickKeys(search, ['enabled', 'debounceMs', 'filterMode', 'matchFields', 'minQueryLength']);
  }

  const statusIcons = toRecord(root['statusIcons']);
  if (statusIcons) {
    next['statusIcons'] = pickKeys(statusIcons, ['loading', 'error', 'locked', 'warning', 'success']);
  }

  return next;
};

export const coerceProfileV2 = (
  candidate: unknown,
  fallback: FolderTreeProfileV2
): FolderTreeProfileV2 => {
  const parsed = profileV2Schema.safeParse(stripUnknownProfileV2CandidateKeys(candidate));
  if (!parsed.success) {
    return cloneProfileV2(fallback);
  }
  return toCanonicalProfileV2({
    candidate,
    parsed: parsed.data,
    fallback,
  });
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

export const parseFolderTreeProfilesV2 = (
  raw: string | null | undefined,
  defaults: FolderTreeProfilesV2Map
): FolderTreeProfilesV2Map => {
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
