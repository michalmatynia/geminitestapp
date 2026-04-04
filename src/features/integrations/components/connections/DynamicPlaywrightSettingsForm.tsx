'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  useIntegrationsActions,
  useIntegrationsForm,
} from '@/features/integrations/context/IntegrationsContext';
import { LoadingState } from '@/shared/ui';
import {
  PlaywrightSettingsFormViewProvider,
  PlaywrightSettingsProvider,
} from '@/shared/ui/playwright/PlaywrightSettingsForm';

export function DynamicPlaywrightSettingsForm(): React.JSX.Element {
  const { playwrightSettings, setPlaywrightSettings } = useIntegrationsForm();
  const { handleSavePlaywrightSettings } = useIntegrationsActions();
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const loadComponent = async (): Promise<void> => {
      const { PlaywrightSettingsFormContent } = await import('@/shared/ui/playwright/PlaywrightSettingsForm');
      setComponent(() => PlaywrightSettingsFormContent);
    };
    void loadComponent();
  }, []);

  const viewValue = useMemo(
    () => ({
      onSave: () => {
        void handleSavePlaywrightSettings();
      },
    }),
    [handleSavePlaywrightSettings]
  );

  if (!Component) {
    return <LoadingState message='Loading settings editor...' />;
  }

  return (
    <PlaywrightSettingsProvider settings={playwrightSettings} setSettings={setPlaywrightSettings}>
      <PlaywrightSettingsFormViewProvider value={viewValue}>
        <Component />
      </PlaywrightSettingsFormViewProvider>
    </PlaywrightSettingsProvider>
  );
}
