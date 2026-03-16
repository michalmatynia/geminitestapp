'use client';
import Link from 'next/link';
import React from 'react';

import {
  useAgentCreatorModes,
  useAgentCreatorOperations,
  useAgentPersonas,
} from '@/features/ai/agentcreator';
import { AgentCreatorSettingsSection } from '@/features/ai/agentcreator/components/AgentCreatorSettingsSection';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { AgentPersona } from '@/shared/contracts/agents';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { fetchPlaywrightPersonas } from '@/shared/lib/playwright/personas';
import {
  Button,
  SelectSimple,
  useToast,
  FormSection,
  FormField,
  ToggleRow,
  FormActions,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useChatbotSettings } from '../context/ChatbotContext';

const SEARCH_PROVIDER_OPTIONS = [
  { value: 'serpapi', label: 'SerpApi' },
  { value: 'google', label: 'Google' },
  { value: 'bing', label: 'Bing' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'serpapi' | 'google' | 'bing'>>;

const AGENT_PERSONA_NONE_OPTION: LabeledOptionDto<string> = {
  value: 'none',
  label: 'None',
};

const PLAYWRIGHT_PERSONA_CUSTOM_OPTION: LabeledOptionDto<string> = {
  value: 'custom',
  label: 'Custom',
};

export function SettingsTab(): React.JSX.Element {
  const {
    model,
    personaId,
    setPersonaId,
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
  } = useChatbotSettings();

  const { toast } = useToast();
  const { agentModeEnabled } = useAgentCreatorModes();
  const { setAgentRunHeadless } = useAgentCreatorOperations();
  const { data: agentPersonas = [], isLoading: agentPersonasLoading } = useAgentPersonas();

  const [playwrightPersonas, setPlaywrightPersonas] = React.useState<PlaywrightPersona[]>([]);
  const [playwrightPersonasLoading, setPlaywrightPersonasLoading] = React.useState<boolean>(true);

  React.useEffect((): (() => void) => {
    let active: boolean = true;
    const loadPersonas = async (): Promise<void> => {
      try {
        const stored = await fetchPlaywrightPersonas();
        if (!active) return;
        setPlaywrightPersonas(stored);
      } catch (error: unknown) {
        logClientError(error);
        if (!active) return;
        logClientError(error, {
          context: { source: 'ChatbotSettingsTab', action: 'loadPersonas' },
        });
        const message = error instanceof Error ? error.message : 'Failed to load personas.';
        toast(message, { variant: 'error' });
      } finally {
        if (active) setPlaywrightPersonasLoading(false);
      }
    };
    void loadPersonas();
    return (): void => {
      active = false;
    };
  }, [toast]);

  const selectedAgentPersona =
    agentPersonas.find((item: AgentPersona): boolean => item.id === personaId) ?? null;
  const agentPersonaOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      AGENT_PERSONA_NONE_OPTION,
      ...agentPersonas.map((persona: AgentPersona) => ({
        value: persona.id,
        label: persona.name,
      })),
    ],
    [agentPersonas]
  );
  const playwrightPersonaOptions = React.useMemo(
    (): Array<LabeledOptionDto<string>> => [
      PLAYWRIGHT_PERSONA_CUSTOM_OPTION,
      ...playwrightPersonas.map((persona: PlaywrightPersona) => ({
        value: persona.id,
        label: persona.name,
      })),
    ],
    [playwrightPersonas]
  );

  const handlePersonaChange = (value: string): void => {
    const nextId = value === 'custom' ? null : value;
    setPlaywrightPersonaId(nextId);
    const persona = playwrightPersonas.find(
      (item: PlaywrightPersona): boolean => item.id === nextId
    );
    if (persona) {
      setAgentRunHeadless(persona.settings.headless);
    }
  };

  const selectedPersona =
    playwrightPersonas.find(
      (item: PlaywrightPersona): boolean => item.id === playwrightPersonaId
    ) ?? null;

  return (
    <div className='space-y-6 p-4'>
      <FormSection title='General Settings' variant='subtle' className='p-4'>
        <div className='grid gap-4 md:grid-cols-2 mt-4'>
          <FormField label='AI Routing'>
            <div className='rounded-md border border-border/60 bg-card/30 px-3 py-2'>
              <div className='text-xs font-medium text-gray-200'>
                {model || 'No Brain model configured'}
              </div>
              <div className='mt-1 text-[11px] text-gray-500'>
                Managed by Brain. Update `/admin/brain?tab=routing` to change Chatbot model routing.
              </div>
            </div>
          </FormField>
          <FormField label='Search Provider'>
            <SelectSimple
              size='sm'
              value={searchProvider}
              onValueChange={(value: string): void => setSearchProvider(value)}
              options={SEARCH_PROVIDER_OPTIONS}
             ariaLabel='Search Provider' title='Search Provider'/>
          </FormField>
        </div>
        <div className='flex flex-wrap items-center gap-4 mt-4'>
          <ToggleRow
            label='Web Search'
            checked={webSearchEnabled}
            onCheckedChange={setWebSearchEnabled}
            className='border-none bg-transparent hover:bg-transparent p-0'
          />
          <ToggleRow
            label='Global Context'
            checked={useGlobalContext}
            onCheckedChange={setUseGlobalContext}
            className='border-none bg-transparent hover:bg-transparent p-0'
          />
          <ToggleRow
            label='Local Context'
            checked={useLocalContext}
            onCheckedChange={setUseLocalContext}
            className='border-none bg-transparent hover:bg-transparent p-0'
          />
        </div>
      </FormSection>

      <FormSection
        title='Agent persona'
        description='Attach a tutor persona with shared memory and mood context to new chatbot sessions.'
        variant='subtle'
        className='p-4'
        actions={
          <Button variant='outline' size='sm' asChild>
            <Link href='/admin/agentcreator/personas'>Manage personas</Link>
          </Button>
        }
      >
        {agentPersonasLoading ? (
          <p className='text-xs text-gray-500 mt-4'>Loading personas...</p>
        ) : agentPersonas.length === 0 ? (
          <p className='text-xs text-gray-500 mt-4'>
            No agent personas yet. Create one in Agent Creator.
          </p>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 mt-4'>
            <FormField
              label='Persona'
              description='The selected persona is saved with new chat sessions and can retrieve its own memory bank.'
            >
              <SelectSimple
                size='sm'
                value={personaId ?? 'none'}
                onValueChange={(value: string): void => setPersonaId(value === 'none' ? null : value)}
                options={agentPersonaOptions}
                placeholder='Select persona'
               ariaLabel='Select persona' title='Select persona'/>
            </FormField>
            <FormSection variant='subtle' className='p-3 text-xs text-gray-400'>
              {selectedAgentPersona ? (
                <>
                  <p className='text-xs font-semibold text-gray-200'>{selectedAgentPersona.name}</p>
                  <p className='mt-1'>
                    {selectedAgentPersona.description || 'No description provided.'}
                  </p>
                </>
              ) : (
                <>
                  <p className='text-xs font-semibold text-gray-200'>No persona attached</p>
                  <p className='mt-1'>
                    Chat sessions will run without a persona memory bank until one is selected.
                  </p>
                </>
              )}
            </FormSection>
          </div>
        )}
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
          {playwrightPersonasLoading ? (
            <p className='text-xs text-gray-500 mt-4'>Loading personas...</p>
          ) : playwrightPersonas.length === 0 ? (
            <p className='text-xs text-gray-500 mt-4'>No personas yet. Create one in settings.</p>
          ) : (
            <div className='grid gap-4 md:grid-cols-2 mt-4'>
              <FormField
                label='Persona'
                description='Selecting a persona updates the headless setting.'
              >
                <SelectSimple
                  size='sm'
                value={playwrightPersonaId ?? 'custom'}
                onValueChange={handlePersonaChange}
                options={playwrightPersonaOptions}
                placeholder='Select persona'
               ariaLabel='Select persona' title='Select persona'/>
              </FormField>
              <FormSection variant='subtle' className='p-3 text-xs text-gray-400'>
                {selectedPersona ? (
                  <>
                    <p className='text-xs font-semibold text-gray-200'>{selectedPersona.name}</p>
                    <p className='mt-1'>
                      {selectedPersona.description || 'No description provided.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className='text-xs font-semibold text-gray-200'>Custom settings</p>
                    <p className='mt-1'>Pick a persona or keep your own agent preferences.</p>
                  </>
                )}
              </FormSection>
            </div>
          )}
        </FormSection>
      )}

      <FormActions
        onSave={() => {
          void saveChatbotSettings();
        }}
        saveText='Save Settings'
        isDisabled={!settingsDirty}
        isSaving={settingsSaving}
        className='mt-6'
      />
    </div>
  );
}
