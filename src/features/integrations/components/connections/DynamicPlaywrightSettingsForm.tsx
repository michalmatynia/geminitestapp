import { useEffect, useState } from 'react';

import {
  useIntegrationsActions,
  useIntegrationsForm,
} from '@/features/integrations/context/IntegrationsContext';
import { PlaywrightSettingsProvider } from '@/features/playwright';
import { LoadingState } from '@/shared/ui';

export function DynamicPlaywrightSettingsForm(): React.JSX.Element {
  const { playwrightSettings, setPlaywrightSettings } = useIntegrationsForm();
  const { handleSavePlaywrightSettings } = useIntegrationsActions();
  const [Component, setComponent] = useState<React.ComponentType<{ onSave: () => void }> | null>(
    null
  );

  useEffect(() => {
    const loadComponent = async (): Promise<void> => {
      const { PlaywrightSettingsFormContent } = await import('@/features/playwright');
      setComponent(() => PlaywrightSettingsFormContent);
    };
    void loadComponent();
  }, []);

  if (!Component) {
    return <LoadingState message='Loading settings editor...' />;
  }

  return (
    <PlaywrightSettingsProvider settings={playwrightSettings} setSettings={setPlaywrightSettings}>
      <Component
        onSave={() => {
          void handleSavePlaywrightSettings();
        }}
      />
    </PlaywrightSettingsProvider>
  );
}
