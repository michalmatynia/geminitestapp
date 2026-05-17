'use client';

import * as React from 'react';

import {
  useAgentCreatorModes,
  useAgentCreatorOperations,
  useAgentPersonas,
} from '@/features/ai/agentcreator';
import { AgentCreatorSettingsSection } from '@/features/ai/agentcreator/components/AgentCreatorSettingsSection';
import type { AgentPersona } from '@/shared/contracts/agents';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';
import { fetchPlaywrightPersonas } from '@/shared/lib/playwright/personas';
import { useToast } from '@/shared/ui/primitives.public';
import { FormActions } from '@/shared/ui/forms-and-actions.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useChatbotSettings } from '../context/ChatbotContext';
import { GeneralSettingsSection } from './SettingsTabGeneralSection';
import { AgentPersonaSection } from './SettingsTabAgentPersonaSection';
import { PlaywrightPersonaSection } from './SettingsTabPlaywrightPersonaSection';

interface SettingsTabState {
  model: string;
  personaId: string | null;
  setPersonaId: (id: string | null) => void;
  webSearchEnabled: boolean;
  setWebSearchEnabled: (value: boolean) => void;
  useGlobalContext: boolean;
  setUseGlobalContext: (value: boolean) => void;
  useLocalContext: boolean;
  setUseLocalContext: (value: boolean) => void;
  searchProvider: string;
  setSearchProvider: (value: string) => void;
  playwrightPersonaId: string | null;
  saveChatbotSettings: () => Promise<void>;
  settingsDirty: boolean;
  settingsSaving: boolean;
  agentModeEnabled: boolean;
  agentPersonas: AgentPersona[];
  agentPersonasLoading: boolean;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
  handlePersonaChange: (value: string) => void;
}

function useSettingsTabState(): SettingsTabState {
  const settings = useChatbotSettings();
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
        logClientError(error, {
          context: { source: 'ChatbotSettingsTab', action: 'loadPersonas' },
        });
        if (!active) return;
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

  const handlePersonaChange = (value: string): void => {
    const nextId = value === 'custom' ? null : value;
    settings.setPlaywrightPersonaId(nextId);
    const persona = playwrightPersonas.find(
      (item: PlaywrightPersona): boolean => item.id === nextId
    );
    if (persona) {
      setAgentRunHeadless(persona.settings.headless);
    }
  };

  return {
    ...settings,
    agentModeEnabled,
    agentPersonas,
    agentPersonasLoading,
    playwrightPersonas,
    playwrightPersonasLoading,
    handlePersonaChange,
  };
}

export function SettingsTab(): React.JSX.Element {
  const state = useSettingsTabState();

  return (
    <div className='space-y-6 p-4'>
      <GeneralSettingsSection
        model={state.model}
        searchProvider={state.searchProvider} setSearchProvider={state.setSearchProvider}
        webSearchEnabled={state.webSearchEnabled} setWebSearchEnabled={state.setWebSearchEnabled}
        useGlobalContext={state.useGlobalContext} setUseGlobalContext={state.setUseGlobalContext}
        useLocalContext={state.useLocalContext} setUseLocalContext={state.setUseLocalContext}
      />
      <AgentPersonaSection
        personaId={state.personaId} setPersonaId={state.setPersonaId}
        agentPersonas={state.agentPersonas} agentPersonasLoading={state.agentPersonasLoading}
      />
      <AgentCreatorSettingsSection />
      {state.agentModeEnabled && (
        <PlaywrightPersonaSection
          playwrightPersonaId={state.playwrightPersonaId} handlePersonaChange={state.handlePersonaChange}
          playwrightPersonas={state.playwrightPersonas} playwrightPersonasLoading={state.playwrightPersonasLoading}
        />
      )}
      <FormActions
        onSave={(): void => {
          void state.saveChatbotSettings();
        }}
        saveText='Save Settings'
        isDisabled={!state.settingsDirty}
        isSaving={state.settingsSaving}
        className='mt-6'
      />
    </div>
  );
}
