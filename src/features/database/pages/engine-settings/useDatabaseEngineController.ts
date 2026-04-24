import { useState, useMemo } from 'react';
import { useDatabaseEnginePolicy } from '@/shared/lib/db/database-engine-policy';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export function useDatabaseEngineController() {
  const { policy, isLoading, refetch } = useDatabaseEnginePolicy();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const [provider, setProvider] = useState(policy?.provider ?? 'mongodb');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSetting.mutateAsync({ key: 'app_db_provider', value: provider });
      toast('Engine provider updated', { variant: 'success' });
      await refetch();
    } catch (e) {
      logClientCatch(e, { source: 'DatabaseEnginePage', action: 'updateProvider' });
      toast('Failed to update provider', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return { policy, isLoading, provider, setProvider, handleSave, isSaving };
}
