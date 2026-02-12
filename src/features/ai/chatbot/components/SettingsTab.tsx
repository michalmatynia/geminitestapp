'use client';
import Link from 'next/link';
import React from 'react';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator';
import { AgentCreatorSettingsSection } from '@/features/ai/agentcreator/components/AgentCreatorSettingsSection';
import { logClientError } from '@/features/observability';
import type { PlaywrightPersona } from '@/features/playwright/types';
import { Button, Label, UnifiedSelect, SectionPanel, Checkbox, useToast } from '@/shared/ui';

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
      <SectionPanel variant='subtle' className='space-y-4 p-4'>
        <h3 className='text-lg font-medium text-white'>General Settings</h3>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label>Model</Label>
            <UnifiedSelect
              value={model}
              onValueChange={(value: string): void => setModel(value)}
              options={modelOptions.map((opt: string) => ({ value: opt, label: opt }))}
              placeholder='Select a model'
            />
          </div>
          <div className='space-y-2'>
            <Label>Search Provider</Label>
            <UnifiedSelect
              value={searchProvider}
              onValueChange={(value: string): void => setSearchProvider(value)}
              options={[
                { value: 'serpapi', label: 'SerpApi' },
                { value: 'google', label: 'Google' },
                { value: 'bing', label: 'Bing' },
              ]}
            />
          </div>
        </div>
        <div className='flex flex-wrap items-center gap-4'>
          <Label className='flex items-center gap-2 text-sm text-gray-300'>
            <Checkbox
              checked={webSearchEnabled} onCheckedChange={(checked: boolean): void => setWebSearchEnabled(Boolean(checked))}
            />
            Enable Web Search
          </Label>
          <Label className='flex items-center gap-2 text-sm text-gray-300'>
            <Checkbox
              checked={useGlobalContext} onCheckedChange={(checked: boolean): void => setUseGlobalContext(Boolean(checked))}
            />
            Use Global Context
          </Label>
          <Label className='flex items-center gap-2 text-sm text-gray-300'>
            <Checkbox
              checked={useLocalContext} onCheckedChange={(checked: boolean): void => setUseLocalContext(Boolean(checked))}
            />
            Use Local Context
          </Label>
        </div>
      </SectionPanel>

      <AgentCreatorSettingsSection />

      {agentModeEnabled && (
        <SectionPanel variant='subtle' className='space-y-4 p-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <p className='text-sm font-semibold text-white'>
                Playwright persona
              </p>
              <p className='mt-1 text-xs text-gray-400'>
                Choose a shared automation profile for agent runs.
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href='/admin/settings/playwright'>Manage personas</Link>
            </Button>
          </div>

          {personasLoading ? (
            <p className='text-xs text-gray-500'>Loading personas...</p>
          ) : personas.length === 0 ? (
            <p className='text-xs text-gray-500'>
              No personas yet. Create one in settings.
            </p>
          ) : (
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label className='text-xs text-gray-400'>Persona</Label>
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
                <p className='text-[11px] text-gray-500'>
                  Selecting a persona updates the headless setting.
                </p>
              </div>
              <SectionPanel variant='subtle' className='p-3 text-xs text-gray-400'>
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
              </SectionPanel>
            </div>
          )}
        </SectionPanel>
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

