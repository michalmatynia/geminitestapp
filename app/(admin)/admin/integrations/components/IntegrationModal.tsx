"use client";

import { Dispatch, SetStateAction } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Integration,
  IntegrationConnection,
  TestLogEntry,
  defaultPlaywrightSettings,
} from "../types";
import { ConnectionManager } from "./ConnectionManager";
import { PlaywrightSettings } from "./PlaywrightSettings";
import { BaseApiConsole } from "./BaseApiConsole";
import { AllegroApiConsole } from "./AllegroApiConsole";
import { AllegroSettings } from "./AllegroSettings";
import { BaselinkerSettings } from "./BaselinkerSettings";
import { TestLogModal } from "./TestLogModal";
import { TestErrorModal } from "./TestErrorModal";
import { TestSuccessModal } from "./TestSuccessModal";
import { SessionModal } from "./SessionModal";

type IntegrationModalProps = {
  activeIntegration: Integration;
  connections: IntegrationConnection[];
  onClose: () => void;

  // Connection Manager
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  connectionForm: { name: string; username: string; password: string };
  setConnectionForm: Dispatch<
    SetStateAction<{ name: string; username: string; password: string }>
  >;
  onSaveConnection: () => void;
  onDeleteConnection: (connection: IntegrationConnection) => void;
  onTestConnection: (connection: IntegrationConnection) => void;
  onBaselinkerTest: (connection: IntegrationConnection) => void;
  onAllegroTest: (connection: IntegrationConnection) => void;
  isTesting: boolean;
  testLog: TestLogEntry[];
  onShowLog: (step: TestLogEntry) => void;

  // Modals State
  showTestLogModal: boolean;
  onCloseTestLogModal: () => void;
  selectedStep: (TestLogEntry & { status: "ok" | "failed" }) | null;

  showTestErrorModal: boolean;
  testError: string | null;
  testErrorMeta: {
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null;
  onCloseTestErrorModal: () => void;

  showTestSuccessModal: boolean;
  testSuccessMessage: string | null;
  onCloseTestSuccessModal: () => void;

  showSessionModal: boolean;
  sessionLoading: boolean;
  sessionError: string | null;
  sessionCookies: {
    name?: string;
    value?: string;
    domain?: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
  }[];
  sessionOrigins: {
    origin?: string;
    localStorage?: { name?: string; value?: string }[];
  }[];
  sessionUpdatedAt: string | null;
  onCloseSessionModal: () => void;

  // Playwright
  playwrightSettings: typeof defaultPlaywrightSettings;
  setPlaywrightSettings: Dispatch<
    SetStateAction<typeof defaultPlaywrightSettings>
  >;
  onSavePlaywrightSettings: () => void;
  showPlaywrightSaved: boolean;
  onOpenSessionModal: () => void;

  // Allegro Settings
  savingAllegroSandbox: boolean;
  onToggleAllegroSandbox: (checked: boolean) => void;
  onAllegroAuthorize: () => void;
  onAllegroDisconnect: () => void;
  onAllegroSandboxConnect: () => void;

  // Base API Console
  baseApiMethod: string;
  setBaseApiMethod: (value: string) => void;
  baseApiParams: string;
  setBaseApiParams: (value: string) => void;
  baseApiLoading: boolean;
  baseApiError: string | null;
  baseApiResponse: { data: unknown } | null;
  onBaseApiRequest: () => void;

  // Allegro API Console
  allegroApiMethod: string;
  setAllegroApiMethod: (value: string) => void;
  allegroApiPath: string;
  setAllegroApiPath: (value: string) => void;
  allegroApiBody: string;
  setAllegroApiBody: (value: string) => void;
  allegroApiLoading: boolean;
  allegroApiError: string | null;
  allegroApiResponse: {
    status: number;
    statusText: string;
    data: unknown;
    refreshed?: boolean;
  } | null;
  onAllegroApiRequest: () => void;
};

export function IntegrationModal({
  activeIntegration,
  connections,
  onClose,
  editingConnectionId,
  setEditingConnectionId,
  connectionForm,
  setConnectionForm,
  onSaveConnection,
  onDeleteConnection,
  onTestConnection,
  onBaselinkerTest,
  onAllegroTest,
  isTesting,
  testLog,
  onShowLog,
  showTestLogModal,
  onCloseTestLogModal,
  selectedStep,
  showTestErrorModal,
  testError,
  testErrorMeta,
  onCloseTestErrorModal,
  showTestSuccessModal,
  testSuccessMessage,
  onCloseTestSuccessModal,
  showSessionModal,
  sessionLoading,
  sessionError,
  sessionCookies,
  sessionOrigins,
  sessionUpdatedAt,
  onCloseSessionModal,
  playwrightSettings,
  setPlaywrightSettings,
  onSavePlaywrightSettings,
  showPlaywrightSaved,
  onOpenSessionModal,
  savingAllegroSandbox,
  onToggleAllegroSandbox,
  onAllegroAuthorize,
  onAllegroDisconnect,
  onAllegroSandboxConnect,
  baseApiMethod,
  setBaseApiMethod,
  baseApiParams,
  setBaseApiParams,
  baseApiLoading,
  baseApiError,
  baseApiResponse,
  onBaseApiRequest,
  allegroApiMethod,
  setAllegroApiMethod,
  allegroApiPath,
  setAllegroApiPath,
  allegroApiBody,
  setAllegroApiBody,
  allegroApiLoading,
  allegroApiError,
  allegroApiResponse,
  onAllegroApiRequest,
}: IntegrationModalProps) {
  const integrationSlug = activeIntegration.slug;
  const isTradera = integrationSlug === "tradera";
  const isAllegro = integrationSlug === "allegro";
  const isBaselinker = integrationSlug === "baselinker";
  const showPlaywright = isTradera;
  const showAllegroConsole = isAllegro;
  const showBaseConsole = isBaselinker;
  const activeConnection = connections[0] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-lg bg-gray-950 p-6 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {activeIntegration.name} Integration
              {isTradera && (
                <span className="ml-2 rounded bg-orange-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-orange-200">
                  Browser
                </span>
              )}
              {isAllegro && (
                <span className="ml-2 rounded bg-blue-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-blue-200">
                  API
                </span>
              )}
              {isBaselinker && (
                <span className="ml-2 rounded bg-purple-500/30 px-1.5 py-0.5 text-xs font-normal uppercase tracking-wider text-purple-200">
                  Platform
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-400">
              {isBaselinker
                ? "Manage connections and warehouse sync settings."
                : isTradera
                ? "Manage connections via browser automation (Playwright)."
                : "Manage connections and marketplace API settings."}
            </p>
          </div>
          <button
            className="text-sm text-gray-400 hover:text-white"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <Tabs defaultValue="connections">
          <TabsList
            className={`grid w-full ${
              showPlaywright || showAllegroConsole || showBaseConsole
                ? "grid-cols-5"
                : "grid-cols-4"
            }`}
          >
            <TabsTrigger value="connections">Connections</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            {showAllegroConsole && (
              <TabsTrigger value="allegro-api">Allegro API</TabsTrigger>
            )}
            {showBaseConsole && (
              <TabsTrigger value="base-api">Base API</TabsTrigger>
            )}
            <TabsTrigger value="price-sync">Price Sync</TabsTrigger>
            <TabsTrigger value="inventory-sync">Inventory Sync</TabsTrigger>
            {showPlaywright && (
              <TabsTrigger value="playwright">Playwright</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="connections" className="mt-4 space-y-6">
            <ConnectionManager
              activeIntegration={activeIntegration}
              connections={connections}
              editingConnectionId={editingConnectionId}
              setEditingConnectionId={setEditingConnectionId}
              connectionForm={connectionForm}
              setConnectionForm={setConnectionForm}
              onSave={onSaveConnection}
              onDelete={onDeleteConnection}
              onTest={(conn) => {
                if (isBaselinker) onBaselinkerTest(conn);
                else if (isAllegro) onAllegroTest(conn);
                else onTestConnection(conn);
              }}
              isTesting={isTesting}
              testLog={testLog}
              onShowLog={onShowLog}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            {isAllegro ? (
              <AllegroSettings
                activeConnection={activeConnection}
                savingSandbox={savingAllegroSandbox}
                onToggleSandbox={onToggleAllegroSandbox}
                onAuthorize={onAllegroAuthorize}
                onDisconnect={onAllegroDisconnect}
                onSandboxConnect={onAllegroSandboxConnect}
              />
            ) : isBaselinker ? (
              <BaselinkerSettings
                activeConnection={activeConnection}
                onTest={() =>
                  activeConnection && onBaselinkerTest(activeConnection)
                }
                isTesting={isTesting}
              />
            ) : (
              <div className="min-h-[220px]" />
            )}

            {isTradera && activeConnection && (
              <div className="mt-4 rounded-md border border-gray-800 bg-gray-950/60 p-3 text-xs text-gray-300">
                <div className="flex items-center justify-between gap-3">
                  <p>
                    <span className="text-gray-400">Session cookie:</span>{" "}
                    {activeConnection.hasPlaywrightStorageState
                      ? "Retained"
                      : "Not stored"}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenSessionModal}
                    disabled={!activeConnection.hasPlaywrightStorageState}
                    className="text-xs text-emerald-200 hover:text-emerald-100 disabled:cursor-not-allowed disabled:text-gray-600"
                  >
                    View details
                  </button>
                </div>
                <p className="mt-1">
                  <span className="text-gray-400">Obtained:</span>{" "}
                  {activeConnection.playwrightStorageStateUpdatedAt
                    ? new Date(
                        activeConnection.playwrightStorageStateUpdatedAt
                      ).toLocaleString()
                    : "—"}
                </p>
              </div>
            )}
          </TabsContent>

          {showBaseConsole && (
            <TabsContent value="base-api" className="mt-4">
              <BaseApiConsole
                activeConnection={activeConnection}
                method={baseApiMethod}
                setMethod={setBaseApiMethod}
                params={baseApiParams}
                setParams={setBaseApiParams}
                loading={baseApiLoading}
                error={baseApiError}
                response={baseApiResponse}
                onRequest={onBaseApiRequest}
              />
            </TabsContent>
          )}

          {showAllegroConsole && (
            <TabsContent value="allegro-api" className="mt-4">
              <AllegroApiConsole
                activeConnection={activeConnection}
                method={allegroApiMethod}
                setMethod={setAllegroApiMethod}
                path={allegroApiPath}
                setPath={setAllegroApiPath}
                body={allegroApiBody}
                setBody={setAllegroApiBody}
                loading={allegroApiLoading}
                error={allegroApiError}
                response={allegroApiResponse}
                onRequest={onAllegroApiRequest}
                isConnected={Boolean(activeConnection?.hasAllegroAccessToken)}
              />
            </TabsContent>
          )}

          <TabsContent value="price-sync" className="mt-4">
            <div className="min-h-[220px]" />
          </TabsContent>
          <TabsContent value="inventory-sync" className="mt-4">
            <div className="min-h-[220px]" />
          </TabsContent>

          {showPlaywright && (
            <TabsContent value="playwright" className="mt-4">
              <PlaywrightSettings
                settings={playwrightSettings}
                setSettings={setPlaywrightSettings}
                onSave={onSavePlaywrightSettings}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {showTestLogModal && selectedStep && (
        <TestLogModal selectedStep={selectedStep} onClose={onCloseTestLogModal} />
      )}

      {showTestErrorModal && testError && (
        <TestErrorModal
          testError={testError}
          testErrorMeta={testErrorMeta}
          onClose={onCloseTestErrorModal}
        />
      )}

      {showTestSuccessModal && testSuccessMessage && (
        <TestSuccessModal
          message={testSuccessMessage}
          onClose={onCloseTestSuccessModal}
        />
      )}

      {showSessionModal && (
        <SessionModal
          loading={sessionLoading}
          error={sessionError}
          cookies={sessionCookies}
          origins={sessionOrigins}
          updatedAt={sessionUpdatedAt}
          onClose={onCloseSessionModal}
        />
      )}
      
      {showPlaywrightSaved && (
        <div className="fixed right-6 top-6 z-[200] rounded-md border border-emerald-400/40 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-100 shadow-lg">
          Playwright settings saved
        </div>
      )}
    </div>
  );
}