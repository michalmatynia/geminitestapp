'use client';

import React, { useMemo, type ReactNode } from 'react';

import {
  isTraderaBrowserIntegrationSlug,
  isVintedIntegrationSlug,
  is1688IntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  useDefault1688Connection,
  useDefaultTraderaConnection,
  useDefaultVintedConnection,
} from '@/features/integrations/hooks/useIntegrationQueries';
import type { IntegrationsData } from '@/shared/contracts/integrations/context';

import {
  IntegrationsActionsContext,
  useIntegrationsActions,
  type IntegrationsActions,
} from './integrations/IntegrationsActionsContext';
import {
  IntegrationsApiConsoleContext,
  useIntegrationsApiConsole,
  type IntegrationsApiConsole,
} from './integrations/IntegrationsApiConsoleContext';
import {
  IntegrationsDataContext,
  useIntegrationsData,
} from './integrations/IntegrationsDataContext';
import {
  IntegrationsFormContext,
  useIntegrationsForm,
  type IntegrationsForm,
} from './integrations/IntegrationsFormContext';
import {
  IntegrationsSessionContext,
  useIntegrationsSession,
  type IntegrationsSession,
} from './integrations/IntegrationsSessionContext';
import {
  IntegrationsTestingContext,
  useIntegrationsTesting,
  type IntegrationsTesting,
} from './integrations/IntegrationsTestingContext';
import { useIntegrationsActionsImpl } from './integrations/useIntegrationsActionsImpl';
import { useIntegrationsApiConsoleImpl } from './integrations/useIntegrationsApiConsoleImpl';
import { useIntegrationsDataImpl } from './integrations/useIntegrationsDataImpl';
import { useIntegrationsFormImpl } from './integrations/useIntegrationsFormImpl';
import { useIntegrationsSessionImpl } from './integrations/useIntegrationsSessionImpl';
import { useIntegrationsTestingImpl } from './integrations/useIntegrationsTestingImpl';

export {
  useIntegrationsData,
  useIntegrationsForm,
  useIntegrationsTesting,
  useIntegrationsSession,
  useIntegrationsApiConsole,
  useIntegrationsActions,
};

export function IntegrationsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const data = useIntegrationsDataImpl();
  const defaultTraderaConnectionQuery = useDefaultTraderaConnection();
  const defaultVintedConnectionQuery = useDefaultVintedConnection();
  const default1688ConnectionQuery = useDefault1688Connection();
  const preferredConnectionId =
    isTraderaBrowserIntegrationSlug(data.activeIntegration?.slug)
      ? defaultTraderaConnectionQuery.data?.connectionId ?? null
      : isVintedIntegrationSlug(data.activeIntegration?.slug)
        ? defaultVintedConnectionQuery.data?.connectionId ?? null
        : is1688IntegrationSlug(data.activeIntegration?.slug)
          ? default1688ConnectionQuery.data?.connectionId ?? null
        : null;
  const form = useIntegrationsFormImpl(
    data.connections,
    preferredConnectionId,
    data.playwrightPersonas
  );
  const testing = useIntegrationsTestingImpl();
  const session = useIntegrationsSessionImpl(
    data.connections.find((c) => c.id === form.editingConnectionId) ?? data.connections[0] ?? null
  );
  const apiConsole = useIntegrationsApiConsoleImpl();
  const actions = useIntegrationsActionsImpl({
    integrations: data.integrations,
    activeIntegration: data.activeIntegration,
    setActiveIntegration: data.setActiveIntegration,
    connections: data.connections,
    editingConnectionId: form.editingConnectionId,
    setEditingConnectionId: form.setEditingConnectionId,
    setIsModalOpen: form.setIsModalOpen,
    setConnectionToDelete: form.setConnectionToDelete,
    connectionToDelete: form.connectionToDelete,
    setIsTesting: testing.setIsTesting,
    setTestLog: testing.setTestLog,
    setSelectedStep: testing.setSelectedStep,
    setShowTestLogModal: testing.setShowTestLogModal,
    setShowTestErrorModal: testing.setShowTestErrorModal,
    setTestError: testing.setTestError,
    setTestErrorMeta: testing.setTestErrorMeta,
    setShowTestSuccessModal: testing.setShowTestSuccessModal,
    setTestSuccessMessage: testing.setTestSuccessMessage,
    playwrightPersonas: data.playwrightPersonas,
    setPlaywrightPersonaId: form.setPlaywrightPersonaId,
    setPlaywrightSettings: form.setPlaywrightSettings,
    playwrightPersonaId: form.playwrightPersonaId,
    playwrightSettings: form.playwrightSettings,
    setShowSessionModal: session.setShowSessionModal,
    baseApiMethod: apiConsole.baseApiMethod,
    baseApiParams: apiConsole.baseApiParams,
    setBaseApiResponse: apiConsole.setBaseApiResponse,
    setBaseApiError: apiConsole.setBaseApiError,
    setBaseApiLoading: apiConsole.setBaseApiLoading,
    allegroApiMethod: apiConsole.allegroApiMethod,
    allegroApiBody: apiConsole.allegroApiBody,
    allegroApiPath: apiConsole.allegroApiPath,
    setAllegroApiResponse: apiConsole.setAllegroApiResponse,
    setAllegroApiError: apiConsole.setAllegroApiError,
    setAllegroApiLoading: apiConsole.setAllegroApiLoading,
    integrationsQuery: data.integrationsQuery,
  });

  const dataValue = useMemo<IntegrationsData>(
    () => ({
      integrations: data.integrations,
      integrationsLoading: data.integrationsLoading,
      activeIntegration: data.activeIntegration,
      setActiveIntegration: data.setActiveIntegration,
      connections: data.connections,
      connectionsLoading: data.connectionsLoading,
      playwrightPersonas: data.playwrightPersonas,
      playwrightPersonasLoading: data.playwrightPersonasLoading,
    }),
    [data]
  );

  const formValue = useMemo<IntegrationsForm>(
    () => ({
      isModalOpen: form.isModalOpen,
      setIsModalOpen: form.setIsModalOpen,
      editingConnectionId: form.editingConnectionId,
      setEditingConnectionId: form.setEditingConnectionId,
      connectionToDelete: form.connectionToDelete,
      setConnectionToDelete: form.setConnectionToDelete,
      playwrightSettings: form.playwrightSettings,
      setPlaywrightSettings: form.setPlaywrightSettings,
      playwrightPersonaId: form.playwrightPersonaId,
      savingAllegroSandbox: actions.savingAllegroSandbox,
    }),
    [form, actions.savingAllegroSandbox]
  );

  const testingValue = useMemo<IntegrationsTesting>(
    () => ({
      isTesting: testing.isTesting,
      testLog: testing.testLog,
      showTestLogModal: testing.showTestLogModal,
      setShowTestLogModal: testing.setShowTestLogModal,
      selectedStep: testing.selectedStep,
      setSelectedStep: testing.setSelectedStep,
      showTestErrorModal: testing.showTestErrorModal,
      setShowTestErrorModal: testing.setShowTestErrorModal,
      testError: testing.testError,
      testErrorMeta: testing.testErrorMeta,
      showTestSuccessModal: testing.showTestSuccessModal,
      setShowTestSuccessModal: testing.setShowTestSuccessModal,
      testSuccessMessage: testing.testSuccessMessage,
    }),
    [testing]
  );

  const sessionValue = useMemo<IntegrationsSession>(
    () => ({
      showSessionModal: session.showSessionModal,
      setShowSessionModal: session.setShowSessionModal,
      sessionLoading: session.sessionQuery.isFetching,
      sessionError: session.sessionError,
      sessionCookies: session.sessionCookies,
      sessionOrigins: session.sessionOrigins,
      sessionUpdatedAt: session.sessionUpdatedAt,
    }),
    [session]
  );

  const apiConsoleValue = useMemo<IntegrationsApiConsole>(
    () => ({
      baseApiMethod: apiConsole.baseApiMethod,
      setBaseApiMethod: apiConsole.setBaseApiMethod,
      baseApiParams: apiConsole.baseApiParams,
      setBaseApiParams: apiConsole.setBaseApiParams,
      baseApiLoading: apiConsole.baseApiLoading,
      baseApiError: apiConsole.baseApiError,
      baseApiResponse: apiConsole.baseApiResponse,
      allegroApiMethod: apiConsole.allegroApiMethod,
      setAllegroApiMethod: apiConsole.setAllegroApiMethod,
      allegroApiPath: apiConsole.allegroApiPath,
      setAllegroApiPath: apiConsole.setAllegroApiPath,
      allegroApiBody: apiConsole.allegroApiBody,
      setAllegroApiBody: apiConsole.setAllegroApiBody,
      allegroApiLoading: apiConsole.allegroApiLoading,
      allegroApiError: apiConsole.allegroApiError,
      allegroApiResponse: apiConsole.allegroApiResponse,
    }),
    [apiConsole]
  );

  const actionsValue = useMemo<IntegrationsActions>(
    () => ({
      handleIntegrationClick: actions.handleIntegrationClick,
      handleSaveConnection: actions.handleSaveConnection,
      handleDeleteConnection: actions.handleDeleteConnection,
      handleConfirmDeleteConnection: actions.handleConfirmDeleteConnection,
      handleBaselinkerTest: actions.handleBaselinkerTest,
      handleAllegroTest: actions.handleAllegroTest,
      handleTestConnection: actions.handleTestConnection,
      handleTraderaManualLogin: actions.handleTraderaManualLogin,
      handleVintedManualLogin: actions.handleVintedManualLogin,
      handle1688ManualLogin: actions.handle1688ManualLogin,
      handleSelectPlaywrightPersona: actions.handleSelectPlaywrightPersona,
      handleSavePlaywrightSettings: actions.handleSavePlaywrightSettings,
      handleAllegroAuthorize: actions.handleAllegroAuthorize,
      handleAllegroDisconnect: actions.handleAllegroDisconnect,
      handleAllegroSandboxToggle: actions.handleAllegroSandboxToggle,
      handleAllegroSandboxConnect: actions.handleAllegroSandboxConnect,
      handleLinkedInAuthorize: actions.handleLinkedInAuthorize,
      handleLinkedInDisconnect: actions.handleLinkedInDisconnect,
      handleBaseApiRequest: actions.handleBaseApiRequest,
      handleAllegroApiRequest: actions.handleAllegroApiRequest,
      onCloseModal: actions.onCloseModal,
      onOpenSessionModal: actions.onOpenSessionModal,
      handleResetListingScript: actions.handleResetListingScript,
    }),
    [actions]
  );

  return (
    <IntegrationsDataContext.Provider value={dataValue}>
      <IntegrationsFormContext.Provider value={formValue}>
        <IntegrationsTestingContext.Provider value={testingValue}>
          <IntegrationsSessionContext.Provider value={sessionValue}>
            <IntegrationsApiConsoleContext.Provider value={apiConsoleValue}>
              <IntegrationsActionsContext.Provider value={actionsValue}>
                {children}
              </IntegrationsActionsContext.Provider>
            </IntegrationsApiConsoleContext.Provider>
          </IntegrationsSessionContext.Provider>
        </IntegrationsTestingContext.Provider>
      </IntegrationsFormContext.Provider>
    </IntegrationsDataContext.Provider>
  );
}
