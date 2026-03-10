import { type CaseResolverWorkspace } from '@/shared/contracts/case-resolver';

import { safeParseCaseResolverWorkspace } from './settings';
import { readPositiveIntegerEnv } from './utils/workspace-persistence-utils';
import { type SettingsRecordLike } from './utils/workspace-settings-persistence-helpers';

export const CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS_DEFAULT = 8_000;
export const CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES_DEFAULT = 1_500_000;

export const CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES = readPositiveIntegerEnv(
  'NEXT_PUBLIC_CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES',
  CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES_DEFAULT
);
export const CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS = readPositiveIntegerEnv(
  'NEXT_PUBLIC_CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS',
  CASE_RESOLVER_WORKSPACE_FETCH_TIMEOUT_MS_DEFAULT
);

export const getCaseResolverWorkspaceMaxPayloadBytes = (): number =>
  CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

export const isCaseResolverWorkspacePayloadTooLarge = (payloadBytes: number): boolean =>
  Number.isFinite(payloadBytes) && payloadBytes > CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

export const readWorkspaceFromSettingRecord = (
  record: SettingsRecordLike | null,
  fallback: string
): CaseResolverWorkspace => {
  const rawValue = typeof record?.value === 'string' ? record.value : fallback;
  if (!rawValue.trim()) {
    return safeParseCaseResolverWorkspace(fallback);
  }
  return safeParseCaseResolverWorkspace(rawValue);
};
