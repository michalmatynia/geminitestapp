import {
  FOLDER_TREE_UI_STATE_V2_KEY_PREFIX,
  FOLDER_TREE_PROFILE_V2_KEY_PREFIX,
} from '@/shared/contracts/master-folder-tree';
import { validationError } from '@/shared/errors/app-error';
import {
  defaultFolderTreeProfilesV2,
  parseFolderTreeProfileV2Strict,
  type FolderTreeInstance,
  type FolderTreeProfileV2,
} from '@/shared/utils/folder-tree-profiles-v2';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export { FOLDER_TREE_UI_STATE_V2_KEY_PREFIX, FOLDER_TREE_PROFILE_V2_KEY_PREFIX };

export const getFolderTreeUiStateV2Key = (instance: FolderTreeInstance): string =>
  `${FOLDER_TREE_UI_STATE_V2_KEY_PREFIX}${instance}`;

export const getFolderTreeProfileV2Key = (instance: FolderTreeInstance): string =>
  `${FOLDER_TREE_PROFILE_V2_KEY_PREFIX}${instance}`;

const normalizeRuleKinds = (values: string[]): string[] =>
  Array.from(
    new Set(values.map((value: string) => value.trim().toLowerCase()).filter(Boolean))
  );

const upsertRequiredNestingRule = (
  profile: FolderTreeProfileV2,
  nextRule: NonNullable<FolderTreeProfileV2['nesting']['rules']>[number]
): FolderTreeProfileV2 => {
  const nextChildKinds = normalizeRuleKinds(nextRule.childKinds);
  const nextTargetKinds = normalizeRuleKinds(nextRule.targetKinds);

  const rules = [...profile.nesting.rules];
  const existingRuleIndex = rules.findIndex((rule) => {
    if (rule.childType !== nextRule.childType) return false;
    if (rule.targetType !== nextRule.targetType) return false;

    const ruleChildKinds = normalizeRuleKinds(rule.childKinds);
    const ruleTargetKinds = normalizeRuleKinds(rule.targetKinds);
    return (
      ruleChildKinds.length === nextChildKinds.length &&
      ruleTargetKinds.length === nextTargetKinds.length &&
      ruleChildKinds.every(
        (kind: string, index: number): boolean => kind === nextChildKinds[index]
      ) &&
      ruleTargetKinds.every(
        (kind: string, index: number): boolean => kind === nextTargetKinds[index]
      )
    );
  });

  if (existingRuleIndex >= 0) {
    rules[existingRuleIndex] = nextRule;
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

const enforceFolderTreeProfileInstanceInvariants = (
  instance: FolderTreeInstance,
  profile: FolderTreeProfileV2
): FolderTreeProfileV2 => {
  if (instance !== 'product_categories') {
    return profile;
  }

  const sanitizedBlockedTargetKinds = profile.nesting.blockedTargetKinds.filter(
    (kind: string): boolean => kind.trim().toLowerCase() !== 'category'
  );

  let nextProfile: FolderTreeProfileV2 =
    sanitizedBlockedTargetKinds.length === profile.nesting.blockedTargetKinds.length
      ? profile
      : {
          ...profile,
          nesting: {
            ...profile.nesting,
            blockedTargetKinds: sanitizedBlockedTargetKinds,
          },
        };

  nextProfile = upsertRequiredNestingRule(nextProfile, {
    childType: 'folder',
    childKinds: ['*'],
    targetType: 'folder',
    targetKinds: ['*'],
    allow: true,
  });

  nextProfile = upsertRequiredNestingRule(nextProfile, {
    childType: 'folder',
    childKinds: ['*'],
    targetType: 'root',
    targetKinds: ['root'],
    allow: true,
  });

  return nextProfile;
};

export type FolderTreeUiStateV2Entry = {
  expandedNodeIds: string[];
  panelCollapsed: boolean;
};

export const createDefaultFolderTreeUiStateV2Entry = (): FolderTreeUiStateV2Entry => ({
  expandedNodeIds: [],
  panelCollapsed: false,
});

export const parseFolderTreeUiStateV2Entry = (
  raw: string | null | undefined
): FolderTreeUiStateV2Entry => {
  if (!raw) return createDefaultFolderTreeUiStateV2Entry();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    logClientError(error);
    throw validationError('Invalid folder tree V2 UI state payload.', {
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid folder tree V2 UI state payload.', {
      reason: 'invalid_shape',
    });
  }
  const record = parsed as Record<string, unknown>;
  const keys = Object.keys(record);
  const allowedKeys = new Set(['expandedNodeIds', 'panelCollapsed']);
  if (keys.some((key: string) => !allowedKeys.has(key))) {
    throw validationError('Folder tree V2 UI state contains unsupported keys.', {
      reason: 'unsupported_keys',
      keys,
    });
  }
  const rawExpandedNodeIds = record['expandedNodeIds'];
  if (rawExpandedNodeIds !== undefined && !Array.isArray(rawExpandedNodeIds)) {
    throw validationError('Folder tree V2 expandedNodeIds must be an array.', {
      reason: 'invalid_expanded_node_ids',
    });
  }
  const expandedNodeIds = Array.isArray(rawExpandedNodeIds)
    ? Array.from(
      new Set(
        rawExpandedNodeIds
          .map((value: unknown): string => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean)
      )
    )
    : [];
  const panelCollapsed = record['panelCollapsed'];
  if (panelCollapsed !== undefined && typeof panelCollapsed !== 'boolean') {
    throw validationError('Folder tree V2 panelCollapsed must be a boolean.', {
      reason: 'invalid_panel_collapsed',
    });
  }
  return {
    expandedNodeIds,
    panelCollapsed: panelCollapsed ?? false,
  };
};

export const parseFolderTreeProfileV2Entry = (
  instance: FolderTreeInstance,
  raw: string | null | undefined
): FolderTreeProfileV2 => {
  if (!raw) {
    return enforceFolderTreeProfileInstanceInvariants(
      instance,
      defaultFolderTreeProfilesV2[instance]
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logClientError(error);
    throw validationError('Invalid folder tree V2 profile payload.', {
      instance,
      reason: 'invalid_json',
    });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid folder tree V2 profile payload.', {
      instance,
      reason: 'invalid_shape',
    });
  }
  return enforceFolderTreeProfileInstanceInvariants(
    instance,
    parseFolderTreeProfileV2Strict(parsed, defaultFolderTreeProfilesV2[instance])
  );
};

export const serializeFolderTreeUiStateV2Entry = (value: FolderTreeUiStateV2Entry): string =>
  JSON.stringify({
    expandedNodeIds: Array.from(
      new Set(value.expandedNodeIds.map((id: string) => id.trim()).filter(Boolean))
    ),
    panelCollapsed: Boolean(value.panelCollapsed),
  });

export const serializeFolderTreeProfileV2Entry = (profile: FolderTreeProfileV2): string =>
  JSON.stringify(profile);
