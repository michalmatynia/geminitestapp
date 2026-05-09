/**
 * Workspace Persistence Shared Service
 * 
 * Provides shared constants and utilities for CaseResolver workspace persistence.
 */

import { type CaseResolverWorkspace } from '@/shared/contracts/case-resolver';
import { safeParseCaseResolverWorkspace } from '../../../settings';
import { readPositiveIntegerEnv } from '../../../utils/workspace-persistence-utils';
import { type SettingsRecordLike } from '../../../utils/workspace-settings-persistence-helpers';

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

/**
 * Returns the maximum allowed payload size for workspace updates.
 */
export const getCaseResolverWorkspaceMaxPayloadBytes = (): number =>
  CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

/**
 * Checks if a payload size exceeds the maximum allowed limit.
 */
export const isCaseResolverWorkspacePayloadTooLarge = (payloadBytes: number): boolean =>
  Number.isFinite(payloadBytes) && payloadBytes > CASE_RESOLVER_WORKSPACE_MAX_PAYLOAD_BYTES;

/**
 * Parses a workspace from a given setting record.
 */
export const readWorkspaceFromSettingRecord = (
  record: SettingsRecordLike | null,
  fallback: string
): CaseResolverWorkspace => {
  const rawValue = typeof record?.value === 'string' ? record.value : fallback;
  if (rawValue.trim().length === 0) {
    return safeParseCaseResolverWorkspace(fallback);
  }
  return safeParseCaseResolverWorkspace(rawValue);
};
