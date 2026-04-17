/* eslint-disable complexity, max-lines, max-lines-per-function */
import {
  cloneAmazonSelectorRegistryProfile,
  deleteAmazonSelectorRegistryEntry,
  deleteAmazonSelectorRegistryProfile,
  listAmazonSelectorRegistry,
  renameAmazonSelectorRegistryProfile,
  saveAmazonSelectorRegistryEntry,
  syncAmazonSelectorRegistryFromCode,
} from '@/features/integrations/services/amazon-selector-registry';
import {
  cloneSupplier1688SelectorRegistryProfile,
  deleteSupplier1688SelectorRegistryEntry,
  deleteSupplier1688SelectorRegistryProfile,
  listSupplier1688SelectorRegistry,
  renameSupplier1688SelectorRegistryProfile,
  saveSupplier1688SelectorRegistryEntry,
  syncSupplier1688SelectorRegistryFromCode,
} from '@/features/integrations/services/supplier-1688-selector-registry';
import {
  cloneTraderaSelectorRegistryProfile,
  deleteTraderaSelectorRegistryEntry,
  deleteTraderaSelectorRegistryProfile,
  listTraderaSelectorRegistry,
  renameTraderaSelectorRegistryProfile,
  saveTraderaSelectorRegistryEntry,
  syncTraderaSelectorRegistryFromCode,
} from '@/features/integrations/services/tradera-selector-registry';
import type {
  SelectorRegistryDeleteResponse,
  SelectorRegistryEntry,
  SelectorRegistryKind,
  SelectorRegistryListResponse,
  SelectorRegistryNamespace,
  SelectorRegistryProfileActionResponse,
  SelectorRegistrySaveResponse,
  SelectorRegistrySyncResponse,
  SelectorRegistryValueType,
} from '@/shared/contracts/integrations/selector-registry';
import {
  SELECTOR_REGISTRY_DEFAULT_PROFILES,
  SELECTOR_REGISTRY_NAMESPACES,
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import type { AmazonSelectorRegistryEntry } from '@/shared/contracts/integrations/amazon-selector-registry';
import type { Supplier1688SelectorRegistryEntry } from '@/shared/contracts/integrations/supplier-1688-selector-registry';
import type { TraderaSelectorRegistryEntry } from '@/shared/contracts/integrations/tradera-selector-registry';
import {
  AMAZON_DEFAULT_SELECTOR_RUNTIME,
  generateAmazonSelectorRegistryRuntimeFromRuntime,
  resolveAmazonSelectorRuntimeFromEntries,
  type AmazonSelectorRegistryRuntimeEntry,
  type AmazonSelectorRuntime,
} from '@/shared/lib/browser-execution/selectors/amazon';
import {
  SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME,
  resolveSupplier1688SelectorRuntimeFromEntries,
  type Supplier1688SelectorRegistryRuntimeEntry,
  type Supplier1688SelectorRuntime,
} from '@/shared/lib/browser-execution/selectors/supplier-1688';
import {
  generateTraderaSelectorRegistryRuntimeFromEntries,
  TRADERA_SELECTOR_REGISTRY_RUNTIME,
  type TraderaSelectorRegistryRuntimeEntry,
} from '@/shared/lib/browser-execution/selectors/tradera';
import {
  VINTED_AUTH_ENTRY_URL,
  VINTED_BASE_ORIGIN,
  VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS,
  VINTED_BRAND_INPUT_SELECTORS,
  VINTED_BRAND_SELECTORS,
  VINTED_CATEGORY_OPTION_SELECTORS,
  VINTED_CATEGORY_SELECTORS,
  VINTED_CONDITION_SELECTORS,
  VINTED_COOKIE_ACCEPT_SELECTORS,
  VINTED_DESCRIPTION_SELECTORS,
  VINTED_DROPDOWN_OPTION_SELECTORS,
  VINTED_IMAGE_UPLOAD_SELECTORS,
  VINTED_ITEM_URL_PATTERN,
  VINTED_LISTING_FORM_URL,
  VINTED_LOGIN_FORM_SELECTOR,
  VINTED_LOGIN_SUCCESS_SELECTORS,
  VINTED_PASSWORD_SELECTORS,
  VINTED_PRICE_SELECTORS,
  VINTED_SIZE_SELECTORS,
  VINTED_SUBMIT_SELECTORS,
  VINTED_TITLE_SELECTORS,
  VINTED_UPDATE_SUBMIT_SELECTORS,
  VINTED_USERNAME_SELECTORS,
} from '@/shared/lib/browser-execution/selectors/vinted';

type LegacySelectorEntry =
  | TraderaSelectorRegistryEntry
  | AmazonSelectorRegistryEntry
  | Supplier1688SelectorRegistryEntry;

type SelectorRegistryValue =
  | string
  | number
  | boolean
  | null
  | SelectorRegistryValue[]
  | { [key: string]: SelectorRegistryValue };

type VintedDefinition = {
  key: string;
  group: string;
  kind: SelectorRegistryKind;
  description: string | null;
  value: SelectorRegistryValue;
};

export type ResolvedSelectorRegistryRuntime =
  | {
      namespace: 'tradera';
      runtime: string;
      requestedProfile: string;
      resolvedProfile: string;
      sourceProfiles: string[];
      entryCount: number;
      overlayEntryCount: number;
      fallbackToCode: boolean;
      fallbackReason?: string;
    }
  | {
      namespace: 'amazon';
      selectorRuntime: AmazonSelectorRuntime;
      runtime: string;
      requestedProfile: string;
      resolvedProfile: string;
      sourceProfiles: string[];
      entryCount: number;
      overlayEntryCount: number;
      fallbackToCode: boolean;
      fallbackReason?: string;
    }
  | {
      namespace: '1688';
      selectorRuntime: Supplier1688SelectorRuntime;
      runtime: null;
      requestedProfile: string;
      resolvedProfile: string;
      sourceProfiles: string[];
      entryCount: number;
      overlayEntryCount: number;
      fallbackToCode: boolean;
      fallbackReason?: string;
    };

const EPOCH_ISO = new Date(0).toISOString();

const normalizeProfile = (
  namespace: SelectorRegistryNamespace,
  profile: string | null | undefined
): string => {
  const trimmed = typeof profile === 'string' ? profile.trim() : '';
  return trimmed.length > 0 ? trimmed : SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace];
};

const isCodeFallbackEntry = (entry: SelectorRegistryEntry): boolean => entry.source === 'code';

const collectProfiles = (
  namespace: SelectorRegistryNamespace,
  entries: readonly SelectorRegistryEntry[],
  extraProfiles: readonly string[] = []
): string[] =>
  Array.from(
    new Set([
      SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace],
      ...extraProfiles,
      ...entries.map((entry) => entry.profile),
    ])
  )
    .filter((value) => value.trim().length > 0)
    .sort((left, right) => left.localeCompare(right));

const latestSyncedAt = (entries: readonly SelectorRegistryEntry[]): string | null =>
  entries.reduce<string | null>((latest, entry) => {
    const candidate = entry.updatedAt;
    return latest === null || candidate > latest ? candidate : latest;
  }, null);

const detectValueType = (value: SelectorRegistryValue): SelectorRegistryValueType => {
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === 'string')) return 'string_array';
    if (value.every((entry) => Array.isArray(entry))) return 'nested_string_array';
    return 'object_array';
  }
  return 'object_array';
};

const getItemCount = (value: SelectorRegistryValue): number => {
  if (Array.isArray(value)) return value.length;
  return value === null ? 0 : 1;
};

const collectPreviewStrings = (value: SelectorRegistryValue, limit = 6): string[] => {
  const result: string[] = [];

  const visit = (candidate: SelectorRegistryValue): void => {
    if (result.length >= limit) return;
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0) result.push(trimmed);
      return;
    }
    if (candidate === null || typeof candidate === 'number' || typeof candidate === 'boolean') {
      return;
    }
    if (Array.isArray(candidate)) {
      for (const entry of candidate) visit(entry);
      return;
    }
    for (const entry of Object.values(candidate)) visit(entry);
  };

  visit(value);
  return result;
};

const toNamespacedEntry = (
  namespace: SelectorRegistryNamespace,
  entry: LegacySelectorEntry
): SelectorRegistryEntry => ({
  id: `${namespace}:${entry.id}`,
  namespace,
  profile: entry.profile,
  key: entry.key,
  group: entry.group,
  kind: entry.kind,
  description: entry.description,
  valueType: entry.valueType,
  valueJson: entry.valueJson,
  itemCount: entry.itemCount,
  preview: entry.preview,
  source: entry.source,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

const VINTED_SELECTOR_REGISTRY_DEFINITIONS: VintedDefinition[] = [
  {
    key: 'vinted.auth.loginSuccess',
    group: 'auth',
    kind: 'selector',
    description: 'Signals that a Vinted seller session is authenticated.',
    value: [...VINTED_LOGIN_SUCCESS_SELECTORS],
  },
  {
    key: 'vinted.auth.loginForm',
    group: 'auth',
    kind: 'selector',
    description: 'Form root used to detect the Vinted login surface.',
    value: VINTED_LOGIN_FORM_SELECTOR,
  },
  {
    key: 'vinted.auth.usernameInputs',
    group: 'auth',
    kind: 'selector',
    description: 'Username/email input candidates.',
    value: [...VINTED_USERNAME_SELECTORS],
  },
  {
    key: 'vinted.auth.passwordInputs',
    group: 'auth',
    kind: 'selector',
    description: 'Password input candidates.',
    value: [...VINTED_PASSWORD_SELECTORS],
  },
  {
    key: 'vinted.auth.cookieAccept',
    group: 'auth',
    kind: 'selector',
    description: 'Cookie consent buttons.',
    value: [...VINTED_COOKIE_ACCEPT_SELECTORS],
  },
  {
    key: 'vinted.listing.title',
    group: 'listing_form',
    kind: 'selector',
    description: 'Title field candidates.',
    value: [...VINTED_TITLE_SELECTORS],
  },
  {
    key: 'vinted.listing.description',
    group: 'listing_form',
    kind: 'selector',
    description: 'Description field candidates.',
    value: [...VINTED_DESCRIPTION_SELECTORS],
  },
  {
    key: 'vinted.listing.price',
    group: 'listing_form',
    kind: 'selector',
    description: 'Price field candidates.',
    value: [...VINTED_PRICE_SELECTORS],
  },
  {
    key: 'vinted.listing.images',
    group: 'images',
    kind: 'selector',
    description: 'Image upload inputs.',
    value: [...VINTED_IMAGE_UPLOAD_SELECTORS],
  },
  {
    key: 'vinted.category.triggers',
    group: 'taxonomy',
    kind: 'selector',
    description: 'Category selector controls.',
    value: [...VINTED_CATEGORY_SELECTORS],
  },
  {
    key: 'vinted.category.options',
    group: 'taxonomy',
    kind: 'selector',
    description: 'Category option candidates.',
    value: [...VINTED_CATEGORY_OPTION_SELECTORS],
  },
  {
    key: 'vinted.brand.inputs',
    group: 'listing_form',
    kind: 'selector',
    description: 'Brand input candidates.',
    value: [...VINTED_BRAND_INPUT_SELECTORS],
  },
  {
    key: 'vinted.brand.selectors',
    group: 'listing_form',
    kind: 'selector',
    description: 'Brand selector controls.',
    value: [...VINTED_BRAND_SELECTORS],
  },
  {
    key: 'vinted.brand.autocompleteOptions',
    group: 'listing_form',
    kind: 'selector',
    description: 'Brand autocomplete option candidates.',
    value: [...VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS],
  },
  {
    key: 'vinted.size.selectors',
    group: 'listing_form',
    kind: 'selector',
    description: 'Size selector controls.',
    value: [...VINTED_SIZE_SELECTORS],
  },
  {
    key: 'vinted.condition.selectors',
    group: 'listing_form',
    kind: 'selector',
    description: 'Condition selector controls.',
    value: [...VINTED_CONDITION_SELECTORS],
  },
  {
    key: 'vinted.dropdown.options',
    group: 'listing_form',
    kind: 'selector',
    description: 'Shared dropdown option candidates.',
    value: [...VINTED_DROPDOWN_OPTION_SELECTORS],
  },
  {
    key: 'vinted.submit.create',
    group: 'publish',
    kind: 'selector',
    description: 'Create-listing submit buttons.',
    value: [...VINTED_SUBMIT_SELECTORS],
  },
  {
    key: 'vinted.submit.update',
    group: 'publish',
    kind: 'selector',
    description: 'Update-listing submit buttons.',
    value: [...VINTED_UPDATE_SUBMIT_SELECTORS],
  },
  {
    key: 'vinted.urls.listingForm',
    group: 'paths',
    kind: 'paths',
    description: 'Vinted listing form URL.',
    value: VINTED_LISTING_FORM_URL,
  },
  {
    key: 'vinted.urls.authEntry',
    group: 'paths',
    kind: 'paths',
    description: 'Vinted authentication entry URL.',
    value: VINTED_AUTH_ENTRY_URL,
  },
  {
    key: 'vinted.urls.baseOrigin',
    group: 'paths',
    kind: 'paths',
    description: 'Vinted marketplace origin.',
    value: VINTED_BASE_ORIGIN,
  },
  {
    key: 'vinted.patterns.itemUrl',
    group: 'patterns',
    kind: 'pattern',
    description: 'Pattern used to extract Vinted item IDs from URLs.',
    value: VINTED_ITEM_URL_PATTERN.source,
  },
];

const listVintedSelectorRegistry = (): SelectorRegistryEntry[] =>
  VINTED_SELECTOR_REGISTRY_DEFINITIONS.map((definition) => {
    const valueType = detectValueType(definition.value);
    return {
      id: `vinted:code:vinted:${definition.key}`,
      namespace: 'vinted',
      profile: SELECTOR_REGISTRY_DEFAULT_PROFILES.vinted,
      key: definition.key,
      group: definition.group,
      kind: definition.kind,
      description: definition.description,
      valueType,
      valueJson: JSON.stringify(definition.value, null, 2),
      itemCount: getItemCount(definition.value),
      preview: collectPreviewStrings(definition.value),
      source: 'code',
      createdAt: EPOCH_ISO,
      updatedAt: EPOCH_ISO,
      resolvedFromProfile: SELECTOR_REGISTRY_DEFAULT_PROFILES.vinted,
      hasOverride: false,
      readOnly: true,
    };
  });

const listNamespaceRaw = async (
  namespace: SelectorRegistryNamespace,
  profile?: string | null
): Promise<{
  entries: SelectorRegistryEntry[];
  profiles: string[];
  syncedAt: string | null;
}> => {
  if (namespace === 'tradera') {
    const response = await listTraderaSelectorRegistry(
      typeof profile === 'string' && profile.trim().length > 0 ? { profile } : undefined
    );
    const entries = response.entries.map((entry) => toNamespacedEntry(namespace, entry));
    return {
      entries,
      profiles: collectProfiles(namespace, entries),
      syncedAt: response.syncedAt,
    };
  }

  if (namespace === 'amazon') {
    const response = await listAmazonSelectorRegistry({ profile });
    const entries = response.entries.map((entry) => toNamespacedEntry(namespace, entry));
    return {
      entries,
      profiles: collectProfiles(namespace, entries, response.profiles),
      syncedAt: response.syncedAt,
    };
  }

  if (namespace === '1688') {
    const response = await listSupplier1688SelectorRegistry({ profile });
    const entries = response.entries.map((entry) => toNamespacedEntry(namespace, entry));
    return {
      entries,
      profiles: collectProfiles(namespace, entries, [normalizeProfile(namespace, profile)]),
      syncedAt: response.syncedAt,
    };
  }

  const entries = listVintedSelectorRegistry();
  return {
    entries,
    profiles: collectProfiles(namespace, entries),
    syncedAt: EPOCH_ISO,
  };
};

const buildEffectiveEntries = async (
  namespace: SelectorRegistryNamespace,
  profile: string
): Promise<{
  entries: SelectorRegistryEntry[];
  profiles: string[];
  syncedAt: string | null;
}> => {
  const defaultProfile = SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace];

  if (namespace === 'vinted') {
    const entries = listVintedSelectorRegistry();
    return {
      entries,
      profiles: collectProfiles(namespace, entries),
      syncedAt: EPOCH_ISO,
    };
  }

  if (namespace === 'tradera') {
    const raw = await listNamespaceRaw(namespace);
    const defaultEntriesByKey = new Map(
      raw.entries
        .filter((entry) => entry.profile === defaultProfile)
        .map((entry) => [entry.key, entry])
    );
    const profileEntriesByKey =
      profile === defaultProfile
        ? defaultEntriesByKey
        : new Map(
            raw.entries
              .filter((entry) => entry.profile === profile)
              .map((entry) => [entry.key, entry])
          );

    const entries = Array.from(new Set([...defaultEntriesByKey.keys(), ...profileEntriesByKey.keys()]))
      .sort()
      .flatMap((key): SelectorRegistryEntry[] => {
        const profileEntry = profile === defaultProfile ? defaultEntriesByKey.get(key) : profileEntriesByKey.get(key);
        const defaultEntry = defaultEntriesByKey.get(key);
        const effectiveEntry = profileEntry ?? defaultEntry;
        if (!effectiveEntry) return [];
        const resolvedFromProfile =
          profile === defaultProfile || profileEntry ? profile : defaultProfile;
        return [
          {
            ...effectiveEntry,
            id: `${namespace}:effective:${profile}:${effectiveEntry.key}`,
            profile,
            resolvedFromProfile,
            hasOverride: profile !== defaultProfile && profileEntry !== undefined,
          },
        ];
      })
      .sort((left, right) => {
        const groupCompare = left.group.localeCompare(right.group);
        return groupCompare !== 0 ? groupCompare : left.key.localeCompare(right.key);
      });

    return {
      entries,
      profiles: raw.profiles,
      syncedAt: raw.syncedAt,
    };
  }

  const [defaultRaw, profileRaw] = await Promise.all([
    listNamespaceRaw(namespace, defaultProfile),
    profile === defaultProfile
      ? Promise.resolve(null)
      : listNamespaceRaw(namespace, profile),
  ]);
  const profileEntries = profileRaw?.entries ?? defaultRaw.entries;
  const defaultEntriesByKey = new Map(defaultRaw.entries.map((entry) => [entry.key, entry]));
  const storedProfileEntriesByKey = new Map(
    profileEntries
      .filter((entry) => entry.profile === profile && !isCodeFallbackEntry(entry))
      .map((entry) => [entry.key, entry])
  );

  const entries = Array.from(new Set([...defaultEntriesByKey.keys(), ...profileEntries.map((entry) => entry.key)]))
    .sort()
    .flatMap((key): SelectorRegistryEntry[] => {
      const profileEntry =
        profile === defaultProfile ? defaultEntriesByKey.get(key) : storedProfileEntriesByKey.get(key);
      const defaultEntry = defaultEntriesByKey.get(key);
      const fallbackEntry = profileEntries.find((entry) => entry.key === key);
      const effectiveEntry = profileEntry ?? defaultEntry ?? fallbackEntry;
      if (!effectiveEntry) return [];
      const resolvedFromProfile =
        profile === defaultProfile || profileEntry ? profile : defaultProfile;
      return [
        {
          ...effectiveEntry,
          id: `${namespace}:effective:${profile}:${effectiveEntry.key}`,
          profile,
          resolvedFromProfile,
          hasOverride: profile !== defaultProfile && profileEntry !== undefined,
        },
      ];
    })
    .sort((left, right) => {
      const groupCompare = left.group.localeCompare(right.group);
      return groupCompare !== 0 ? groupCompare : left.key.localeCompare(right.key);
    });

  return {
    entries,
    profiles: collectProfiles(namespace, entries, [
      ...defaultRaw.profiles,
      ...(profileRaw?.profiles ?? []),
      profile,
    ]),
    syncedAt: latestSyncedAt(entries),
  };
};

export async function listSelectorRegistry(options?: {
  namespace?: SelectorRegistryNamespace | null;
  profile?: string | null;
  effective?: boolean;
}): Promise<SelectorRegistryListResponse> {
  const namespace = options?.namespace ?? null;

  if (namespace === null) {
    const namespaceResponses = await Promise.all(
      SELECTOR_REGISTRY_NAMESPACES.map(async (entryNamespace) => {
        const profile = normalizeProfile(entryNamespace, null);
        return buildEffectiveEntries(entryNamespace, profile);
      })
    );
    const entries = namespaceResponses.flatMap((response) => response.entries);
    return {
      entries,
      namespaces: SELECTOR_REGISTRY_NAMESPACES,
      profiles: [],
      namespace: null,
      profile: null,
      defaultProfile: null,
      total: entries.length,
      syncedAt: latestSyncedAt(entries),
    };
  }

  const requestedProfile = options?.profile;
  const effective = options?.effective ?? true;
  const profile = normalizeProfile(namespace, requestedProfile);
  const result =
    effective === false
      ? await listNamespaceRaw(namespace, requestedProfile)
      : await buildEffectiveEntries(namespace, profile);

  return {
    entries: result.entries,
    namespaces: SELECTOR_REGISTRY_NAMESPACES,
    profiles: result.profiles,
    namespace,
    profile,
    defaultProfile: SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace],
    total: result.entries.length,
    syncedAt: result.syncedAt,
  };
}

const assertWritableNamespace = (namespace: SelectorRegistryNamespace): void => {
  if (namespace === 'vinted') {
    throw new Error('The Vinted selector registry is currently read-only code seed data.');
  }
};

const assertNonDefaultProfile = (
  namespace: SelectorRegistryNamespace,
  profile: string,
  action: string
): void => {
  if (profile === SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace]) {
    throw new Error(`${action} is not supported for the default ${namespace} selector profile.`);
  }
};

export async function syncSelectorRegistryFromCode(input: {
  namespace: SelectorRegistryNamespace;
  profile?: string | null;
}): Promise<SelectorRegistrySyncResponse> {
  assertWritableNamespace(input.namespace);

  if (input.namespace === 'tradera') {
    const response = await syncTraderaSelectorRegistryFromCode({ profile: input.profile });
    return { namespace: input.namespace, ...response };
  }
  if (input.namespace === 'amazon') {
    const response = await syncAmazonSelectorRegistryFromCode({ profile: input.profile });
    return { namespace: input.namespace, ...response };
  }
  const response = await syncSupplier1688SelectorRegistryFromCode({ profile: input.profile });
  return { namespace: input.namespace, ...response };
}

export async function saveSelectorRegistryEntry(input: {
  namespace: SelectorRegistryNamespace;
  profile: string;
  key: string;
  valueJson: string;
}): Promise<SelectorRegistrySaveResponse> {
  assertWritableNamespace(input.namespace);

  if (input.namespace === 'tradera') {
    const response = await saveTraderaSelectorRegistryEntry(input);
    return { namespace: input.namespace, ...response };
  }
  if (input.namespace === 'amazon') {
    const response = await saveAmazonSelectorRegistryEntry(input);
    return { namespace: input.namespace, ...response };
  }
  const response = await saveSupplier1688SelectorRegistryEntry(input);
  return { namespace: input.namespace, ...response };
}

export async function deleteSelectorRegistryEntry(input: {
  namespace: SelectorRegistryNamespace;
  profile: string;
  key: string;
}): Promise<SelectorRegistryDeleteResponse> {
  assertWritableNamespace(input.namespace);
  const profile = normalizeProfile(input.namespace, input.profile);
  assertNonDefaultProfile(input.namespace, profile, 'Deleting selector overrides');

  if (input.namespace === 'tradera') {
    const response = await deleteTraderaSelectorRegistryEntry({ ...input, profile });
    return { namespace: input.namespace, ...response };
  }
  if (input.namespace === 'amazon') {
    const response = await deleteAmazonSelectorRegistryEntry({ ...input, profile });
    return { namespace: input.namespace, ...response };
  }
  const response = await deleteSupplier1688SelectorRegistryEntry({ ...input, profile });
  return { namespace: input.namespace, ...response };
}

export async function mutateSelectorRegistryProfile(input:
  | {
      action: 'clone_profile';
      namespace: SelectorRegistryNamespace;
      sourceProfile: string;
      targetProfile: string;
    }
  | {
      action: 'rename_profile';
      namespace: SelectorRegistryNamespace;
      profile: string;
      targetProfile: string;
    }
  | {
      action: 'delete_profile';
      namespace: SelectorRegistryNamespace;
      profile: string;
    }
): Promise<SelectorRegistryProfileActionResponse> {
  assertWritableNamespace(input.namespace);

  if (input.action === 'clone_profile') {
    const sourceProfile = normalizeProfile(input.namespace, input.sourceProfile);
    const targetProfile = normalizeProfile(input.namespace, input.targetProfile);
    assertNonDefaultProfile(input.namespace, targetProfile, 'Cloning');
    if (sourceProfile === targetProfile) {
      throw new Error('The target profile must be different from the source profile.');
    }

    if (input.namespace === 'tradera') {
      const response = await cloneTraderaSelectorRegistryProfile({ sourceProfile, targetProfile });
      return { namespace: input.namespace, ...response };
    }
    if (input.namespace === 'amazon') {
      const response = await cloneAmazonSelectorRegistryProfile({ sourceProfile, targetProfile });
      return { namespace: input.namespace, ...response };
    }
    const response = await cloneSupplier1688SelectorRegistryProfile({ sourceProfile, targetProfile });
    return { namespace: input.namespace, ...response };
  }

  if (input.action === 'rename_profile') {
    const profile = normalizeProfile(input.namespace, input.profile);
    const targetProfile = normalizeProfile(input.namespace, input.targetProfile);
    assertNonDefaultProfile(input.namespace, profile, 'Renaming');
    assertNonDefaultProfile(input.namespace, targetProfile, 'Renaming');
    if (profile === targetProfile) {
      throw new Error('The target profile name must be different.');
    }

    if (input.namespace === 'tradera') {
      const response = await renameTraderaSelectorRegistryProfile({ profile, targetProfile });
      return { namespace: input.namespace, ...response };
    }
    if (input.namespace === 'amazon') {
      const response = await renameAmazonSelectorRegistryProfile({ profile, targetProfile });
      return { namespace: input.namespace, ...response };
    }
    const response = await renameSupplier1688SelectorRegistryProfile({ profile, targetProfile });
    return { namespace: input.namespace, ...response };
  }

  const profile = normalizeProfile(input.namespace, input.profile);
  assertNonDefaultProfile(input.namespace, profile, 'Deleting');
  if (input.namespace === 'tradera') {
    const response = await deleteTraderaSelectorRegistryProfile({ profile });
    return { namespace: input.namespace, ...response };
  }
  if (input.namespace === 'amazon') {
    const response = await deleteAmazonSelectorRegistryProfile({ profile });
    return { namespace: input.namespace, ...response };
  }
  const response = await deleteSupplier1688SelectorRegistryProfile({ profile });
  return { namespace: input.namespace, ...response };
}

const getRuntimeEntries = async (
  namespace: Exclude<SelectorRegistryNamespace, 'vinted'>,
  profile: string
): Promise<{
  entries: SelectorRegistryEntry[];
  requestedProfile: string;
  resolvedProfile: string;
  sourceProfiles: string[];
  overlayEntryCount: number;
}> => {
  const response = await listSelectorRegistry({
    namespace,
    profile,
    effective: true,
  });
  const defaultProfile = SELECTOR_REGISTRY_DEFAULT_PROFILES[namespace];
  const overlayEntryCount = response.entries.filter((entry) => entry.hasOverride === true).length;
  const resolvedProfile = overlayEntryCount > 0 || profile === defaultProfile ? profile : defaultProfile;
  return {
    entries: response.entries,
    requestedProfile: profile,
    resolvedProfile,
    sourceProfiles: resolvedProfile === defaultProfile ? [defaultProfile] : [defaultProfile, resolvedProfile],
    overlayEntryCount,
  };
};

export async function resolveSelectorRegistryRuntime(input: {
  namespace: Exclude<SelectorRegistryNamespace, 'vinted'>;
  profile?: string | null;
}): Promise<ResolvedSelectorRegistryRuntime> {
  const requestedProfile = normalizeProfile(input.namespace, input.profile);

  try {
    const resolution = await getRuntimeEntries(input.namespace, requestedProfile);
    if (input.namespace === 'tradera') {
      const entries: TraderaSelectorRegistryRuntimeEntry[] = resolution.entries.map((entry) => ({
        key: entry.key,
        valueJson: entry.valueJson,
      }));
      return {
        namespace: input.namespace,
        runtime: generateTraderaSelectorRegistryRuntimeFromEntries(entries),
        requestedProfile,
        resolvedProfile: resolution.resolvedProfile,
        sourceProfiles: resolution.sourceProfiles,
        entryCount: entries.length,
        overlayEntryCount: resolution.overlayEntryCount,
        fallbackToCode: false,
      };
    }

    if (input.namespace === 'amazon') {
      const entries: AmazonSelectorRegistryRuntimeEntry[] = resolution.entries.map((entry) => ({
        key: entry.key,
        valueJson: entry.valueJson,
      }));
      const selectorRuntime = resolveAmazonSelectorRuntimeFromEntries(entries);
      return {
        namespace: input.namespace,
        selectorRuntime,
        runtime: generateAmazonSelectorRegistryRuntimeFromRuntime(selectorRuntime),
        requestedProfile,
        resolvedProfile: resolution.resolvedProfile,
        sourceProfiles: resolution.sourceProfiles,
        entryCount: entries.length,
        overlayEntryCount: resolution.overlayEntryCount,
        fallbackToCode: false,
      };
    }

    const entries: Supplier1688SelectorRegistryRuntimeEntry[] = resolution.entries.map((entry) => ({
      key: entry.key,
      valueJson: entry.valueJson,
    }));
    return {
      namespace: input.namespace,
      selectorRuntime: resolveSupplier1688SelectorRuntimeFromEntries(entries),
      runtime: null,
      requestedProfile,
      resolvedProfile: resolution.resolvedProfile,
      sourceProfiles: resolution.sourceProfiles,
      entryCount: entries.length,
      overlayEntryCount: resolution.overlayEntryCount,
      fallbackToCode: false,
    };
  } catch (error) {
    if (input.namespace === 'tradera') {
      return {
        namespace: input.namespace,
        runtime: TRADERA_SELECTOR_REGISTRY_RUNTIME,
        requestedProfile,
        resolvedProfile: SELECTOR_REGISTRY_DEFAULT_PROFILES.tradera,
        sourceProfiles: ['code'],
        entryCount: 0,
        overlayEntryCount: 0,
        fallbackToCode: true,
        fallbackReason: error instanceof Error ? error.message : 'Unknown selector runtime error.',
      };
    }
    if (input.namespace === 'amazon') {
      return {
        namespace: input.namespace,
        selectorRuntime: AMAZON_DEFAULT_SELECTOR_RUNTIME,
        runtime: generateAmazonSelectorRegistryRuntimeFromRuntime(AMAZON_DEFAULT_SELECTOR_RUNTIME),
        requestedProfile,
        resolvedProfile: SELECTOR_REGISTRY_DEFAULT_PROFILES.amazon,
        sourceProfiles: ['code'],
        entryCount: 0,
        overlayEntryCount: 0,
        fallbackToCode: true,
        fallbackReason: error instanceof Error ? error.message : 'Unknown selector runtime error.',
      };
    }
    return {
      namespace: input.namespace,
      selectorRuntime: SUPPLIER_1688_DEFAULT_SELECTOR_RUNTIME,
      runtime: null,
      requestedProfile,
      resolvedProfile: SELECTOR_REGISTRY_DEFAULT_PROFILES['1688'],
      sourceProfiles: ['code'],
      entryCount: 0,
      overlayEntryCount: 0,
      fallbackToCode: true,
      fallbackReason: error instanceof Error ? error.message : 'Unknown selector runtime error.',
    };
  }
}

export const isSelectorRegistrySelectorKind = (kind: SelectorRegistryKind): boolean =>
  kind === 'selector' || kind === 'selectors';
