import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthUserSecurity } from '@/features/auth/hooks/useAuthQueries';
import { AUTH_SETTINGS_KEYS, type AuthRole } from '@/features/auth/utils/auth-management';
import { type AuthSecurityPolicy } from '@/features/auth/utils/auth-security';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { disableMfa, setupMfa, verifyMfa } from '@/features/auth/api/mfa';
import { ApiError } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export function useSettingsController() {
  const { toast } = useToast();
  const { session, roles: contextRoles, defaultRole: contextDefaultRole, securityPolicy: contextSecurityPolicy, updateSetting, refetchSettings } = useAuth();
  
  const [roles, setRoles] = useState<AuthRole[]>(contextRoles);
  const [defaultRole, setDefaultRole] = useState(contextDefaultRole);
  const [securityPolicy, setSecurityPolicy] = useState<AuthSecurityPolicy>(contextSecurityPolicy);
  const [defaultDirty, setDefaultDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);

  const mfaSetupMutation = createMutationV2({ mutationKey: QUERY_KEYS.auth.mutation('mfa.setup'), mutationFn: setupMfa });
  const mfaVerifyMutation = createMutationV2({ mutationKey: QUERY_KEYS.auth.mutation('mfa.verify'), mutationFn: verifyMfa });
  const mfaDisableMutation = createMutationV2({ mutationKey: QUERY_KEYS.auth.mutation('mfa.disable'), mutationFn: disableMfa });
  const userSecurityQuery = useAuthUserSecurity(session?.user?.id);

  useEffect(() => {
    setRoles(contextRoles);
    setDefaultRole(contextDefaultRole);
    setSecurityPolicy(contextSecurityPolicy);
  }, [contextRoles, contextDefaultRole, contextSecurityPolicy]);

  const saveDefaultRole = async () => {
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

  const saveSecurityPolicy = async () => {
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
