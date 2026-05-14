import { useAuth } from '@/features/auth/context/AuthContext';
import { disableMfa, setupMfa, verifyMfa } from '@/features/auth/api/mfa';
import { useAuthUserSecurity } from '@/features/auth/hooks/useAuthQueries';
import { AUTH_SETTINGS_KEYS, type AuthRole } from '@/features/auth/utils/auth-management';
import { type AuthSecurityPolicy } from '@/features/auth/utils/auth-security';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import type { MfaDisableResponse, MfaSetupResponse, MfaVerifyResponse } from '@/shared/contracts/auth';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

type SettingsMutations = {
  mfaSetupMutation: MutationResult<{ ok: boolean; payload: MfaSetupResponse }, void>;
  mfaVerifyMutation: MutationResult<{ ok: boolean; payload: MfaVerifyResponse }, string>;
  mfaDisableMutation: MutationResult<
    { ok: boolean; payload: MfaDisableResponse },
    string | { token?: string; recoveryCode?: string }
  >;
};

type SettingsControllerReturn = {
  roles: AuthRole[];
  defaultRole: string;
  setDefaultRole: Dispatch<SetStateAction<string>>;
  setDefaultDirty: Dispatch<SetStateAction<boolean>>;
  defaultDirty: boolean;
  saveDefaultRole: () => Promise<void>;
  securityPolicy: AuthSecurityPolicy;
  setSecurityPolicy: Dispatch<SetStateAction<AuthSecurityPolicy>>;
  setSecurityDirty: Dispatch<SetStateAction<boolean>>;
  securityDirty: boolean;
  saveSecurityPolicy: () => Promise<void>;
  userSecurityQuery: ReturnType<typeof useAuthUserSecurity>;
  isSaving: boolean;
} & SettingsMutations;

export function useSettingsController(): SettingsControllerReturn {
  const { toast } = useToast();
  const { session, roles: contextRoles, defaultRole: contextDefaultRole, securityPolicy: contextSecurityPolicy, updateSetting, refetchSettings } = useAuth();
  
  const [roles, setRoles] = useState<AuthRole[]>(contextRoles);
  const [defaultRole, setDefaultRole] = useState(contextDefaultRole);
  const [securityPolicy, setSecurityPolicy] = useState<AuthSecurityPolicy>(contextSecurityPolicy);
  const [defaultDirty, setDefaultDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);

  const mfaSetupMutation = createMutationV2({
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
  const mfaVerifyMutation = createMutationV2({
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
  const mfaDisableMutation = createMutationV2({
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
  const userSecurityQuery = useAuthUserSecurity(session?.user?.id);

  useEffect(() => {
    setRoles(contextRoles);
    setDefaultRole(contextDefaultRole);
    setSecurityPolicy(contextSecurityPolicy);
  }, [contextRoles, contextDefaultRole, contextSecurityPolicy]);

  const saveDefaultRole = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({ key: AUTH_SETTINGS_KEYS.defaultRole, value: defaultRole });
      setDefaultDirty(false);
      await refetchSettings();
      toast('Default role saved.', { variant: 'success' });
    } catch (e) {
      logClientCatch(e, { source: 'AuthSettingsPage', action: 'saveDefaultRole' });
      toast('Failed to save settings.', { variant: 'error' });
    }
  };

  const saveSecurityPolicy = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({ key: AUTH_SETTINGS_KEYS.securityPolicy, value: JSON.stringify(securityPolicy) });
      setSecurityDirty(false);
      await refetchSettings();
      toast('Security policy saved.', { variant: 'success' });
    } catch (e) {
      logClientCatch(e, { source: 'AuthSettingsPage', action: 'saveSecurityPolicy' });
      toast('Failed to save security policy.', { variant: 'error' });
    }
  };

  return {
    roles, defaultRole, setDefaultRole, setDefaultDirty, defaultDirty, saveDefaultRole,
    securityPolicy, setSecurityPolicy, setSecurityDirty, securityDirty, saveSecurityPolicy,
    mfaSetupMutation, mfaVerifyMutation, mfaDisableMutation, userSecurityQuery,
    isSaving: updateSetting.isPending
  };
}
