export type PlaywrightSettings = {
  headless: boolean;
  slowMo: number;
  timeout: number;
  navigationTimeout: number;
  humanizeMouse: boolean;
  mouseJitter: number;
  clickDelayMin: number;
  clickDelayMax: number;
  inputDelayMin: number;
  inputDelayMax: number;
  actionDelayMin: number;
  actionDelayMax: number;
  proxyEnabled: boolean;
  proxyServer: string;
  proxyUsername: string;
  proxyPassword: string;
  emulateDevice: boolean;
  deviceName: string;
};

export type PlaywrightPersona = {
  id: string;
  name: string;
  description?: string | null;
  settings: PlaywrightSettings;
  createdAt?: string;
  updatedAt?: string;
};
