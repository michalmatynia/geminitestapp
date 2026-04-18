/* eslint-disable complexity, max-lines, max-lines-per-function */
import 'server-only';

import {
  resolveBrainExecutionConfigForCapability,
} from '@/shared/lib/ai-brain/segments/api';
import {
  isBrainModelVisionCapable,
  runBrainChatCompletion,
} from '@/shared/lib/ai-brain/server-runtime-client';
import {
  readPlaywrightEngineArtifact,
  runPlaywrightEngineTask,
} from '@/features/playwright/server';

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
  cloneCustomSelectorRegistryProfile,
  deleteCustomSelectorRegistryEntry,
  deleteCustomSelectorRegistryProfile,
  listCustomSelectorRegistry,
  renameCustomSelectorRegistryProfile,
  saveCustomSelectorRegistryEntry,
  syncCustomSelectorRegistryFromCode,
} from '@/features/integrations/services/custom-selector-registry';
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
  listSelectorRegistryProbeSessionClusters,
  listSelectorRegistryProbeSessions,
} from '@/features/integrations/services/selector-registry-probe-sessions';
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
  SelectorRegistryClassifySuggestionItem,
  SelectorRegistryClassifySuggestionsResponse,
  SelectorRegistryDeleteResponse,
  SelectorRegistryEntry,
  SelectorRegistryKind,
  SelectorRegistryListResponse,
  SelectorRegistryNamespace,
  SelectorRegistryProfileActionResponse,
  SelectorRegistryProbeResponse,
  SelectorRegistryRole,
  SelectorRegistrySaveResponse,
  SelectorRegistrySyncResponse,
  SelectorRegistryValueType,
} from '@/shared/contracts/integrations/selector-registry';
import { selectorRegistryRoleSchema } from '@/shared/contracts/integrations/selector-registry';
import {
  SELECTOR_REGISTRY_DEFAULT_PROFILES,
  SELECTOR_REGISTRY_NAMESPACES,
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import { inferSelectorRegistryRole } from '@/shared/lib/browser-execution/selector-registry-roles';
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
  role: SelectorRegistryEntry['role'];
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
  role: entry.role,
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
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.auth.loginSuccess',
      kind: 'selector',
      group: 'auth',
    }),
    description: 'Signals that a Vinted seller session is authenticated.',
    value: [...VINTED_LOGIN_SUCCESS_SELECTORS],
  },
  {
    key: 'vinted.auth.loginForm',
    group: 'auth',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.auth.loginForm',
      kind: 'selector',
      group: 'auth',
    }),
    description: 'Form root used to detect the Vinted login surface.',
    value: VINTED_LOGIN_FORM_SELECTOR,
  },
  {
    key: 'vinted.auth.usernameInputs',
    group: 'auth',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.auth.usernameInputs',
      kind: 'selector',
      group: 'auth',
    }),
    description: 'Username/email input candidates.',
    value: [...VINTED_USERNAME_SELECTORS],
  },
  {
    key: 'vinted.auth.passwordInputs',
    group: 'auth',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.auth.passwordInputs',
      kind: 'selector',
      group: 'auth',
    }),
    description: 'Password input candidates.',
    value: [...VINTED_PASSWORD_SELECTORS],
  },
  {
    key: 'vinted.auth.cookieAccept',
    group: 'auth',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.auth.cookieAccept',
      kind: 'selector',
      group: 'auth',
    }),
    description: 'Cookie consent buttons.',
    value: [...VINTED_COOKIE_ACCEPT_SELECTORS],
  },
  {
    key: 'vinted.listing.title',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.listing.title',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Title field candidates.',
    value: [...VINTED_TITLE_SELECTORS],
  },
  {
    key: 'vinted.listing.description',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.listing.description',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Description field candidates.',
    value: [...VINTED_DESCRIPTION_SELECTORS],
  },
  {
    key: 'vinted.listing.price',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.listing.price',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Price field candidates.',
    value: [...VINTED_PRICE_SELECTORS],
  },
  {
    key: 'vinted.listing.images',
    group: 'images',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.listing.images',
      kind: 'selector',
      group: 'images',
    }),
    description: 'Image upload inputs.',
    value: [...VINTED_IMAGE_UPLOAD_SELECTORS],
  },
  {
    key: 'vinted.category.triggers',
    group: 'taxonomy',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.category.triggers',
      kind: 'selector',
      group: 'taxonomy',
    }),
    description: 'Category selector controls.',
    value: [...VINTED_CATEGORY_SELECTORS],
  },
  {
    key: 'vinted.category.options',
    group: 'taxonomy',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.category.options',
      kind: 'selector',
      group: 'taxonomy',
    }),
    description: 'Category option candidates.',
    value: [...VINTED_CATEGORY_OPTION_SELECTORS],
  },
  {
    key: 'vinted.brand.inputs',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.brand.inputs',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Brand input candidates.',
    value: [...VINTED_BRAND_INPUT_SELECTORS],
  },
  {
    key: 'vinted.brand.selectors',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.brand.selectors',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Brand selector controls.',
    value: [...VINTED_BRAND_SELECTORS],
  },
  {
    key: 'vinted.brand.autocompleteOptions',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.brand.autocompleteOptions',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Brand autocomplete option candidates.',
    value: [...VINTED_BRAND_AUTOCOMPLETE_OPTION_SELECTORS],
  },
  {
    key: 'vinted.size.selectors',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.size.selectors',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Size selector controls.',
    value: [...VINTED_SIZE_SELECTORS],
  },
  {
    key: 'vinted.condition.selectors',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.condition.selectors',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Condition selector controls.',
    value: [...VINTED_CONDITION_SELECTORS],
  },
  {
    key: 'vinted.dropdown.options',
    group: 'listing_form',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.dropdown.options',
      kind: 'selector',
      group: 'listing_form',
    }),
    description: 'Shared dropdown option candidates.',
    value: [...VINTED_DROPDOWN_OPTION_SELECTORS],
  },
  {
    key: 'vinted.submit.create',
    group: 'publish',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.submit.create',
      kind: 'selector',
      group: 'publish',
    }),
    description: 'Create-listing submit buttons.',
    value: [...VINTED_SUBMIT_SELECTORS],
  },
  {
    key: 'vinted.submit.update',
    group: 'publish',
    kind: 'selector',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.submit.update',
      kind: 'selector',
      group: 'publish',
    }),
    description: 'Update-listing submit buttons.',
    value: [...VINTED_UPDATE_SUBMIT_SELECTORS],
  },
  {
    key: 'vinted.urls.listingForm',
    group: 'paths',
    kind: 'paths',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.urls.listingForm',
      kind: 'paths',
      group: 'paths',
    }),
    description: 'Vinted listing form URL.',
    value: VINTED_LISTING_FORM_URL,
  },
  {
    key: 'vinted.urls.authEntry',
    group: 'paths',
    kind: 'paths',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.urls.authEntry',
      kind: 'paths',
      group: 'paths',
    }),
    description: 'Vinted authentication entry URL.',
    value: VINTED_AUTH_ENTRY_URL,
  },
  {
    key: 'vinted.urls.baseOrigin',
    group: 'paths',
    kind: 'paths',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.urls.baseOrigin',
      kind: 'paths',
      group: 'paths',
    }),
    description: 'Vinted marketplace origin.',
    value: VINTED_BASE_ORIGIN,
  },
  {
    key: 'vinted.patterns.itemUrl',
    group: 'patterns',
    kind: 'pattern',
    role: inferSelectorRegistryRole({
      namespace: 'vinted',
      key: 'vinted.patterns.itemUrl',
      kind: 'pattern',
      group: 'patterns',
    }),
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
      role: definition.role,
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

  if (namespace === 'custom') {
    const response = await listCustomSelectorRegistry({ profile });
    return {
      entries: response.entries,
      profiles: collectProfiles(namespace, response.entries, response.profiles),
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
  includeArchived?: boolean;
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
      probeSessions: [],
      probeSessionClusters: [],
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
  const includeArchived = options?.includeArchived ?? false;
  const profile = normalizeProfile(namespace, requestedProfile);
  const result =
    effective === false
      ? await listNamespaceRaw(namespace, requestedProfile)
      : await buildEffectiveEntries(namespace, profile);
  const [probeSessions, probeSessionClusters] = await Promise.all([
    listSelectorRegistryProbeSessions({
      namespace,
      profile,
      includeArchived,
    }).catch(() => []),
    listSelectorRegistryProbeSessionClusters({
      namespace,
      profile,
      includeArchived,
    }).catch(() => []),
  ]);

  return {
    entries: result.entries,
    probeSessions,
    probeSessionClusters,
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
  if (input.namespace === 'custom') {
    const response = await syncCustomSelectorRegistryFromCode({ profile: input.profile });
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
  role?: SelectorRegistryRole;
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
  if (input.namespace === 'custom') {
    const response = await saveCustomSelectorRegistryEntry(input);
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
  if (input.namespace === 'custom') {
    const response = await deleteCustomSelectorRegistryEntry({ ...input, profile });
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
  | {
      action: 'classify_role';
      namespace: SelectorRegistryNamespace;
      profile: string;
      key: string;
    }
): Promise<SelectorRegistryProfileActionResponse> {
  if (input.action === 'classify_role') {
    return classifySelectorRegistryRole({ namespace: input.namespace, profile: input.profile, key: input.key });
  }

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
    if (input.namespace === 'custom') {
      const response = await cloneCustomSelectorRegistryProfile({ sourceProfile, targetProfile });
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
    if (input.namespace === 'custom') {
      const response = await renameCustomSelectorRegistryProfile({ profile, targetProfile });
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
  if (input.namespace === 'custom') {
    const response = await deleteCustomSelectorRegistryProfile({ profile });
    return { namespace: input.namespace, ...response };
  }
  const response = await deleteSupplier1688SelectorRegistryProfile({ profile });
  return { namespace: input.namespace, ...response };
}

const getRuntimeEntries = async (
  namespace: Exclude<SelectorRegistryNamespace, 'vinted' | 'custom'>,
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
  namespace: Exclude<SelectorRegistryNamespace, 'vinted' | 'custom'>;
  profile?: string | null;
}): Promise<ResolvedSelectorRegistryRuntime> {
  const requestedProfile = normalizeProfile(input.namespace, input.profile);

  try {
    const resolution = await getRuntimeEntries(input.namespace, requestedProfile);
    if (input.namespace === 'tradera') {
      const entries: TraderaSelectorRegistryRuntimeEntry[] = resolution.entries.map((entry) => ({
        key: entry.key,
        role: entry.role,
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

const ROLE_CLASSIFICATION_SYSTEM_PROMPT = `You are a browser automation expert. Given a selector registry entry, classify its role.

Available roles and when to use them:
- generic: Default/unspecified role, no clear semantic meaning
- input: Text input fields for data entry
- upload_input: File upload inputs
- trigger: Buttons or clickable elements that trigger an action
- option: Dropdown options or selectable items
- submit: Form submission buttons
- ready_signal: Selectors that indicate the page/process is ready or succeeded
- result_hint: Individual search result items or links
- result_shell: Container wrapping search results
- candidate_hint: Candidate matches in a search or comparison flow
- overlay_accept: Accept/agree buttons on overlays (cookie consent, popups)
- overlay_dismiss: Close/reject buttons on overlays
- navigation: Navigation elements (menus, links, breadcrumbs)
- content: General product or page content
- content_title: Product title content
- content_price: Product price content
- content_description: Product description content
- content_image: Product image content
- feedback: Status/feedback messages (errors, validation, pending, saving)
- barrier: Access barriers like captcha, login gates, verification prompts
- barrier_title: Title text of an access barrier
- text_hint: General text hints used for pattern matching
- negative_text_hint: Text hints indicating rejection or negative states
- pattern: Regex or string patterns for matching
- path: URL paths or navigation paths
- label: Display labels

Respond with ONLY the role identifier (e.g. "input", "trigger", "content_title"). No explanation.`;

const parseAiRoleResponse = (text: string): SelectorRegistryRole => {
  const trimmed = text.trim().toLowerCase().replace(/[^a-z_]/g, '');
  const parsed = selectorRegistryRoleSchema.safeParse(trimmed);
  return parsed.success ? parsed.data : 'generic';
};

const NAMESPACE_PROBE_URLS: Record<SelectorRegistryNamespace, string> = {
  tradera: 'https://www.tradera.com',
  amazon: 'https://www.amazon.com',
  '1688': 'https://www.1688.com',
  custom: 'https://example.com',
  vinted: 'https://www.vinted.com',
};

export async function probeSelectorRegistryEntry(input: {
  namespace: SelectorRegistryNamespace;
  profile: string;
  key: string;
  probeUrl?: string;
}): Promise<SelectorRegistryProbeResponse> {
  const profile = normalizeProfile(input.namespace, input.profile);

  const listResponse = await listSelectorRegistry({ namespace: input.namespace, profile, effective: true });
  const entry = listResponse.entries.find((e) => e.key === input.key.trim());
  if (!entry) {
    throw new Error(`Selector registry entry "${input.key}" not found in namespace "${input.namespace}" profile "${profile}".`);
  }

  const probeUrl = input.probeUrl ?? NAMESPACE_PROBE_URLS[input.namespace];

  let selectors: string[] = [];
  try {
    const parsed: unknown = JSON.parse(entry.valueJson);
    if (typeof parsed === 'string') selectors = [parsed];
    else if (Array.isArray(parsed)) selectors = parsed.filter((s): s is string => typeof s === 'string').slice(0, 5);
  } catch {
    selectors = entry.preview.slice(0, 5);
  }

  const selectorsJson = JSON.stringify(selectors);

  const probeScript = `
await page.waitForLoadState('domcontentloaded', { timeout: 12000 }).catch(() => null);
const selectorsToTest = ${selectorsJson};
let matchCount = 0;
let domSnippet = null;
let matchedSelector = null;
for (const selector of selectorsToTest) {
  try {
    const elements = await page.$$(selector);
    if (elements.length > 0) {
      matchCount = elements.length;
      matchedSelector = selector;
      try {
        domSnippet = await elements[0].evaluate(function(el) { return el.outerHTML.substring(0, 1000); });
      } catch (_e) {}
      break;
    }
  } catch (_e) {}
}
return { matchCount, domSnippet, matchedSelector };
`.trim();

  const runRecord = await runPlaywrightEngineTask({
    request: {
      script: probeScript,
      startUrl: probeUrl,
      capture: { screenshot: true },
      timeoutMs: 45000,
    },
    instance: {
      kind: 'custom',
      family: 'custom',
      label: `selector-registry-probe:${input.namespace}:${entry.key}`,
    },
  });

  let screenshotBase64: string | null = null;
  const screenshotArtifact = runRecord.artifacts.find(
    (a) => a.mimeType === 'image/png' || a.name.endsWith('.png') || a.kind === 'screenshot'
  );
  if (screenshotArtifact) {
    const artifactResult = await readPlaywrightEngineArtifact({
      runId: runRecord.runId,
      fileName: screenshotArtifact.name,
    }).catch(() => null);
    if (artifactResult) {
      screenshotBase64 = artifactResult.content.toString('base64');
    }
  }

  const probeResult = runRecord.result as { matchCount?: number; domSnippet?: string | null; matchedSelector?: string | null } | null;
  const resolvedMatchCount = probeResult?.matchCount ?? 0;
  const resolvedDomSnippet = probeResult?.domSnippet ?? null;
  const resolvedMatchedSelector = probeResult?.matchedSelector ?? null;

  return {
    namespace: input.namespace,
    profile,
    key: entry.key,
    probeUrl,
    matchCount: resolvedMatchCount,
    screenshotBase64,
    domSnippet: resolvedDomSnippet,
    matchedSelector: resolvedMatchedSelector,
    probedAt: new Date().toISOString(),
    message: `Probed "${entry.key}" on ${probeUrl} — ${resolvedMatchCount} match(es) found.`,
  };
}

export async function classifySelectorRegistryRole(input: {
  namespace: SelectorRegistryNamespace;
  profile: string;
  key: string;
}): Promise<SelectorRegistryProfileActionResponse> {
  assertWritableNamespace(input.namespace);

  const profile = normalizeProfile(input.namespace, input.profile);

  const listResponse = await listSelectorRegistry({ namespace: input.namespace, profile, effective: true });
  const entry = listResponse.entries.find((e) => e.key === input.key.trim());
  if (!entry) {
    throw new Error(`Selector registry entry "${input.key}" not found in namespace "${input.namespace}" profile "${profile}".`);
  }

  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'selector_registry.role_classification',
    { defaultTemperature: 0, defaultMaxTokens: 50 }
  );

  const isVisionCapable = isBrainModelVisionCapable(brainConfig.modelId);

  const probeData = await probeSelectorRegistryEntry({
    namespace: input.namespace,
    profile,
    key: entry.key,
  }).catch(() => null);

  const textContext = [
    `Namespace: ${entry.namespace}`,
    `Key: ${entry.key}`,
    `Group: ${entry.group}`,
    `Kind: ${entry.kind}`,
    `Description: ${entry.description ?? 'none'}`,
    `Sample values: ${entry.preview.slice(0, 3).join(', ') || 'none'}`,
    ...(probeData?.matchCount !== undefined
      ? [`DOM matches found: ${probeData.matchCount}${probeData.matchedSelector ? ` (selector: ${probeData.matchedSelector})` : ''}`]
      : []),
    ...(probeData?.domSnippet ? [`DOM snippet of first match:\n${probeData.domSnippet}`] : []),
  ].join('\n');

  type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

  const userContent: string | ContentPart[] =
    isVisionCapable && probeData?.screenshotBase64
      ? [
          { type: 'image_url', image_url: { url: `data:image/png;base64,${probeData.screenshotBase64}` } },
          { type: 'text', text: textContext },
        ]
      : textContext;

  const { text } = await runBrainChatCompletion({
    modelId: brainConfig.modelId,
    temperature: brainConfig.temperature,
    maxTokens: brainConfig.maxTokens,
    messages: [
      { role: 'system', content: ROLE_CLASSIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  });

  const classifiedRole = parseAiRoleResponse(text);

  await saveSelectorRegistryEntry({
    namespace: input.namespace,
    profile,
    key: entry.key,
    valueJson: entry.valueJson,
    role: classifiedRole,
  });

  return {
    namespace: input.namespace,
    action: 'classify_role',
    profile,
    key: entry.key,
    role: classifiedRole,
    affectedEntries: 1,
    message: [
      `Selector "${entry.key}" classified as role "${classifiedRole}" by AI (${brainConfig.modelId})`,
      isVisionCapable && probeData?.screenshotBase64 ? 'with visual context' : null,
      probeData?.matchCount !== undefined ? `— ${probeData.matchCount} DOM match(es)` : null,
    ].filter(Boolean).join(' ') + '.',
  };
}

const SUGGESTION_BATCH_SIZE = 10;

const SUGGESTION_CLASSIFICATION_SYSTEM_PROMPT = `You are a browser automation expert classifying DOM elements for selector-registry roles.
For each numbered element, respond with ONLY the role identifier on its own line, in the same order. No extra text.

Available roles:
generic, input, upload_input, trigger, option, submit, ready_signal, result_hint, result_shell,
candidate_hint, overlay_accept, overlay_dismiss, navigation, content, content_title, content_price,
content_description, content_image, feedback, barrier, barrier_title, text_hint, negative_text_hint,
pattern, path, label`;

const formatSuggestionForPrompt = (
  index: number,
  suggestion: SelectorRegistryClassifySuggestionItem
): string => {
  const parts: string[] = [`Element ${index + 1}:`];
  parts.push(`  tag: ${suggestion.tag}`);
  if (suggestion.id) parts.push(`  id: ${suggestion.id}`);
  if (suggestion.classes.length > 0) parts.push(`  classes: ${suggestion.classes.slice(0, 5).join(' ')}`);
  if (suggestion.role) parts.push(`  role attr: ${suggestion.role}`);
  if (suggestion.textPreview) parts.push(`  text: ${suggestion.textPreview.slice(0, 80)}`);
  const selector = suggestion.candidates.css ?? suggestion.candidates.xpath;
  if (selector) parts.push(`  selector: ${selector.slice(0, 120)}`);
  const relevantAttrs = Object.entries(suggestion.attrs)
    .filter(([key]) => ['type', 'name', 'placeholder', 'aria-label', 'data-testid'].includes(key))
    .slice(0, 4)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');
  if (relevantAttrs) parts.push(`  attrs: ${relevantAttrs}`);
  return parts.join('\n');
};

const parseBatchRoleResponse = (
  text: string,
  batchSize: number
): SelectorRegistryRole[] => {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/^\d+[.):\-\s]*/, '').trim().toLowerCase().replace(/[^a-z_]/g, ''))
    .filter((line) => line.length > 0);

  const roles: SelectorRegistryRole[] = [];
  for (let i = 0; i < batchSize; i++) {
    const raw = lines[i] ?? '';
    const parsed = selectorRegistryRoleSchema.safeParse(raw);
    roles.push(parsed.success ? parsed.data : 'generic');
  }
  return roles;
};

export async function classifyProbeSuggestions(input: {
  namespace: SelectorRegistryNamespace;
  suggestions: SelectorRegistryClassifySuggestionItem[];
}): Promise<SelectorRegistryClassifySuggestionsResponse> {
  if (input.suggestions.length === 0) {
    return {
      namespace: input.namespace,
      results: [],
      classifiedCount: 0,
      modelId: 'none',
      message: 'No suggestions to classify.',
    };
  }

  const brainConfig = await resolveBrainExecutionConfigForCapability(
    'selector_registry.role_classification',
    { defaultTemperature: 0, defaultMaxTokens: 200 }
  );

  const results: Array<{ suggestionId: string; classificationRole: SelectorRegistryRole }> = [];

  for (let offset = 0; offset < input.suggestions.length; offset += SUGGESTION_BATCH_SIZE) {
    const batch = input.suggestions.slice(offset, offset + SUGGESTION_BATCH_SIZE);
    const userMessage = `Namespace: ${input.namespace}\n\n${batch.map((s, i) => formatSuggestionForPrompt(i, s)).join('\n\n')}`;

    const { text } = await runBrainChatCompletion({
      modelId: brainConfig.modelId,
      temperature: brainConfig.temperature,
      maxTokens: Math.max(brainConfig.maxTokens ?? 200, batch.length * 20),
      messages: [
        { role: 'system', content: SUGGESTION_CLASSIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const roles = parseBatchRoleResponse(text, batch.length);
    for (let i = 0; i < batch.length; i++) {
      const suggestion = batch[i];
      if (suggestion) {
        results.push({
          suggestionId: suggestion.suggestionId,
          classificationRole: roles[i] ?? 'generic',
        });
      }
    }
  }

  return {
    namespace: input.namespace,
    results,
    classifiedCount: results.length,
    modelId: brainConfig.modelId,
    message: `AI classified ${results.length} probe suggestion(s) using ${brainConfig.modelId}.`,
  };
}
