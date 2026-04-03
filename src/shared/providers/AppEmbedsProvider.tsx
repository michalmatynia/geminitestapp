'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { APP_EMBED_SETTING_KEY, type AppEmbedId } from '@/shared/lib/app-embeds';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { useToast } from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

interface AppEmbedsContextType {
  enabled: Set<AppEmbedId>;
  toggleOption: (id: AppEmbedId, checked: boolean) => void;
  save: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

const {
  Context: AppEmbedsContext,
  useStrictContext: useAppEmbeds,
} = createStrictContext<AppEmbedsContextType>({
  hookName: 'useAppEmbeds',
  providerName: 'AppEmbedsProvider',
  displayName: 'AppEmbedsContext',
  errorFactory: internalError,
});

export function AppEmbedsProvider({ children }: { children: React.ReactNode }): React.ReactNode {
  const { toast } = useToast();
  const settingsQuery = useSettingsMap();
  const updateSetting = useUpdateSetting();

  const initialEnabled = useMemo(() => {
    if (!settingsQuery.data) {
      return new Set<AppEmbedId>();
    }

    const stored = parseJsonSetting<AppEmbedId[]>(
      settingsQuery.data.get(APP_EMBED_SETTING_KEY),
      []
    );
    return new Set(stored);
  }, [settingsQuery.data]);

  const [userEnabled, setUserEnabled] = useState<Set<AppEmbedId> | null>(null);
  const enabled = userEnabled ?? initialEnabled;

  useEffect(() => {
    setUserEnabled(null);
  }, [initialEnabled]);

  const toggleOption = useCallback(
    (id: AppEmbedId, checked: boolean): void => {
      setUserEnabled((prev) => {
        const current = prev ?? initialEnabled;
        const next = new Set(current);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    [initialEnabled]
  );

  const save = useCallback(async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: APP_EMBED_SETTING_KEY,
        value: serializeSetting(Array.from(enabled)),
      });
      setUserEnabled(null);
      toast('App embed settings saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, { source: 'AppEmbedsProvider', action: 'saveSettings' });
      toast('Failed to save app embed settings.', { variant: 'error' });
      throw error;
    }
  }, [enabled, toast, updateSetting]);

  const value = useMemo(
    () => ({
      enabled,
      toggleOption,
      save,
      isLoading: settingsQuery.isLoading,
      isSaving: updateSetting.isPending,
    }),
    [enabled, save, settingsQuery.isLoading, toggleOption, updateSetting.isPending]
  );

  return <AppEmbedsContext.Provider value={value}>{children}</AppEmbedsContext.Provider>;
}

export { useAppEmbeds };
