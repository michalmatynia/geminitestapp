import { useState } from 'react';

import {
  isTraderaApiIntegrationSlug,
  isTraderaIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import type { PlaywrightPersona } from '@/shared/contracts/playwright';

type UseIntegrationTabsResult = {
  activeTab: string;
  setActiveTab: (value: string) => void;
  integrationSlug: string;
  isTradera: boolean;
  isAllegro: boolean;
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
  handleSavePlaywrightSettings: () => Promise<void>;
};

export function useIntegrationTabs(): UseIntegrationTabsResult {
  const {
    activeIntegration,
    connections,
    editingConnectionId,
    playwrightPersonas,
    playwrightPersonasLoading,
    playwrightPersonaId,
    handleSelectPlaywrightPersona,
    handleSavePlaywrightSettings,
  } = useIntegrationsContext();

  const [activeTab, setActiveTab] = useState('connections');

  if (!activeIntegration) {
    return {
      activeTab,
      setActiveTab,
      integrationSlug: '',
      isTradera: false,
      isAllegro: false,
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
      handleSavePlaywrightSettings,
    };
  }

  const integrationSlug = activeIntegration.slug;
  const isTradera = isTraderaIntegrationSlug(integrationSlug);
  const isTraderaApi = isTraderaApiIntegrationSlug(integrationSlug);
  const isAllegro = integrationSlug === 'allegro';
  const isBaselinker = integrationSlug === 'baselinker';
  const showPlaywright = isTradera && !isTraderaApi;
  const showAllegroConsole = isAllegro;
  const showBaseConsole = isBaselinker;
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
    isAllegro,
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
    handleSavePlaywrightSettings,
  };
}
