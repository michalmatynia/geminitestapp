'use client';
import Link from 'next/link';
import React from 'react';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator';
import { AgentCreatorSettingsSection } from '@/features/ai/agentcreator/components/AgentCreatorSettingsSection';
import { logClientError } from '@/features/observability';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { Button, UnifiedSelect, Checkbox, useToast, FormSection, FormField } from '@/shared/ui';

import { useChatbot } from '../context/ChatbotContext';

export function SettingsTab(): React.JSX.Element {
  const {
    model,
    setModel,
    modelOptions,
    webSearchEnabled,
    setWebSearchEnabled,
    useGlobalContext,
    setUseGlobalContext,
    useLocalContext,
    setUseLocalContext,
    searchProvider,
    setSearchProvider,
    playwrightPersonaId,
    setPlaywrightPersonaId,
    saveChatbotSettings,
    settingsDirty,
    settingsSaving,
  } = useChatbot();

  const { toast } = useToast();
  const {
    agentModeEnabled,
    setAgentRunHeadless,
  } = useAgentCreatorSettings();

  const [personas, setPersonas] = React.useState<PlaywrightPersona[]>([]);
  const [personasLoading, setPersonasLoading] = React.useState<boolean>(true);

  React.useEffect((): (() => void) => {
    let active: boolean = true;
    const loadPersonas = async (): Promise<void> => {
      try {
        const { fetchPlaywrightPersonas } = await import('@/features/playwright/utils/personas');
        const stored = await fetchPlaywrightPersonas();
        if (!active) return;
        setPersonas(stored);
      } catch (error: unknown) {
        if (!active) return;
        logClientError(error, { context: { source: 'ChatbotSettingsTab', action: 'loadPersonas' } });
        const message =
          error instanceof Error ? error.message : 'Failed to load personas.';
        toast(message, { variant: 'error' });
      } finally {
        if (active) setPersonasLoading(false);
      }
    };
    void loadPersonas();
    return (): void => {
      active = false;
    };
  }, [toast]);

  const handlePersonaChange = (value: string): void => {
    const nextId = value === 'custom' ? null : value;
    setPlaywrightPersonaId(nextId);
    const persona = personas.find((item: PlaywrightPersona): boolean => item.id === nextId);
    if (persona) {
      setAgentRunHeadless(persona.settings.headless);
    }
  };

  const selectedPersona =
    personas.find((item: PlaywrightPersona): boolean => item.id === playwrightPersonaId) ?? null;

  return (
    <div className='space-y-6 p-4'>
      <FormSection title='General Settings' variant='subtle' className='p-4'>
        <div className='grid gap-4 md:grid-cols-2 mt-4'>
          <FormField label='Model'>
            <UnifiedSelect
              value={model}
              onValueChange={(value: string): void => setModel(value)}
              options={modelOptions.map((opt: string) => ({ value: opt, label: opt }))}
              placeholder='Select a model'
            />
          </FormField>
          <FormField label='Search Provider'>
            <UnifiedSelect
              value={searchProvider}
              onValueChange={(value: string): void => setSearchProvider(value)}
              options={[
                { value: 'serpapi', label: 'SerpApi' },
                { value: 'google', label: 'Google' },
                { value: 'bing', label: 'Bing' },
              ]}
            />
          </FormField>
        </div>
        <div className='flex flex-wrap items-center gap-4 mt-4'>
          <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>
            <Checkbox
              checked={webSearchEnabled} onCheckedChange={(checked: boolean): void => setWebSearchEnabled(Boolean(checked))}
            />
            Enable Web Search
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>
            <Checkbox
              checked={useGlobalContext} onCheckedChange={(checked: boolean): void => setUseGlobalContext(Boolean(checked))}
            />
            Use Global Context
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-300 cursor-pointer'>
            <Checkbox
              checked={useLocalContext} onCheckedChange={(checked: boolean): void => setUseLocalContext(Boolean(checked))}
            />
            Use Local Context
          </label>
        </div>
      </FormSection>

      <AgentCreatorSettingsSection />

      {agentModeEnabled && (
        <FormSection
          title='Playwright persona'
          description='Choose a shared automation profile for agent runs.'
          variant='subtle'
          className='p-4'
          actions={
            <Button variant='outline' size='sm' asChild>
              <Link href='/admin/settings/playwright'>Manage personas</Link>
            </Button>
          }
        >
          {personasLoading ? (
            <p className='text-xs text-gray-500 mt-4'>Loading personas...</p>
          ) : personas.length === 0 ? (
            <p className='text-xs text-gray-500 mt-4'>
              No personas yet. Create one in settings.
            </p>
          ) : (
            <div className='grid gap-4 md:grid-cols-2 mt-4'>
              <FormField label='Persona'>
                <UnifiedSelect
                  value={playwrightPersonaId ?? 'custom'}
                  onValueChange={handlePersonaChange}
                  options={[
                    { value: 'custom', label: 'Custom' },
                    ...personas.map((persona: PlaywrightPersona) => ({
                      value: persona.id,
                      label: persona.name
                    }))
                  ]}
                  placeholder='Select persona'
                />
                <p className='text-[11px] text-gray-500 mt-1'>
                  Selecting a persona updates the headless setting.
                </p>
              </FormField>
              <FormSection variant='subtle' className='p-3 text-xs text-gray-400'>
                {selectedPersona ? (
                  <>
                    <p className='text-xs font-semibold text-gray-200'>
                      {selectedPersona.name}
                    </p>
                    <p className='mt-1'>
                      {selectedPersona.description ||
                        'No description provided.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className='text-xs font-semibold text-gray-200'>
                      Custom settings
                    </p>
                    <p className='mt-1'>
                      Pick a persona or keep your own agent preferences.
                    </p>
                  </>
                )}
              </FormSection>
            </div>
          )}
        </FormSection>
      )}

      <div className='flex justify-end'>
        <Button
          onClick={(): void => void saveChatbotSettings()}
          disabled={!settingsDirty}
        >
          {settingsSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
