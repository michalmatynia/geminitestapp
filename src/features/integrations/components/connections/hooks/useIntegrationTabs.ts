'use client';

import { useState } from 'react';

import {
  is1688IntegrationSlug,
  isVintedIntegrationSlug,
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
  isLinkedInIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
} from '@/features/integrations/context/IntegrationsContext';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';

type UseIntegrationTabsResult = {
  activeTab: string;
  setActiveTab: (value: string) => void;
  integrationSlug: string;
  isTradera: boolean;
  isVinted: boolean;
  is1688: boolean;
  isAllegro: boolean;
  isLinkedIn: boolean;
  isBaselinker: boolean;
  showPlaywright: boolean;
  showAllegroConsole: boolean;
  showBaseConsole: boolean;
  activeConnection: unknown;
  selectedPersona: PlaywrightPersona | null;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
  playwrightPersonaId: string | null;
  handleSelectPlaywrightPersona: (id: string | null) => Promise<void>;
  handleSavePlaywrightFallbackSettings: () => Promise<void>;
  playwrightSaveLabel: string;
};

export function useIntegrationTabs(): UseIntegrationTabsResult {
  const { activeIntegration, connections, playwrightPersonas, playwrightPersonasLoading } =
    useIntegrationsData();
  const { editingConnectionId, playwrightPersonaId } = useIntegrationsForm();
  const { handleSelectPlaywrightPersona, handleSavePlaywrightFallbackSettings } =
    useIntegrationsActions();

  const [activeTab, setActiveTab] = useState('connections');

  if (!activeIntegration) {
    return {
      activeTab,
      setActiveTab,
      integrationSlug: '',
      isTradera: false,
      isVinted: false,
      is1688: false,
      isAllegro: false,
      isLinkedIn: false,
      isBaselinker: false,
      showPlaywright: false,
      showAllegroConsole: false,
      showBaseConsole: false,
      activeConnection: null,
      selectedPersona: null,
      playwrightPersonas: [],
      playwrightPersonasLoading: false,
      playwrightPersonaId: null,
      handleSelectPlaywrightPersona,
      handleSavePlaywrightFallbackSettings,
      playwrightSaveLabel: 'Save Playwright settings',
    };
  }

  const integrationSlug = activeIntegration.slug;
  const isTradera = isTraderaIntegrationSlug(integrationSlug);
  const isTraderaApi = isTraderaApiIntegrationSlug(integrationSlug);
  const isVinted = isVintedIntegrationSlug(integrationSlug);
  const is1688 = is1688IntegrationSlug(integrationSlug);
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';
  const isLinkedIn = isLinkedInIntegrationSlug(integrationSlug);
  const showPlaywright = (isTradera && !isTraderaApi) || isVinted || is1688;
  const showAllegroConsole = isAllegro;
  const showBaseConsole = isBaselinker;
  const playwrightSaveLabel =
    (isTradera && !isTraderaApi) || isVinted
      ? 'Save fallback settings'
      : 'Save Playwright settings';
  const activeConnection =
    connections.find((connection) => connection.id === editingConnectionId) ??
    connections[0] ??
    null;
  const selectedPersona =
    playwrightPersonas.find((persona: PlaywrightPersona) => persona.id === playwrightPersonaId) ??
    null;

  return {
    activeTab,
    setActiveTab,
    integrationSlug,
    isTradera,
    isVinted,
    is1688,
    isAllegro,
    isLinkedIn,
    isBaselinker,
    showPlaywright,
    showAllegroConsole,
    showBaseConsole,
    activeConnection,
    selectedPersona,
    playwrightPersonas,
    playwrightPersonasLoading,
    playwrightPersonaId,
    handleSelectPlaywrightPersona,
    handleSavePlaywrightFallbackSettings,
    playwrightSaveLabel,
  };
}
