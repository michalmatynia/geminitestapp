'use client';

import { useCallback } from 'react';
import { useToast } from '@/shared/ui/primitives.public';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';
import { AUTH_SETTINGS_KEYS, type AuthPermission, type AuthRole } from '@/features/auth/utils/auth-management';

interface SaveParams {
  permissions: AuthPermission[];
  roles: AuthRole[];
  setDirty: (dirty: boolean) => void;
  refetchSettings: () => Promise<unknown>;
}

interface SaveResult {
  handleSave: () => Promise<void>;
  isSaving: boolean;
}

export function usePermissionsSave(params: SaveParams): SaveResult {
  const { toast } = useToast();
  const { permissions, roles, setDirty, refetchSettings } = params;
  const mutation = useUpdateSettingsBulk();

  const handleSave = useCallback(async (): Promise<void> => {
    try {
      await mutation.mutateAsync([
        { key: AUTH_SETTINGS_KEYS.permissions, value: serializeSetting(permissions) },
        { key: AUTH_SETTINGS_KEYS.roles, value: serializeSetting(roles) },
      ]);
      setDirty(false);
      await refetchSettings();
      toast('Permissions saved successfully.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AuthPermissionsPage', action: 'saveSettings' });
      toast('Failed to save permissions.', { variant: 'error' });
    }
  }, [permissions, roles, setDirty, refetchSettings, mutation, toast]);

  return { handleSave, isSaving: mutation.isPending };
}
