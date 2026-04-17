'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
} from '@/features/integrations/context/IntegrationsContext';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';
import {
  PlaywrightSettingsFormViewProvider,
  PlaywrightSettingsProvider,
} from '@/shared/ui/playwright/PlaywrightSettingsForm';

export function DynamicPlaywrightSettingsForm(): React.JSX.Element {
  const { playwrightSettings, setPlaywrightSettings } = useIntegrationsForm();
  const { activeIntegration } = useIntegrationsData();
  const { handleSavePlaywrightFallbackSettings } = useIntegrationsActions();
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const loadComponent = async (): Promise<void> => {
      const { PlaywrightSettingsFormContent } = await import('@/shared/ui/playwright/PlaywrightSettingsForm');
      setComponent(() => PlaywrightSettingsFormContent);
    };
    loadComponent().catch(() => undefined);
  }, []);

  const saveLabel =
    isTraderaBrowserIntegrationSlug(activeIntegration?.slug) ||
    isVintedIntegrationSlug(activeIntegration?.slug)
      ? 'Save fallback settings'
      : 'Save Playwright settings';

  const viewValue = useMemo(
    () => ({
      onSave: () => {
        handleSavePlaywrightFallbackSettings().catch(() => undefined);
      },
      saveLabel,
    }),
    [handleSavePlaywrightFallbackSettings, saveLabel]
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
