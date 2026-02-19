import { integrationDefinitions } from '@/features/integrations/types/integrations-ui';
import type { PlaywrightPersona, PlaywrightSettings } from '@/features/playwright';
import type { 
  IntegrationDto as Integration, 
  IntegrationConnectionDto as IntegrationConnection, 
  SessionCookieDto as SessionCookie, 
  TestLogEntryDto as TestLogEntry,
  SessionPayloadDto
} from '@/shared/contracts/integrations';

import type { Dispatch, SetStateAction } from 'react';


export type ConnectionFormState = {
  name: string;
  username: string;
  password: string;
  traderaDefaultTemplateId: string;
  traderaDefaultDurationHours: number;
  traderaAutoRelistEnabled: boolean;
  traderaAutoRelistLeadMinutes: number;
  traderaApiAppId: string;
  traderaApiAppKey: string;
  traderaApiPublicKey: string;
  traderaApiUserId: string;
  traderaApiToken: string;
  traderaApiSandbox: boolean;
};

export const createEmptyConnectionForm = (): ConnectionFormState => ({
  name: '',
  username: '',
  password: '',
  traderaDefaultTemplateId: '',
  traderaDefaultDurationHours: 72,
  traderaAutoRelistEnabled: true,
  traderaAutoRelistLeadMinutes: 180,
  traderaApiAppId: '',
  traderaApiAppKey: '',
  traderaApiPublicKey: '',
  traderaApiUserId: '',
  traderaApiToken: '',
  traderaApiSandbox: false,
});

export type IntegrationDefinition = (typeof integrationDefinitions)[number];

export type StepWithResult = TestLogEntry & { status: 'ok' | 'failed' };

export type SessionPayload = SessionPayloadDto;

export interface IntegrationsContextType {
  integrations: Integration[];
  integrationsLoading: boolean;
  activeIntegration: Integration | null;
  connections: IntegrationConnection[];
  connectionsLoading: boolean;
  playwrightPersonas: PlaywrightPersona[];
  playwrightPersonasLoading: boolean;
  setActiveIntegration: (integration: Integration | null) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingConnectionId: string | null;
  setEditingConnectionId: (id: string | null) => void;
  connectionForm: ConnectionFormState;
  setConnectionForm: Dispatch<SetStateAction<ConnectionFormState>>;
  isTesting: boolean;
  testLog: TestLogEntry[];
  showTestLogModal: boolean;
  setShowTestLogModal: (open: boolean) => void;
  selectedStep: StepWithResult | null;
  setSelectedStep: (step: StepWithResult | null) => void;
  showTestErrorModal: boolean;
  setShowTestErrorModal: (open: boolean) => void;
  testError: string | null;
  testErrorMeta: {
    errorId?: string;
    integrationId?: string | null;
    connectionId?: string | null;
  } | null;
  showTestSuccessModal: boolean;
  setShowTestSuccessModal: (open: boolean) => void;
  testSuccessMessage: string | null;
  showSessionModal: boolean;
  setShowSessionModal: (open: boolean) => void;
  sessionLoading: boolean;
  sessionError: string | null;
  sessionCookies: SessionCookie[];
  sessionOrigins: unknown[];
  sessionUpdatedAt: string | null;
  playwrightSettings: PlaywrightSettings;
  setPlaywrightSettings: Dispatch<SetStateAction<PlaywrightSettings>>;
  playwrightPersonaId: string | null;
  showPlaywrightSaved: boolean;
  baseApiMethod: string;
  setBaseApiMethod: (method: string) => void;
  baseApiParams: string;
  setBaseApiParams: (params: string) => void;
  baseApiLoading: boolean;
  baseApiError: string | null;
  baseApiResponse: { data: unknown } | null;
  allegroApiMethod: string;
  setAllegroApiMethod: (method: string) => void;
  allegroApiPath: string;
  setAllegroApiPath: (path: string) => void;
  allegroApiBody: string;
  setAllegroApiBody: (body: string) => void;
  allegroApiLoading: boolean;
  allegroApiError: string | null;
  allegroApiResponse: {
    status: number;
    statusText: string;
    data?: unknown;
    refreshed?: boolean;
  } | null;
  savingAllegroSandbox: boolean;
  handleIntegrationClick: (definition: IntegrationDefinition) => Promise<void>;
  handleSaveConnection: () => Promise<void>;
  handleDeleteConnection: (connection: IntegrationConnection) => void;
  handleConfirmDeleteConnection: () => Promise<void>;
  connectionToDelete: IntegrationConnection | null;
  setConnectionToDelete: (conn: IntegrationConnection | null) => void;
  handleBaselinkerTest: (connection: IntegrationConnection) => Promise<void>;
  handleAllegroTest: (connection: IntegrationConnection) => Promise<void>;
  handleTestConnection: (connection: IntegrationConnection) => Promise<void>;
  handleTraderaManualLogin: (connection: IntegrationConnection) => Promise<void>;
  handleSelectPlaywrightPersona: (personaId: string | null) => Promise<void>;
  handleSavePlaywrightSettings: () => Promise<void>;
  handleAllegroAuthorize: () => void;
  handleAllegroDisconnect: () => Promise<void>;
  handleAllegroSandboxToggle: (value: boolean) => Promise<void>;
  handleAllegroSandboxConnect: () => Promise<void>;
  handleBaseApiRequest: () => Promise<void>;
  handleAllegroApiRequest: () => Promise<void>;
  onCloseModal: () => void;
  onOpenSessionModal: () => void;
}
