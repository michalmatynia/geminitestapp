import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthUserSecurity } from '@/features/auth/hooks/useAuthQueries';
import { AUTH_SETTINGS_KEYS, type AuthRole } from '@/features/auth/utils/auth-management';
import { type AuthSecurityPolicy } from '@/features/auth/utils/auth-security';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useMfaMutations, type MfaMutations } from './useMfaMutations';

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
} & MfaMutations;

export function useSettingsController(): SettingsControllerReturn {
  const { toast } = useToast();
  const { session, roles: contextRoles, defaultRole: contextDefaultRole, securityPolicy: contextSecurityPolicy, updateSetting, refetchSettings } = useAuth();
  
  const [roles, setRoles] = useState<AuthRole[]>(contextRoles);
  const [defaultRole, setDefaultRole] = useState(contextDefaultRole);
  const [securityPolicy, setSecurityPolicy] = useState<AuthSecurityPolicy>(contextSecurityPolicy);
  const [defaultDirty, setDefaultDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);

  const mfa = useMfaMutations();
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
    ...mfa, userSecurityQuery,
    isSaving: updateSetting.isPending
  };
}
