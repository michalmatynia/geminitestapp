import type {
  CaseResolverCaptureAction,
  CaseResolverCaptureRole,
  CaseResolverCaptureRoleMapping,
  CaseResolverCaptureSettings,
} from '@/shared/contracts/case-resolver';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export const CASE_RESOLVER_CAPTURE_SETTINGS_KEY = 'case_resolver_capture_settings_v1';

export type {
  CaseResolverCaptureAction,
  CaseResolverCaptureRole,
  CaseResolverCaptureRoleMapping,
  CaseResolverCaptureSettings,
};

export const CASE_RESOLVER_CAPTURE_ACTION_OPTIONS: Array<
  LabeledOptionDto<CaseResolverCaptureAction>
> = [
  { value: 'useMatched', label: 'Use Matched Filemaker' },
  { value: 'createInFilemaker', label: 'Create in Filemaker' },
  { value: 'keepText', label: 'Keep as Text' },
  { value: 'ignore', label: 'Ignore' },
];

export const CASE_RESOLVER_CAPTURE_TARGET_ROLE_OPTIONS: Array<
  LabeledOptionDto<CaseResolverCaptureRole>
> = [
  { value: 'addresser', label: 'Addresser' },
  { value: 'addressee', label: 'Addressee' },
];

export const DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS: CaseResolverCaptureSettings = {
  enabled: true,
  autoOpenProposalModal: true,
  roleMappings: {
    addresser: {
      role: 'addresser',
      enabled: true,
      targetRole: 'addresser',
      defaultAction: 'useMatched',
      autoMatchPartyReference: true,
      autoMatchAddress: true,
      targetPath: 'addresser',
      required: true,
    },
    addressee: {
      role: 'addressee',
      enabled: true,
      targetRole: 'addressee',
      defaultAction: 'useMatched',
      autoMatchPartyReference: true,
      autoMatchAddress: true,
      targetPath: 'addressee',
      required: true,
    },
    subject: {
      role: 'subject',
      enabled: true,
      targetRole: 'subject',
      defaultAction: 'keepText',
      autoMatchPartyReference: false,
      autoMatchAddress: false,
      targetPath: 'subject',
      required: false,
    },
    reference: {
      role: 'reference',
      enabled: true,
      targetRole: 'reference',
      defaultAction: 'ignore',
      autoMatchPartyReference: false,
      autoMatchAddress: false,
      targetPath: 'reference',
      required: false,
    },
    other: {
      role: 'other',
      enabled: true,
      targetRole: 'other',
      defaultAction: 'ignore',
      autoMatchPartyReference: false,
      autoMatchAddress: false,
      targetPath: 'other',
      required: false,
    },
  },
};

const normalizeCaptureRole = (
  value: unknown,
  fallback: CaseResolverCaptureRole
): CaseResolverCaptureRole => {
  if (value === 'addresser' || value === 'addressee') {
    return value;
  }
  return fallback;
};

const normalizeCaptureAction = (
  value: unknown,
  fallback: CaseResolverCaptureAction
): CaseResolverCaptureAction => {
  if (value === 'useMatched') {
    return 'useMatched';
  }
  if (value === 'createInFilemaker') {
    return 'createInFilemaker';
  }
  if (value === 'keepText') {
    return 'keepText';
  }
  if (value === 'ignore') {
    return 'ignore';
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
      role: fallback.role,
      targetPath: fallback.targetPath,
      required: fallback.required,
      enabled: fallback.enabled,
      targetRole: fallback.targetRole,
      defaultAction: fallback.defaultAction,
      autoMatchPartyReference: fallback.autoMatchPartyReference,
      autoMatchAddress: fallback.autoMatchAddress,
    };
  }

  const record = value as Record<string, unknown>;
  return {
    role: fallback.role,
    targetPath: fallback.targetPath,
    required: fallback.required,
    enabled: typeof record['enabled'] === 'boolean' ? record['enabled'] : fallback.enabled,
    targetRole: normalizeCaptureRole(
      record['targetRole'],
      normalizeCaptureRole(fallback.targetRole, fallbackTargetRole)
    ),
    defaultAction: normalizeCaptureAction(
      record['defaultAction'],
      fallback.defaultAction || 'keepText'
    ),
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
        subject: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.subject },
        reference: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.reference },
        other: { ...DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.other },
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
      subject: normalizeRoleMapping(
        roleMappings['subject'],
        DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.subject,
        'subject'
      ),
      reference: normalizeRoleMapping(
        roleMappings['reference'],
        DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.reference,
        'reference'
      ),
      other: normalizeRoleMapping(
        roleMappings['other'],
        DEFAULT_CASE_RESOLVER_CAPTURE_SETTINGS.roleMappings.other,
        'other'
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
