'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from 'react';

import type {
  IntegrationsContextType,
} from '@/features/integrations/context/integrations-context-types';
import { internalError } from '@/shared/errors/app-error';

import {
  IntegrationsDataContext,
  type IntegrationsData,
} from './integrations/IntegrationsDataContext';
import {
  IntegrationsFormContext,
  type IntegrationsForm,
} from './integrations/IntegrationsFormContext';
import {
  IntegrationsTestingContext,
  type IntegrationsTesting,
} from './integrations/IntegrationsTestingContext';
import {
  IntegrationsSessionContext,
  type IntegrationsSession,
} from './integrations/IntegrationsSessionContext';
import {
  IntegrationsApiConsoleContext,
  type IntegrationsApiConsole,
} from './integrations/IntegrationsApiConsoleContext';
import {
  IntegrationsActionsContext,
  type IntegrationsActions,
} from './integrations/IntegrationsActionsContext';

import { useIntegrationsDataImpl } from './integrations/useIntegrationsDataImpl';
import { useIntegrationsFormImpl } from './integrations/useIntegrationsFormImpl';
import { useIntegrationsTestingImpl } from './integrations/useIntegrationsTestingImpl';
import { useIntegrationsSessionImpl } from './integrations/useIntegrationsSessionImpl';
import { useIntegrationsApiConsoleImpl } from './integrations/useIntegrationsApiConsoleImpl';
import { useIntegrationsActionsImpl } from './integrations/useIntegrationsActionsImpl';

export { useIntegrationsData } from './integrations/IntegrationsDataContext';
export { useIntegrationsForm } from './integrations/IntegrationsFormContext';
export { useIntegrationsTesting } from './integrations/IntegrationsTestingContext';
export { useIntegrationsSession } from './integrations/IntegrationsSessionContext';
export { useIntegrationsApiConsole } from './integrations/IntegrationsApiConsoleContext';
export { useIntegrationsActions } from './integrations/IntegrationsActionsContext';

const IntegrationsContext = createContext<IntegrationsContextType | null>(null);

export function useIntegrationsContext(): IntegrationsContextType {
  const context = useContext(IntegrationsContext);
  if (!context) {
    throw internalError('useIntegrationsContext must be used within an IntegrationsProvider');
  }
  return context;
}

export function IntegrationsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const data = useIntegrationsDataImpl();
  const form = useIntegrationsFormImpl(data.connections);
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
      handleSelectPlaywrightPersona: actions.handleSelectPlaywrightPersona,
      handleSavePlaywrightSettings: actions.handleSavePlaywrightSettings,
      handleAllegroAuthorize: actions.handleAllegroAuthorize,
      handleAllegroDisconnect: actions.handleAllegroDisconnect,
      handleAllegroSandboxToggle: actions.handleAllegroSandboxToggle,
      handleAllegroSandboxConnect: actions.handleAllegroSandboxConnect,
      handleBaseApiRequest: actions.handleBaseApiRequest,
      handleAllegroApiRequest: actions.handleAllegroApiRequest,
      onCloseModal: actions.onCloseModal,
      onOpenSessionModal: actions.onOpenSessionModal,
    }),
    [actions]
  );

  const aggregatedValue = useMemo<IntegrationsContextType>(
    () => ({
      ...dataValue,
      ...formValue,
      ...testingValue,
      ...sessionValue,
      ...apiConsoleValue,
      ...actionsValue,
    }),
    [dataValue, formValue, testingValue, sessionValue, apiConsoleValue, actionsValue]
  );

  return (
    <IntegrationsDataContext.Provider value={dataValue}>
      <IntegrationsFormContext.Provider value={formValue}>
        <IntegrationsTestingContext.Provider value={testingValue}>
          <IntegrationsSessionContext.Provider value={sessionValue}>
            <IntegrationsApiConsoleContext.Provider value={apiConsoleValue}>
              <IntegrationsActionsContext.Provider value={actionsValue}>
                <IntegrationsContext.Provider value={aggregatedValue}>
                  {children}
                </IntegrationsContext.Provider>
              </IntegrationsActionsContext.Provider>
            </IntegrationsApiConsoleContext.Provider>
          </IntegrationsSessionContext.Provider>
        </IntegrationsTestingContext.Provider>
      </IntegrationsFormContext.Provider>
    </IntegrationsDataContext.Provider>
  );
}
