import { useEffect, useState } from 'react';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { PlaywrightSettingsProvider } from '@/shared/lib/playwright/context/PlaywrightSettingsContext';
import { LoadingState } from '@/shared/ui';

export function DynamicPlaywrightSettingsForm(): React.JSX.Element {
  const { playwrightSettings, setPlaywrightSettings, handleSavePlaywrightSettings } = useIntegrationsContext();
  const [Component, setComponent] = useState<React.ComponentType<{ onSave: () => void }> | null>(null);

  useEffect(() => {
    const loadComponent = async (): Promise<void> => {
      const { PlaywrightSettingsFormContent } = await import('@/shared/lib/playwright');
      setComponent(() => PlaywrightSettingsFormContent);
    };
    void loadComponent();
  }, []);

  if (!Component) {
    return <LoadingState message='Loading settings editor...' />;
  }

  return (
    <PlaywrightSettingsProvider
      settings={playwrightSettings}
      setSettings={setPlaywrightSettings}
    >
      <Component onSave={() => { void handleSavePlaywrightSettings(); }} />
    </PlaywrightSettingsProvider>
  );
}
