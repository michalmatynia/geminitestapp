import { parseJsonSetting } from '@/shared/utils/settings-json';

export const CASE_RESOLVER_CAPTURE_SETTINGS_KEY = 'case_resolver_capture_settings_v1';

export type CaseResolverCaptureAction = 'database' | 'text' | 'ignore';
export type CaseResolverCaptureRole = 'addresser' | 'addressee';

export type CaseResolverCaptureRoleMapping = {
  enabled: boolean;
  targetRole: CaseResolverCaptureRole;
  defaultAction: CaseResolverCaptureAction;
  autoMatchPartyReference: boolean;
  autoMatchAddress: boolean;
};

export type CaseResolverCaptureSettings = {
  enabled: boolean;
  autoOpenProposalModal: boolean;
  roleMappings: Record<CaseResolverCaptureRole, CaseResolverCaptureRoleMapping>;
};

export const CASE_RESOLVER_CAPTURE_ACTION_OPTIONS: Array<{
  value: CaseResolverCaptureAction;
  label: string;
}> = [
  { value: 'database', label: 'Map to Filemaker' },
  { value: 'text', label: 'Keep as Text' },
  { value: 'ignore', label: 'Ignore' },
];

export const CASE_RESOLVER_CAPTURE_TARGET_ROLE_OPTIONS: Array<{
  value: CaseResolverCaptureRole;
  label: string;
}> = [
  { value: 'addresser', label: 'Addresser' },
  { value: 'addressee', label: 'Addressee' },
];

export const DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS: CaseResolverCaptureSettings = {
  enabled: true,
  autoOpenProposalModal: true,
  roleMappings: {
    addresser: {
      enabled: true,
      targetRole: 'addresser',
      defaultAction: 'database',
      autoMatchPartyReference: true,
      autoMatchAddress: true,
    },
    addressee: {
      enabled: true,
      targetRole: 'addressee',
      defaultAction: 'database',
      autoMatchPartyReference: true,
      autoMatchAddress: true,
    },
  },
};

const normalizeCaptureRole = (value: unknown, fallback: CaseResolverCaptureRole): CaseResolverCaptureRole => {
  if (value === 'addresser' || value === 'addressee') {
    return value;
  }
  return fallback;
};

const normalizeCaptureAction = (
  value: unknown,
  fallback: CaseResolverCaptureAction
): CaseResolverCaptureAction => {
  if (value === 'database' || value === 'text' || value === 'ignore') {
    return value;
  }
  return fallback;
};

const normalizeRoleMapping = (
  value: unknown,
  fallback: CaseResolverCaptureRoleMapping,
  fallbackTargetRole: CaseResolverCaptureRole
): CaseResolverCaptureRoleMapping => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      enabled: fallback.enabled,
      targetRole: fallback.targetRole,
      defaultAction: fallback.defaultAction,
      autoMatchPartyReference: fallback.autoMatchPartyReference,
      autoMatchAddress: fallback.autoMatchAddress,
    };
  }

  const record = value as Record<string, unknown>;
  return {
    enabled: typeof record['enabled'] === 'boolean' ? record['enabled'] : fallback.enabled,
    targetRole: normalizeCaptureRole(
      record['targetRole'],
      normalizeCaptureRole(fallback.targetRole, fallbackTargetRole)
    ),
    defaultAction: normalizeCaptureAction(record['defaultAction'], fallback.defaultAction),
    autoMatchPartyReference:
      typeof record['autoMatchPartyReference'] === 'boolean'
        ? record['autoMatchPartyReference']
        : fallback.autoMatchPartyReference,
    autoMatchAddress:
      typeof record['autoMatchAddress'] === 'boolean'
        ? record['autoMatchAddress']
        : fallback.autoMatchAddress,
  };
};

const normalizeCaseResolverCaptureSettings = (input: unknown): CaseResolverCaptureSettings => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS,
      roleMappings: {
        addresser: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addresser },
        addressee: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addressee },
      },
    };
  }

  const record = input as Record<string, unknown>;
  const roleMappings =
    record['roleMappings'] &&
    typeof record['roleMappings'] === 'object' &&
    !Array.isArray(record['roleMappings'])
      ? (record['roleMappings'] as Record<string, unknown>)
      : {};

  return {
    enabled:
      typeof record['enabled'] === 'boolean'
        ? record['enabled']
        : DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.enabled,
    autoOpenProposalModal:
      typeof record['autoOpenProposalModal'] === 'boolean'
        ? record['autoOpenProposalModal']
        : DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.autoOpenProposalModal,
    roleMappings: {
      addresser: normalizeRoleMapping(
        roleMappings['addresser'],
        DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addresser,
        'addresser'
      ),
      addressee: normalizeRoleMapping(
        roleMappings['addressee'],
        DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.addressee,
        'addressee'
      ),
    },
  };
};

export const parseCaseResolverCaptureSettings = (
  raw: string | null | undefined
): CaseResolverCaptureSettings =>
  normalizeCaseResolverCaptureSettings(
    parseJsonSetting<unknown>(raw, DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS)
  );
