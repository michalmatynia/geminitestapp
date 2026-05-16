'use client';

import { disableMfa, setupMfa, verifyMfa } from '@/features/auth/api/mfa';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import type { MfaDisableResponse, MfaSetupResponse, MfaVerifyResponse } from '@/shared/contracts/auth';

export type MfaMutations = {
  mfaSetupMutation: MutationResult<{ ok: boolean; payload: MfaSetupResponse }, unknown>;
  mfaVerifyMutation: MutationResult<{ ok: boolean; payload: MfaVerifyResponse }, string>;
  mfaDisableMutation: MutationResult<
    { ok: boolean; payload: MfaDisableResponse },
    { token?: string; recoveryCode?: string }
  >;
};

export function useMfaMutations(): MfaMutations {
  const mfaSetupMutation = useMutationV2({
    mutationKey: QUERY_KEYS.auth.mutation('mfa.setup'),
    mutationFn: setupMfa,
    meta: {
      source: 'useSettingsController.mfaSetup',
      operation: 'action',
      resource: 'mfa.setup',
      domain: 'auth',
      description: 'Setup MFA for the user',
    },
  });
  const mfaVerifyMutation = useMutationV2({
    mutationKey: QUERY_KEYS.auth.mutation('mfa.verify'),
    mutationFn: verifyMfa,
    meta: {
      source: 'useSettingsController.mfaVerify',
      operation: 'action',
      resource: 'mfa.verify',
      domain: 'auth',
      description: 'Verify MFA for the user',
    },
  });
  const mfaDisableMutation = useMutationV2({
    mutationKey: QUERY_KEYS.auth.mutation('mfa.disable'),
    mutationFn: disableMfa,
    meta: {
      source: 'useSettingsController.mfaDisable',
      operation: 'action',
      resource: 'mfa.disable',
      domain: 'auth',
      description: 'Disable MFA for the user',
    },
  });

  return { mfaSetupMutation, mfaVerifyMutation, mfaDisableMutation };
}
