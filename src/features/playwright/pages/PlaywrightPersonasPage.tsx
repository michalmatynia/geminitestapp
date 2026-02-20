'use client';

import { logClientError } from '@/features/observability';
import { PlaywrightSettingsForm } from '@/features/playwright/components/PlaywrightSettingsForm';
import { usePlaywrightPersonas, useSavePlaywrightPersonasMutation } from '@/features/playwright/hooks/usePlaywrightPersonas';
import type {
  PlaywrightPersona,
  PlaywrightSettings,
} from '@/shared/contracts/playwright';
import { buildPlaywrightSettings, createPlaywrightPersonaId } from '@/features/playwright/utils/personas';
import { ItemLibrary, useToast, Breadcrumbs } from '@/shared/ui';

import type { SetStateAction } from 'react';

export function PlaywrightPersonasPage(): React.JSX.Element {
  const { toast } = useToast();
  
  const { data: personas = [], isLoading: loading } = usePlaywrightPersonas();
  const { mutateAsync: savePersonas, isPending: saving } = useSavePlaywrightPersonasMutation();

  const handleSavePersona = async (draft: Partial<PlaywrightPersona>): Promise<void> => {
    const name = draft.name?.trim();
    if (!name) {
      toast('Persona name is required.', { variant: 'error' });
      return;
    }

    const now = new Date().toISOString();
    const existing = personas.find((persona: PlaywrightPersona) => persona.id === draft.id);
    const nextPersona: PlaywrightPersona = {
      id: existing?.id ?? createPlaywrightPersonaId(),
      name,
      description: draft.description?.trim() || null,
      settings: buildPlaywrightSettings(draft.settings),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const next = existing
      ? personas.map((persona: PlaywrightPersona) =>
        persona.id === existing.id ? nextPersona : persona
      )
      : [...personas, nextPersona];

    try {
      await savePersonas({ personas: next });
      toast(existing ? 'Persona updated.' : 'Persona created.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'PlaywrightPersonasPage', action: 'savePersona', personaId: draft.id } });
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save personas.';
      toast(errorMessage, { variant: 'error' });
    }
  };

  const handleDeletePersona = async (persona: PlaywrightPersona): Promise<void> => {
    const next = personas.filter((item: PlaywrightPersona) => item.id !== persona.id);
    try {
      await savePersonas({ personas: next });
      toast('Persona deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'PlaywrightPersonasPage', action: 'deletePersona', personaId: persona.id } });
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to save personas.';
      toast(errorMessage, { variant: 'error' });
    }
  };

  return (
    <ItemLibrary<PlaywrightPersona>
      title='Playwright Personas'
      description='Centralize browser automation settings to reuse across integrations and chatbot flows.'
      entityName='Persona'
      items={personas}
      isLoading={loading}
      isSaving={saving}
      onSave={handleSavePersona}
      onDelete={handleDeletePersona}
      backLink={(
        <Breadcrumbs
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Settings', href: '/admin/settings' },
            { label: 'Personas' }
          ]}
          className='mb-2'
        />
      )}
      buildDefaultItem={() => ({
        name: '',
        description: '',
        settings: buildPlaywrightSettings(),
      })}
      renderItemTags={(persona: PlaywrightPersona) => {
        const settings = persona.settings;
        const tags = [
          settings.headless ? 'Headless' : 'Headful',
          settings.emulateDevice ? `Device: ${settings.deviceName}` : 'Device: default',
          `Timeout: ${settings.timeout}ms`,
          settings.proxyEnabled ? 'Proxy: on' : 'Proxy: off',
        ];
        if (settings.slowMo > 0) {
          tags.push(`SlowMo: ${settings.slowMo}ms`);
        }
        return tags;
      }}
      renderExtraFields={(draft: Partial<PlaywrightPersona>, onChange: (updates: Partial<PlaywrightPersona>) => void): React.JSX.Element => (
        <PlaywrightSettingsForm
          settings={draft.settings || buildPlaywrightSettings()}
          setSettings={(newSettings: SetStateAction<PlaywrightSettings>): void => {
            const current = draft.settings || buildPlaywrightSettings();
            const nextSettings = typeof newSettings === 'function' 
              ? (newSettings as (prev: PlaywrightSettings) => PlaywrightSettings)(current) 
              : newSettings;
            onChange({ settings: nextSettings });
          }}
          showSave={false}
          title='Persona settings'
          description='Tune browser behavior, timeouts, and automation pacing.'
        />
      )}
    />
  );
}