import { useEffect, useMemo, useState } from 'react';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const APP_DB_PROVIDER_SETTING_KEY = 'app_db_provider';

export function useDatabaseEngineController() {
  const settingsQuery = useSettingsMap({ scope: 'all' });
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const persistedProvider = settingsQuery.data?.get(APP_DB_PROVIDER_SETTING_KEY) === 'redis' ? 'redis' : 'mongodb';
  const [provider, setProvider] = useState<'mongodb' | 'redis'>(persistedProvider);
  const [isSaving, setIsSaving] = useState(false);
  const policy = useMemo(() => ({ provider }), [provider]);

  useEffect(() => {
    setProvider(persistedProvider);
  }, [persistedProvider]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({ key: APP_DB_PROVIDER_SETTING_KEY, value: provider });
      toast('Engine provider updated', { variant: 'success' });
      await settingsQuery.refetch();
    } catch (e) {
      logClientCatch(e, { source: 'DatabaseEnginePage', action: 'updateProvider' });
      toast('Failed to update provider', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return { policy, isLoading: settingsQuery.isPending, provider, setProvider, handleSave, isSaving };
}
