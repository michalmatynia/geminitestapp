export type Integration = {
  id: string;
  name: string;
  slug: string;
};

export type IntegrationConnection = {
  id: string;
  integrationId: string;
  name: string;
  username: string;
  password?: string; // Optional for UI form
  hasAllegroAccessToken?: boolean;
  allegroTokenUpdatedAt?: string | null;
  allegroExpiresAt?: string | null;
  allegroScope?: string | null;
  allegroUseSandbox?: boolean;
  hasBaseApiToken?: boolean;
  baseTokenUpdatedAt?: string | null;
  baseLastInventoryId?: string | null;
  hasPlaywrightStorageState?: boolean;
  playwrightStorageStateUpdatedAt?: string | null;
  playwrightHeadless?: boolean;
  playwrightSlowMo?: number;
  playwrightTimeout?: number;
  playwrightNavigationTimeout?: number;
  playwrightHumanizeMouse?: boolean;
  playwrightMouseJitter?: number;
  playwrightClickDelayMin?: number;
  playwrightClickDelayMax?: number;
  playwrightInputDelayMin?: number;
  playwrightInputDelayMax?: number;
  playwrightActionDelayMin?: number;
  playwrightActionDelayMax?: number;
  playwrightProxyEnabled?: boolean;
  playwrightProxyServer?: string | null;
  playwrightProxyUsername?: string | null;
  playwrightProxyHasPassword?: boolean;
  playwrightEmulateDevice?: boolean;
  playwrightDeviceName?: string | null;
};

export const TEST_STATUSES = ["pending", "ok", "failed"] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export type TestLogEntry = {
  step: string;
  status: TestStatus;
  timestamp: string;
  detail?: string;
};

export type TestConnectionResponse = {
  error?: string;
  errorId?: string;
  integrationId?: string | null;
  connectionId?: string | null;
  steps?: unknown;
  profile?: unknown;
};

export const integrationDefinitions = [
  { name: "Tradera", slug: "tradera" },
  { name: "Allegro", slug: "allegro" },
  { name: "Baselinker", slug: "baselinker" },
] as const;

export const defaultPlaywrightSettings = {
  headless: true,
  slowMo: 50,
  timeout: 15000,
  navigationTimeout: 30000,
  humanizeMouse: false,
  mouseJitter: 6,
  clickDelayMin: 30,
  clickDelayMax: 120,
  inputDelayMin: 20,
  inputDelayMax: 120,
  actionDelayMin: 200,
  actionDelayMax: 900,
  proxyEnabled: false,
  proxyServer: "",
  proxyUsername: "",
  proxyPassword: "",
  emulateDevice: false,
  deviceName: "Desktop Chrome",
};
